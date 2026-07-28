/**
 * ─── 示例模型评分配置 ───
 *
 * 修改此文件即可更新所有示例模型的评分。
 *
 * 每个模型只需填写 reviewScores（逐条 0-10 分），
 * 维度分和总分会自动根据评测标准计算。
 *
 * 评测标准位置: src/data/evaluation-standards.ts
 * 计算逻辑:      (reviewScore / 10) × criterionMaxScore
 */

import type { EvaluationType, EvaluationStandard } from '@/types/evaluation'
import { getStandardByType } from '@/data/evaluation-standards'
import { roundScore } from '@/stores/evalStore'

export interface ExampleScoreEntry {
  /** 模型显示名称 */
  name: string
  /** 评测标准类型 */
  evaluationType: EvaluationType
  /**
   * 是否启用对称性评测。
   * true → 对称性准则满分生效（各类型不同），且其他维度权重按比例重新分配
   * false → 对称性 maxScore=0，不参与总分计算
   */
  symmetryEnabled: boolean
  /**
   * 逐条评分 (0-10)
   *
   * 可用准则 ID 取决于 evaluationType：
   *
   * ┌────────────────────┬──────────┬──────────┬──────────┬──────────┐
   * │ 准则 ID             │ 游戏可动  │ 游戏静态  │ 通用可动  │ 通用静态  │
   * ├────────────────────┼──────────┼──────────┼──────────┼──────────┤
   * │ symmetry           │ 20分/手动 │ 10分/手动 │ 17分/手动 │ 13分/手动 │ ← 可选，布尔控制
   * │ quad-tri-ratio     │ 5分/自动  │ 10分/自动 │ 5分/自动  │ 10分/自动 │
   * │ tri-distribution   │ 4分/手动  │ 8分/手动  │ 5分/手动  │ 10分/手动 │
   * │ pole-distribution  │ 3分/手动  │ 6分/手动  │ 4分/手动  │ 8分/手动  │
   * │ ngon-count         │ 3分/自动  │ 6分/自动  │ 3分/自动  │ 7分/自动  │
   * │ non-manifold       │ 12分/自动 │ 12分/自动 │ 12分/自动 │ 12分/自动 │
   * │ overlapping        │ 8分/自动  │ 10分/自动 │ 8分/自动  │ 10分/自动 │
   * │ boundary-holes     │ 5分/自动  │ 5分/自动  │ 8分/自动  │ 8分/自动  │
   * │ structure          │ 7分/手动  │ 10分/手动 │ 7分/手动  │ 10分/手动 │
   * │ flat-optimization  │ 3分/手动  │ 5分/手动  │ 4分/手动  │ 7分/手动  │
   * │ density            │ 6分/手动  │ 10分/手动 │ 5分/手动  │ 10分/手动 │
   * │ loop-edges         │ 4分/手动  │ 8分/手动  │ 4分/手动  │ 8分/手动  │
   * │ joint-density      │ 5分/手动  │ —        │ 5分/手动  │ —        │
   * │ joint-loop         │ 5分/手动  │ —        │ 5分/手动  │ —        │
   * │ articulation-point │ 10分/手动 │ —        │ 10分/手动 │ —        │
   * │ deformation-flow   │ 10分/手动 │ —        │ 10分/手动 │ —        │
   * │ blend-shape        │ 10分/手动 │ —        │ —        │ —        │
   * └────────────────────┴──────────┴──────────┴──────────┴──────────┘
   *
   * "自动" = 系统自动检测并建议分数，此处提供的人工评分会覆盖自动检测结果
   * "手动" = 人工主观评分
   * "—" = 该类型不含此准则，填写后会被忽略
   *
   * 对称性启用后，总分保持不变（100 分），但维度权重会重新分配。
   */
  reviewScores: Record<string, number>
}

/**
 * 所有示例模型的评分配置。
 * key = 示例模型 ID
 */
