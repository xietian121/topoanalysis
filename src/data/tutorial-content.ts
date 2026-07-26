import type { EvaluationType } from '@/types/evaluation'

export interface TutorialCriterionContent {
  criterionId: string
  problemAnalysis: string
  whyBad: string
  goodPractice: string
  judgingStandard: string
}

export interface TutorialDimensionContent {
  dimensionId: string
  dimensionName: string
  criteria: TutorialCriterionContent[]
}

export interface TutorialTypeContent {
  type: EvaluationType
  title: string
  description: string
  dimensions: TutorialDimensionContent[]
}

/**
 * 专业讲解内容占位数据。
 * 这部分内容由资深主美自行编写，体现专业判断能力。
 * 数据结构已就绪，填充内容后即可在 TutorialPage 中渲染。
 */
const PLACEHOLDER_CRITERION: TutorialCriterionContent = {
  criterionId: '',
  problemAnalysis: '（待填充：问题模型的具体问题分析）',
  whyBad: '（待填充：为什么这是问题，专业原理解释）',
  goodPractice: '（待填充：优秀模型的做法）',
  judgingStandard: '（待填充：核心判断标准/知识点）',
}

function makePlaceholderDimensions(type: EvaluationType): TutorialDimensionContent[] {
  const isDynamic = type.endsWith('-dynamic')
  const dims: TutorialDimensionContent[] = [
    {
      dimensionId: 'face-quality',
      dimensionName: '面型质量',
      criteria: [
        { ...PLACEHOLDER_CRITERION, criterionId: 'quad-tri-ratio' },
        { ...PLACEHOLDER_CRITERION, criterionId: 'tri-distribution' },
        { ...PLACEHOLDER_CRITERION, criterionId: 'pole-distribution' },
      ],
    },
    {
      dimensionId: 'face-errors',
      dimensionName: '面错误',
      criteria: [
        { ...PLACEHOLDER_CRITERION, criterionId: 'ngon-count' },
        { ...PLACEHOLDER_CRITERION, criterionId: 'non-manifold' },
        { ...PLACEHOLDER_CRITERION, criterionId: 'overlapping' },
        { ...PLACEHOLDER_CRITERION, criterionId: 'boundary-holes' },
      ],
    },
    {
      dimensionId: 'edge-flow',
      dimensionName: '布线合理性',
      criteria: [
        { ...PLACEHOLDER_CRITERION, criterionId: 'structure' },
        { ...PLACEHOLDER_CRITERION, criterionId: 'flat-optimization' },
        { ...PLACEHOLDER_CRITERION, criterionId: 'density' },
        { ...PLACEHOLDER_CRITERION, criterionId: 'loop-edges' },
      ],
    },
  ]

  if (isDynamic) {
    dims.push({
      dimensionId: 'animation-friendly',
      dimensionName: '绑定动画友好性',
      criteria: [
        { ...PLACEHOLDER_CRITERION, criterionId: 'joint-density' },
        { ...PLACEHOLDER_CRITERION, criterionId: 'joint-loop' },
      ],
    })
  }

  return dims
}

export const TUTORIAL_CONTENT: TutorialTypeContent[] = [
  {
    type: 'game-static',
    title: '游戏静态模型拓扑对比教学',
    description: '对比游戏静态模型中的优秀案例与问题案例，理解低面数场景道具的拓扑标准。',
    dimensions: makePlaceholderDimensions('game-static'),
  },
  {
    type: 'game-dynamic',
    title: '游戏可动模型拓扑对比教学',
    description: '对比游戏可动角色中的优秀案例与问题案例，深入理解关节布线和变形区域的拓扑要求。',
    dimensions: makePlaceholderDimensions('game-dynamic'),
  },
  {
    type: 'general-static',
    title: '通用静态模型拓扑对比教学',
    description: '对比通用静态模型中的优秀案例与问题案例，掌握高面数展示模型的布线规范。',
    dimensions: makePlaceholderDimensions('general-static'),
  },
  {
    type: 'general-dynamic',
    title: '通用可动模型拓扑对比教学',
    description: '对比通用可动模型中的优秀案例与问题案例，学习影视级可动资产的拓扑标准。',
    dimensions: makePlaceholderDimensions('general-dynamic'),
  },
]

/** 根据评测类型获取教程内容 */
export function getTutorialContent(type: EvaluationType): TutorialTypeContent | undefined {
  return TUTORIAL_CONTENT.find((t) => t.type === type)
}
