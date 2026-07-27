import { useMemo } from 'react'
import * as THREE from 'three'
import { useViewerStore } from '@/stores/viewerStore'

interface SymmetryGuideProps {
  /** Model to show symmetry plane for */
  model: THREE.Group | null
}

/**
 * 对称性辅助面 — 在模型中心渲染半透明 YZ 镜面
 * 帮助建模师目测拓扑结构的左右对称性
 */
export function SymmetryGuide({ model }: SymmetryGuideProps) {
  const showSymmetry = useViewerStore((s) => s.settings.showSymmetry)

  // 计算模型包围盒中心 X，用于定位对称面
  const centerX = useMemo(() => {
    if (!model) return 0
    const box = new THREE.Box3().setFromObject(model)
    const center = new THREE.Vector3()
    box.getCenter(center)
    return center.x
  }, [model])

  // 对称面高度（基于模型尺寸）
  const planeSize = useMemo(() => {
    if (!model) return 6
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    box.getSize(size)
    return Math.max(size.y, size.z) * 1.4
  }, [model])

  if (!showSymmetry || !model) return null

  return (
    <mesh
      position={[centerX, 0, 0]}
      rotation={[0, Math.PI / 2, 0]}
      renderOrder={2}
    >
      <planeGeometry args={[planeSize, planeSize]} />
      <meshBasicMaterial
        color="#4dc9f6"
        transparent
        opacity={0.22}
        side={THREE.DoubleSide}
        depthTest
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-5}
        polygonOffsetUnits={-5}
      />
    </mesh>
  )
}
