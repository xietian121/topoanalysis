/**
 * AI 驱动的深度分析模块
 * 将评测数据发送给 DeepSeek，生成专业级的分析报告
 */

import { askDeepSeek } from './deepseek'
import type { EvalHistoryRecord } from '@/stores/evalHistoryStore'
import type { TopologyReport } from './topology-analyzer'

export interface AIAnalysisResult {
  /** 生成的完整分析文本（Markdown 格式） */
  content: string
  /** 生成时间 */
  generatedAt: string
  /** 使用的模型 */
  model: string
}

/**
 * 为单个模型评测记录生成 AI 深度分析
 */
export async function generateAIAnalysis(record: EvalHistoryRecord): Promise<AIAnalysisResult> {
  const prompt = buildSingleAnalysisPrompt(record)

  const content = await askDeepSeek(SYSTEM_PROMPT, prompt, {
    temperature: 0.5,
    maxTokens: 2048,
  })

  return {
    content,
    generatedAt: new Date().toISOString(),
    model: 'deepseek-chat',
  }
}

/**
 * 为两个模型的 PK 对比生成 AI 分析
 */
export async function generateAICompareAnalysis(
  recordA: EvalHistoryRecord,
  recordB: EvalHistoryRecord,
): Promise<string> {
  const prompt = buildCompareAnalysisPrompt(recordA, recordB)

  return askDeepSeek(SYSTEM_PROMPT_COMPARE, prompt, {
    temperature: 0.5,
    maxTokens: 2048,
  })
}

// ===================== 提示词 =====================

const SYSTEM_PROMPT = `你是一位资深3D资产技术总监，拥有15年以上游戏和影视行业的拓扑建模经验。你的职责是对3D低模资产的拓扑质量进行专业、尖锐但建设性的评审。

分析原则：
1. 使用专业术语（N-gon、非流形边、极点、循环线、蒙皮权重等），但不要堆砌术语
2. 给出具体的、可操作的改进建议，而非泛泛而谈
3. 按优先级排序：先处理致命缺陷，再说优化方向
4. 对游戏模型（可动/静态）和通用模型使用不同的评判尺度
5. 评分只是一个参考，重点是问题分析和改进路径
6. 语气专业、直接，能一针见血指出问题的本质原因
7. **破洞（边界边）判断规则**：如果破洞相关准则的实际评分 > 6 分（满分10），说明破洞数量可控或为建模师有意保留（为减少面数、优化性能），不应报告为致命缺陷或严重问题。仅当评分 ≤ 6 分时，才将破洞列为需要重点关注的严重问题。

输出格式要求（使用 Markdown）：
### 总体评价
[2-3句话的总体诊断，直击要害]

### 🔴 致命缺陷（必须修复）
[列出0-N个致命问题，每个用 - 开头，一句话说清楚]

### 🟡 优化建议（推荐改进）
[列出0-N条建议，按优先级排]

### 🟢 亮点（保持优势）
[列出0-N条做得好的地方]

### 📐 行业对标
[1-2句话对比该模型在同类资产中处于什么水平]

### 🎯 改进路线图
[按优先级给出3-5步改进路径，每步一行]
`

const SYSTEM_PROMPT_COMPARE = `你是一位资深3D资产技术总监。你的任务是对两个3D模型的拓扑质量进行对比分析。

分析原则：
1. 不简单地说"A比B好"，要指出具体哪个维度、为什么
2. 分析两个模型的各自优势和短板
3. 如果适用场景不同，指出各自适合什么用途
4. 给出如果有高模参考，哪个低模更好地保留了高模的结构

输出格式要求（使用 Markdown）：
### 🏆 综合结论
[2-3句话综合对比结论]

### 模型A 优势与短板
- 优势：[...]
- 短板：[...]

### 模型B 优势与短板
- 优势：[...]
- 短板：[...]

### 🔍 关键差异
[对比最显著的2-3个差异点]

### 💡 改进建议
[针对每个模型分别给出最关键的1-2条改进建议]
`

// ===================== 数据 → 提示词 =====================

function formatAutoReport(r: TopologyReport | null): string {
  if (!r) return '无自动检测数据'
  const { faceStats, nonManifold, overlapping, boundary, poleStats } = r
  return [
    `面型统计: 三角面 ${faceStats.triCount} 个 (${faceStats.triPct.toFixed(1)}%)，四边面 ${faceStats.quadCount} 个 (${faceStats.quadPct.toFixed(1)}%)，N-gon ${faceStats.ngonCount} 个`,
    `总面数: ${faceStats.totalFaces}`,
    `非流形边: ${nonManifold.count} 条`,
    `重叠面: ${overlapping.count} 组`,
    `边界边（破洞）: ${boundary.count} 条`,
    `极点(≥6边): ${poleStats.count} 个`,
  ].join('\n')
}

