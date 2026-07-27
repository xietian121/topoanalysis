import * as THREE from 'three'
import type { OBJFaceData } from './model-parser'
import type { TopologyReport } from './topology-analyzer'

export interface HighlightFaceData {
  /** Triangle indices (3 per triangle) into vertexPositions */
  indices: Uint32Array
}

export interface HighlightPointData {
  /** Flat array of [x,y,z, x,y,z, ...] */
  positions: Float32Array
}

export interface HighlightLineData {
  /** Flat array of [x1,y1,z1, x2,y2,z2, ...] — pairs of endpoints */
  positions: Float32Array
}

export interface HighlightResult {
  faces?: HighlightFaceData
  points?: HighlightPointData
  lines?: HighlightLineData
  /** Vertex positions shared by faces highlight */
  vertexPositions?: Float32Array
  /** RGB per vertex for density gradient (parallel to vertexPositions) */
  vertexColors?: Float32Array
}

/**
 * Flatten face data into a single list, tracking original face index.
 */
function flattenFaces(faceData: OBJFaceData): { vertices: number[]; origIdx: number }[] {
  const result: { vertices: number[]; origIdx: number }[] = []
  let origIdx = 0
  for (const group of faceData.groups) {
    for (const face of group) {
      result.push({ vertices: face, origIdx })
      origIdx++
    }
  }
  return result
}

/**
 * Build mapping: original face index → array of triangulated face indices.
 * A quad (4 verts) → 2 triangles, an n-gon (n verts) → (n-2) triangles.
 */
function buildTriangulationMap(faces: { vertices: number[] }[]): Map<number, number[]> {
  const map = new Map<number, number[]>()
  let triIdx = 0
  for (let i = 0; i < faces.length; i++) {
    const n = faces[i].vertices.length
    const count = n - 2
    const tris: number[] = []
    for (let j = 0; j < count; j++) {
      tris.push(triIdx + j)
    }
    map.set(i, tris)
    triIdx += count
  }
  return map
}

/**
 * Merge all mesh geometries from a model group into a single geometry.
 * This handles models split across multiple meshes (e.g., per-material groups).
 */
function getModelGeometry(model: THREE.Group): {
  positions: Float32Array
  index: Uint32Array
} | null {
  const allPositions: number[] = []
  const allIndices: number[] = []
  let vertexOffset = 0

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geo = child.geometry
      if (geo instanceof THREE.BufferGeometry) {
        const pos = geo.getAttribute('position') as THREE.BufferAttribute
        if (!pos) return
        const idx = geo.getIndex()
        const posArray = pos.array
        const vertexCount = pos.count

        console.log('[HighlightData] Mesh found — hasPos:', !!pos, 'posCount:', vertexCount, 'hasIdx:', !!idx, 'idxCount:', idx?.count)

        // Append positions
        for (let i = 0; i < posArray.length; i++) {
          allPositions.push(posArray[i])
        }

        // Append indices (rebase to new vertex offset)
        if (idx) {
          const idxArray = idx.array
          for (let i = 0; i < idxArray.length; i++) {
            allIndices.push(idxArray[i] + vertexOffset)
          }
        } else {
          // Non-indexed geometry — generate sequential indices
          for (let i = 0; i < vertexCount; i++) {
            allIndices.push(vertexOffset + i)
          }
        }

        vertexOffset += vertexCount
      }
    }
  })

  console.log('[HighlightData] Merged geometry — total vertices:', vertexOffset, 'total indices:', allIndices.length, 'triangles:', allIndices.length / 3)

  if (allPositions.length === 0 || allIndices.length === 0) {
    console.log('[HighlightData] getModelGeometry result: false (no data)')
    return null
  }

  console.log('[HighlightData] getModelGeometry result: true')
  return {
    positions: new Float32Array(allPositions),
    index: new Uint32Array(allIndices),
  }
}

/**
 * Build the full highlight geometry index array for target original faces.
 * Takes the model's full index buffer and selects only the triangles
 * corresponding to the target original face indices.
 */
function buildFaceHighlightIndices(
  targetOrigIndices: Set<number>,
  triMap: Map<number, number[]>,
  geoIndex: Uint32Array,
): Uint32Array {
  const result: number[] = []
  for (const origIdx of targetOrigIndices) {
    const triIndices = triMap.get(origIdx)
    if (!triIndices) continue
    for (const triIdx of triIndices) {
      const base = triIdx * 3
      if (base + 2 < geoIndex.length) {
        result.push(geoIndex[base], geoIndex[base + 1], geoIndex[base + 2])
      }
    }
  }
  return new Uint32Array(result)
}

/**
 * Get highlight data for the given criterion.
 * Returns null if no highlight is applicable or data is unavailable.
 */
/**
 * Position key helper for spatial deduplication.
 */
function posKey(x: number, y: number, z: number): string {
  return `${x.toFixed(4)}:${y.toFixed(4)}:${z.toFixed(4)}`
}

/**
 * Build per-vertex RGB colors from density data.
 * Low density (0) → medium red (#ff6666), High density (1) → medium blue (#6666ff).
 */
