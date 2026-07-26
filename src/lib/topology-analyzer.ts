import * as THREE from 'three'
import type { OBJFaceData } from './model-parser'

export interface FaceStats {
  quadCount: number
  triCount: number
  ngonCount: number
  totalFaces: number
  quadPct: number
  triPct: number
}

export interface NonManifoldEdge {
  /** Endpoint A position */
  a: [number, number, number]
  /** Endpoint B position */
  b: [number, number, number]
  /** Number of faces sharing this edge */
  faceCount: number
}

export interface NonManifoldResult {
  count: number
  edges: NonManifoldEdge[]
}

export interface OverlappingResult {
  count: number
  pairs: [number, number][] // [faceA_idx, faceB_idx] — indices into original OBJ faces
}

export interface BoundaryEdge {
  /** Endpoint A position */
  a: [number, number, number]
  /** Endpoint B position */
  b: [number, number, number]
}

export interface BoundaryResult {
  count: number
  edges: BoundaryEdge[]
}

export interface PoleStats {
  /** Number of vertices with valence >= 6 */
  count: number
  /** World-space positions of all poles (valence >= 6) */
  poles: [number, number, number][]
}

export interface DensityData {
  /** Per-vertex density [0, 1], 0 = low density, 1 = high density */
  values: Float32Array
  /** posKey → density for merged geometry color lookup */
  keyMap: Map<string, number>
}

export interface EdgeLoop {
  edges: Array<{
    a: [number, number, number]
    b: [number, number, number]
  }>
}

export interface EdgeLoopResult {
  loops: EdgeLoop[]
}

export interface TopologyReport {
  faceStats: FaceStats
  nonManifold: NonManifoldResult
  overlapping: OverlappingResult
  boundary: BoundaryResult
  poleStats: PoleStats
  vertexCount: number
  density?: DensityData
  edgeLoops?: EdgeLoopResult
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Quantize a position to a string key for spatial deduplication. */
function posKey(x: number, y: number, z: number): string {
  // Round to 4 decimal places (0.1mm precision is enough for topology analysis)
  return `${x.toFixed(4)}:${y.toFixed(4)}:${z.toFixed(4)}`
}

// ---------------------------------------------------------------------------
// Face type analysis (uses OBJ face data — reliable, not geometry-dependent)
// ---------------------------------------------------------------------------

export function analyzeFaceTypes(faceData: OBJFaceData | null, model: THREE.Group): FaceStats {
  let quadCount = 0, triCount = 0, ngonCount = 0

  if (faceData) {
    for (const group of faceData.groups) {
      for (const face of group) {
        if (face.length === 3) triCount++
        else if (face.length === 4) quadCount++
        else ngonCount++
      }
    }
  } else {
    // Fallback: count triangles from triangulated geometry
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geo = child.geometry
        if (geo instanceof THREE.BufferGeometry) {
          const idx = geo.getIndex()
          triCount += idx ? idx.count / 3 : (geo.getAttribute('position')?.count ?? 0) / 3
        }
      }
    })
  }

  const totalFaces = quadCount + triCount + ngonCount
  return {
    quadCount, triCount, ngonCount, totalFaces,
    quadPct: totalFaces > 0 ? (quadCount / totalFaces) * 100 : 0,
    triPct: totalFaces > 0 ? (triCount / totalFaces) * 100 : 0,
  }
}

// ---------------------------------------------------------------------------
// Non-manifold edge detection (position-based dedup across meshes)
// ---------------------------------------------------------------------------

