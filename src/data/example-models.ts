import type { EvalHistoryRecord } from '@/stores/evalHistoryStore'
import type { EvaluationType } from '@/types/evaluation'

/**
 * 示例模型定义（4组 × 每组1高模 + 2低模 = 12个OBJ文件）
 *
 * 目录结构：public/models/examples/{type}/
 *   ├── high.obj          ← 高模参考
 *   ├── excellent.obj     ← 优秀低模
 *   └── problematic.obj   ← 问题低模
 *
 * autoReport 由运行时 topology analyzer 分析真实模型自动生成。
 * dimensionScores 为预估值——实际得分由 autoReport + manualRatings 决定。
 */
export interface ExampleModelDef {
  id: string
  name: string
  type: EvaluationType
  quality: 'excellent' | 'problematic'
  description: string
  /** 低模 public 路径 */
  modelUrl: string
  /** 对应高模 public 路径 */
  referenceModelUrl: string
  /** 评测说明（面试评估上下文） */
  evaluationNote: string
  record: EvalHistoryRecord
}

// ── 路径工具 ──

function lowUrl(type: EvaluationType, quality: 'excellent' | 'problematic'): string {
  return `/models/examples/${type}/${quality}.obj`
}

function highUrl(type: EvaluationType): string {
  return `/models/examples/${type}/high.obj`
}

// ── 模型定义 ──