function buildDensityColors(
  positions: Float32Array,
  keyMap: Map<string, number>,
): Float32Array {
  const vCount = positions.length / 3
  const colors = new Float32Array(vCount * 3)

  for (let i = 0; i < vCount; i++) {
    const key = posKey(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
    const density = keyMap.get(key) ?? 0.5

    // lerp: strong red (#ff2222=1,0.13,0.13) → strong blue (#2222ff=0.13,0.13,1)
    const r = 1.0 - 0.87 * density
    const g = 0.13
    const b = 0.13 + 0.87 * density

    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
  }

  return colors
}

/**
 * Flatten edge loops into line segment positions.
 */
function buildLoopLinePositions(
  edgeLoops: import('./topology-analyzer').EdgeLoopResult,
): Float32Array {
  const positions: number[] = []
  for (const loop of edgeLoops.loops) {
    for (const edge of loop.edges) {
      positions.push(
        edge.a[0], edge.a[1], edge.a[2],
        edge.b[0], edge.b[1], edge.b[2],
      )
    }
  }
  return new Float32Array(positions)
}

/**
 * Extract unique vertex positions from edge loops for point markers.
 * Makes the loops more visible (WebGL linewidth is limited to 1 on Windows).
 */
function buildLoopPointPositions(
  edgeLoops: import('./topology-analyzer').EdgeLoopResult,
): Float32Array {
  const seen = new Set<string>()
  const positions: number[] = []
  const key = (v: [number, number, number]) => `${v[0].toFixed(4)},${v[1].toFixed(4)},${v[2].toFixed(4)}`

  for (const loop of edgeLoops.loops) {
    for (const edge of loop.edges) {
      for (const v of [edge.a, edge.b]) {
        const k = key(v)
        if (!seen.has(k)) {
          seen.add(k)
          positions.push(v[0], v[1], v[2])
        }
      }
    }
  }
  return new Float32Array(positions)
}

export function getHighlightData(
  criterionId: string,
  model: THREE.Group,
  faceData: OBJFaceData | null,
  report: TopologyReport,
): HighlightResult | null {
  const geo = getModelGeometry(model)
  console.log('[HighlightData] getHighlightData — criterionId:', criterionId, 'hasGeo:', !!geo, 'hasFaceData:', !!faceData)
  if (!geo) return null

  // Face-based highlights (tri, quad, ngon, overlapping)
  if (faceData) {
    const faces = flattenFaces(faceData)
    const triMap = buildTriangulationMap(faces)
    console.log('[HighlightData] Flattened faces:', faces.length, 'triMap size:', triMap.size)

    switch (criterionId) {
      case 'quad-tri-ratio':
      case 'tri-distribution': {
        // Highlight all triangle faces (3 vertices)
        const targetIndices = new Set<number>()
        for (let i = 0; i < faces.length; i++) {
          if (faces[i].vertices.length === 3) {
            targetIndices.add(i)
          }
        }
        if (targetIndices.size === 0) return null
        return {
          faces: {
            indices: buildFaceHighlightIndices(targetIndices, triMap, geo.index),
          },
          vertexPositions: geo.positions,
        }
      }

      case 'ngon-count': {
        // Highlight all N-gon faces (5+ vertices)
        const targetIndices = new Set<number>()
        for (let i = 0; i < faces.length; i++) {
          if (faces[i].vertices.length >= 5) {
            targetIndices.add(i)
          }
        }
        if (targetIndices.size === 0) return null
        return {
          faces: {
            indices: buildFaceHighlightIndices(targetIndices, triMap, geo.index),
          },
          vertexPositions: geo.positions,
        }
      }

      case 'overlapping': {
        // Highlight overlapping face pairs
        const targetIndices = new Set<number>()
        for (const [a, b] of report.overlapping.pairs) {
          targetIndices.add(a)
          targetIndices.add(b)
        }
        if (targetIndices.size === 0) return null
        return {
          faces: {
            indices: buildFaceHighlightIndices(targetIndices, triMap, geo.index),
          },
          vertexPositions: geo.positions,
        }
      }
    }
  }

  // Density highlight — per-vertex colored faces (full model)
  if (criterionId === 'density') {
    if (!report.density) return null
    const densityColors = buildDensityColors(geo.positions, report.density.keyMap)
    return {
      faces: {
        indices: new Uint32Array(geo.index), // all faces
      },
      vertexPositions: geo.positions,
      vertexColors: densityColors,
    }
  }

  // Point-based highlight (poles)
  if (criterionId === 'pole-distribution') {
    const { poleStats } = report
    const allPoles = poleStats.poles
    if (allPoles.length === 0) return null
    const arr = new Float32Array(allPoles.length * 3)
    for (let i = 0; i < allPoles.length; i++) {
      arr[i * 3] = allPoles[i][0]
      arr[i * 3 + 1] = allPoles[i][1]
      arr[i * 3 + 2] = allPoles[i][2]
    }
    return {
      points: { positions: arr },
    }
  }

  // Edge-based highlight (non-manifold) — positions stored directly in report
  if (criterionId === 'non-manifold') {
    const { nonManifold } = report
    if (nonManifold.count === 0) return null
    const edgePositions: number[] = []
    for (const edge of nonManifold.edges) {
      edgePositions.push(
        edge.a[0], edge.a[1], edge.a[2],
        edge.b[0], edge.b[1], edge.b[2],
      )
    }
    if (edgePositions.length === 0) return null
    return {
      lines: { positions: new Float32Array(edgePositions) },
    }
  }

  // Edge-based highlight (boundary-holes) — boundary edges
  if (criterionId === 'boundary-holes') {
    const { boundary } = report
    if (boundary.count === 0) return null
    const edgePositions: number[] = []
    for (const edge of boundary.edges) {
      edgePositions.push(
        edge.a[0], edge.a[1], edge.a[2],
        edge.b[0], edge.b[1], edge.b[2],
      )
    }
    if (edgePositions.length === 0) return null
    return {
      lines: { positions: new Float32Array(edgePositions) },
    }
  }

  // Edge-based highlight (loop-edges) — closed edge loops
  if (criterionId === 'loop-edges') {
    if (!report.edgeLoops || report.edgeLoops.loops.length === 0) return null
    return {
      lines: { positions: buildLoopLinePositions(report.edgeLoops) },
      points: { positions: buildLoopPointPositions(report.edgeLoops) },
    }
  }

  return null
}
