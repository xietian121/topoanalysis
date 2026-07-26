import { create } from 'zustand'

export type LoadingStage = 'download' | 'parse' | 'analyze' | 'init' | 'done' | null

interface LoadingStore {
  isLoading: boolean
  progress: number       // 0-100
  stage: LoadingStage
  stageText: string
  error: string | null
  /** AbortController for cancelling fetch */
  abortController: AbortController | null
  /** Timestamp when loading started, for timeout detection */
  startedAt: number | null

  startLoading: () => void
  setProgress: (progress: number, stage: LoadingStage, stageText: string) => void
  setError: (error: string) => void
  finishLoading: () => void
  cancelLoading: () => void
  resetLoading: () => void
}

export const useLoadingStore = create<LoadingStore>()((set, get) => ({
  isLoading: false,
  progress: 0,
  stage: null,
  stageText: '',
  error: null,
  abortController: null,
  startedAt: null,

  startLoading: () =>
    set({
      isLoading: true,
      progress: 0,
      stage: null,
      stageText: '准备中...',
      error: null,
      abortController: new AbortController(),
      startedAt: Date.now(),
    }),

  setProgress: (progress, stage, stageText) =>
    set((s) => {
      // Don't go backwards
      if (progress <= s.progress && s.progress > 0) return s
      return { progress: Math.min(100, Math.max(0, progress)), stage, stageText }
    }),

  setError: (error) =>
    set({ error, isLoading: false }),

  finishLoading: () =>
    set({ progress: 100, stage: 'done', stageText: '加载完成', isLoading: false }),

  cancelLoading: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
    }
    set({
      isLoading: false,
      progress: 0,
      stage: null,
      stageText: '',
      error: null,
      abortController: null,
      startedAt: null,
    })
  },

  resetLoading: () =>
    set({
      isLoading: false,
      progress: 0,
      stage: null,
      stageText: '',
      error: null,
      abortController: null,
      startedAt: null,
    }),
}))