export function detectNonManifold(model: THREE.Group): NonManifoldResult {
  // Map: "keyA|keyB" → { count, posA, posB }
  const edgeMap = new Map<string, { count: number; posA: [number, number, number]; posB: [number, number, number] }>()

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const geo = child.geometry
    if (!(geo instanceof THREE.BufferGeometry)) return

    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    if (!pos) return
    const idx = geo.getIndex()

    const addEdgeByPos = (vi: number, vj: number) => {
      const x0 = pos.getX(vi), y0 = pos.getY(vi), z0 = pos.getZ(vi)
      const x1 = pos.getX(vj), y1 = pos.getY(vj), z1 = pos.getZ(vj)
      const ki = posKey(x0, y0, z0)
      const kj = posKey(x1, y1, z1)
      if (ki === kj) return // degenerate edge
      const eKey = ki < kj ? `${ki}|${kj}` : `${kj}|${ki}`
      const existing = edgeMap.get(eKey)
      if (existing) {
        existing.count++
      } else {
        edgeMap.set(eKey, { count: 1, posA: [x0, y0, z0], posB: [x1, y1, z1] })
      }
    }

    const count = pos.count
    if (idx) {
      const arr = idx.array
      for (let i = 0; i < idx.count; i += 3) {
        addEdgeByPos(arr[i], arr[i + 1])
        addEdgeByPos(arr[i + 1], arr[i + 2])
        addEdgeByPos(arr[i + 2], arr[i])
      }
    } else {
      for (let i = 0; i < count; i += 3) {
        addEdgeByPos(i, i + 1)
        addEdgeByPos(i + 1, i + 2)
        addEdgeByPos(i + 2, i)
      }
    }
  })

  // Collect edges shared by ≥3 faces → non-manifold
  const nonManifoldEdges: NonManifoldEdge[] = []
  for (const [, data] of edgeMap) {
    if (data.count >= 3) {
      nonManifoldEdges.push({ a: data.posA, b: data.posB, faceCount: data.count })
    }
  }

  return { count: nonManifoldEdges.length, edges: nonManifoldEdges }
}

// ---------------------------------------------------------------------------
// Overlapping face detection (position-based, operates on merged geometry)
// ---------------------------------------------------------------------------

export function detectOverlapping(model: THREE.Group, faceData: OBJFaceData | null): OverlappingResult {
  // Use OBJ face data when available — gives us original face indices directly
  if (faceData) {
    return detectOverlappingFromOBJ(faceData)
  }
  // Fallback to geometry-based detection
  return detectOverlappingFromGeometry(model)
}

function detectOverlappingFromOBJ(faceData: OBJFaceData): OverlappingResult {
  const positions = faceData.positions
  const overlapping: [number, number][] = []
  const EPS = 0.0001

  // Flatten all faces with their original indices
  interface OBJFace {
    origIdx: number
    vertices: [number, number, number][]
    centroid: [number, number, number]
  }

  const allFaces: OBJFace[] = []
  let origIdx = 0
  for (const group of faceData.groups) {
    for (const face of group) {
      const verts: [number, number, number][] = face.map((vi) => {
        if (vi * 3 + 2 < positions.length) {
          return [positions[vi * 3], positions[vi * 3 + 1], positions[vi * 3 + 2]]
        }
        return [0, 0, 0]
      })

      const cx = verts.reduce((s, v) => s + v[0], 0) / verts.length
      const cy = verts.reduce((s, v) => s + v[1], 0) / verts.length
      const cz = verts.reduce((s, v) => s + v[2], 0) / verts.length

      allFaces.push({ origIdx, vertices: verts, centroid: [cx, cy, cz] })
      origIdx++
    }
  }

  // Compare all face pairs
  for (let i = 0; i < allFaces.length; i++) {
    for (let j = i + 1; j < allFaces.length; j++) {
      const a = allFaces[i], b = allFaces[j]
      const dx = a.centroid[0] - b.centroid[0]
      const dy = a.centroid[1] - b.centroid[1]
      const dz = a.centroid[2] - b.centroid[2]
      if (dx * dx + dy * dy + dz * dz > EPS) continue

      // Check vertex overlap: how many vertices of A are also in B?
      const matchCount = a.vertices.filter((va) =>
        b.vertices.some((vb) => {
          const d = [va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]]
          return d[0] * d[0] + d[1] * d[1] + d[2] * d[2] < EPS
        }),
      ).length

      if (matchCount >= 3) {
        overlapping.push([a.origIdx, b.origIdx])
      }
    }
  }

  return { count: overlapping.length, pairs: overlapping }
}

