import { create } from 'zustand'
import type { EvalHistoryRecord } from './evalHistoryStore'

interface ComparePoolStore {
  /** 对比池中的模型（最多2个） */
  pool: EvalHistoryRecord[]
  /** 是否正在进行对比选择 */
  isSelecting: boolean

  addToPool: (record: EvalHistoryRecord) => boolean
  removeFromPool: (id: string) => void
  clearPool: () => void
  /** 对比池是否已满 */
  isFull: () => boolean
  /** 开始对比选择模式 */
  startSelecting: () => void
  stopSelecting: () => void
}

export const useComparePoolStore = create<ComparePoolStore>()((set, get) => ({
  pool: [],
  isSelecting: false,

  addToPool: (record) => {
    const { pool } = get()
    // Don't add duplicates
    if (pool.find((r) => r.id === record.id)) return false
    if (pool.length >= 2) return false
    set({ pool: [...pool, record] })
    return true
  },

  removeFromPool: (id) =>
    set((s) => ({ pool: s.pool.filter((r) => r.id !== id) })),

  clearPool: () => set({ pool: [], isSelecting: false }),

  isFull: () => get().pool.length >= 2,

  startSelecting: () => set({ isSelecting: true }),
  stopSelecting: () => set({ isSelecting: false }),
}))
