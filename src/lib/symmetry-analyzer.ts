import * as THREE from 'three'

// ═══════════════════════════════════════════════════════════════
// Spatial Grid — 快速最近邻查找
// ═══════════════════════════════════════════════════════════════

class SpatialGrid {
  private cellSize: number
  private cells = new Map<string, number[]>()
  private positions: Float32Array

  constructor(positions: Float32Array, cellSize: number) {
    this.positions = positions
    this.cellSize = Math.max(cellSize, 0.001)
    const count = (positions.length / 3) | 0
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      const key = this.key(positions[ix], positions[ix + 1], positions[ix + 2])
      let arr = this.cells.get(key)
      if (!arr) {
        arr = []
        this.cells.set(key, arr)
      }
      arr.push(i)
    }
  }

  private key(x: number, y: number, z: number): string {
    return `${(x / this.cellSize) | 0},${(y / this.cellSize) | 0},${(z / this.cellSize) | 0}`
  }

  /** 查找距离 (x,y,z) 最近的顶点的距离 */
  nearestDist(x: number, y: number, z: number): number {
    const [cx, cy, cz] = this.key(x, y, z).split(',').map(Number)
    let bestSq = Infinity
    // 搜索 3×3×3 = 27 个邻接格子
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cell = this.cells.get(`${cx + dx},${cy + dy},${cz + dz}`)
          if (!cell) continue
          const len = cell.length
          for (let ci = 0; ci < len; ci++) {
            const vi = cell[ci]
            const ix = vi * 3
            const ddx = this.positions[ix] - x
            const ddy = this.positions[ix + 1] - y
            const ddz = this.positions[ix + 2] - z
            const distSq = ddx * ddx + ddy * ddy + ddz * ddz
            if (distSq < bestSq) bestSq = distSq
          }
        }
      }
    }
    return Math.sqrt(bestSq)
  }
}

// ═══════════════════════════════════════════════════════════════
// 颜色渐变 — 绿→黄→红 热力图
// ═══════════════════════════════════════════════════════════════

type RGB = [number, number, number]

const COLOR_SYM: RGB = [0.15, 0.82, 0.25]   // 绿色 — 对称
const COLOR_MID: RGB = [1.0, 0.88, 0.08]    // 琥珀色 — 中等偏差
const COLOR_ASYM: RGB = [0.92, 0.12, 0.08]  // 红色 — 明显不对称

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function asymmetryToColor(t: number): RGB {
  // t: 0=完美对称, 1=严重不对称
  const clamped = Math.max(0, Math.min(1, t))
  if (clamped <= 0.5) return lerpRGB(COLOR_SYM, COLOR_MID, clamped * 2)
  return lerpRGB(COLOR_MID, COLOR_ASYM, (clamped - 0.5) * 2)
}

// ═══════════════════════════════════════════════════════════════
// 公共类型
// ═══════════════════════════════════════════════════════════════

export interface SymmetryHeatmapData {
  /** 合并后的模型几何体，带逐顶点颜色（绿→黄→红 热力图） */
  geometry: THREE.BufferGeometry
  /** 世界空间中的对称面 X 坐标 */
  centerX: number
  /** 模型最大维度尺寸 */
  modelSize: number
  /** 对称性统计数据 */
  stats: SymmetryStats
}

export interface SymmetryStats {
  /** 平均不对称距离 */
  meanAsymmetry: number
  /** 最大不对称距离 */
  maxAsymmetry: number
  /** 不对称距离低于阈值（2%模型尺寸）的顶点占比 */
  symmetricFraction: number
}

// ═══════════════════════════════════════════════════════════════
// 主计算函数
// ═══════════════════════════════════════════════════════════════

/**
 * 计算模型的对称性热力图。
 *
 * 算法：
 * 1. 收集所有子 Mesh 的世界空间顶点和三角面索引
 * 2. 计算包围盒，取 X 中心为 YZ 镜面
 * 3. 对每个顶点，将其 X 坐标关于镜面镜像，在空间网格中查找最近的
 *    现有顶点，距离 = 不对称度
 * 4. 归一化后映射到绿→黄→红渐变色
 * 5. 返回带顶点颜色的合并 BufferGeometry
 */
