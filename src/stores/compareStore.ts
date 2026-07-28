import { create } from 'zustand'
import type * as THREE from 'three'
import type { ModelInfo } from '@/types/model'
import type { OBJFaceData } from '@/lib/model-parser'
import { HIGH_POLY_MAX_FILE_SIZE_MB, MAX_FILE_SIZE_MB } from '@/lib/constants'

interface ModelSlot {
  info: ModelInfo | null
  object: THREE.Group | null
  faceData: OBJFaceData | null
  isLoading: boolean
  error: string | null
}

interface CompareStore {
  highModel: ModelSlot
  lowModel: ModelSlot

  loadHighPolyModel: (file: File) => Promise<void>
  loadLowPolyModel: (file: File) => Promise<void>
  clearHighModel: () => void
  clearLowModel: () => void
  clearAll: () => void
}

function createEmptySlot(): ModelSlot {
  return {
    info: null,
    object: null,
    faceData: null,
    isLoading: false,
    error: null,
  }
}

function disposeSlot(slot: ModelSlot) {
  if (slot.object) {
    slot.object.traverse((child) => {
      if ((child as THREE.Mesh).geometry) {
        ;(child as THREE.Mesh).geometry.dispose()
      }
      const mat = (child as THREE.Mesh).material
      if (mat) {
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose())
        } else {
          mat.dispose()
        }
      }
    })
  }
}

export const useCompareStore = create<CompareStore>()((set, get) => ({
  highModel: createEmptySlot(),
  lowModel: createEmptySlot(),

  loadHighPolyModel: async (file: File) => {
    // Size validation
    const maxBytes = HIGH_POLY_MAX_FILE_SIZE_MB * 1024 * 1024
    if (file.size > maxBytes) {
      set((s) => ({
        highModel: {
          ...s.highModel,
          isLoading: false,
          error: `文件大小超过限制（最大 ${HIGH_POLY_MAX_FILE_SIZE_MB}MB）`,
        },
      }))
      return
    }

    set((s) => ({
      highModel: { ...s.highModel, isLoading: true, error: null },
    }))

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

      set((s) => ({
        highModel: {
          ...s.highModel,
          info: modelInfo,
          object: group,
          faceData: null,
          isLoading: false,
          error: null,
        },
      }))
      console.log(`[TopoAnalysis] ✅ 高模加载完成: ${file.name}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : '模型加载失败'
      console.error(`[TopoAnalysis] ❌ 高模加载失败:`, err)
      set((s) => ({
        highModel: { ...s.highModel, isLoading: false, error: message },
      }))
    }
  },

  loadLowPolyModel: async (file: File) => {
    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024
    if (file.size > maxBytes) {
      set((s) => ({
        lowModel: {
          ...s.lowModel,
          isLoading: false,
          error: `文件大小超过限制（最大 ${MAX_FILE_SIZE_MB}MB）`,
        },
      }))
      return
    }

    set((s) => ({
      lowModel: { ...s.lowModel, isLoading: true, error: null },
    }))

    try {
      const { parseOBJFile, parseFBXFile, extractOBJFaceData } =
        await import('@/lib/model-parser')

      const ext = file.name.split('.').pop()?.toLowerCase() as 'obj' | 'fbx'
      let group: THREE.Group
      let faceData: OBJFaceData | null = null

      if (ext === 'obj') {
        const text = await file.text()
        group = await parseOBJFile(file)
        faceData = extractOBJFaceData(text)
        const allFaces = faceData.groups.flat()
        console.log(
          `[TopoAnalysis] 低模 OBJ 原始面: ${allFaces.length} 个 (${allFaces.filter((f) => f.length === 3).length}三角, ${allFaces.filter((f) => f.length === 4).length}四边)`,
        )
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

      set((s) => ({
        lowModel: {
          ...s.lowModel,
          info: modelInfo,
          object: group,
          faceData,
          isLoading: false,
          error: null,
        },
      }))
      console.log(`[TopoAnalysis] ✅ 低模加载完成: ${file.name}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : '模型加载失败'
      console.error(`[TopoAnalysis] ❌ 低模加载失败:`, err)
      set((s) => ({
        lowModel: { ...s.lowModel, isLoading: false, error: message },
      }))
    }
  },

  clearHighModel: () => {
    const { highModel } = get()
    disposeSlot(highModel)
    set({ highModel: createEmptySlot() })
  },

  clearLowModel: () => {
    const { lowModel } = get()
    disposeSlot(lowModel)
    set({ lowModel: createEmptySlot() })
  },

  clearAll: () => {
    const { highModel, lowModel } = get()
    disposeSlot(highModel)
    disposeSlot(lowModel)
    set({ highModel: createEmptySlot(), lowModel: createEmptySlot() })
  },
}))
