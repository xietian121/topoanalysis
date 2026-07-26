import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TopologyReport } from '@/lib/topology-analyzer'
import type { RatingLevel } from './evalStore'
import type { EvaluationType, EvaluationSuggestions } from '@/types/evaluation'
import type { ModelInfo } from '@/types/model'

export interface EvalHistoryRecord {
  id: string
  modelName: string
  modelFormat: string
  modelFileSize: number
  /** Phase 2: 评测标准组合键 */
  evaluationType: EvaluationType
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

  // ===== Phase 2 新增字段 =====
  /** 是否为示例模型 */
  isExample?: boolean
  /** 模型缩略图 URL */
  thumbnailUrl?: string
  /** 示例模型文件 URL */
  modelUrl?: string
  /** 模型信息快照（用于重新加载） */
  modelInfoSnapshot?: ModelInfo
  /** 优化建议（评测后自动生成） */
  suggestions?: EvaluationSuggestions
  /** 评测状态 */
  evalStatus?: 'completed' | 'in_progress' | 'not_started'
  /** OBJ 模型文本内容（用于报告页重新加载模型） */
  modelText?: string
}

interface EvalHistoryStore {
  records: EvalHistoryRecord[]

  addRecord: (record: EvalHistoryRecord) => void
  updateRecord: (id: string, updates: Partial<EvalHistoryRecord>) => void
  removeRecord: (id: string) => void
  clearAll: () => void
  /** 获取非示例的用户模型记录 */
  getUserRecords: () => EvalHistoryRecord[]
  /** 获取示例模型记录 */
  getExampleRecords: () => EvalHistoryRecord[]
}

function makeId() {
  return `eval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export { makeId }

export const useEvalHistoryStore = create<EvalHistoryStore>()(
  persist(
    (set, get) => ({
      records: [],

      addRecord: (record) =>
        set((s) => ({
          records: [{ ...record, id: record.id || makeId() }, ...s.records].slice(0, 200),
        })),

      updateRecord: (id, updates) =>
        set((s) => ({
          records: s.records.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),

      removeRecord: (id) =>
        set((s) => ({
          records: s.records.filter((r) => r.id !== id),
        })),

      clearAll: () => set({ records: [] }),

      getUserRecords: () => get().records.filter((r) => !r.isExample),

      getExampleRecords: () => get().records.filter((r) => r.isExample),
    }),
    {
      name: 'topoeval-history',
      version: 2,
      // Migration from v1: old modelType 'static'|'dynamic' → 'game-static'|'game-dynamic'
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2) {
          const state = persistedState as { records: EvalHistoryRecord[] }
          if (state.records) {
            state.records = state.records.map((r) => {
              // Migrate old modelType field
              const oldType = (r as unknown as { modelType?: string }).modelType
              if (oldType === 'static' || oldType === 'dynamic') {
                r.evaluationType = `game-${oldType}` as EvaluationType
                delete (r as unknown as { modelType?: string }).modelType
              }
              if (!r.evaluationType) {
                r.evaluationType = 'game-static'
              }
              if (!r.evalStatus) {
                r.evalStatus = 'completed'
              }
              return r
            })
          }
        }
        return persistedState as EvalHistoryStore
      },
    },
  ),
)
