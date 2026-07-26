import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/lib/storage'

interface UIStore {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: STORAGE_KEYS.UI_STATE,
    },
  ),
)
