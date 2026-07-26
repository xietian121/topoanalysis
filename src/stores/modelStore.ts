import { create } from 'zustand'
import type * as THREE from 'three'
import type { ModelInfo, ModelStats } from '@/types/model'
import type { OBJFaceData } from '@/lib/model-parser'
import { STORAGE_KEYS, getItem, setItem } from '@/lib/storage'

interface ModelStore {
  currentModel: ModelInfo | null
  modelObject: THREE.Group | null
  stats: ModelStats | null
  objFaceData: OBJFaceData | null
  isLoading: boolean
  error: string | null
  /** Reference (high-poly) model for structure comparison */
  referenceModel: THREE.Group | null
  referenceModelInfo: ModelInfo | null

  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  loadModel: (file: File) => Promise<void>
  loadReferenceModel: (file: File) => Promise<void>
  clearModel: () => void
  clearReferenceModel: () => void
}

export const useModelStore = create<ModelStore>()((set, get) => ({
  currentModel: null,
  modelObject: null,
  stats: null,
  objFaceData: null,
  isLoading: false,
  error: null,
  referenceModel: null,
  referenceModelInfo: null,

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadModel: async (file: File) => {
    const { clearModel } = get()
    clearModel()

    set({ isLoading: true, error: null })
    console.log(`[TopoEval] 开始加载模型: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)

    try {
      const { parseOBJFile, parseFBXFile, extractModelStats, extractOBJFaceData } =
        await import('@/lib/model-parser')

      const ext = file.name.split('.').pop()?.toLowerCase() as 'obj' | 'fbx'
      console.log(`[TopoEval] 文件格式: .${ext}`)

      let group: THREE.Group
      let objFaceData: OBJFaceData | null = null

      if (ext === 'obj') {
        const text = await file.text()
        group = await parseOBJFile(file)
        objFaceData = extractOBJFaceData(text)
        const allFaces = objFaceData.groups.flat()
        const quads = allFaces.filter((f) => f.length === 4).length
        const tris = allFaces.filter((f) => f.length === 3).length
        console.log(
          `[TopoEval] OBJ 原始面: ${allFaces.length} 个 (${tris}三角, ${quads}四边) in ${objFaceData.groups.length} 组`,
        )
      } else if (ext === 'fbx') {
        group = await parseFBXFile(file)
      } else {
        throw new Error(`不支持的模型格式: .${ext}`)
      }

      let meshCount = 0
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) meshCount++
      })
      console.log(`[TopoEval] 解析完成，找到 ${meshCount} 个子网格`)

      const stats = extractModelStats(group)
      console.log(
        `[TopoEval] 统计: ${stats.vertexCount} 顶点, ${stats.faceCount} 三角面`,
      )

      const modelInfo: ModelInfo = {
        id: crypto.randomUUID(),
        name: file.name,
        format: ext,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      }

      const recent = getItem<ModelInfo[]>(STORAGE_KEYS.RECENT_MODELS, [])
      const updated = [modelInfo, ...recent.filter((m) => m.name !== file.name)].slice(0, 20)
      setItem(STORAGE_KEYS.RECENT_MODELS, updated)

      set({
        currentModel: modelInfo,
        modelObject: group,
        stats,
        objFaceData,
        isLoading: false,
        error: null,
      })
      console.log('[TopoEval] ✅ 模型加载完成')
    } catch (err) {
      const message = err instanceof Error ? err.message : '模型加载失败'
      console.error(`[TopoEval] ❌ 加载失败:`, err)
      set({ isLoading: false, error: message })
    }
  },

  loadReferenceModel: async (file: File) => {
    const { clearReferenceModel } = get()
    clearReferenceModel()

    set({ isLoading: true, error: null })
    console.log(`[TopoEval] 加载参考模型: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)

    try {
      const { parseOBJFile, parseFBXFile, extractModelStats } =
        await import('@/lib/model-parser')

      const ext = file.name.split('.').pop()?.toLowerCase() as 'obj' | 'fbx'
      let group: THREE.Group
      if (ext === 'obj') {
        group = await parseOBJFile(file)
      } else if (ext === 'fbx') {
        group = await parseFBXFile(file)
      } else {
        throw new Error(`不支持的模型格式: .${ext}`)
      }

      const modelInfo: ModelInfo = {
        id: crypto.randomUUID(),
        name: file.name,
        format: ext,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      }

      set({
        referenceModel: group,
        referenceModelInfo: modelInfo,
        isLoading: false,
        error: null,
      })
      console.log('[TopoEval] ✅ 参考模型加载完成')
    } catch (err) {
      const message = err instanceof Error ? err.message : '参考模型加载失败'
      console.error(`[TopoEval] ❌ 参考模型加载失败:`, err)
      set({ isLoading: false, error: message })
    }
  },

  clearReferenceModel: () => {
    const { referenceModel } = get()
    if (referenceModel) {
      referenceModel.traverse((child) => {
        if ((child as THREE.Mesh).geometry) {
          ;(child as THREE.Mesh).geometry.dispose()
        }
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else mat.dispose()
        }
      })
    }
    set({ referenceModel: null, referenceModelInfo: null })
  },

  clearModel: () => {
    const { modelObject } = get()
    if (modelObject) {
      modelObject.traverse((child) => {
        if ((child as THREE.Mesh).geometry) {
          ;(child as THREE.Mesh).geometry.dispose()
        }
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose())
          } else {
            mat.dispose()
          }
        }
      })
    }
    set({
      currentModel: null,
      modelObject: null,
      stats: null,
      objFaceData: null,
      error: null,
    })
  },
}))
