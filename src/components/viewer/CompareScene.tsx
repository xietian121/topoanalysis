import { Grid } from '@react-three/drei'
import { LoadedModel } from './LoadedModel'
import { HighlightOverlay } from './HighlightOverlay'
import { SyncedOrbitControls } from './SyncedOrbitControls'
import * as THREE from 'three'
import type { RenderMode } from '@/types/viewer'
import type { OBJFaceData } from '@/lib/model-parser'

interface CompareSceneProps {
  model: THREE.Group | null
  renderMode: RenderMode
  showGrid: boolean
  side: 'left' | 'right'
  /** Material overrides */
  materialColor?: string
  materialRoughness?: number
  materialMetalness?: number
  objFaceData?: OBJFaceData | null
  forceSolid?: boolean
}

export function CompareScene({
  model,
  renderMode,
  showGrid,
  side,
  materialColor,
  materialRoughness,
  materialMetalness,
  objFaceData,
  forceSolid,
}: CompareSceneProps) {
  return (
    <>
      {/* Lights — neutral studio lighting */}
      <hemisphereLight args={['#e8ecf0', '#c8ccd0', 0.5]} />
      <ambientLight intensity={0.55} color="#ffffff" />

      <directionalLight
        position={[5, 8, 5]}
        intensity={2.8}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 3, -3]} intensity={1.0} color="#d0d4d8" />
      <directionalLight position={[0, 2, -5]} intensity={1.2} color="#e8e4e0" />
      <directionalLight position={[0, -2, 0]} intensity={0.6} color="#d0d4d8" />

      {/* Synced orbit controls */}
      <SyncedOrbitControls side={side} />

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

      {/* Model */}
      {model && (
        <LoadedModel
          model={model}
          renderMode={renderMode}
          objFaceData={objFaceData}
          materialColor={materialColor}
          materialRoughness={materialRoughness}
          materialMetalness={materialMetalness}
          forceSolid={forceSolid}
        />
      )}

      {/* Highlight overlay — only on low-poly (right) side */}
      {side === 'right' && model && (
        <HighlightOverlay model={model} objFaceData={objFaceData} />
      )}
    </>
  )
}
