import { useEffect, useRef } from 'react'
import { OrbitControls, Grid } from '@react-three/drei'
import { LoadedModel } from './LoadedModel'
import { HighlightOverlay } from './HighlightOverlay'
import { useHighlightStore } from '@/stores/highlightStore'
import { useModelStore } from '@/stores/modelStore'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { RenderMode } from '@/types/viewer'

interface ViewerSceneProps {
  model: THREE.Group | null
  renderMode: RenderMode
  showGrid: boolean
  cameraResetCounter: number
  onResetCamera: () => void
}

export function ViewerScene({
  model,
  renderMode,
  showGrid,
  cameraResetCounter,
}: ViewerSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const criterionId = useHighlightStore((s) => s.criterionId)
  const referenceModel = useModelStore((s) => s.referenceModel)

  const isStructureMode = criterionId === 'structure' && referenceModel !== null

  // Reset camera when counter changes
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
  }, [cameraResetCounter])

  return (
    <>
      {/* Lights — neutral studio lighting */}

      {/* Hemisphere light — soft sky/ground ambient */}
      <hemisphereLight
        args={['#e8ecf0', '#c8ccd0', 0.5]}
      />

      <ambientLight intensity={0.55} color="#ffffff" />

      {/* Key light — neutral white */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={2.8}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Fill light — cool gray */}
      <directionalLight
        position={[-3, 3, -3]}
        intensity={1.0}
        color="#d0d4d8"
      />

      {/* Rim light — warm gray */}
      <directionalLight
        position={[0, 2, -5]}
        intensity={1.2}
        color="#e8e4e0"
      />

      {/* Bottom bounce */}
      <directionalLight
        position={[0, -2, 0]}
        intensity={0.6}
        color="#d0d4d8"
      />

      {/* Orbit controls */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan
        screenSpacePanning
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.PAN,
          RIGHT: THREE.MOUSE.DOLLY,
        }}
        minDistance={0.5}
        maxDistance={50}
        target={[0, 0, 0]}
      />

      {/* Grid */}
      {showGrid && (
        <Grid
          position={[0, -2, 0]}
          cellSize={0.25}
          cellThickness={0.5}
          cellColor="#d2d2d7"
          sectionSize={1.25}
          sectionThickness={1}
          sectionColor="#aeaeb2"
          fadeDistance={120}
          infiniteGrid
          followCamera
        />
      )}

      {/* Structure comparison mode: dual-model overlay */}
      {isStructureMode ? (
        <>
          {/* Reference (high-poly) model — original material, normalized to low model's bounds */}
          {referenceModel && (
            <LoadedModel
              model={referenceModel}
              normalizationFrom={model}
              renderMode="solid"
              forceSolid
              objFaceData={null}
            />
          )}
          {/* Low-poly model — blue semi-transparent overlay */}
          {model && (
            <LoadedModel
              model={model}
              renderMode="solid"
              forceSolid
              materialColor="#4a90d9"
              materialRoughness={0.3}
              opacity={0.55}
            />
          )}
        </>
      ) : (
        <>
          {/* Normal mode: single model */}
          {model && <LoadedModel model={model} renderMode={renderMode} />}
        </>
      )}

      {/* Highlight overlay — only in normal mode */}
      {model && !isStructureMode && <HighlightOverlay model={model} singleModel />}
    </>
  )
}