const exampleModels: ExampleModelDef[] = [
  // ═══════════════════════════════════════════════════════
  // 1. 游戏·可动 — 优秀
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_game-dynamic_excellent',
    name: '游戏角色·优秀案例',
    type: 'game-dynamic',
    quality: 'excellent',
    description: '标准的游戏可动角色模型，四边面占比高，关节布线规范。',
    modelUrl: lowUrl('game-dynamic', 'excellent'),
    referenceModelUrl: highUrl('game-dynamic'),
    evaluationNote: '展示了游戏可动角色的最佳实践：关节处三圈环形线、极点避开变形区、三角面集中于非关键区域。',
    record: {
      id: 'example_game-dynamic_excellent',
      modelName: '游戏角色·优秀案例',
      modelFormat: 'obj',
      modelFileSize: 2314079,
      evaluationType: 'game-dynamic',
      createdAt: '2026-07-26T00:00:00Z',
      autoTotal: 33,
      manualTotal: 55,
      total: 88,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 13, maxScore: 15 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 23, maxScore: 25 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 17, maxScore: 20 },
        { dimensionId: 'animation-friendly', dimensionName: '绑定动画友好性', score: 35, maxScore: 40 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
    },
  },

  // ═══════════════════════════════════════════════════════
  // 2. 游戏·可动 — 问题
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_game-dynamic_problematic',
    name: '游戏角色·问题案例',
    type: 'game-dynamic',
    quality: 'problematic',
    description: '存在多处拓扑问题的游戏角色：三角面过多，关节布线不足，含N-gon。',
    modelUrl: lowUrl('game-dynamic', 'problematic'),
    referenceModelUrl: highUrl('game-dynamic'),
    evaluationNote: '故意包含常见错误，验证评测系统的问题检测能力。重点：自动检测N-gon和非流形边，关节区域评分应偏低。',
    record: {
      id: 'example_game-dynamic_problematic',
      modelName: 'Game Character (Problematic)',
      modelFormat: 'obj',
      modelFileSize: 2666072,
      evaluationType: 'game-dynamic',
      createdAt: '2026-07-25T00:00:00Z',
      autoTotal: 14,
      manualTotal: 33,
      total: 47,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 6, maxScore: 15 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 14, maxScore: 25 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 12, maxScore: 20 },
        { dimensionId: 'animation-friendly', dimensionName: '绑定动画友好性', score: 15, maxScore: 40 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
    },
  },

  // ═══════════════════════════════════════════════════════
  // 3. 游戏·静态 — 优秀
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_game-static_excellent',
    name: '游戏道具·优秀案例',
    type: 'game-static',
    quality: 'excellent',
    description: '高品质游戏武器模型，四边面占比高，布线流畅跟随结构。',
    modelUrl: lowUrl('game-static', 'excellent'),
    referenceModelUrl: highUrl('game-static'),
    evaluationNote: '静态游戏资产参考标准：极低三角面率、面错误为零、结构跟随性强。',
    record: {
      id: 'example_game-static_excellent',
      modelName: 'Game Prop (Excellent)',
      modelFormat: 'obj',
      modelFileSize: 0,
      evaluationType: 'game-static',
      createdAt: '2026-07-24T00:00:00Z',
      autoTotal: 37,
      manualTotal: 53,
      total: 90,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 27, maxScore: 30 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 28, maxScore: 30 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 35, maxScore: 40 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
    },
  },

  // ═══════════════════════════════════════════════════════
  // 4. 游戏·静态 — 问题
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_game-static_problematic',
    name: '游戏道具·问题案例',
    type: 'game-static',
    quality: 'problematic',
    description: '存在非流形边、结构跟随性差、循环线断裂的游戏场景道具。',
    modelUrl: lowUrl('game-static', 'problematic'),
    referenceModelUrl: highUrl('game-static'),
    evaluationNote: '包含非流形边和布线问题。自动检测应标记非流形边为critical，布线问题为warning。',
    record: {
      id: 'example_game-static_problematic',
      modelName: 'Game Prop (Problematic)',
      modelFormat: 'obj',
      modelFileSize: 0,
      evaluationType: 'game-static',
      createdAt: '2026-07-23T00:00:00Z',
      autoTotal: 19,
      manualTotal: 31,
      total: 50,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 16, maxScore: 30 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 15, maxScore: 30 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 19, maxScore: 40 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
    },
  },

  // ═══════════════════════════════════════════════════════
  // 5. 通用·可动 — 优秀
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_general-dynamic_excellent',
    name: '影视角色·优秀案例',
    type: 'general-dynamic',
    quality: 'excellent',
    description: '高品质影视动画角色模型，布线流畅，关节变形区域布线充足。',
    modelUrl: lowUrl('general-dynamic', 'excellent'),
    referenceModelUrl: highUrl('general-dynamic'),
    evaluationNote: '通用可动模型标杆：零面错误、布线美观流畅。面部布线可进一步加强。',
    record: {
      id: 'example_general-dynamic_excellent',
      modelName: 'Film Character (Excellent)',
      modelFormat: 'obj',
      modelFileSize: 0,
      evaluationType: 'general-dynamic',
      createdAt: '2026-07-22T00:00:00Z',
      autoTotal: 33,
      manualTotal: 50,
      total: 83,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 16, maxScore: 20 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 23, maxScore: 25 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 22, maxScore: 25 },
        { dimensionId: 'animation-friendly', dimensionName: '绑定动画友好性', score: 22, maxScore: 30 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
    },
  },

  // ═══════════════════════════════════════════════════════
  // 6. 通用·可动 — 问题
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_general-dynamic_problematic',
    name: '影视角色·问题案例',
    type: 'general-dynamic',
    quality: 'problematic',
    description: '存在重叠面和N-gon的影视角色模型，关节布线混乱。',
    modelUrl: lowUrl('general-dynamic', 'problematic'),
    referenceModelUrl: highUrl('general-dynamic'),
    evaluationNote: '包含重叠面和关节布线问题。自动检测应捕获重叠面，人工审核应标记关节布线为critical。',
    record: {
      id: 'example_general-dynamic_problematic',
      modelName: 'Film Character (Problematic)',
      modelFormat: 'obj',
      modelFileSize: 0,
      evaluationType: 'general-dynamic',
      createdAt: '2026-07-21T00:00:00Z',
      autoTotal: 15,
      manualTotal: 33,
      total: 48,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 9, maxScore: 20 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 12, maxScore: 25 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 14, maxScore: 25 },
        { dimensionId: 'animation-friendly', dimensionName: '绑定动画友好性', score: 13, maxScore: 30 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
    },
  },

  // ═══════════════════════════════════════════════════════
  // 7. 通用·静态 — 优秀
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_general-static_excellent',
    name: '建筑场景·优秀案例',
    type: 'general-static',
    quality: 'excellent',
    description: '高品质建筑可视化模型，布线整齐规范，循环线完整。',
    modelUrl: lowUrl('general-static', 'excellent'),
    referenceModelUrl: highUrl('general-static'),
    evaluationNote: '通用静态模型参考标准：零拓扑错误、布线结构清晰、循环线完整。',
    record: {
      id: 'example_general-static_excellent',
      modelName: 'Architecture (Excellent)',
      modelFormat: 'obj',
      modelFileSize: 0,
      evaluationType: 'general-static',
      createdAt: '2026-07-20T00:00:00Z',
      autoTotal: 38,
      manualTotal: 50,
      total: 88,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 31, maxScore: 35 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 28, maxScore: 30 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 29, maxScore: 35 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
    },
  },

  // ═══════════════════════════════════════════════════════
  // 8. 通用·静态 — 问题
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_general-static_problematic',
    name: '展示道具·问题案例',
    type: 'general-static',
    quality: 'problematic',
    description: '三角面占比高、布线杂乱，存在非流形边。',
    modelUrl: lowUrl('general-static', 'problematic'),
    referenceModelUrl: highUrl('general-static'),
    evaluationNote: '高三角面占比 + 非流形边 + 布线杂乱。自动检测应标记三角面率和非流形边。',
    record: {
      id: 'example_general-static_problematic',
      modelName: 'Display Prop (Problematic)',
      modelFormat: 'obj',
      modelFileSize: 0,
      evaluationType: 'general-static',
      createdAt: '2026-07-19T00:00:00Z',
      autoTotal: 14,
      manualTotal: 31,
      total: 45,
      maxTotal: 100,
      dimensionScores: [
        { dimensionId: 'face-quality', dimensionName: '面型质量', score: 14, maxScore: 35 },
        { dimensionId: 'face-errors', dimensionName: '面错误', score: 15, maxScore: 30 },
        { dimensionId: 'edge-flow', dimensionName: '布线合理性', score: 16, maxScore: 35 },
      ],
      autoReport: null,
      manualRatings: {},
      reviewScores: {},
      isExample: true,
      evalStatus: 'completed',
    },
  },
]

export default exampleModels

export function getExampleRecords(): EvalHistoryRecord[] {
  return exampleModels.map((e) => ({ ...e.record, modelUrl: e.modelUrl }))
}

export function getExampleDefs(): ExampleModelDef[] {
  return exampleModels
}

export function getExamplesByType(type: EvaluationType): ExampleModelDef[] {
  return exampleModels.filter((e) => e.type === type)
}

export function getExamplesByQuality(quality: 'excellent' | 'problematic'): ExampleModelDef[] {
  return exampleModels.filter((e) => e.quality === quality)
}