function detectOverlappingFromGeometry(model: THREE.Group): OverlappingResult {
  interface FaceData {
    centroid: [number, number, number]
    vertices: [number, number, number][]
    faceIdx: number // index in allFaces array (global triangle index)
  }

  const allFaces: FaceData[] = []

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const geo = child.geometry
    if (!(geo instanceof THREE.BufferGeometry)) return

    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    if (!pos) return
    const idx = geo.getIndex()

    const getVertex = (i: number): [number, number, number] => [
      pos.getX(i), pos.getY(i), pos.getZ(i),
    ]

    const count = pos.count
    if (idx) {
      const arr = idx.array
      for (let i = 0; i < idx.count; i += 3) {
        const v0 = getVertex(arr[i]), v1 = getVertex(arr[i + 1]), v2 = getVertex(arr[i + 2])
        allFaces.push({
          centroid: [(v0[0] + v1[0] + v2[0]) / 3, (v0[1] + v1[1] + v2[1]) / 3, (v0[2] + v1[2] + v2[2]) / 3],
          vertices: [v0, v1, v2],
          faceIdx: allFaces.length,
        })
      }
    } else {
      for (let i = 0; i < count; i += 3) {
        const v0 = getVertex(i), v1 = getVertex(i + 1), v2 = getVertex(i + 2)
        allFaces.push({
          centroid: [(v0[0] + v1[0] + v2[0]) / 3, (v0[1] + v1[1] + v2[1]) / 3, (v0[2] + v1[2] + v2[2]) / 3],
          vertices: [v0, v1, v2],
          faceIdx: allFaces.length,
        })
      }
    }
  })

  const EPS = 0.0001
  const overlapping: [number, number][] = []

  for (let i = 0; i < allFaces.length; i++) {
    for (let j = i + 1; j < allFaces.length; j++) {
      const a = allFaces[i], b = allFaces[j]
      const dx = a.centroid[0] - b.centroid[0]
      const dy = a.centroid[1] - b.centroid[1]
      const dz = a.centroid[2] - b.centroid[2]
      if (dx * dx + dy * dy + dz * dz > EPS) continue

      const matchCount = a.vertices.filter((va) =>
        b.vertices.some((vb) => {
          const d = [va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]]
          return d[0] * d[0] + d[1] * d[1] + d[2] * d[2] < EPS
        }),
      ).length

      if (matchCount >= 3) {
        overlapping.push([a.faceIdx, b.faceIdx])
      }
    }
  }

  return { count: overlapping.length, pairs: overlapping }
}

// ---------------------------------------------------------------------------
// Boundary edge (hole) detection — edges shared by only 1 face
// ---------------------------------------------------------------------------

/**
 * Detect boundary edges (holes) in the mesh.
 * A boundary edge belongs to exactly one face — the model is not watertight at that edge.
 * These manifest as visible holes, gaps, or open seams in the model.
 */
export function detectBoundaryEdges(model: THREE.Group): BoundaryResult {
  // Map: "keyA|keyB" → face count
  const edgeMap = new Map<string, { count: number; posA: [number, number, number]; posB: [number, number, number] }>()

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const geo = child.geometry
    if (!(geo instanceof THREE.BufferGeometry)) return

    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    if (!pos) return
    const idx = geo.getIndex()

    const addEdgeByPos = (vi: number, vj: number) => {
      const x0 = pos.getX(vi), y0 = pos.getY(vi), z0 = pos.getZ(vi)
      const x1 = pos.getX(vj), y1 = pos.getY(vj), z1 = pos.getZ(vj)
      const ki = posKey(x0, y0, z0)
      const kj = posKey(x1, y1, z1)
      if (ki === kj) return
      const eKey = ki < kj ? `${ki}|${kj}` : `${kj}|${ki}`
      const existing = edgeMap.get(eKey)
      if (existing) {
        existing.count++
      } else {
        edgeMap.set(eKey, { count: 1, posA: [x0, y0, z0], posB: [x1, y1, z1] })
      }
    }

    const count = pos.count
    if (idx) {
      const arr = idx.array
      for (let i = 0; i < idx.count; i += 3) {
        addEdgeByPos(arr[i], arr[i + 1])
        addEdgeByPos(arr[i + 1], arr[i + 2])
        addEdgeByPos(arr[i + 2], arr[i])
      }
    } else {
      for (let i = 0; i < count; i += 3) {
        addEdgeByPos(i, i + 1)
        addEdgeByPos(i + 1, i + 2)
        addEdgeByPos(i + 2, i)
      }
    }
  })

  // Collect edges shared by exactly 1 face → boundary (hole)
  const boundaryEdges: BoundaryEdge[] = []
  for (const [, data] of edgeMap) {
    if (data.count === 1) {
      boundaryEdges.push({ a: data.posA, b: data.posB })
    }
  }

  return { count: boundaryEdges.length, edges: boundaryEdges }
}

