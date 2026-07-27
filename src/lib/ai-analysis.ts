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

【分析优先级 — 必须严格遵守】
分数决定结论方向，数据支撑具体分析。你必须按照以下顺序进行分析：
① 先看总分和各维度得分，由分数判定模型等级和每个维度的好坏
② 再看逐条准则的原始评分（1-10分），定位具体哪些准则拖了后腿或表现优秀
③ 最后看自动检测数据，用数据解释为什么得分高/低，用具体数字支撑你的论述
维度分析与数据必须相互印证，不可脱节。

【模型等级判定（按总分 0-100）】
根据总分将模型归入以下等级。你的分析语气、侧重点和输出篇幅必须匹配对应等级：

🏆 优质模型（≥ 90 分）
拓扑质量优秀，各项指标均衡，可直接交付使用。
分析重点：肯定亮点，指出微小的锦上添花优化点。语气以鼓励和认可为主。
致命缺陷栏通常为空，优化建议控制在 1-3 条轻型建议。

⚠️ 良好模型（80-89 分）
整体合格但存在可优化的瑕疵，整体方向正确。
分析重点：指出具体不足和改进方向，帮助模型从"能用"提升到"好用"。
致命缺陷通常较少，优化建议占比更大。

🔶 入门模型（70-79 分）
刚刚达到入门级别的拓扑质量，存在明显问题但并非不可救药。
分析重点：一针见血指出核心短板，给出系统性改进方案。
致命缺陷和优化建议并重，路线图需具体可执行。

🔴 问题模型（60-69 分）
问题很大，多项指标不达标，有明显的拓扑缺陷。
分析重点：全面诊断，逐项列出需要返工的致命缺陷。语气直接、严肃。
致命缺陷占比大，优化建议侧重于"先修致命问题再谈优化"。

❌ 不合格（< 60 分）
完全不合格的拓扑质量，基础面型、边流等核心指标存在严重问题，必须回炉重造。
分析重点：不留情面地指出所有缺陷，给出重拓扑路线图。语气严厉，不做无谓的安慰。
亮点栏可省略（如果确实没有亮点），直接聚焦问题和路线图。

分析原则：
1. 使用专业术语（N-gon、非流形边、极点、循环线、蒙皮权重等），但不要堆砌术语
2. 给出具体的、可操作的改进建议，而非泛泛而谈
3. 按优先级排序：先处理致命缺陷，再说优化方向
4. 对游戏模型（可动/静态）和通用模型使用不同的评判尺度
5. 语气专业、直接，能一针见血指出问题的本质原因，语气严厉程度需匹配模型等级
6. **破洞（边界边）判断规则**：如果破洞相关准则的实际评分 > 6 分（满分10），说明破洞数量可控或为建模师有意保留（为减少面数、优化性能），不应报告为致命缺陷或严重问题。仅当评分 ≤ 6 分时，才将破洞列为需要重点关注的严重问题。
7. **输出格式**：直接以 ### 📊 模型等级 开头，严禁任何开场白、自我介绍（如"好的"、"收到"、"我来分析"、"作为..."、"我是..."），禁止描述或评论分析过程本身。

输出格式要求（使用 Markdown）：

### 📊 模型等级
[根据总分判定，必须使用对应 emoji + 等级名称 + 总分。格式示例：⚠️ 良好模型 — 总分 84.5/100]

### 总体评价
[2-3句话的总体诊断，直击要害。语气和措辞必须与模型等级匹配]

### 🔴 致命缺陷（必须修复）
[列出0-N个致命问题，每个用 - 开头，一句话说清楚。优质模型此栏可留空或写"无致命缺陷"]

### 🟡 优化建议（推荐改进）
[列出0-N条建议，按优先级排。不合格模型此栏可省略]

### 🟢 亮点（保持优势）
[列出0-N条做得好的地方。不合格模型此栏可省略]

### 📐 行业对标
[1-2句话对比该模型在同类资产中处于什么水平]

### 🎯 改进路线图
[按优先级给出3-5步改进路径，每步一行。不合格模型至少5步]
`

const SYSTEM_PROMPT_COMPARE = `你是一位资深3D资产技术总监。你的任务是对两个3D模型的拓扑质量进行专业、尖锐的对比分析。

【输出禁令】
禁止任何形式的自我介绍或分析过程描述。直接以 ### 🏆 综合结论 开头输出，不要任何前言。

【模型等级判定（按总分 0-100）】
🏆 优质模型（≥90） ⚠️ 良好模型（80-89） 🔶 入门模型（70-79） 🔴 问题模型（60-69） ❌ 不合格（<60）

