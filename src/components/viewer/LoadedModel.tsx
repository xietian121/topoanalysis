import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useViewerStore } from '@/stores/viewerStore'
import { useModelStore } from '@/stores/modelStore'
import { buildQuadWireframe } from '@/lib/model-parser'
import type { RenderMode } from '@/types/viewer'
import type { OBJFaceData } from '@/lib/model-parser'

interface LoadedModelProps {
  model: THREE.Group
  renderMode: RenderMode
  /** OBJ face data for wireframe. undefined → read from store; null → skip wireframe entirely */
  objFaceData?: OBJFaceData | null
  /** Material overrides. undefined → read from viewerStore */
  materialColor?: string
  materialRoughness?: number
  materialMetalness?: number
  /** Force solid-only rendering (ignores renderMode). For high-poly reference model. */
  forceSolid?: boolean
  /** Material opacity. undefined → default 1.0 */
  opacity?: number
  /** Use this model's bounding box for centering+scaling instead of own */
  normalizationFrom?: THREE.Group | null
  /** Place model bottom at this Y position (disables geometric Y-centering). Default: center at origin. */
  groundY?: number
}

function buildLinesFromOBJ(faces: number[][], globalPositions: number[]): THREE.LineSegments {
  const vertexCount = globalPositions.length / 3
  const edgeSet = new Set<string>()
  const linePositions: number[] = []

  for (const face of faces) {
    const n = face.length
    for (let i = 0; i < n; i++) {
      const a = face[i]
      const b = face[(i + 1) % n]
      if (a >= vertexCount || b >= vertexCount) continue
      const key = a < b ? `${a}:${b}` : `${b}:${a}`
      if (edgeSet.has(key)) continue
      edgeSet.add(key)
      linePositions.push(
        globalPositions[a * 3], globalPositions[a * 3 + 1], globalPositions[a * 3 + 2],
        globalPositions[b * 3], globalPositions[b * 3 + 1], globalPositions[b * 3 + 2],
      )
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
  const mat = new THREE.LineBasicMaterial({
    color: 0x222222,
    transparent: true,
    opacity: 0.55,
    depthTest: true,
    depthWrite: false,
  })
  const lines = new THREE.LineSegments(geo, mat)
  lines.renderOrder = 1
  return lines
}

export function LoadedModel({
  model,
  renderMode,
  objFaceData: propFaceData,
  materialColor: propColor,
  materialRoughness: propRoughness,
  materialMetalness: propMetalness,
  forceSolid,
  opacity,
  normalizationFrom,
  groundY,
}: LoadedModelProps) {
  const storeColor = useViewerStore((s) => s.settings.materialColor)
  const storeRoughness = useViewerStore((s) => s.settings.materialRoughness)
  const storeMetalness = useViewerStore((s) => s.settings.materialMetalness)
  const storeFaceData = useModelStore((s) => s.objFaceData)

  // Resolve props: use provided or fall back to store
  const materialColor = propColor ?? storeColor
  const materialRoughness = propRoughness ?? storeRoughness
  const materialMetalness = propMetalness ?? storeMetalness
  const objFaceData = propFaceData !== undefined ? propFaceData : storeFaceData

  const showSolid = forceSolid ? true : (renderMode === 'solid' || renderMode === 'wireframe-solid')
  const showWire = forceSolid ? false : (renderMode === 'wireframe' || renderMode === 'wireframe-solid')

  const centeredModel = useMemo(() => {
    const clone = model.clone(true)
    // Use normalizationFrom's bounding box if provided, else own
    const normSource = normalizationFrom ?? clone
    const box = new THREE.Box3().setFromObject(normSource)
    const center = new THREE.Vector3()
    box.getCenter(center)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)

    let s = 1
    if (maxDim > 0 && maxDim < 0.5) s = 4 / maxDim
    else if (maxDim > 20) s = 4 / maxDim

    // Y: if groundY provided and not overlay mode, place model bottom on groundY
    let posY = -center.y
    if (!normalizationFrom && groundY !== undefined) {
      posY = -center.y + groundY / s + size.y / 2
    }

    const root = new THREE.Group()
    root.name = 'ModelRoot'
    clone.position.set(-center.x, posY, -center.z)
    root.add(clone)

    if (s !== 1) root.scale.setScalar(s)

    return root
  }, [model, normalizationFrom, groundY])

  // Solid material
  useEffect(() => {
    centeredModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material) {
          const oldMats = Array.isArray(child.material) ? child.material : [child.material]
          oldMats.forEach((m) => m.dispose())
        }
        child.material = new THREE.MeshStandardMaterial({
          color: materialColor,
          roughness: materialRoughness,
          metalness: materialMetalness,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
          visible: showSolid,
          transparent: opacity !== undefined && opacity < 1,
          opacity: opacity ?? 1,
        })
      }
    })
  }, [centeredModel, materialColor, materialRoughness, materialMetalness, showSolid])

  // Wireframe lines
  useEffect(() => {
    // Remove old lines
    const toRemove: { obj: THREE.Object3D; parent: THREE.Object3D }[] = []
    centeredModel.traverse((child) => {
      if (child instanceof THREE.LineSegments && child.name === 'WireframeEdges') {
        toRemove.push({ obj: child, parent: child.parent! })
      }
    })
    toRemove.forEach(({ obj, parent }) => {
      ;(obj as THREE.LineSegments).geometry.dispose()
      parent.remove(obj)
    })

    if (!showWire) return

    const meshes: THREE.Mesh[] = []
    centeredModel.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child)
    })

    if (objFaceData && objFaceData.groups.length > 0) {
      // Flatten all face groups into a single wireframe to avoid mesh-to-group
      // index mismatch. When the OBJ has hierarchical group structures (nested
      // o/g/usemtl), THREE.js OBJLoader may produce a different child
      // arrangement than the flat groups array from extractOBJFaceData.
      // A unified wireframe on the root group covers all faces correctly.
      const allFaces = objFaceData.groups.flat()
      if (allFaces.length > 0) {
        const lines = buildLinesFromOBJ(allFaces, objFaceData.positions)
        lines.name = 'WireframeEdges'
        centeredModel.add(lines)
      }
    } else {
      meshes.forEach((mesh) => {
        if (mesh.geometry) {
          const lines = buildQuadWireframe(mesh.geometry)
          lines.name = 'WireframeEdges'
          mesh.add(lines)
        }
      })
    }
  }, [centeredModel, showWire, objFaceData])

  return <primitive object={centeredModel} />
}
