import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TopologyReport } from '@/lib/topology-analyzer'
import type { RatingLevel } from './evalStore'
import type { ModelType } from '@/types/evaluation'

export interface EvalHistoryRecord {
  id: string
  modelName: string
  modelFormat: string
  modelFileSize: number
  modelType: ModelType
  createdAt: string // ISO 8601
  autoTotal: number
  manualTotal: number
  total: number
  maxTotal: number
  dimensionScores: {
    dimensionId: string
    dimensionName: string
    score: number
    maxScore: number
  }[]
  autoReport: TopologyReport | null
  manualRatings: Record<string, RatingLevel>
  reviewScores?: Record<string, number>
}

interface EvalHistoryStore {
  records: EvalHistoryRecord[]

  addRecord: (record: EvalHistoryRecord) => void
  removeRecord: (id: string) => void
  clearAll: () => void
}

function makeId() {
  return `eval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export { makeId }

export const useEvalHistoryStore = create<EvalHistoryStore>()(
  persist(
    (set) => ({
      records: [],

      addRecord: (record) =>
        set((s) => ({
          records: [{ ...record, id: record.id || makeId() }, ...s.records].slice(0, 100),
        })),

      removeRecord: (id) =>
        set((s) => ({
          records: s.records.filter((r) => r.id !== id),
        })),

      clearAll: () => set({ records: [] }),
    }),
    {
      name: 'topoeval-history',
      version: 1,
    },
  ),
)