export function computeSymmetryHeatmap(model: THREE.Group): SymmetryHeatmapData | null {
  // 确保世界矩阵是最新的
  model.updateMatrixWorld()

  // ── 步骤 1：收集所有几何体数据（世界空间） ──
  const positionsArr: number[] = []
  const indicesArr: number[] = []
  let vertOffset = 0

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const geo = child.geometry
    if (!geo) return

    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute | undefined
    if (!posAttr || posAttr.count === 0) return

    const idxAttr = geo.getIndex()
    const worldMat = child.matrixWorld
    const v = new THREE.Vector3()

    for (let i = 0; i < posAttr.count; i++) {
      v.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
      v.applyMatrix4(worldMat)
      positionsArr.push(v.x, v.y, v.z)
    }

    if (idxAttr) {
      for (let i = 0; i < idxAttr.count; i++) {
        indicesArr.push(idxAttr.getX(i) + vertOffset)
      }
    } else {
      // 无索引 → 隐式三角形列表 (0,1,2, 3,4,5, ...)
      for (let i = 0; i < posAttr.count; i++) {
        indicesArr.push(i + vertOffset)
      }
    }

    vertOffset += posAttr.count
  })

  const vertexCount = positionsArr.length / 3
  if (vertexCount === 0) return null

  const positions = new Float32Array(positionsArr)
  const indices = new Uint32Array(indicesArr)

  // ── 步骤 2：计算包围盒和镜面位置 ──
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity
  for (let i = 0; i < positions.length; i += 3) {
    const px = positions[i]
    const py = positions[i + 1]
    const pz = positions[i + 2]
    if (px < minX) minX = px
    if (px > maxX) maxX = px
    if (py < minY) minY = py
    if (py > maxY) maxY = py
    if (pz < minZ) minZ = pz
    if (pz > maxZ) maxZ = pz
  }

  const centerX = (minX + maxX) / 2
  const modelSize = Math.max(maxX - minX, maxY - minY, maxZ - minZ)
  if (modelSize <= 0) return null

  // ── 步骤 3：构建空间网格 ──
  const cellSize = modelSize / 30
  const grid = new SpatialGrid(positions, cellSize)

  // ── 步骤 4：计算逐顶点不对称度 ──
  const asymmetry = new Float32Array(vertexCount)
  let sumAsym = 0
  let maxAsym = 0

  for (let i = 0; i < vertexCount; i++) {
    const ix = i * 3
    const mx = 2 * centerX - positions[ix] // 镜像 X 坐标
    const my = positions[ix + 1]
    const mz = positions[ix + 2]
    const dist = grid.nearestDist(mx, my, mz)
    asymmetry[i] = dist
    sumAsym += dist
    if (dist > maxAsym) maxAsym = dist
  }

  // ── 步骤 5：归一化 + 着色 ──
  const normMax = modelSize * 0.05 // 5% 模型尺寸 = 完全不对称
  const threshold = modelSize * 0.02 // 2% 以内算对称
  let symCount = 0

  const colors = new Float32Array(vertexCount * 3)
  for (let i = 0; i < vertexCount; i++) {
    const t = Math.min(asymmetry[i] / normMax, 1)
    const [r, g, b] = asymmetryToColor(t)
    const ci = i * 3
    colors[ci] = r
    colors[ci + 1] = g
    colors[ci + 2] = b
    if (asymmetry[i] < threshold) symCount++
  }

  // ── 步骤 6：构建输出几何体 ──
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()

  return {
    geometry: geo,
    centerX,
    modelSize,
    stats: {
      meanAsymmetry: sumAsym / vertexCount,
      maxAsymmetry: maxAsym,
      symmetricFraction: symCount / vertexCount,
    },
  }
}
