import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Loader } from '@react-three/drei'
import { ViewerScene } from './ViewerScene'
import { ModelInfoOverlay } from './ModelInfoOverlay'
import { useModelStore } from '@/stores/modelStore'
import { useViewerStore } from '@/stores/viewerStore'
import * as THREE from 'three'

export function ViewerCanvas() {
  const modelObject = useModelStore((s) => s.modelObject)
  const currentModel = useModelStore((s) => s.currentModel)
  const objFaceData = useModelStore((s) => s.objFaceData)
  const renderMode = useViewerStore((s) => s.settings.renderMode)
  const showGrid = useViewerStore((s) => s.settings.showGrid)
  const cameraResetCounter = useViewerStore((s) => s.cameraResetCounter)
  const resetCamera = useViewerStore((s) => s.resetCamera)

  return (
    <div className="relative w-full h-full min-h-[400px] bg-[#e8e8ed]">
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
          <ViewerScene
            model={modelObject}
            renderMode={renderMode}
            showGrid={showGrid}
            cameraResetCounter={cameraResetCounter}
            onResetCamera={resetCamera}
          />
        </Suspense>
      </Canvas>
      <Loader
        containerStyles={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(20px)',
        }}
        dataStyles={{
          color: '#8e8e93',
          fontSize: '12px',
        }}
        barStyles={{
          background: '#8e8e93',
        }}
      />

      {/* Fallback when no model */}
      {!modelObject && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-text-tertiary">加载模型后在此处预览</p>
        </div>
      )}

      {/* Model info overlay */}
      {modelObject && (
        <ModelInfoOverlay
          model={modelObject}
          modelInfo={currentModel}
          faceData={objFaceData}
          label="模型"
          labelDesc="统计信息"
        />
      )}

      {/* 操作提示 */}
      {modelObject && (
        <div className="absolute bottom-2 left-2.5 pointer-events-none select-none">
          <p className="text-[12px] text-black/55 whitespace-nowrap leading-tight tracking-wide">
            ◉ 旋转 <span className="text-black/20 mx-1">·</span> ↕ 缩放 <span className="text-black/20 mx-1">·</span> ⊚ 平移
          </p>
        </div>
      )}
    </div>
  )
}