export const EXAMPLE_SCORES: Record<string, ExampleScoreEntry> = {

  // ═══════════════════════════════════════════════════════
  // 游戏·可动 — 优秀案例
  // ═══════════════════════════════════════════════════════
  'example_game-dynamic_excellent': {
    name: '游戏角色·优秀案例',
    evaluationType: 'game-dynamic',
    symmetryEnabled:  true,
    reviewScores: {
      'symmetry': 10,
      'quad-tri-ratio': 9,
      'tri-distribution': 9,
      'pole-distribution': 8,
      'ngon-count': 10,
      'non-manifold': 10,
      'overlapping': 10,
      'boundary-holes': 10,
      'structure': 9,
      'flat-optimization': 10,
      'density': 9,
      'loop-edges': 9,
      'joint-density': 9,
      'joint-loop': 9,
      'articulation-point': 9,
      'deformation-flow': 9,
      'blend-shape': 9,
    },
  },

  // ═══════════════════════════════════════════════════════
  // 游戏·可动 — 问题案例
  // ═══════════════════════════════════════════════════════
  'example_game-dynamic_problematic': {
    name: 'Game Character (Problematic)',
    evaluationType: 'game-dynamic',
    symmetryEnabled: true,
    reviewScores: {
      'symmetry': 0,
      'quad-tri-ratio': 10,
      'tri-distribution': 10,
      'pole-distribution': 10,
      'ngon-count': 10,
      'non-manifold': 5,
      'overlapping': 10,
      'boundary-holes': 0,
      'structure': 4,
      'flat-optimization': 5,
      'density': 6,
      'loop-edges': 5,
      'joint-density': 7,
      'joint-loop': 10,
      'articulation-point': 7,
      'deformation-flow': 10,
      'blend-shape': 4,
    },
  },

  // ═══════════════════════════════════════════════════════
  // 游戏·静态 — 优秀案例
  // ═══════════════════════════════════════════════════════
  'example_game-static_excellent': {
    name: 'Game Prop (Excellent)',
    evaluationType: 'game-static',
    symmetryEnabled: false,
    reviewScores: {
      'symmetry': 10,
      'quad-tri-ratio': 10,
      'tri-distribution': 9,
      'pole-distribution': 8,
      'ngon-count': 10,
      'non-manifold': 10,
      'overlapping': 10,
      'boundary-holes': 10,
      'structure': 9,
      'flat-optimization': 10,
      'density': 9,
      'loop-edges': 10,
    },
  },

  // ═══════════════════════════════════════════════════════
  // 游戏·静态 — 问题案例
  // ═══════════════════════════════════════════════════════
  'example_game-static_problematic': {
    name: 'Game Prop (Problematic)',
    evaluationType: 'game-static',
    symmetryEnabled: true,
    reviewScores: {
      'symmetry': 0,
      'quad-tri-ratio': 10,
      'tri-distribution': 10,
      'pole-distribution': 4,
      'ngon-count': 10,
      'non-manifold': 9,
      'overlapping': 5,
      'boundary-holes': 5,
      'structure': 4,
      'flat-optimization': 2,
      'density': 4,
      'loop-edges': 2,
    },
  },

  // ═══════════════════════════════════════════════════════
  // 通用·可动 — 优秀案例
  // ═══════════════════════════════════════════════════════
  'example_general-dynamic_excellent': {
    name: 'Film Character (Excellent)',
    evaluationType: 'general-dynamic',
    symmetryEnabled: true,
    reviewScores: {
      'symmetry': 10,
      'quad-tri-ratio': 10,
      'tri-distribution': 10,
      'pole-distribution': 10,
      'ngon-count': 10,
      'non-manifold': 10,
      'overlapping': 10,
      'boundary-holes': 10,
      'structure': 10,
      'flat-optimization': 10,
      'density': 10,
      'loop-edges': 10,
      'joint-density': 10,
      'joint-loop': 10,
      'articulation-point': 10,
      'deformation-flow': 10,
    },
  },

  // ═══════════════════════════════════════════════════════
  // 通用·可动 — 问题案例
  // ═══════════════════════════════════════════════════════
  'example_general-dynamic_problematic': {
    name: 'Film Character (Problematic)',
    evaluationType: 'general-dynamic',
    symmetryEnabled: true,
    reviewScores: {
      'symmetry': 0,
      'quad-tri-ratio': 10,
      'tri-distribution': 10,
      'pole-distribution': 0,
      'ngon-count': 10,
      'non-manifold': 0,
      'overlapping': 10,
      'boundary-holes': 0,
      'structure': 4,
      'flat-optimization': 0,
      'density': 2,
      'loop-edges': 3,
      'joint-density': 10,
      'joint-loop': 10,
      'articulation-point': 6,
      'deformation-flow': 10,
    },
  },

  // ═══════════════════════════════════════════════════════
  // 通用·静态 — 优秀案例
  // ═══════════════════════════════════════════════════════
  'example_general-static_excellent': {
    name: 'Architecture (Excellent)',
    evaluationType: 'general-static',
    symmetryEnabled: false,
    reviewScores: {
      'symmetry': 0,
      'quad-tri-ratio': 10,
      'tri-distribution': 10,
      'pole-distribution': 10,
      'ngon-count': 10,
      'non-manifold': 10,
      'overlapping': 10,
      'boundary-holes': 10,
      'structure': 10,
      'flat-optimization': 10,
      'density': 10,
      'loop-edges': 10,
    },
  },

  // ═══════════════════════════════════════════════════════
  // 通用·静态 — 问题案例
  // ═══════════════════════════════════════════════════════
  'example_general-static_problematic': {
    name: 'Display Prop (Problematic)',
    evaluationType: 'general-static',
    symmetryEnabled: false,
    reviewScores: {
      'symmetry': 0,
      'quad-tri-ratio': 10,
      'tri-distribution': 10,
      'pole-distribution': 3,
      'ngon-count': 10,
      'non-manifold': 9,
      'overlapping': 10,
      'boundary-holes': 0,
      'structure': 3,
      'flat-optimization': 0,
      'density': 0,
      'loop-edges': 2,
    },
  },
}

