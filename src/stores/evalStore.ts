import { create } from 'zustand'
import type { TopologyReport } from '@/lib/topology-analyzer'
import { STATIC_MODEL_STANDARD, DYNAMIC_MODEL_STANDARD } from '@/data/evaluation-standards'
import type { EvaluationStandard, EvaluationCriterion } from '@/types/evaluation'

export type RatingLevel = 1 | 2 | 3 | 4 | 5
export const RATING_LABELS: Record<RatingLevel, string> = {
  1: '糟糕', 2: '差', 3: '普通', 4: '良好', 5: '优秀',
}
export const RATING_PCTS: Record<RatingLevel, number> = {
  1: 0, 2: 0.25, 3: 0.5, 4: 0.75, 5: 1,
}

interface EvalStore {
  modelType: 'static' | 'dynamic'
  autoReport: TopologyReport | null
  manualRatings: Record<string, RatingLevel>
  /** Flow-based review scores (criterionId → 1-10), null if not using flow */
  flowReviewScores: Record<string, number> | null
  flowTotal: number | null
  /** Whether the current flow result has been saved */
  flowSaved: boolean

  setModelType: (t: 'static' | 'dynamic') => void
  setAutoReport: (report: TopologyReport | null) => void
  setManualRating: (criterionId: string, level: RatingLevel) => void
  setFlowResult: (scores: Record<string, number>, total: number) => void
  resetFlowResult: () => void
  setFlowSaved: () => void
  resetFlowSaved: () => void
  resetEval: () => void
}

export const useEvalStore = create<EvalStore>()((set) => ({
  modelType: 'static',
  autoReport: null,
  manualRatings: {},
  flowReviewScores: null,
  flowTotal: null,
  flowSaved: false,

  setModelType: (modelType) => set({ modelType }),
  setAutoReport: (autoReport) => set({ autoReport }),
  setManualRating: (criterionId, level) =>
    set((s) => ({ manualRatings: { ...s.manualRatings, [criterionId]: level } })),
  setFlowResult: (flowReviewScores, flowTotal) => set({ flowReviewScores, flowTotal, flowSaved: false }),
  resetFlowResult: () => set({ flowReviewScores: null, flowTotal: null, flowSaved: false }),
  setFlowSaved: () => set({ flowSaved: true }),
  resetFlowSaved: () => set({ flowSaved: false }),
  resetEval: () => set({ autoReport: null, manualRatings: {}, flowReviewScores: null, flowTotal: null, flowSaved: false }),
}))

/**
 * Compute the score for a single auto-detectable criterion.
 */
export function computeAutoScore(
  criterion: EvaluationCriterion,
  report: TopologyReport,
): number {
  const { faceStats, nonManifold, overlapping } = report
  const maxScore = criterion.maxScore

  switch (criterion.id) {
    case 'quad-tri-ratio': {
      // Face-count tiered threshold
      const { totalFaces, triPct } = faceStats
      const triRatio = triPct / 100
      let threshold: number
      if (totalFaces < 15000) {
        threshold = 0.30
      } else if (totalFaces <= 25000) {
        threshold = 0.20
      } else {
        threshold = 0.10
      }
      if (triRatio <= threshold) return maxScore
      // Deduct maxScore/10 per percentage point above threshold
      const excess = triRatio - threshold
      const penalty = excess * maxScore * 10
      return Math.max(0, Math.round(maxScore - penalty))
    }

    case 'ngon-count':
      // Each N-gon deducts 1 point
      return Math.max(0, maxScore - faceStats.ngonCount)

    case 'non-manifold':
      // Each non-manifold edge deducts 0.5 points
      return Math.max(0, maxScore - Math.ceil(nonManifold.count * 0.5))

    case 'overlapping':
      // Each overlapping pair deducts 0.5 points
      return Math.max(0, maxScore - Math.ceil(overlapping.count * 0.5))

    default:
      return 0
  }
}

/**
 * Compute the score for a manual rating.
 */
export function computeManualScore(criterion: EvaluationCriterion, level: RatingLevel): number {
  return Math.round(RATING_PCTS[level] * criterion.maxScore)
}

/**
 * Compute total score for the current evaluation standard.
 */
export function computeTotalScore(
  modelType: 'static' | 'dynamic',
  report: TopologyReport | null,
  manualRatings: Record<string, RatingLevel>,
): { autoTotal: number; manualTotal: number; total: number; maxTotal: number } {
  const standard: EvaluationStandard =
    modelType === 'static' ? STATIC_MODEL_STANDARD : DYNAMIC_MODEL_STANDARD

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

  return { autoTotal, manualTotal, total: autoTotal + manualTotal, maxTotal: standard.totalScore }
}
