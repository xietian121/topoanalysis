export type EvalMethod = 'auto' | 'manual'
export type ModelType = 'static' | 'dynamic'

export interface EvaluationCriterion {
  id: string
  name: string
  description: string
  maxScore: number
  method: EvalMethod
  /** 评分规则简要说明（一句话公式，展示在评测卡片中） */
  scoringRule?: string
  subItems?: { name: string; description: string }[]
}

export interface EvaluationDimension {
  id: string
  name: string
  weight: number
  criteria: EvaluationCriterion[]
}

export interface EvaluationStandard {
  id: string
  modelType: ModelType
  name: string
  totalScore: number
  dimensions: EvaluationDimension[]
}
