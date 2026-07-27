import { Grid } from '@react-three/drei'
import { LoadedModel } from './LoadedModel'
import { HighlightOverlay } from './HighlightOverlay'
import { SymmetryGuide } from './SymmetryGuide'
import { SyncedOrbitControls } from './SyncedOrbitControls'
import * as THREE from 'three'
import type { RenderMode } from '@/types/viewer'
import type { OBJFaceData } from '@/lib/model-parser'
import type { TopologyReport } from '@/lib/topology-analyzer'

interface CompareSceneProps {
  model: THREE.Group | null
  renderMode: RenderMode
  showGrid: boolean
  side: 'left' | 'center' | 'right'
  /** Material overrides */
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
  overlayModel,
  highlightAutoReport,
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

      {/* Structure comparison mode: dual-model overlay */}
      {overlayModel && model ? (
        <>
          {/* Base (reference/high-poly) model — always solid, normalized to overlay model's bounds */}
          <LoadedModel
            model={model}
            normalizationFrom={overlayModel}
            renderMode="solid"
            forceSolid
            objFaceData={null}
          />
          {/* Overlay (low-poly) model — 跟随 renderMode，工具栏切换线框/混合模式均可生效 */}
          <LoadedModel
            model={overlayModel}
            renderMode={renderMode}
            objFaceData={objFaceData}
            materialColor="#4a90d9"
            materialRoughness={0.3}
            opacity={0.55}
          />
        </>
      ) : (
        <>
          {/* Normal mode: single model */}
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
        </>
      )}

      {/* Highlight overlay — renders on both sides when highlightAutoReport is provided,
          otherwise falls back to legacy right-side-only behavior using evalStore */}
      {model && !overlayModel && (highlightAutoReport !== undefined
        ? highlightAutoReport !== null
        : side === 'right'
      ) && (
        <HighlightOverlay model={model} objFaceData={objFaceData} autoReportOverride={highlightAutoReport} />
      )}

      {/* Symmetry guide — only on center (low model) viewport */}
      {side === 'center' && <SymmetryGuide model={model} />}
    </>
  )
}