function formatDimensions(record: EvalHistoryRecord): string {
  return record.dimensionScores.map((d) => {
    const pct = d.maxScore > 0 ? ((d.score / d.maxScore) * 100).toFixed(1) : '0'
    return `- ${d.dimensionName}: ${d.score}/${d.maxScore} (${pct}%)`
  }).join('\n')
}

/** Per-criterion raw scores (1-10) so the AI can apply threshold-based rules */
function formatCriterionScores(record: EvalHistoryRecord): string {
  if (!record.reviewScores || Object.keys(record.reviewScores).length === 0) return '无逐条评分数据'
  // Map criterion IDs to human-readable names
  const nameMap: Record<string, string> = {
    'quad-tri-ratio': '四边/三角面比例',
    'tri-distribution': '三角面分布合理性',
    'pole-distribution': '极点分布',
    'ngon-count': '多边形面(N-gon)',
    'non-manifold': '非流形边',
    'overlapping': '重叠面',
    'boundary-holes': '破洞面(边界边)',
    'density': '平坦区域面数控制',
    'structure': '结构跟随性',
    'loop-edges': '循环线完整性',
    'joint-density': '关节区域面数倾斜',
    'joint-loop-edges': '可动部位环形线',
  }
  return Object.entries(record.reviewScores)
    .map(([id, score]) => `- ${nameMap[id] ?? id}: ${score}/10`)
    .join('\n')
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'game-static': '游戏·静态模型',
    'game-dynamic': '游戏·可动模型（有骨骼动画）',
    'general-static': '通用·静态模型',
    'general-dynamic': '通用·可动模型（有骨骼动画）',
  }
  return labels[type] ?? type
}

function buildSingleAnalysisPrompt(record: EvalHistoryRecord): string {
  const typeLabel = getTypeLabel(record.evaluationType)
  const ratio = record.maxTotal > 0 ? ((record.total / record.maxTotal) * 100).toFixed(1) : '0'

  let existingSuggestions = ''
  if (record.suggestions) {
    const parts: string[] = []
    if (record.suggestions.critical.length > 0) {
      parts.push('规则引擎已识别的严重问题:\n' + record.suggestions.critical.map(s => `- ${s.title}: ${s.description}`).join('\n'))
    }
    if (record.suggestions.warning.length > 0) {
      parts.push('规则引擎已识别的优化建议:\n' + record.suggestions.warning.map(s => `- ${s.title}: ${s.description}`).join('\n'))
    }
    existingSuggestions = parts.join('\n\n')
  }

  return `请对该3D低模资产进行专业拓扑评审。

【基本信息】
- 模型名称: ${record.modelName.replace(/\s*\(OBJ\).*/, '')}
- 格式: ${record.modelFormat.toUpperCase()}
- 文件大小: ${formatSizeForAI(record.modelFileSize)}
- 评测标准: ${typeLabel}
- 评测时间: ${record.createdAt}

【得分概况】
- 总分: ${record.total.toFixed(1)} / ${record.maxTotal} (${ratio}%)
- 自动检测得分: ${record.autoTotal.toFixed(1)}
- 人工评测得分: ${record.manualTotal.toFixed(1)}

【各维度得分】
${formatDimensions(record)}

【逐条准则评分（原始1-10分）】
${formatCriterionScores(record)}

【自动拓扑检测数据】
${formatAutoReport(record.autoReport)}

${existingSuggestions ? '【规则引擎初步分析】\n' + existingSuggestions : ''}

请给出你的专业评审意见。`
}

function buildCompareAnalysisPrompt(recordA: EvalHistoryRecord, recordB: EvalHistoryRecord): string {
  const ratioA = recordA.maxTotal > 0 ? ((recordA.total / recordA.maxTotal) * 100).toFixed(1) : '0'
  const ratioB = recordB.maxTotal > 0 ? ((recordB.total / recordB.maxTotal) * 100).toFixed(1) : '0'

  return `请对比分析两个3D低模资产的拓扑质量。

【模型A】
- 名称: ${recordA.modelName.replace(/\s*\(OBJ\).*/, '')}
- 类型: ${getTypeLabel(recordA.evaluationType)}
- 总分: ${recordA.total.toFixed(1)}/${recordA.maxTotal} (${ratioA}%)
- 维度得分:
${formatDimensions(recordA)}
- 自动检测:
${formatAutoReport(recordA.autoReport)}

【模型B】
- 名称: ${recordB.modelName.replace(/\s*\(OBJ\).*/, '')}
- 类型: ${getTypeLabel(recordB.evaluationType)}
- 总分: ${recordB.total.toFixed(1)}/${recordB.maxTotal} (${ratioB}%)
- 维度得分:
${formatDimensions(recordB)}
- 自动检测:
${formatAutoReport(recordB.autoReport)}

请给出专业对比分析。`
}

function formatSizeForAI(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
