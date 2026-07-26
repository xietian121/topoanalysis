import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import type { ModelStats } from '@/types/model'

/**
 * Parse an OBJ file and return a THREE.Group
 */
export async function parseOBJFile(file: File): Promise<THREE.Group> {
  const text = await file.text()
  const loader = new OBJLoader()

  return new Promise((resolve, reject) => {
    try {
      const group = loader.parse(text)
      resolve(group)
    } catch (err) {
      reject(new Error(`OBJ 文件解析失败: ${err instanceof Error ? err.message : '未知错误'}`))
    }
  })
}

export interface OBJFaceData {
  groups: number[][][] // per-group: per-face: [vIdx0, vIdx1, vIdx2, vIdx3, ...]
  positions: number[]  // flat float array of all vertex positions
}

/**
 * Parse raw OBJ text to extract original face definitions and vertex positions.
 * Groups faces by mesh (separated by o/g/usemtl commands).
 * Vertex indices are 0-based.
 */
export function extractOBJFaceData(text: string): OBJFaceData {
  const positions: number[] = []
  const groups: number[][][] = []
  let currentFaces: number[][] = []

  const lines = text.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const parts = line.split(/\s+/)
    const cmd = parts[0].toLowerCase()

    if (cmd === 'v') {
      // v x y z [w]
      positions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]))
    } else if (cmd === 'f') {
      // f v1[/vt1][/vn1] v2[/vt2][/vn2] v3[/vt3][/vn3] [v4...]
      const indices: number[] = []
      for (let i = 1; i < parts.length; i++) {
        const vStr = parts[i].split('/')[0] // vertex index is before first /
        const vIdx = parseInt(vStr, 10)
        // Convert to 0-based: positive stays, negative is relative to current vertex count
        indices.push(vIdx > 0 ? vIdx - 1 : positions.length / 3 + vIdx)
      }
      if (indices.length >= 3) {
        currentFaces.push(indices)
      }
    } else if (cmd === 'o' || cmd === 'g' || cmd === 'usemtl') {
      // Group separator — flush current face group
      if (currentFaces.length > 0) {
        groups.push(currentFaces)
        currentFaces = []
      }
    }
  }

  // Flush last group
  if (currentFaces.length > 0) {
    groups.push(currentFaces)
  }

  // If no group markers found, all faces belong to one group
  if (groups.length === 0 && currentFaces.length === 0) {
    // Edge case: no faces at all
    return { groups: [], positions }
  }

  return { groups, positions }
}

/**
 * Parse an FBX file and return a THREE.Group
 */
export async function parseFBXFile(file: File): Promise<THREE.Group> {
  const buffer = await file.arrayBuffer()
  const loader = new FBXLoader()

  return new Promise((resolve, reject) => {
    try {
      const group = loader.parse(buffer, '')
      resolve(group)
    } catch (err) {
      reject(
        new Error(
          `FBX 文件解析失败（FBX 为实验性支持）: ${err instanceof Error ? err.message : '未知错误'}`,
        ),
      )
    }
  })
}

/**
 * Build a quad-aware wireframe from a triangulated BufferGeometry.
 *
 * For each edge shared by exactly 2 triangles: if the two triangles are coplanar
 * (angle between normals < threshold), the edge is a quad diagonal → HIDE it.
 * All other edges → SHOW.
 *
 * This reconstructs the original quad topology from triangulated geometry
 * without needing access to the source file's polygon data.
 */
export function buildQuadWireframe(geometry: THREE.BufferGeometry): THREE.LineSegments {
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
  const indexAttr = geometry.getIndex()

  const vertexCount = posAttr.count
  const positions = new Float32Array(posAttr.array)

  // Build triangle list (3 indices per triangle)
  let triangles: number[][]
  if (indexAttr) {
    const idx = indexAttr.array
    triangles = []
    for (let i = 0; i < indexAttr.count; i += 3) {
      triangles.push([idx[i], idx[i + 1], idx[i + 2]])
    }
  } else {
    triangles = []
    for (let i = 0; i < vertexCount; i += 3) {
      triangles.push([i, i + 1, i + 2])
    }
  }

  // Map edge key → list of triangle indices that share this edge
  const edgeMap = new Map<string, number[]>()
  for (let t = 0; t < triangles.length; t++) {
    const [a, b, c] = triangles[t]
    const edges = [[a, b], [b, c], [c, a]]
    for (const [v0, v1] of edges) {
      const key = v0 < v1 ? `${v0}:${v1}` : `${v1}:${v0}`
      const list = edgeMap.get(key)
      if (list) list.push(t)
      else edgeMap.set(key, [t])
    }
  }

  // Compute triangle normals (cached)
  function getNormal(triIdx: number): THREE.Vector3 {
    const [a, b, c] = triangles[triIdx]
    const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2]
    const bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2]
    const cx = positions[c * 3], cy = positions[c * 3 + 1], cz = positions[c * 3 + 2]
    const u = new THREE.Vector3(bx - ax, by - ay, bz - az)
    const v = new THREE.Vector3(cx - ax, cy - ay, cz - az)
    return u.cross(v).normalize()
  }

  // For each edge, decide whether to show it
  const linePositions: number[] = []
  const COPLANAR_THRESHOLD = 0.9998 // cos(1.15°) — nearly parallel normals

  for (const [key, triList] of edgeMap) {
    if (triList.length === 2) {
      // Internal edge — check coplanarity
      const n1 = getNormal(triList[0])
      const n2 = getNormal(triList[1])
      const dot = Math.abs(n1.dot(n2))
      if (dot >= COPLANAR_THRESHOLD) {
        // Coplanar → quad diagonal → skip
        continue
      }
    }
    // Show this edge (boundary, non-manifold, or non-coplanar internal edge)
    const [i0, i1] = key.split(':').map(Number)
    linePositions.push(
      positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2],
      positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2],
    )
  }

  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x222222,
    transparent: true,
    opacity: 0.55,
    depthTest: true,
    depthWrite: false,
  })
  const lines = new THREE.LineSegments(lineGeo, lineMat)
  lines.renderOrder = 1
  return lines
}

/**
 * Extract face-quality statistics from a THREE.Group
 */
export function extractModelStats(object: THREE.Group): ModelStats {
  let vertexCount = 0
  let faceCount = 0
  let triangleCount = 0
  let quadCount = 0
  let ngonCount = 0

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    const geometry = child.geometry
    if (!(geometry instanceof THREE.BufferGeometry)) return

    const posAttr = geometry.getAttribute('position')
    if (posAttr) {
      vertexCount += posAttr.count
    }

    const index = geometry.getIndex()

    if (index) {
      const triCount = index.count / 3
      faceCount += triCount
      triangleCount += triCount
    } else if (posAttr) {
      const triCount = posAttr.count / 3
      faceCount += triCount
      triangleCount += triCount
    }
  })

  return {
    vertexCount,
    faceCount,
    triangleCount,
    quadCount,
    ngonCount,
  }
}
