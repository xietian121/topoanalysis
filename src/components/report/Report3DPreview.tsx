import { useEffect, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Loader, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { LoadedModel } from '@/components/viewer/LoadedModel'
import { HighlightOverlay } from '@/components/viewer/HighlightOverlay'
import { useModelStore } from '@/stores/modelStore'
import { useHighlightStore } from '@/stores/highlightStore'
import { useLoadingStore } from '@/stores/loadingStore'
import type { EvalHistoryRecord } from '@/stores/evalHistoryStore'
import type { OBJFaceData } from '@/lib/model-parser'

interface Report3DPreviewProps {
  record: EvalHistoryRecord
}

function ReportScene({ modelLoaded, faceData }: {
  modelLoaded: boolean
  faceData: OBJFaceData | null
}) {
  const criterionId = useHighlightStore((s) => s.criterionId)

  return (
    <>
      <hemisphereLight args={['#e8ecf0', '#c8ccd0', 0.5]} />
      <ambientLight intensity={0.55} color="#ffffff" />
      <directionalLight position={[5, 8, 5]} intensity={2.8} color="#ffffff" />
      <directionalLight position={[-3, 3, -3]} intensity={1.0} color="#d0d4d8" />
      <directionalLight position={[0, 2, -5]} intensity={1.2} color="#e8e4e0" />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.5}
        maxDistance={50}
        target={[0, 0, 0]}
        autoRotate
        autoRotateSpeed={0.5}
      />

      {modelLoaded && (
        <LoadedModel
          model={useModelStore.getState().modelObject!}
          renderMode="solid"
          objFaceData={faceData}
          forceSolid
        />
      )}

      {modelLoaded && criterionId && (
        <HighlightOverlay
          model={useModelStore.getState().modelObject!}
          objFaceData={faceData}
        />
      )}
    </>
  )
}

export function Report3DPreview({ record }: Report3DPreviewProps) {
  const [modelReady, setModelReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  const modelObject = useModelStore((s) => s.modelObject)
  const currentModel = useModelStore((s) => s.currentModel)
  const objFaceData = useModelStore((s) => s.objFaceData)

  // Check if model is already loaded in current session
  const alreadyLoaded = modelObject !== null && currentModel?.name === record.modelName

  useEffect(() => {
    if (alreadyLoaded) {
      setModelReady(true)
      return
    }

    if (loadingRef.current) return

    // Try loading from URL (example models) or modelText (user models)
    const loadModel = async () => {
      loadingRef.current = true
      setLoading(true)
      setError(null)

      try {
        const { loadModelFromUrl, loadModelFromText } = useModelStore.getState()
        const { startLoading, setProgress, finishLoading } = useLoadingStore.getState()

        if (record.modelUrl) {
          startLoading()
          await loadModelFromUrl(record.modelUrl, record.modelName, {
            onProgress: (progress, stage, text) => {
              setProgress(progress, stage as 'download' | 'parse' | 'analyze' | 'init' | 'done', text)
            },
          })
          finishLoading()
        } else if (record.modelText) {
          startLoading()
          await loadModelFromText(record.modelText, record.modelName, record.modelFileSize, {
            onProgress: (progress, stage, text) => {
              setProgress(progress, stage as 'download' | 'parse' | 'analyze' | 'init' | 'done', text)
            },
          })
          finishLoading()
        } else {
          setError('模型数据不可用')
          return
        }

        setModelReady(true)
      } catch (err) {
        console.error('Report3DPreview load error:', err)
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    }

    loadModel()
  }, [record, alreadyLoaded])

  const faceData = alreadyLoaded ? objFaceData : useModelStore.getState().objFaceData

  return (
    <div className="relative w-full h-[300px] rounded-2xl overflow-hidden bg-[#e8e8ed] border border-black/5">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="text-center space-y-2">
            <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[12px] text-text-tertiary">加载模型预览...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-[13px] text-text-tertiary">3D 预览不可用</p>
            <p className="text-[11px] text-text-tertiary/60">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && !modelReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[13px] text-text-tertiary">无模型数据</p>
        </div>
      )}

      <Canvas
        camera={{ position: [5, 5, 5], fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        style={{ background: '#e8e8ed' }}
      >
        <ReportScene modelUrl={record.modelUrl} modelLoaded={modelReady} faceData={faceData} />
      </Canvas>
      <Loader
        containerStyles={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(20px)',
        }}
        dataStyles={{ color: '#8e8e93', fontSize: '12px' }}
        barStyles={{ background: '#8e8e93' }}
      />
    </div>
  )
}
