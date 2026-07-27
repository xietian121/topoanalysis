export type EvalMethod = 'auto' | 'manual'

/** 模型用途 */
export type ModelUsage = 'game' | 'general'
/** 模型动效类型（保留旧名称兼容） */
export type ModelAnimation = 'static' | 'dynamic'
/** Phase 1 兼容类型 */
export type LegacyModelType = 'static' | 'dynamic'
/** Phase 2 评测标准组合键 */
export type EvaluationType = 'game-static' | 'game-dynamic' | 'general-static' | 'general-dynamic'

/** 模型类型（Phase 2 新格式） */
export interface ModelTypeInfo {
  usage: ModelUsage
  animation: ModelAnimation
}

/** 模型类型标签映射 */
export const MODEL_TYPE_LABELS: Record<EvaluationType, string> = {
  'game-static': '游戏·静态模型',
  'game-dynamic': '游戏·可动模型',
  'general-static': '通用·静态模型',
  'general-dynamic': '通用·可动模型',
}

export const MODEL_USAGE_LABELS: Record<ModelUsage, string> = {
  game: '游戏模型',
  general: '非游戏模型',
}

export const MODEL_ANIMATION_LABELS: Record<ModelAnimation, string> = {
  static: '静态模型',
  dynamic: '可动模型',
}

/** 类型标签颜色 */
export const MODEL_USAGE_COLORS: Record<ModelUsage, string> = {
  game: 'bg-blue-100 text-blue-700',
  general: 'bg-purple-100 text-purple-700',
}

export const MODEL_ANIMATION_COLORS: Record<ModelAnimation, string> = {
  static: 'bg-green-100 text-green-700',
  dynamic: 'bg-orange-100 text-orange-700',
}

/** ModelTypeInfo → EvaluationType */
export function toEvaluationType(info: ModelTypeInfo): EvaluationType {
  return `${info.usage}-${info.animation}`
}

/** EvaluationType → ModelTypeInfo */
export function fromEvaluationType(type: EvaluationType): ModelTypeInfo {
  const [usage, animation] = type.split('-') as [ModelUsage, ModelAnimation]
  return { usage, animation }
}

/** Legacy ModelType → EvaluationType (向后兼容) */
export function legacyToEvaluationType(legacy: LegacyModelType, usage: ModelUsage = 'game'): EvaluationType {
  return `${usage}-${legacy}`
}

export interface EvaluationCriterion {
  id: string
  name: string
  description: string
  maxScore: number
  method: EvalMethod
  /** 评分规则简要说明（一句话公式，展示在评测卡片中） */
  scoringRule?: string
  subItems?: { name: string; description: string }[]
  /** 是否为可选准则（如对称性），需用户手动启用后才可打分 */
  optional?: boolean
}

export interface EvaluationDimension {
  id: string
  name: string
  weight: number
  criteria: EvaluationCriterion[]
}

export interface EvaluationStandard {
  id: string
  evaluationType: EvaluationType
  name: string
  totalScore: number
  dimensions: EvaluationDimension[]
}

// ===== Phase 2 新增：优化建议 =====

export interface SuggestionItem {
  title: string
  description: string
  why: string
  howToFix: string
  relatedCriterionId?: string
}

export interface EvaluationSuggestions {
  critical: SuggestionItem[]
  warning: SuggestionItem[]
  good: SuggestionItem[]
  summary: string
}

// ===== Phase 2 新增：对比分析 =====

export interface CompareResult {
  modelA: {
    id: string
    name: string
    type: EvaluationType
    total: number
    dimensionScores: { dimensionId: string; dimensionName: string; score: number; maxScore: number }[]
  }
  modelB: {
    id: string
    name: string
    type: EvaluationType
    total: number
    dimensionScores: { dimensionId: string; dimensionName: string; score: number; maxScore: number }[]
  }
  winner: 'A' | 'B' | 'draw'
  totalDiff: number
  dimensionDiffs: {
    dimensionName: string
    diff: number
    winner: 'A' | 'B' | 'draw'
    significant: boolean
  }[]
  analysis: string[]
  commonIssues: string[]
}

// ===== Phase 2 新增：数据分析 =====

export interface AnalyticsData {
  totalModels: number
  averageScore: number
  excellentRate: number
  topIssue: { name: string; rate: number }
  scoreDistribution: { range: string; count: number; label: string }[]
  qualityBreakdown: { level: string; count: number; pct: number }[]
  dimensionAverages: { dimensionName: string; avgScore: number; maxScore: number }[]
  frequentIssues: { name: string; rate: number; severity: 'high' | 'medium' | 'low'; suggestion: string }[]
  categoryComparison: {
    label: string
    dimensions: { dimensionName: string; avgScore: number; maxScore: number }[]
  }[]
  insights: string[]
}
