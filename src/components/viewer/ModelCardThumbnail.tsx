import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Box } from 'lucide-react'

// ── 单例渲染器 + 缓存 ──
const _imgCache = new Map<string, string>()
let _renderer: THREE.WebGLRenderer | null = null
function getRenderer(): THREE.WebGLRenderer {
  if (!_renderer) {
    _renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    _renderer.setSize(400, 300)
    _renderer.setPixelRatio(1)
  }
  return _renderer
}

async function renderOne(url: string): Promise<string> {
  // 1. fetch
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()

  // 2. parse
  const [{ parseOBJFile }] = await Promise.all([import('@/lib/model-parser')])
  const model = await parseOBJFile(new File([text], 'm.obj'))

  // 3. center + scale
  const box = new THREE.Box3().setFromObject(model)
  const c = new THREE.Vector3(); box.getCenter(c)
  const size = new THREE.Vector3(); box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  model.position.set(-c.x, -c.y, -c.z)
  model.scale.setScalar(2.2 / maxDim)

  // 4. solid material + wireframe overlay
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
        else child.material.dispose()
      }
      child.material = new THREE.MeshStandardMaterial({
        color: 0xd4d4d8,
        roughness: 0.5,
        metalness: 0,
        side: THREE.DoubleSide,
      })

      // 线框叠加
      const edges = new THREE.EdgesGeometry(child.geometry)
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.4, depthTest: true }),
      )
      child.add(line)
    }
  })

  // 5. scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xe8e8ed)
  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const k = new THREE.DirectionalLight(0xffffff, 3)
  k.position.set(5, 8, 5); scene.add(k)
  const f = new THREE.DirectionalLight(0xd8dce0, 1.5)
  f.position.set(-3, 3, -3); scene.add(f)
  scene.add(model)

  // 6. camera — fit model bounding box
  const camera = new THREE.PerspectiveCamera(38, 4 / 3, 0.1, 100)
  const modelBox = new THREE.Box3().setFromObject(model)
  const sphere = new THREE.Sphere()
  modelBox.getBoundingSphere(sphere)
  const dist = sphere.radius / Math.sin((38 / 2) * (Math.PI / 180))
  const dir = new THREE.Vector3(0.8, 0.6, 1).normalize()
  camera.position.copy(sphere.center).addScaledVector(dir, dist * 0.95)
  camera.lookAt(sphere.center)

  // 7. render
  const renderer = getRenderer()
  renderer.setClearColor(0xe8e8ed)
  renderer.render(scene, camera)
  const dataUrl = renderer.domElement.toDataURL('image/png')
  // 8. cleanup
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
      else obj.material.dispose()
    }
  })

  return dataUrl
}

// ── 组件 ──

interface Props { modelUrl?: string }

export function ModelCardThumbnail({ modelUrl }: Props) {
  const [img, setImg] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const ref = useRef(true)

  useEffect(() => {
    ref.current = true
    if (!modelUrl) { setStatus('idle'); return }

    // 缓存命中
    const cached = _imgCache.get(modelUrl)
    if (cached) { setImg(cached); setStatus('done'); return }

    let cancelled = false
    setStatus('loading')
    renderOne(modelUrl)
      .then((dataUrl) => {
        _imgCache.set(modelUrl, dataUrl)
        if (!cancelled && ref.current) { setImg(dataUrl); setStatus('done') }
      })
      .catch((e) => {
        console.error('[Thumb] render failed:', modelUrl.slice(-40), e)
        if (!cancelled && ref.current) setStatus('error')
      })
    return () => { cancelled = true }
  }, [modelUrl])

  // Cleanup on unmount
  useEffect(() => {
    ref.current = true
    return () => { ref.current = false }
  }, [])

  if (!modelUrl) {
    return <div className="flex items-center justify-center w-full h-full bg-black/[0.02]"><Box className="h-6 w-6 text-text-tertiary opacity-30" /></div>
  }
  if (status === 'loading') {
    return <div className="flex items-center justify-center w-full h-full bg-[#e8e8ed]"><div className="h-5 w-5 rounded-full border-2 border-black/10 border-t-accent animate-spin" /></div>
  }
  if (status === 'error') {
    return <div className="flex items-center justify-center w-full h-full bg-black/[0.02]"><Box className="h-6 w-6 text-text-tertiary opacity-30" /></div>
  }
  if (status === 'done' && img) {
    return <div className="w-full h-full"><img src={img} alt="" className="w-full h-full object-cover" /></div>
  }
  return null
}