// ---------------------------------------------------------------------------
// Pole detection (position-based vertex deduplication across ALL meshes!)
// ---------------------------------------------------------------------------

/**
 * Detect poles from the ORIGINAL OBJ face topology (before triangulation).
 * This is the preferred method because it reflects the artist's actual mesh
 * topology: a vertex shared by 4 quads has valence 4, not 8.
 */
function detectPolesFromOBJ(faceData: OBJFaceData): PoleStats {
  const positions = faceData.positions
  const adjacency = new Map<string, Set<string>>()
  const posByKey = new Map<string, [number, number, number]>()

  const getPos = (vi: number): [number, number, number] => {
    if (vi * 3 + 2 < positions.length) {
      return [positions[vi * 3], positions[vi * 3 + 1], positions[vi * 3 + 2]]
    }
    return [0, 0, 0]
  }

  const addEdge = (vi0: number, vi1: number) => {
    const p0 = getPos(vi0)
    const p1 = getPos(vi1)
    const k0 = posKey(p0[0], p0[1], p0[2])
    const k1 = posKey(p1[0], p1[1], p1[2])
    if (k0 === k1) return

    if (!posByKey.has(k0)) posByKey.set(k0, p0)
    if (!posByKey.has(k1)) posByKey.set(k1, p1)

    if (!adjacency.has(k0)) adjacency.set(k0, new Set())
    if (!adjacency.has(k1)) adjacency.set(k1, new Set())
    adjacency.get(k0)!.add(k1)
    adjacency.get(k1)!.add(k0)
  }

  // Process original faces (quads, tris, n-gons) — NOT triangulated
  for (const group of faceData.groups) {
    for (const face of group) {
      const n = face.length
      // Each face creates edges between consecutive vertices (and last→first)
      for (let i = 0; i < n; i++) {
        addEdge(face[i], face[(i + 1) % n])
      }
    }
  }

  // Count valence per position key — only valence >= 6 is a pole
  const poles: [number, number, number][] = []

  for (const [key, neighbors] of adjacency) {
    const valence = neighbors.size
    if (valence >= 6) {
      poles.push(posByKey.get(key)!)
    }
  }

  return { count: poles.length, poles }
}

/**
 * Fallback pole detection from triangulated geometry.
 * Used when OBJ face data is not available (e.g., FBX files).
 */
