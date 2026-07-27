import { useMemo } from 'react'
import * as THREE from 'three'
import type { ModelInfo } from '@/types/model'
import type { OBJFaceData } from '@/lib/model-parser'

interface ModelStats {
  vertexCount: number
  triangleCount: number
  quadCount: number
  meshCount: number
  bboxSize: THREE.Vector3
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
  let meshCount = 0
  const box = new THREE.Box3()

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    meshCount++

    const geo = child.geometry
    if (geo instanceof THREE.BufferGeometry) {
      const pos = geo.getAttribute('position')
      if (pos) vertexCount += pos.count
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

  // Use OBJ face data for accurate face-type counts when available
  let triangleCount = 0
  let quadCount = 0

  if (faceData) {
    const allFaces = faceData.groups.flat()
    triangleCount = allFaces.filter((f) => f.length === 3).length
    quadCount = allFaces.filter((f) => f.length === 4).length
  } else {
    // Fallback: count triangulated faces from geometry
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const geo = child.geometry
      if (geo instanceof THREE.BufferGeometry) {
        const pos = geo.getAttribute('position')
        const index = geo.getIndex()
        triangleCount += index ? index.count / 3 : pos ? pos.count / 3 : 0
      }
    })
    triangleCount = Math.floor(triangleCount)
  }

  return { vertexCount, triangleCount, quadCount, meshCount, bboxSize }
}

export function ModelInfoOverlay({ model, modelInfo: _modelInfo, faceData, label, labelDesc }: ModelInfoOverlayProps) {
  const stats = useMemo(() => {
    if (!model) return null
    return extractStats(model, faceData)
  }, [model, faceData])

  if (!stats) return null

  const dim = stats.bboxSize

  // Vertical stat rows — ordered per user spec:
  // 顶点 → 三角面 → 四边面 → 包围盒(宽×高×深) → 部件数
  const rows: { label: string; value: string }[] = [
    { label: '顶点', value: stats.vertexCount.toLocaleString() },
    { label: '三角面', value: stats.triangleCount.toLocaleString() },
    { label: '四边面', value: stats.quadCount.toLocaleString() },
    { label: '包围盒', value: `${dim.x.toFixed(2)}cm 宽 × ${dim.y.toFixed(2)}cm 高 × ${dim.z.toFixed(2)}cm 深` },
    { label: '部件数', value: stats.meshCount.toLocaleString() },
  ]

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
