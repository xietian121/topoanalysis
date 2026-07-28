import { create } from 'zustand'
import type * as THREE from 'three'
import type { ModelInfo, ModelStats } from '@/types/model'
import type { OBJFaceData } from '@/lib/model-parser'
import { STORAGE_KEYS, getItem, setItem } from '@/lib/storage'

export interface LoadModelOptions {
  /** Progress callback: (progress 0-100, stage, stageText) */
  onProgress?: (progress: number, stage: string, text: string) => void
  /** AbortSignal for cancelling fetch */
  signal?: AbortSignal
  /** 标记为示例模型，不可打分 */
  isExample?: boolean
}

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
  /** Raw OBJ text for persistence (so report page can reload) */
  modelText: string | null

  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  loadModel: (file: File, options?: LoadModelOptions) => Promise<void>
  /** Load model from a URL (for example models / report page preview) */
  loadModelFromUrl: (url: string, fileName: string, options?: LoadModelOptions) => Promise<void>
  /** Restore model from saved text (for report → re-evaluate flow) */
  loadModelFromText: (text: string, fileName: string, fileSize: number, options?: LoadModelOptions) => Promise<void>
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
  modelText: null,

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadModel: async (file: File, options?: LoadModelOptions) => {
    const { clearModel } = get()
    clearModel()

    const onProgress = options?.onProgress
    const signal = options?.signal

    set({ isLoading: true, error: null })
    console.log(`[TopoEval] 开始加载模型: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)

    try {
      const { parseOBJFile, extractModelStats, extractOBJFaceData } =
        await import('@/lib/model-parser')
      const { analyzeTopology } = await import('@/lib/topology-analyzer')

      const ext = file.name.split('.').pop()?.toLowerCase()
      console.log(`[TopoEval] 文件格式: .${ext}`)

      // 低模仅支持 OBJ — FBX 无法进行拓扑分析（extractOBJFaceData）
      if (ext !== 'obj') {
        throw new Error('低模评测仅支持 OBJ 格式，请上传 .obj 文件')
      }

      let group: THREE.Group
      let objFaceData: OBJFaceData | null = null
      let modelText: string | null = null

      // Download progress: 0-40%
      onProgress?.(5, 'download', '正在下载模型文件...')

      // Check for abort
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      const text = await file.text()
      modelText = text
      onProgress?.(35, 'download', '正在下载模型文件...')

      // Parse: 40-60%
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      onProgress?.(40, 'parse', '正在解析模型数据...')
      group = await parseOBJFile(file)
      objFaceData = extractOBJFaceData(text)
      const allFaces = objFaceData.groups.flat()
      const quads = allFaces.filter((f) => f.length === 4).length
      const tris = allFaces.filter((f) => f.length === 3).length
      console.log(
        `[TopoEval] OBJ 原始面: ${allFaces.length} 个 (${tris}三角, ${quads}四边) in ${objFaceData.groups.length} 组`,
      )
      onProgress?.(60, 'parse', '正在解析模型数据...')

      // Analyze topology: 60-90%, 7 steps
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      onProgress?.(60, 'analyze', '正在分析拓扑结构...')

      analyzeTopology(group, objFaceData, (step, total, label) => {
        // Map 60-90% across 7 steps
        const baseProgress = 60
        const analyzeRange = 30
        const stepProgress = baseProgress + (step / total) * analyzeRange
        onProgress?.(Math.round(stepProgress), 'analyze', `正在分析拓扑结构: ${label}`)
      })

      let meshCount = 0
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) meshCount++
      })
      console.log(`[TopoEval] 解析完成，找到 ${meshCount} 个子网格`)

      const stats = extractModelStats(group)
      console.log(
        `[TopoEval] 统计: ${stats.vertexCount} 顶点, ${stats.faceCount} 三角面`,
      )

      // Init scene: 90-100%
      onProgress?.(92, 'init', '正在准备 3D 场景...')

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

      onProgress?.(100, 'done', '加载完成')

      set({
        currentModel: modelInfo,
        modelObject: group,
        stats,
        objFaceData,
        isLoading: false,
        error: null,
        modelText,
      })
      console.log('[TopoEval] ✅ 模型加载完成')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('[TopoEval] ⏹ 加载已取消')
        set({ isLoading: false })
        return
      }
      const message = err instanceof Error ? err.message : '模型加载失败'
      console.error(`[TopoEval] ❌ 加载失败:`, err)
      set({ isLoading: false, error: message })
      onProgress?.(0, null as unknown as string, '')
    }
  },

  loadModelFromUrl: async (url: string, fileName: string, options?: LoadModelOptions) => {
    const { clearModel } = get()
    clearModel()

    const onProgress = options?.onProgress
    const signal = options?.signal

    set({ isLoading: true, error: null })
    console.log(`[TopoEval] 从 URL 加载模型: ${url}`)

    try {
      const { parseOBJFile, extractModelStats, extractOBJFaceData } =
        await import('@/lib/model-parser')

      // Fetch with progress tracking via stream
      onProgress?.(0, 'download', '正在下载模型文件...')
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(`下载失败: HTTP ${response.status}`)

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0
      let loaded = 0

      const reader = response.body!.getReader()
      const chunks: Uint8Array[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        loaded += value.length

        if (total > 0) {
          const downloadProgress = Math.round((loaded / total) * 35)
          onProgress?.(downloadProgress, 'download', '正在下载模型文件...')
        } else {
          // No content-length, estimate based on chunks
          const estimated = Math.min(35, 5 + Math.round((loaded / (1024 * 1024)) * 2))
          onProgress?.(estimated, 'download', '正在下载模型文件...')
        }
      }

      // Combine chunks
      const blob = new Blob(chunks as BlobPart[])
      const text = await blob.text()

      onProgress?.(38, 'parse', '正在解析模型数据...')
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      const blobFile = new File([blob], fileName, { type: 'text/plain' })
      const group = await parseOBJFile(blobFile)
      const objFaceData = extractOBJFaceData(text)

      const allFaces = objFaceData.groups.flat()
      console.log(`[TopoEval] OBJ 原始面: ${allFaces.length} 个`)
      onProgress?.(60, 'parse', '正在解析模型数据...')

      // Analyze: 60-90%
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      onProgress?.(60, 'analyze', '正在分析拓扑结构...')

      const { analyzeTopology } = await import('@/lib/topology-analyzer')
      analyzeTopology(group, objFaceData, (step, total, label) => {
        const baseProgress = 60
        const analyzeRange = 30
        const stepProgress = baseProgress + (step / total) * analyzeRange
        onProgress?.(Math.round(stepProgress), 'analyze', `正在分析拓扑结构: ${label}`)
      })

      // Init: 90-100%
      onProgress?.(92, 'init', '正在准备 3D 场景...')

      const stats = extractModelStats(group)
      const modelInfo: ModelInfo = {
        id: crypto.randomUUID(),
        name: fileName,
        format: 'obj',
        fileSize: blob.size,
        uploadedAt: new Date().toISOString(),
        isExample: options?.isExample,
      }

      onProgress?.(100, 'done', '加载完成')

      set({
        currentModel: modelInfo,
        modelObject: group,
        stats,
        objFaceData,
        isLoading: false,
        error: null,
        modelText: text,
      })
      console.log('[TopoEval] ✅ URL 模型加载完成')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('[TopoEval] ⏹ 加载已取消')
        set({ isLoading: false })
        return
      }
      const message = err instanceof Error ? err.message : 'URL 模型加载失败'
      console.error(`[TopoEval] ❌ URL 加载失败:`, err)
      set({ isLoading: false, error: message })
      onProgress?.(0, null as unknown as string, '')
    }
  },

  loadModelFromText: async (text: string, fileName: string, fileSize: number, options?: LoadModelOptions) => {
    const { clearModel } = get()
    clearModel()

    const onProgress = options?.onProgress

    set({ isLoading: true, error: null })
    console.log(`[TopoEval] 从文本恢复模型: ${fileName}`)

    try {
      const { parseOBJFile, extractModelStats, extractOBJFaceData } =
        await import('@/lib/model-parser')

      onProgress?.(20, 'parse', '正在解析模型数据...')
      const blobFile = new File([text], fileName, { type: 'text/plain' })
      const group = await parseOBJFile(blobFile)
      const objFaceData = extractOBJFaceData(text)
      onProgress?.(60, 'parse', '正在解析模型数据...')

      onProgress?.(60, 'analyze', '正在分析拓扑结构...')
      const { analyzeTopology } = await import('@/lib/topology-analyzer')
      analyzeTopology(group, objFaceData, (step, total, label) => {
        const baseProgress = 60
        const analyzeRange = 30
        const stepProgress = baseProgress + (step / total) * analyzeRange
        onProgress?.(Math.round(stepProgress), 'analyze', `正在分析拓扑结构: ${label}`)
      })

      onProgress?.(92, 'init', '正在准备 3D 场景...')

      const stats = extractModelStats(group)
      const modelInfo: ModelInfo = {
        id: crypto.randomUUID(),
        name: fileName,
        format: 'obj',
        fileSize: fileSize,
        uploadedAt: new Date().toISOString(),
      }

      onProgress?.(100, 'done', '加载完成')

      set({
        currentModel: modelInfo,
        modelObject: group,
        stats,
        objFaceData,
        isLoading: false,
        error: null,
        modelText: text,
      })
      console.log('[TopoEval] ✅ 模型恢复完成')
    } catch (err) {
      const message = err instanceof Error ? err.message : '模型恢复失败'
      console.error(`[TopoEval] ❌ 模型恢复失败:`, err)
      set({ isLoading: false, error: message })
      onProgress?.(0, null as unknown as string, '')
    }
  },

  loadReferenceModel: async (file: File) => {
    const { clearReferenceModel } = get()
    clearReferenceModel()

    set({ isLoading: true, error: null })
    console.log(`[TopoEval] 加载参考模型: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)

    try {
      const { parseOBJFile, parseFBXFile } =
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
      modelText: null,
    })
  },
}))