function detectPolesFromGeometry(model: THREE.Group): PoleStats {
  const adjacency = new Map<string, Set<string>>()
  const posByKey = new Map<string, [number, number, number]>()

  const addEdgeByPos = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
    const k0 = posKey(x0, y0, z0)
    const k1 = posKey(x1, y1, z1)
    if (k0 === k1) return

    if (!posByKey.has(k0)) posByKey.set(k0, [x0, y0, z0])
    if (!posByKey.has(k1)) posByKey.set(k1, [x1, y1, z1])

    if (!adjacency.has(k0)) adjacency.set(k0, new Set())
    if (!adjacency.has(k1)) adjacency.set(k1, new Set())
    adjacency.get(k0)!.add(k1)
    adjacency.get(k1)!.add(k0)
  }

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const geo = child.geometry
    if (!(geo instanceof THREE.BufferGeometry)) return

    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    if (!pos) return
    const idx = geo.getIndex()

    const addTriangleEdges = (a: number, b: number, c: number) => {
      addEdgeByPos(
        pos.getX(a), pos.getY(a), pos.getZ(a),
        pos.getX(b), pos.getY(b), pos.getZ(b),
      )
      addEdgeByPos(
        pos.getX(b), pos.getY(b), pos.getZ(b),
        pos.getX(c), pos.getY(c), pos.getZ(c),
      )
      addEdgeByPos(
        pos.getX(c), pos.getY(c), pos.getZ(c),
        pos.getX(a), pos.getY(a), pos.getZ(a),
      )
    }

    const count = pos.count
    if (idx) {
      const arr = idx.array
      for (let i = 0; i < idx.count; i += 3) {
        addTriangleEdges(arr[i], arr[i + 1], arr[i + 2])
      }
    } else {
      for (let i = 0; i < count; i += 3) {
        addTriangleEdges(i, i + 1, i + 2)
      }
    }
  })

  const poles: [number, number, number][] = []

  for (const [key, neighbors] of adjacency) {
    const valence = neighbors.size
    if (valence >= 6) {
      poles.push(posByKey.get(key)!)
    }
  }

  return { count: poles.length, poles }
}

/** Dispatch to the appropriate pole detection method. */
export function detectPoles(model: THREE.Group, faceData: OBJFaceData | null): PoleStats {
  if (faceData) return detectPolesFromOBJ(faceData)
  return detectPolesFromGeometry(model)
}

// ---------------------------------------------------------------------------
// Density detection — per-vertex local mesh density
// ---------------------------------------------------------------------------

export function detectDensity(model: THREE.Group): DensityData {
  // Accumulate face area per position key
  const areaSums = new Map<string, number>()
  const faceCounts = new Map<string, number>()
  const posByKey = new Map<string, [number, number, number]>()

  const addFaceArea = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => {
    // Triangle area via cross product
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2]
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]
    const cx = uy * vz - uz * vy
    const cy = uz * vx - ux * vz
    const cz = ux * vy - uy * vx
    const area = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz)

    for (const p of [a, b, c]) {
      const key = posKey(p[0], p[1], p[2])
      areaSums.set(key, (areaSums.get(key) ?? 0) + area)
      faceCounts.set(key, (faceCounts.get(key) ?? 0) + 1)
      if (!posByKey.has(key)) posByKey.set(key, p)
    }
  }

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const geo = child.geometry
    if (!(geo instanceof THREE.BufferGeometry)) return

    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    if (!pos) return
    const idx = geo.getIndex()

    const getV = (i: number): [number, number, number] => [
      pos.getX(i), pos.getY(i), pos.getZ(i),
    ]

    const count = pos.count
    if (idx) {
      const arr = idx.array
      for (let i = 0; i < idx.count; i += 3) {
        addFaceArea(getV(arr[i]), getV(arr[i + 1]), getV(arr[i + 2]))
      }
    } else {
      for (let i = 0; i < count; i += 3) {
        addFaceArea(getV(i), getV(i + 1), getV(i + 2))
      }
    }
  })

  // Compute raw density = 1 / averageFaceArea per vertex
  const keys = [...posByKey.keys()]
  const rawDensities = new Map<string, number>()
  let minRaw = Infinity, maxRaw = -Infinity

  for (const key of keys) {
    const totalArea = areaSums.get(key) ?? 0
    const count = faceCounts.get(key) ?? 1
    const avgArea = totalArea / count
    const density = 1 / (1 + avgArea) // smaller area → higher density
    rawDensities.set(key, density)
    if (density < minRaw) minRaw = density
    if (density > maxRaw) maxRaw = density
  }

  // Min-max normalize to [0, 1]
  const keyMap = new Map<string, number>()
  const range = maxRaw - minRaw
  const valuesArr: number[] = []

  for (const key of keys) {
    const raw = rawDensities.get(key) ?? 0
    const normalized = range > 0.0001 ? (raw - minRaw) / range : 0.5
    keyMap.set(key, normalized)
    valuesArr.push(normalized)
  }

  return {
    values: new Float32Array(valuesArr),
    keyMap,
  }
}

