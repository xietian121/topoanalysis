import { create } from 'zustand'
import { roundScore } from './evalStore'

export interface FlattenedCriterion {
  id: string
  name: string
  description: string
  maxScore: number
  method: 'auto' | 'manual'
  dimensionName: string
  /** 评分规则简要说明 */
  scoringRule?: string
  /** 是否为可选准则（如对称性），需用户手动启用后才可打分 */
  optional?: boolean
}

interface EvalFlowStore {
  isActive: boolean
  currentIndex: number
  criteria: FlattenedCriterion[]
  reviewScores: Record<string, number> // criterionId → 1-10 (0 = skipped/unscored)

  startFlow: (criteria: FlattenedCriterion[]) => void
  goTo: (index: number) => void
  setScore: (criterionId: string, score: number) => void
  /** Replace criteria in-place without resetting scores — used when toggling symmetry mid-flow */
  updateCriteria: (criteria: FlattenedCriterion[]) => void
  finishFlow: () => void
  cancelFlow: () => void
}

export const useEvalFlowStore = create<EvalFlowStore>()((set, get) => ({
  isActive: false,
  currentIndex: 0,
  criteria: [],
  reviewScores: {},

  startFlow: (criteria) =>
    set({
      isActive: true,
      currentIndex: 0,
      criteria,
      reviewScores: {},
    }),

  goTo: (index) =>
    set({
      currentIndex: Math.max(0, Math.min(index, get().criteria.length - 1)),
    }),

  setScore: (criterionId, score) =>
    set((s) => ({
      reviewScores: { ...s.reviewScores, [criterionId]: roundScore(score) },
    })),

  updateCriteria: (criteria) => set({ criteria }),

  finishFlow: () => set({ isActive: false }),

  cancelFlow: () =>
    set({
      isActive: false,
      currentIndex: 0,
      criteria: [],
      reviewScores: {},
    }),
}))

/**
 * Check if all criteria have been scored (including score 0).
 */
export function isAllScored(
  criteria: FlattenedCriterion[],
  reviewScores: Record<string, number>,
): boolean {
  return criteria.every((c) => {
    // 跳过未启用的可选准则（maxScore === 0 表示未启用）
    if (c.optional && c.maxScore === 0) return true
    return c.id in reviewScores
  })
}

/**
 * Compute total score from flow review scores.
 * Each criterion: (reviewScore / 10) × criterionMaxScore
 * Total = sum of all mapped scores (naturally 0-100).
 */
export function computeFlowTotal(
  criteria: FlattenedCriterion[],
  reviewScores: Record<string, number>,
): { total: number; maxTotal: number; dimensionScores: Record<string, { score: number; maxScore: number }> } {
  let total = 0
  let maxTotal = 0
  const dimMap: Record<string, { score: number; maxScore: number }> = {}

  for (const crit of criteria) {
    const raw = reviewScores[crit.id] ?? 0
    const mapped = roundScore((raw / 10) * crit.maxScore)
    total += mapped
    maxTotal += crit.maxScore

    if (!dimMap[crit.dimensionName]) {
      dimMap[crit.dimensionName] = { score: 0, maxScore: 0 }
    }
    dimMap[crit.dimensionName].score = roundScore(dimMap[crit.dimensionName].score + mapped)
    dimMap[crit.dimensionName].maxScore += crit.maxScore
  }

  return { total: roundScore(total), maxTotal, dimensionScores: dimMap }
}
