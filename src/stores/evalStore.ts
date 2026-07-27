import { create } from 'zustand'
import type { TopologyReport } from '@/lib/topology-analyzer'
import { getStandardByType } from '@/data/evaluation-standards'
import type { EvaluationStandard, EvaluationCriterion, EvaluationType } from '@/types/evaluation'

export type RatingLevel = 1 | 2 | 3 | 4 | 5
export const RATING_LABELS: Record<RatingLevel, string> = {
  1: '糟糕', 2: '差', 3: '普通', 4: '良好', 5: '优秀',
}
export const RATING_PCTS: Record<RatingLevel, number> = {
  1: 0, 2: 0.25, 3: 0.5, 4: 0.75, 5: 1,
}

interface EvalStore {
  /** Phase 2: 评测标准类型组合键 */
  evaluationType: EvaluationType
  /** 是否启用对称性评测 */
  symmetryEnabled: boolean
  autoReport: TopologyReport | null
  manualRatings: Record<string, RatingLevel>
  /** Flow-based review scores (criterionId → 1-10), null if not using flow */
  flowReviewScores: Record<string, number> | null
  flowTotal: number | null
  /** Whether the current flow result has been saved */
  flowSaved: boolean

  setEvaluationType: (t: EvaluationType) => void
  setSymmetryEnabled: (v: boolean) => void
  setAutoReport: (report: TopologyReport | null) => void
  setManualRating: (criterionId: string, level: RatingLevel) => void
  setFlowResult: (scores: Record<string, number>, total: number) => void
  resetFlowResult: () => void
  setFlowSaved: () => void
  resetFlowSaved: () => void
  resetEval: () => void
}

export const useEvalStore = create<EvalStore>()((set) => ({
  evaluationType: 'game-static',
  symmetryEnabled: false,
  autoReport: null,
  manualRatings: {},
  flowReviewScores: null,
  flowTotal: null,
  flowSaved: false,

  setEvaluationType: (evaluationType) => set({ evaluationType }),
  setSymmetryEnabled: (symmetryEnabled) => set({ symmetryEnabled }),
  setAutoReport: (autoReport) => set({ autoReport }),
  setManualRating: (criterionId, level) =>
    set((s) => ({ manualRatings: { ...s.manualRatings, [criterionId]: level } })),
  setFlowResult: (flowReviewScores, flowTotal) => set({ flowReviewScores, flowTotal, flowSaved: false }),
  resetFlowResult: () => set({ flowReviewScores: null, flowTotal: null, flowSaved: false }),
  setFlowSaved: () => set({ flowSaved: true }),
  resetFlowSaved: () => set({ flowSaved: false }),
  resetEval: () => set({ autoReport: null, manualRatings: {}, flowReviewScores: null, flowTotal: null, flowSaved: false }),
}))

/** Round to 1 decimal place for scores. */
export function roundScore(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Compute the score for a single auto-detectable criterion.
 */
export function computeAutoScore(
  criterion: EvaluationCriterion,
  report: TopologyReport,
): number {
  const { faceStats, nonManifold, overlapping, boundary } = report
  const maxScore = criterion.maxScore

  switch (criterion.id) {
    case 'quad-tri-ratio': {
      // Face-count tiered threshold — 游戏模型更严格，通用模型更宽松
      const { totalFaces, triPct } = faceStats
      const triRatio = triPct / 100
      let threshold: number
      let penaltyRate: number
      if (totalFaces < 15000) {
        threshold = 0.30
        penaltyRate = 1.0
      } else if (totalFaces <= 25000) {
        threshold = 0.20
        penaltyRate = 1.0
      } else {
        threshold = 0.10
        penaltyRate = 1.0
      }
      if (triRatio <= threshold) return maxScore
      const excess = triRatio - threshold
      const penalty = excess * maxScore * 10 * penaltyRate
      return roundScore(Math.max(0, maxScore - penalty))
    }

    case 'ngon-count':
      return roundScore(Math.max(0, maxScore - faceStats.ngonCount))

    case 'non-manifold':
      return roundScore(Math.max(0, maxScore - nonManifold.count * 1))

    case 'overlapping':
      return roundScore(Math.max(0, maxScore - overlapping.count * 1))

    case 'boundary-holes':
      return roundScore(Math.max(0, maxScore - boundary.count * 1))

    default:
      return 0
  }
}

/**
 * Compute the score for a manual rating.
 */
export function computeManualScore(criterion: EvaluationCriterion, level: RatingLevel): number {
  return roundScore(RATING_PCTS[level] * criterion.maxScore)
}

/**
 * Compute total score for the current evaluation standard.
 */
export function computeTotalScore(
  evaluationType: EvaluationType,
  report: TopologyReport | null,
  manualRatings: Record<string, RatingLevel>,
  symmetryEnabled = false,
): { autoTotal: number; manualTotal: number; total: number; maxTotal: number } {
  const standard: EvaluationStandard = getStandardByType(evaluationType, symmetryEnabled)

  let autoTotal = 0
  let manualTotal = 0

  for (const dim of standard.dimensions) {
    for (const crit of dim.criteria) {
      if (crit.method === 'auto' && report) {
        autoTotal += computeAutoScore(crit, report)
      } else if (crit.method === 'manual') {
        const level = manualRatings[crit.id]
        if (level) manualTotal += computeManualScore(crit, level)
      }
    }
  }

  return { autoTotal: roundScore(autoTotal), manualTotal: roundScore(manualTotal), total: roundScore(autoTotal + manualTotal), maxTotal: standard.totalScore }
}