// ---------------------------------------------------------------------------
// Edge loop detection — find closed edge loops in quad-dominant meshes
// ---------------------------------------------------------------------------

/**
 * Detect closed edge loops in a quad-dominant mesh.
 *
 * Algorithm:
 * 1. Build edge→face map for all edges
 * 2. For each quad face, compute the "opposite edge" for each of its 4 edges
 *    (edges that don't share a vertex are opposite in a quad)
 * 3. Build adjacency: for each internal edge ek, collect ALL opposite edges
 *    from each quad sharing ek → Set{0-2 entries}
 * 4. Walk each chain: from an unvisited edge, follow a consistent direction
 *    until returning to start (closed loop) or dead-ending (not a loop)
 */
export function detectEdgeLoops(faceData: OBJFaceData | null): EdgeLoopResult | undefined {
  if (!faceData) return undefined

  const positions = faceData.positions
  const getPos = (vi: number): [number, number, number] => {
    if (vi * 3 + 2 < positions.length) {
      return [positions[vi * 3], positions[vi * 3 + 1], positions[vi * 3 + 2]]
    }
    return [0, 0, 0]
  }

  const edgeKey = (vi0: number, vi1: number) =>
    vi0 < vi1 ? `${vi0}|${vi1}` : `${vi1}|${vi0}`

  // Step 1: Build edge → faces map + all edges list
  const edgeFaces = new Map<string, number[]>()
  const allEdges: Array<{ key: string; vi0: number; vi1: number }> = []

  let faceIdx = 0
  for (const group of faceData.groups) {
    for (const face of group) {
      const n = face.length
      for (let i = 0; i < n; i++) {
        const vi0 = face[i]
        const vi1 = face[(i + 1) % n]
        const ek = edgeKey(vi0, vi1)
        const list = edgeFaces.get(ek)
        if (list) {
          list.push(faceIdx)
        } else {
          edgeFaces.set(ek, [faceIdx])
          allEdges.push({ key: ek, vi0, vi1 })
        }
      }
      faceIdx++
    }
  }

  // Step 2: Precompute opposite-edge mapping per quad face
  // For quad [v0,v1,v2,v3]: edges = [e01, e12, e23, e30]
  // opposite(e01) = e23, opposite(e12) = e30, etc.
  const faceOppositeMap = new Map<number, Map<string, string>>()

  faceIdx = 0
  for (const group of faceData.groups) {
    for (const face of group) {
      const n = face.length
      if (n === 4) {
        const edges: string[] = []
        for (let i = 0; i < n; i++) {
          edges.push(edgeKey(face[i], face[(i + 1) % n]))
        }
        const oppMap = new Map<string, string>()
        for (let i = 0; i < n; i++) {
          oppMap.set(edges[i], edges[(i + 2) % n])
        }
        faceOppositeMap.set(faceIdx, oppMap)
      }
      faceIdx++
    }
  }

  // Step 3: Build adjacency — each edge → Set of opposite edges (0, 1, or 2)
  const neighbors = new Map<string, Set<string>>()

  for (const { key: ek } of allEdges) {
    const faces = edgeFaces.get(ek) ?? []
    // Only consider internal edges (shared by exactly 2 faces)
    if (faces.length !== 2) continue

    const nbrs = new Set<string>()
    for (const fid of faces) {
      const oppMap = faceOppositeMap.get(fid)
      if (!oppMap) continue // only quads contribute
      const opp = oppMap.get(ek)
      if (opp && opp !== ek) {
        nbrs.add(opp)
      }
    }
    if (nbrs.size > 0) {
      neighbors.set(ek, nbrs)
    }
  }

  // Step 4: Walk chains to find closed loops
  const visited = new Set<string>()
  const loops: EdgeLoop[] = []

  for (const { key: startKey } of allEdges) {
    if (visited.has(startKey)) continue
    const startNbrs = neighbors.get(startKey)
    if (!startNbrs || startNbrs.size === 0) continue

    // Try each neighbor as the first step (edge loops are undirected — 2 possible directions)
    for (const firstStep of startNbrs) {
      if (visited.has(firstStep)) continue

      const walk: string[] = [startKey, firstStep]
      let prev = startKey
      let current = firstStep
      let closed = false

      while (true) {
        const curNbrs = neighbors.get(current)
        if (!curNbrs) break // dead end (non-quad adjacent) → not a loop

        // Find the neighbor that is NOT prev (continue in the same direction)
        let next = ''
        for (const n of curNbrs) {
          if (n !== prev) { next = n; break }
        }

        if (!next) break // no continuation → not a closed loop

        if (next === startKey) {
          // Closed back to start → found a loop!
          closed = true
          break
        }

        if (walk.includes(next)) break // hit a previously visited edge in this walk → tangled

        walk.push(next)
        prev = current
        current = next
      }

      if (closed && walk.length >= 4) {
        // Mark all edges in this loop as visited
        for (const ek of walk) visited.add(ek)

        // Convert edge keys to position pairs
        const edgePositions: EdgeLoop['edges'] = []
        for (const ek of walk) {
          const [s0, s1] = ek.split('|')
          const vi0 = parseInt(s0, 10)
          const vi1 = parseInt(s1, 10)
          edgePositions.push({ a: getPos(vi0), b: getPos(vi1) })
        }
        loops.push({ edges: edgePositions })
      }
    }

    // Mark start as visited regardless (don't retry failed starts)
    visited.add(startKey)
  }

  return { loops }
}

