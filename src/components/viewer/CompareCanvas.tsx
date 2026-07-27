import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Loader } from '@react-three/drei'
import { CompareScene } from './CompareScene'
import * as THREE from 'three'
import type { RenderMode } from '@/types/viewer'
import type { OBJFaceData } from '@/lib/model-parser'
import type { TopologyReport } from '@/lib/topology-analyzer'

interface CompareCanvasProps {
  model: THREE.Group | null
  renderMode: RenderMode
  showGrid: boolean
  side: 'left' | 'right'
  materialColor?: string
  materialRoughness?: number
  materialMetalness?: number
  objFaceData?: OBJFaceData | null
  forceSolid?: boolean
  /** 结构跟随性叠加模式：在此 model 上方叠加半透明低模 */
  overlayModel?: THREE.Group | null
  /** External autoReport for highlight overlay (multi-viewport comparison) */
  highlightAutoReport?: TopologyReport | null
}

export function CompareCanvas({
  model,
  renderMode,
  showGrid,
  side,
  materialColor,
  materialRoughness,
  materialMetalness,
  objFaceData,
  forceSolid,
  overlayModel,
  highlightAutoReport,
}: CompareCanvasProps) {
  return (
    <div className="relative w-full h-full bg-[#e8e8ed]">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        style={{ background: '#e8e8ed' }}
      >
        <Suspense fallback={null}>
          <CompareScene
            model={model}
            renderMode={renderMode}
            showGrid={showGrid}
            side={side}
            materialColor={materialColor}
            materialRoughness={materialRoughness}
            materialMetalness={materialMetalness}
            objFaceData={objFaceData}
            forceSolid={forceSolid}
            overlayModel={overlayModel}
            highlightAutoReport={highlightAutoReport}
          />
        </Suspense>
      </Canvas>
      <Loader
        containerStyles={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(20px)',
        }}
        dataStyles={{ color: '#8e8e93', fontSize: '12px' }}
        barStyles={{ background: '#8e8e93' }}
      />
      {!model && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-text-tertiary">等待模型加载...</p>
        </div>
      )}
      {/* 操作提示 */}
      {model && (
        <div className="absolute bottom-2 left-2.5 pointer-events-none select-none">
          <p className="text-[12px] text-black/55 whitespace-nowrap leading-tight tracking-wide">
            ◉ 旋转 <span className="text-black/20 mx-1">·</span> ↕ 缩放 <span className="text-black/20 mx-1">·</span> ⊚ 平移
          </p>
        </div>
      )}
    </div>
  )
}
