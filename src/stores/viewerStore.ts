import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/lib/storage'
import type { ViewerSettings, RenderMode } from '@/types/viewer'

interface ViewerStore {
  settings: ViewerSettings
  cameraResetCounter: number
  setRenderMode: (mode: RenderMode) => void
  toggleGrid: () => void
  toggleAutoRotate: () => void
  toggleSymmetry: () => void
  setShowSymmetry: (show: boolean) => void
  setSymmetryAxis: (axis: 'x' | 'y' | 'z') => void
  resetCamera: () => void
  setMaterialColor: (color: string) => void
  setMaterialRoughness: (roughness: number) => void
  setMaterialMetalness: (metalness: number) => void
}

const defaultSettings: ViewerSettings = {
  renderMode: 'wireframe-solid' as RenderMode,
  showGrid: true,
  autoRotate: false,
  materialColor: '#d0d0d0',
  materialRoughness: 0.4,
  materialMetalness: 0,
  showSymmetry: false,
  symmetryAxis: 'x',
}

export const useViewerStore = create<ViewerStore>()(
  persist(
    (set) => ({
      settings: { ...defaultSettings },
      cameraResetCounter: 0,

      setRenderMode: (mode) =>
        set((s) => ({ settings: { ...s.settings, renderMode: mode } })),
      toggleGrid: () =>
        set((s) => ({ settings: { ...s.settings, showGrid: !s.settings.showGrid } })),
      toggleAutoRotate: () =>
        set((s) => ({ settings: { ...s.settings, autoRotate: !s.settings.autoRotate } })),
      toggleSymmetry: () =>
        set((s) => ({ settings: { ...s.settings, showSymmetry: !s.settings.showSymmetry } })),
      setShowSymmetry: (show) =>
        set((s) => ({ settings: { ...s.settings, showSymmetry: show } })),
      setSymmetryAxis: (axis) =>
        set((s) => ({ settings: { ...s.settings, symmetryAxis: axis } })),
      resetCamera: () => set((s) => ({ cameraResetCounter: s.cameraResetCounter + 1 })),

      setMaterialColor: (color) =>
        set((s) => ({ settings: { ...s.settings, materialColor: color } })),
      setMaterialRoughness: (roughness) =>
        set((s) => ({ settings: { ...s.settings, materialRoughness: roughness } })),
      setMaterialMetalness: (metalness) =>
        set((s) => ({ settings: { ...s.settings, materialMetalness: metalness } })),
    }),
    {
      name: STORAGE_KEYS.VIEWER_SETTINGS,
      partialize: (state) => ({ settings: state.settings }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        settings: {
          ...defaultSettings,
          ...((persisted as { settings?: Partial<ViewerSettings> })?.settings ?? {}),
          // 强制覆盖：确保所有用户默认混合模式 + 对称面关闭
          renderMode: 'wireframe-solid' as RenderMode,
          showSymmetry: false,
          symmetryAxis: ((persisted as { settings?: Partial<ViewerSettings> })?.settings?.symmetryAxis) ?? 'x',
        },
      }),
    },
  ),
)
