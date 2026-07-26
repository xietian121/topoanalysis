import { create } from 'zustand'

interface HighlightStore {
  /** Current criterion ID being reviewed, null = no highlight */
  criterionId: string | null
  setCriterion: (id: string | null) => void
}

export const useHighlightStore = create<HighlightStore>()((set) => ({
  criterionId: null,
  setCriterion: (criterionId) => set({ criterionId }),
}))