// ---------------------------------------------------------------------------
// Full analysis
// ---------------------------------------------------------------------------

export type TopologyProgressCallback = (step: number, total: number, label: string) => void

const ANALYSIS_STEPS = [
  { label: '面型分析', fn: 'faceStats' },
  { label: '非流形检测', fn: 'nonManifold' },
  { label: '重叠面检测', fn: 'overlapping' },
  { label: '破洞检测', fn: 'boundary' },
  { label: '极点分析', fn: 'poleStats' },
  { label: '密度分布', fn: 'density' },
  { label: '循环线检测', fn: 'edgeLoops' },
] as const

export function analyzeTopology(
  model: THREE.Group,
  faceData: OBJFaceData | null,
  onProgress?: TopologyProgressCallback,
): TopologyReport {
  const totalSteps = ANALYSIS_STEPS.length

  // Step 1: Face types
  onProgress?.(1, totalSteps, ANALYSIS_STEPS[0].label)
  const faceStats = analyzeFaceTypes(faceData, model)

  // Step 2: Non-manifold
  onProgress?.(2, totalSteps, ANALYSIS_STEPS[1].label)
  const nonManifold = detectNonManifold(model)

  // Step 3: Overlapping
  onProgress?.(3, totalSteps, ANALYSIS_STEPS[2].label)
  const overlapping = detectOverlapping(model, faceData)

  // Step 4: Boundary
  onProgress?.(4, totalSteps, ANALYSIS_STEPS[3].label)
  const boundary = detectBoundaryEdges(model)

  // Step 5: Poles
  onProgress?.(5, totalSteps, ANALYSIS_STEPS[4].label)
  const poleStats = detectPoles(model, faceData)

  // Step 6: Density
  onProgress?.(6, totalSteps, ANALYSIS_STEPS[5].label)
  const density = detectDensity(model)

  // Step 7: Edge loops
  onProgress?.(7, totalSteps, ANALYSIS_STEPS[6].label)
  const edgeLoops = detectEdgeLoops(faceData)

  let vertexCount = 0
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      vertexCount += child.geometry?.getAttribute('position')?.count ?? 0
    }
  })

  console.log(
    `[TopoEval] 拓扑分析: ${faceStats.totalFaces}面 ` +
    `(Q:${faceStats.quadCount} T:${faceStats.triCount} N:${faceStats.ngonCount}) ` +
    `非流形:${nonManifold.count} 重叠:${overlapping.count} 边界边:${boundary.count} ` +
    `极点(≥6边):${poleStats.count} ` +
    `循环线:${edgeLoops?.loops.length ?? 0}`,
  )

  return { faceStats, nonManifold, overlapping, boundary, poleStats, vertexCount, density, edgeLoops }
}
