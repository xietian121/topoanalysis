import { useMemo } from 'react'
import * as THREE from 'three'
import type { ModelInfo } from '@/types/model'
import type { OBJFaceData } from '@/lib/model-parser'

interface ModelStats {
  vertexCount: number
  triangleCount: number
  meshCount: number
  bboxSize: THREE.Vector3
  materialCount: number
  /** Number of quad faces from OBJ face data */
  quadCount?: number
  /** Number of N-gon faces from OBJ face data */
  ngonCount?: number
}

interface ModelInfoOverlayProps {
  model: THREE.Group | null
  modelInfo: ModelInfo | null
  faceData?: OBJFaceData | null
  label: string
  labelDesc: string
}

function extractStats(model: THREE.Group, faceData?: OBJFaceData | null): ModelStats {
  let vertexCount = 0
  let triangleCount = 0
  let meshCount = 0
  const materials = new Set<THREE.Material>()
  const box = new THREE.Box3()

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    meshCount++

    const geo = child.geometry
    if (geo instanceof THREE.BufferGeometry) {
      const pos = geo.getAttribute('position')
      if (pos) vertexCount += pos.count
      const index = geo.getIndex()
      triangleCount += index ? index.count / 3 : pos ? pos.count / 3 : 0
    }

    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      mats.forEach((m) => materials.add(m))
    }

    // Compute per-mesh bbox and expand global bbox
    if (geo instanceof THREE.BufferGeometry) {
      geo.computeBoundingBox()
      if (geo.boundingBox) {
        box.expandByPoint(geo.boundingBox.min)
        box.expandByPoint(geo.boundingBox.max)
      }
    }
  })

  const bboxSize = new THREE.Vector3()
  box.getSize(bboxSize)

  const stats: ModelStats = {
    vertexCount,
    triangleCount: Math.floor(triangleCount),
    meshCount,
    bboxSize,
    materialCount: materials.size,
  }

  // Add OBJ face data stats if available
  if (faceData) {
    const allFaces = faceData.groups.flat()
    stats.quadCount = allFaces.filter((f) => f.length === 4).length
    stats.ngonCount = allFaces.filter((f) => f.length > 4).length
  }

  return stats
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function ModelInfoOverlay({ model, modelInfo, faceData, label, labelDesc }: ModelInfoOverlayProps) {
  const stats = useMemo(() => {
    if (!model) return null
    return extractStats(model, faceData)
  }, [model, faceData])

  if (!stats) return null

  const dim = stats.bboxSize

  // Vertical stat rows — rendered by hand for clarity
  const rows: { label: string; value: string }[] = [
    { label: '顶点', value: formatNum(stats.vertexCount) },
    { label: '三角面', value: formatNum(stats.triangleCount) },
    { label: '部件', value: formatNum(stats.meshCount) },
    { label: '材质', value: formatNum(stats.materialCount) },
    { label: '包围盒', value: `${dim.x.toFixed(2)} × ${dim.y.toFixed(2)} × ${dim.z.toFixed(2)}` },
  ]
  if (stats.quadCount !== undefined) {
    rows.push({ label: '四边面', value: stats.quadCount.toLocaleString() })
  }
  if (stats.ngonCount !== undefined && stats.ngonCount > 0) {
    rows.push({ label: 'N-gon', value: stats.ngonCount.toLocaleString() })
  }

  return (
    <div className="absolute top-2 left-2 z-50 pointer-events-none select-none">
      {/* Header */}
      <p className="text-[13px] font-bold text-black/70 leading-relaxed">
        {label}
        <span className="ml-1.5 text-[10px] font-normal text-black/40">{labelDesc}</span>
      </p>

      {/* Vertical stats */}
      <div className="mt-1 space-y-0">
        {rows.map((row) => (
          <p key={row.label} className="text-[12px] leading-relaxed">
            <span className="text-black/45">{row.label}</span>
            <span className="ml-2 text-black/70 font-medium mono tabular-nums">{row.value}</span>
          </p>
        ))}
      </div>
    </div>
  )
}
