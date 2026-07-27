import { useMemo } from 'react'
import * as THREE from 'three'
import { useViewerStore } from '@/stores/viewerStore'

// ═══════════════════════════════════════════════════════════════
// 归一化计算 — 与 LoadedModel / HighlightOverlay 保持一致
// ═══════════════════════════════════════════════════════════════

function getModelNormalization(model: THREE.Group, groundY?: number): {
  position: [number, number, number]
  scale: number
} {
  const box = new THREE.Box3().setFromObject(model)
  const center = new THREE.Vector3()
  box.getCenter(center)
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)

  let scale = 1
  if (maxDim > 0 && maxDim < 0.5) scale = 4 / maxDim
  else if (maxDim > 20) scale = 4 / maxDim

  let posY = -center.y
  if (groundY !== undefined) {
    posY = -center.y + groundY / scale + size.y / 2
  }

  return {
    position: [-center.x, posY, -center.z],
    scale,
  }
}

// ═══════════════════════════════════════════════════════════════
// 组件
// ═══════════════════════════════════════════════════════════════

interface SymmetryGuideProps {
  model: THREE.Group | null
  /** Place model bottom at this Y. Must match LoadedModel's groundY. */
  groundY?: number
}

/**
 * 对称性参考面组件。
 *
 * 在模型的 X 轴中心位置渲染一个贯穿前后的绿色半透明 YZ 面片，
 * 用于直观界定模型的左右侧，辅助判断拓扑结构是否左右对称。
 *
 * 面片规格：
 * - 位置：模型包围盒的 X 中心（归一化后为原点）
 * - 朝向：YZ 平面（垂直于 X 轴）
 * - 颜色：绿色 #22c55e
 * - 透明度：80%（opacity 0.2）
 * - 尺寸：模型 YZ 范围 × 1.6
 */
export function SymmetryGuide({ model, groundY }: SymmetryGuideProps) {
  const showSymmetry = useViewerStore((s) => s.settings.showSymmetry)

  // ── 归一化变换（与 LoadedModel 一致） ──
  const normalization = useMemo(() => {
    if (!model) return null
    return getModelNormalization(model, groundY)
  }, [model, groundY])

  // ── 面片尺寸（基于模型 YZ 范围） ──
  const planeSize = useMemo(() => {
    if (!model) return 6
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    box.getSize(size)
    return Math.max(size.y, size.z) * 2.5
  }, [model])

  if (!showSymmetry || !model || !normalization) return null

  return (
    <group scale={normalization.scale}>
      <group position={normalization.position}>
        {/* YZ 对称参考面 — 80% 透明绿色 */}
        <mesh
          position={[0, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          renderOrder={1}
        >
          <planeGeometry args={[planeSize, planeSize]} />
          <meshBasicMaterial
            color="#22c55e"
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthTest
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-5}
            polygonOffsetUnits={-5}
          />
        </mesh>
      </group>
    </group>
  )
}
