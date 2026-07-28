import type { EvalHistoryRecord } from '@/stores/evalHistoryStore'
import type { EvaluationType } from '@/types/evaluation'
import { EXAMPLE_SCORES, computeExampleScores } from './example-scores'

/**
 * 示例模型定义（4组 × 每组1高模 + 2低模 = 12个OBJ文件）
 *
 * 目录结构：public/models/examples/{type}/
 *   ├── high.obj          ← 高模参考
 *   ├── excellent.obj     ← 优秀低模
 *   └── problematic.obj   ← 问题低模
 *
 * 评测评分定义在 src/data/example-scores.ts 中，修改该文件即可更新所有示例模型的评分。
 * autoReport 在运行时由 topology analyzer 分析模型后自动生成。
 */
export interface ExampleModelDef {
  id: string
  /** 显示名称（从 example-scores.ts 读取） */
  name: string
  type: EvaluationType
  quality: 'excellent' | 'problematic'
  description: string
  /** 低模 public 路径 */
  modelUrl: string
  /** 对应高模 public 路径 */
  referenceModelUrl: string
  /** 评测说明 */
  evaluationNote: string
  /** 评测记录（由 reviewScores 自动计算） */
  record: EvalHistoryRecord
}

/** 内部定义（不含 name/record，由 getExampleDefs 自动补全） */
interface RawExampleModelDef {
  id: string
  type: EvaluationType
  quality: 'excellent' | 'problematic'
  description: string
  modelUrl: string
  referenceModelUrl: string
  evaluationNote: string
}

// ── 路径工具 ──

function lowUrl(type: EvaluationType, quality: 'excellent' | 'problematic'): string {
  return `/models/examples/${type}/${quality}.obj`
}

function highUrl(type: EvaluationType): string {
  return `/models/examples/${type}/high.obj`
}

// ── 模型定义 ──

const exampleModels: RawExampleModelDef[] = [
  // ═══════════════════════════════════════════════════════
  // 1. 游戏·可动 — 优秀
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_game-dynamic_excellent',
    type: 'game-dynamic',
    quality: 'excellent',
    description: '标准的游戏可动角色模型，四边面占比高，关节布线规范。',
    modelUrl: lowUrl('game-dynamic', 'excellent'),
    referenceModelUrl: highUrl('game-dynamic'),
    evaluationNote: '展示了游戏可动角色的最佳实践：关节处三圈环形线、极点避开变形区、三角面集中于非关键区域。',
  },

  // ═══════════════════════════════════════════════════════
  // 2. 游戏·可动 — 问题
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_game-dynamic_problematic',
    type: 'game-dynamic',
    quality: 'problematic',
    description: '存在多处拓扑问题的游戏角色：三角面过多，关节布线不足，含N-gon。',
    modelUrl: lowUrl('game-dynamic', 'problematic'),
    referenceModelUrl: highUrl('game-dynamic'),
    evaluationNote: '故意包含常见错误，验证评测系统的问题检测能力。重点：自动检测N-gon和非流形边，关节区域评分应偏低。',
  },

  // ═══════════════════════════════════════════════════════
  // 3. 游戏·静态 — 优秀
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_game-static_excellent',
    type: 'game-static',
    quality: 'excellent',
    description: '高品质游戏武器模型，四边面占比高，布线流畅跟随结构。',
    modelUrl: lowUrl('game-static', 'excellent'),
    referenceModelUrl: highUrl('game-static'),
    evaluationNote: '静态游戏资产参考标准：极低三角面率、面错误为零、结构跟随性强。',
  },

  // ═══════════════════════════════════════════════════════
  // 4. 游戏·静态 — 问题
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_game-static_problematic',
    type: 'game-static',
    quality: 'problematic',
    description: '存在非流形边、结构跟随性差、循环线断裂的游戏场景道具。',
    modelUrl: lowUrl('game-static', 'problematic'),
    referenceModelUrl: highUrl('game-static'),
    evaluationNote: '包含非流形边和布线问题。自动检测应标记非流形边为critical，布线问题为warning。',
  },

  // ═══════════════════════════════════════════════════════
  // 5. 通用·可动 — 优秀
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_general-dynamic_excellent',
    type: 'general-dynamic',
    quality: 'excellent',
    description: '高品质影视动画角色模型，布线流畅，关节变形区域布线充足。',
    modelUrl: lowUrl('general-dynamic', 'excellent'),
    referenceModelUrl: highUrl('general-dynamic'),
    evaluationNote: '通用可动模型标杆：零面错误、布线美观流畅。面部布线可进一步加强。',
  },

  // ═══════════════════════════════════════════════════════
  // 6. 通用·可动 — 问题
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_general-dynamic_problematic',
    type: 'general-dynamic',
    quality: 'problematic',
    description: '存在重叠面和N-gon的影视角色模型，关节布线混乱。',
    modelUrl: lowUrl('general-dynamic', 'problematic'),
    referenceModelUrl: highUrl('general-dynamic'),
    evaluationNote: '包含重叠面和关节布线问题。自动检测应捕获重叠面，人工审核应标记关节布线为critical。',
  },

  // ═══════════════════════════════════════════════════════
  // 7. 通用·静态 — 优秀
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_general-static_excellent',
    type: 'general-static',
    quality: 'excellent',
    description: '高品质建筑可视化模型，布线整齐规范，循环线完整。',
    modelUrl: lowUrl('general-static', 'excellent'),
    referenceModelUrl: highUrl('general-static'),
    evaluationNote: '通用静态模型参考标准：零拓扑错误、布线结构清晰、循环线完整。',
  },

  // ═══════════════════════════════════════════════════════
  // 8. 通用·静态 — 问题
  // ═══════════════════════════════════════════════════════
  {
    id: 'example_general-static_problematic',
    type: 'general-static',
    quality: 'problematic',
    description: '三角面占比高、布线杂乱，存在非流形边。',
    modelUrl: lowUrl('general-static', 'problematic'),
    referenceModelUrl: highUrl('general-static'),
    evaluationNote: '高三角面占比 + 非流形边 + 布线杂乱。自动检测应标记三角面率和非流形边。',
  },
]

