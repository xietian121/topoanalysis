import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TopologyReport } from '@/lib/topology-analyzer'
import type { RatingLevel } from './evalStore'
import type { EvaluationType, EvaluationSuggestions } from '@/types/evaluation'
import { deleteModelFile } from '@/lib/storage'
import type { ModelInfo } from '@/types/model'
import type { AIAnalysisResult } from '@/lib/ai-analysis'

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
  /** 是否启用对称性评测 */
  symmetryEnabled?: boolean

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
  /** AI 深度分析结果 */
  aiAnalysis?: AIAnalysisResult
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

      removeRecord: (id) => {
        // 同步清理 IndexedDB 中的模型文件
        deleteModelFile(id).catch(() => {})
        set((s) => ({
          records: s.records.filter((r) => r.id !== id),
        }))
      },

      clearAll: () => {
        // 清理所有非示例记录的 IndexedDB 文件
        const ids = get().records.filter(r => !r.isExample).map(r => r.id)
        ids.forEach(id => deleteModelFile(id).catch(() => {}))
        set({ records: [] })
      },

      getUserRecords: () => get().records.filter((r) => !r.isExample),

      getExampleRecords: () => get().records.filter((r) => r.isExample),
    }),
    {
      name: 'topo-analysis-history',
      version: 3,
      // Strip large geometry data before persisting to avoid localStorage quota
      partialize: (state) => ({
        ...state,
        records: state.records.map((r) => ({
          ...r,
          // modelText can be MBs — never persist OBJ file content
          modelText: undefined,
          // Strip geometry arrays from autoReport, keep only counts
          autoReport: r.autoReport ? stripAutoReportForStorage(r.autoReport) : null,
        })),
      }),
      // Migration from v1: old modelType 'static'|'dynamic' → 'game-static'|'game-dynamic'
      // Migration from v2→v3: records may have modelText/autoReport stripped, hydrate safely
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as EvalHistoryStore & { records: EvalHistoryRecord[] }
        if (!state.records) state.records = []

        if (version < 2) {
          state.records = state.records.map((r) => {
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

        if (version < 3) {
          // v3: modelText and autoReport geometry stripped on persist;
          // ensure old records are clean too
          state.records = state.records.map((r) => ({
            ...r,
            modelText: undefined,
            autoReport: r.autoReport ? stripAutoReportForStorage(r.autoReport) : null,
          }))
        }

        return state as EvalHistoryStore
      },
      // 水化后验证：清除无模型数据的已完成用户记录（modelText 被 partialize 清空）
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error || !state?.records) return
          state.records = state.records.filter((r) => {
            if (r.isExample) return true                       // 示例模型永远保留
            if (r.evalStatus !== 'completed') return false     // 未完成的清除
            return true                                        // 已完成用户记录保留（modelText 可能在持久化时被 strip）
          })
        }
      },
    },
  ),
)

/** Keep only summary counts from autoReport; discard all geometry position arrays. */
function stripAutoReportForStorage(report: TopologyReport): TopologyReport {
  return {
    faceStats: report.faceStats,
    vertexCount: report.vertexCount,
    nonManifold: { count: report.nonManifold.count, edges: [] },
    overlapping: { count: report.overlapping.count, pairs: [] },
    boundary: { count: report.boundary.count, edges: [] },
    poleStats: { count: report.poleStats.count, poles: [] },
    // density: stripped entirely (Float32Array + large Map)
    density: undefined,
    // edgeLoops: stripped entirely (potentially hundreds of edge positions)
    edgeLoops: undefined,
  }
}
