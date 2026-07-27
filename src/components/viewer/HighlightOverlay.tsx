import { useMemo } from 'react'
import * as THREE from 'three'
import { useHighlightStore } from '@/stores/highlightStore'
import { useEvalStore } from '@/stores/evalStore'
import { useModelStore } from '@/stores/modelStore'
import { useCompareStore } from '@/stores/compareStore'
import { getHighlightData } from '@/lib/highlight-data'
import type { OBJFaceData } from '@/lib/model-parser'

interface HighlightOverlayProps {
  /** Model to highlight on */
  model: THREE.Group | null
  /** OBJ face data (for face-based highlights) */
  objFaceData?: OBJFaceData | null
  /** If true, read model from modelStore (single view), else from compareStore (low model) */
  singleModel?: boolean
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  'quad-tri-ratio': '#ff9500',   // orange — tri faces
  'tri-distribution': '#ff9500',  // orange — tri faces
  'ngon-count': '#ff3b30',        // red — N-gon faces
  'overlapping': '#af52de',       // purple — overlapping faces
  'pole-distribution': '#ff3b30', // red — pole markers (high contrast)
  'non-manifold': '#ff3b30',      // red — non-manifold edges
  'boundary-holes': '#ff3b30',    // red — boundary/hole edges (x-ray)
  'density': '#4a90d9',           // blue accent — vertex colors override this
  'loop-edges': '#34c759',        // green — edge loops
}

/** Criteria whose edge lines should render through the model (depthTest: false) */
const XRAY_CRITERIA = new Set(['boundary-holes'])

// Cached circular texture for pole point markers
let circleTexture: THREE.Texture | null = null
function getCircleTexture(): THREE.Texture {
  if (circleTexture) return circleTexture
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.7, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.85, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.86, 'rgba(255,255,255,0)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  circleTexture = new THREE.CanvasTexture(canvas)
  circleTexture.needsUpdate = true
  return circleTexture
}

/**
 * Compute the same centering + scaling transform that LoadedModel applies.
 * This ensures highlight geometry aligns with the rendered model.
 */
function getModelNormalization(model: THREE.Group): {
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

  return {
    position: [-center.x, -center.y, -center.z],
    scale,
  }
}

export function HighlightOverlay({ model, objFaceData, singleModel }: HighlightOverlayProps) {
  const criterionId = useHighlightStore((s) => s.criterionId)
  const autoReport = useEvalStore((s) => s.autoReport)
  const singleObjFaceData = useModelStore((s) => s.objFaceData)
  const singleModelObject = useModelStore((s) => s.modelObject)
  const lowModel = useCompareStore((s) => s.lowModel)

  // Resolve which model and faceData to use
  const effectiveModel = model ?? (singleModel ? singleModelObject : lowModel.object)
  const effectiveFaceData = objFaceData !== undefined ? objFaceData : (singleModel ? singleObjFaceData : lowModel.faceData)

  // Compute the same normalization transform that LoadedModel uses
  const normalization = useMemo(() => {
    if (!effectiveModel) return null
    return getModelNormalization(effectiveModel)
  }, [effectiveModel])

  const data = useMemo(() => {
    console.log('[Highlight] criterionId:', criterionId, 'model:', !!effectiveModel, 'faceData:', !!effectiveFaceData, 'report:', !!autoReport)
    if (!criterionId || !effectiveModel || !autoReport) return null
    const result = getHighlightData(criterionId, effectiveModel, effectiveFaceData ?? null, autoReport)
    console.log('[Highlight] getHighlightData result:', result ? { faces: !!result.faces, points: !!result.points, lines: !!result.lines } : null)
    return result
  }, [criterionId, effectiveModel, effectiveFaceData, autoReport])

  const color = criterionId ? (HIGHLIGHT_COLORS[criterionId] ?? '#ff9500') : '#ff9500'

  // Face highlight geometry
  const faceGeo = useMemo(() => {
    if (!data?.faces || !data.vertexPositions) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.vertexPositions, 3))
    g.setIndex(new THREE.BufferAttribute(data.faces.indices, 1))
    // Add per-vertex colors for density gradient
    if (data.vertexColors) {
      g.setAttribute('color', new THREE.BufferAttribute(data.vertexColors, 3))
    }
    g.computeVertexNormals()
    console.log('[Highlight] faceGeo created — verts:', data.vertexPositions.length / 3, 'indices:', data.faces.indices.length, 'triangles:', data.faces.indices.length / 3, 'vertexColors:', !!data.vertexColors)
    return g
  }, [data])

  // Line geometry for edges
  const lineGeo = useMemo(() => {
    if (!data?.lines) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(data.lines.positions, 3))
    return g
  }, [data])

  // Log normalization and data summary
  console.log('[Highlight] Render decision — criterionId:', criterionId, 'hasData:', !!data, 'hasNorm:', !!normalization, 'hasFaceGeo:', !!faceGeo, 'hasLineGeo:', !!lineGeo, 'hasPoints:', !!data?.points, 'normalization:', normalization)

  if (!criterionId || !data || !normalization) return null

  // Match LoadedModel's two-level transform: outer scale → inner translation
  // LoadedModel: root(scale) → clone(position=-center) → geometry
  // World pos = scale * (vertex - center) = scale * vertex - scale * center
  return (
    <group scale={normalization.scale}>
      <group position={normalization.position}>
        {/* Face highlights */}
        {faceGeo && (
          <mesh
            geometry={faceGeo}
            renderOrder={1}
          >
            <meshBasicMaterial
              color={data.vertexColors ? undefined : color}
              vertexColors={!!data.vertexColors}
              transparent
              opacity={criterionId === 'density' ? 0.65 : 0.5}
              side={THREE.DoubleSide}
              depthTest
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-10}
              polygonOffsetUnits={-10}
            />
          </mesh>
        )}

        {/* Pole point markers + edge lines — micro-scaled outward to avoid z-fighting */}
        {(data.points || lineGeo) && (
          <group scale={[1.002, 1.002, 1.002]}>
            {/* Pole point markers */}
            {data.points && (
              <points>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[data.points.positions, 3]}
                  />
                </bufferGeometry>
                <pointsMaterial
                  color={color}
                  size={0.048}
                  sizeAttenuation
                  map={getCircleTexture()}
                  transparent
                  depthTest
                  depthWrite={false}
                />
              </points>
            )}

            {/* Edge lines (non-manifold / edge loops / boundary holes) */}
            {lineGeo && (
              <lineSegments geometry={lineGeo} renderOrder={1}>
                <lineBasicMaterial
                  color={color}
                  linewidth={2}
                  depthTest={!XRAY_CRITERIA.has(criterionId)}
                  depthWrite={false}
                  transparent
                  opacity={0.9}
                />
              </lineSegments>
            )}
          </group>
        )}
      </group>
    </group>
  )
}