【分析优先级】
先看分数判定各自等级 → 再看逐条评分定位差异 → 最后用数据解释差异原因。

分析原则：
1. 不简单地说"A比B好"，要指出具体哪个维度、为什么，用数字说话
2. 分析两个模型的各自优势和短板，标准一致不偏袒
3. 如果适用场景不同，指出各自适合什么用途
4. 先判定两个模型各自的等级，再展开逐项对比
5. 语气专业、直接，一针见血

输出格式要求（直接以 ### 🏆 综合结论 开头）：

### 🏆 综合结论
[2-3句话综合对比结论，给出明确的胜负判断和分差原因]

### 📊 等级判定
- 问题案例：[等级 emoji + 等级名称] — 总分 X/100
- 优秀案例：[等级 emoji + 等级名称] — 总分 X/100

### 问题案例 优势与短板
- 优势：[即使是问题模型，也找出1-2个相对较好的方面]
- 短板：[具体问题维度及得分]

### 优秀案例 优势与短板
- 优势：[表现突出的维度及具体分数]
- 短板：[仍可改进的微弱点，优秀模型也需锦上添花]

### 🔍 关键差异
[对比最显著的2-3个差异点，用具体分数和百分比说明差距]

### 💡 改进建议
[问题案例：最关键1-2条改进方向]
[优秀案例：最关键1-2条锦上添花建议]
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

  // Determine grade for the prompt
  const totalScore = record.total
  let gradeEmoji: string
  let gradeName: string
  if (totalScore >= 90) { gradeEmoji = '🏆'; gradeName = '优质模型' }
  else if (totalScore >= 80) { gradeEmoji = '⚠️'; gradeName = '良好模型' }
  else if (totalScore >= 70) { gradeEmoji = '🔶'; gradeName = '入门模型' }
  else if (totalScore >= 60) { gradeEmoji = '🔴'; gradeName = '问题模型' }
  else { gradeEmoji = '❌'; gradeName = '不合格' }

  let existingSuggestions = ''
  if (record.suggestions) {
    // 如果 boundary-holes 评分 > 6，从建议中过滤（建模师有意保留的破洞不视为问题）
    const boundaryScore = record.reviewScores?.['boundary-holes']
    const filterHoles = boundaryScore !== undefined && boundaryScore > 6
    const parts: string[] = []
    if (record.suggestions.critical.length > 0) {
      const filtered = filterHoles
        ? record.suggestions.critical.filter(s => s.relatedCriterionId !== 'boundary-holes')
        : record.suggestions.critical
      if (filtered.length > 0) {
        parts.push('规则引擎已识别的严重问题:\n' + filtered.map(s => `- ${s.title}: ${s.description}`).join('\n'))
      }
    }
    if (record.suggestions.warning.length > 0) {
      const filtered = filterHoles
        ? record.suggestions.warning.filter(s => s.relatedCriterionId !== 'boundary-holes')
        : record.suggestions.warning
      if (filtered.length > 0) {
        parts.push('规则引擎已识别的优化建议:\n' + filtered.map(s => `- ${s.title}: ${s.description}`).join('\n'))
      }
    }
    existingSuggestions = parts.join('\n\n')
  }

  // Build prompt with SCORES FIRST, then data — matching the analysis priority
  return `请对该3D低模资产进行专业拓扑评审。

【基本信息】
- 模型名称: ${record.modelName.replace(/\s*\(OBJ\).*/, '')}
- 格式: ${record.modelFormat.toUpperCase()}
- 文件大小: ${formatSizeForAI(record.modelFileSize)}
- 评测标准: ${typeLabel}
- 评测时间: ${record.createdAt}

【⚠️ 请先看这里 — 得分概况（决定分析方向）】
- 模型预判等级: ${gradeEmoji} ${gradeName}
- 总分: ${record.total.toFixed(1)} / ${record.maxTotal} (${ratio}%)
- 自动检测得分: ${record.autoTotal.toFixed(1)}
- 人工评测得分: ${record.manualTotal.toFixed(1)}

【各维度得分（分数决定好坏，先从这里入手）】
${formatDimensions(record)}

【逐条准则评分（原始1-10分，定位具体问题）】
${formatCriterionScores(record)}

【自动拓扑检测数据（用数据支撑分析）】
${formatAutoReport(record.autoReport)}

${existingSuggestions ? '【规则引擎初步分析】\n' + existingSuggestions : ''}

请按照分析优先级（分数→数据→结论）给出你的专业评审意见。直接以 ### 📊 模型等级 开头，不要任何前言。`
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

请给出专业对比分析。先判定两个模型各自的等级，再做逐项对比。`
}

function formatSizeForAI(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