// ─── 计算函数：从 reviewScores 自动派生维度分、自动分、手动分、总分 ───

export interface ComputedExampleScores {
  dimensionScores: {
    dimensionId: string
    dimensionName: string
    score: number
    maxScore: number
  }[]
  autoTotal: number
  manualTotal: number
  total: number
  maxTotal: number
}

/**
 * 根据评测标准和逐条评分，自动计算所有派生分数。
 * 与 ScoringPanel 使用完全相同的计算逻辑：(reviewScore / 10) × criterionMaxScore。
 */
export function computeExampleScores(
  evaluationType: EvaluationType,
  reviewScores: Record<string, number>,
  symmetryEnabled = false,
): ComputedExampleScores {
  const standard: EvaluationStandard = getStandardByType(evaluationType, symmetryEnabled)

  let autoTotal = 0
  let manualTotal = 0
  let maxTotal = 0

  const dimensionScores = standard.dimensions.map((dim) => {
    let dimScore = 0
    let dimMax = 0

    for (const crit of dim.criteria) {
      const raw = reviewScores[crit.id] ?? 0
      const mapped = roundScore((raw / 10) * crit.maxScore)
      dimScore = roundScore(dimScore + mapped)
      dimMax += crit.maxScore

      if (crit.method === 'auto') {
        autoTotal = roundScore(autoTotal + mapped)
      } else {
        manualTotal = roundScore(manualTotal + mapped)
      }
    }

    return {
      dimensionId: dim.id,
      dimensionName: dim.name,
      score: dimScore,
      maxScore: dimMax,
    }
  })

  maxTotal = standard.dimensions.reduce((sum, dim) => sum + dim.criteria.reduce((s, c) => s + c.maxScore, 0), 0)

  return {
    dimensionScores,
    autoTotal: roundScore(autoTotal),
    manualTotal: roundScore(manualTotal),
    total: roundScore(autoTotal + manualTotal),
    maxTotal,
  }
}