export default exampleModels

// ── 构建 EvalHistoryRecord ──

/** 从评分配置 + 模型定义构建完整的 EvalHistoryRecord */
function buildRecord(def: { id: string; type: EvaluationType }): EvalHistoryRecord {
  const scoreEntry = EXAMPLE_SCORES[def.id]
  if (!scoreEntry) {
    throw new Error(`Missing score entry for example model: ${def.id}`)
  }

  const computed = computeExampleScores(def.type, scoreEntry.reviewScores, scoreEntry.symmetryEnabled)

  // 模型文件大小（固定值，仅用于显示）
  const FILE_SIZES: Record<string, number> = {
    'example_game-dynamic_excellent': 2314079,
    'example_game-dynamic_problematic': 2666072,
    'example_game-static_excellent': 2058867,
    'example_game-static_problematic': 2378443,
    'example_general-dynamic_excellent': 13554763,
    'example_general-dynamic_problematic': 5944292,
    'example_general-static_excellent': 10535918,
    'example_general-static_problematic': 7477878,
  }

  // 创建时间（固定值，仅用于排序显示）
  const CREATED_DATES: Record<string, string> = {
    'example_game-dynamic_excellent': '2026-07-26T00:00:00Z',
    'example_game-dynamic_problematic': '2026-07-25T00:00:00Z',
    'example_game-static_excellent': '2026-07-24T00:00:00Z',
    'example_game-static_problematic': '2026-07-23T00:00:00Z',
    'example_general-dynamic_excellent': '2026-07-22T00:00:00Z',
    'example_general-dynamic_problematic': '2026-07-21T00:00:00Z',
    'example_general-static_excellent': '2026-07-20T00:00:00Z',
    'example_general-static_problematic': '2026-07-19T00:00:00Z',
  }

  return {
    id: def.id,
    modelName: scoreEntry.name,
    modelFormat: 'obj',
    modelFileSize: FILE_SIZES[def.id] ?? 0,
    evaluationType: def.type,
    createdAt: CREATED_DATES[def.id] ?? '2026-01-01T00:00:00Z',
    autoTotal: computed.autoTotal,
    manualTotal: computed.manualTotal,
    total: computed.total,
    maxTotal: computed.maxTotal,
    dimensionScores: computed.dimensionScores,
    autoReport: null,
    manualRatings: {},
    reviewScores: scoreEntry.reviewScores,
    symmetryEnabled: scoreEntry.symmetryEnabled,
    isExample: true,
    evalStatus: 'completed',
  }
}

export function getExampleRecords(): EvalHistoryRecord[] {
  return exampleModels.map((def) => ({
    ...buildRecord(def),
    modelUrl: def.modelUrl,
  }))
}

export function getExampleDefs(): ExampleModelDef[] {
  return exampleModels.map((def) => ({
    ...def,
    name: EXAMPLE_SCORES[def.id]?.name ?? def.id,
    record: buildRecord(def),
  }))
}

export function getExamplesByType(type: EvaluationType): ExampleModelDef[] {
  return getExampleDefs().filter((e) => e.type === type)
}

export function getExamplesByQuality(quality: 'excellent' | 'problematic'): ExampleModelDef[] {
  return getExampleDefs().filter((e) => e.quality === quality)
}
