import type { EvaluationSuggestions, SuggestionItem, EvaluationType } from '@/types/evaluation'
import type { TopologyReport } from '@/lib/topology-analyzer'

interface SuggestionInput {
  evaluationType: EvaluationType
  autoReport: TopologyReport | null
  dimensionScores: { dimensionId: string; dimensionName: string; score: number; maxScore: number }[]
  reviewScores?: Record<string, number>
}

/**
 * 根据评测结果自动生成结构化的优化建议
 */
export function generateSuggestions(input: SuggestionInput): EvaluationSuggestions {
  const { evaluationType, autoReport, dimensionScores } = input
  const critical: SuggestionItem[] = []
  const warning: SuggestionItem[] = []
  const good: SuggestionItem[] = []
  const isAnimation = evaluationType.endsWith('-dynamic')

  // Helper: get dimension score ratio
  const getDimRatio = (dimId: string) => {
    const dim = dimensionScores.find((d) => d.dimensionId === dimId)
    return dim ? dim.score / dim.maxScore : 1
  }

  // ===== 自动检测项分析 =====
  if (autoReport) {
    const { faceStats, nonManifold, overlapping, boundary } = autoReport

    // N-gon
    if (faceStats.ngonCount > 0) {
      critical.push({
        title: `检测到 ${faceStats.ngonCount} 个N-gon面`,
        description: `模型存在 ${faceStats.ngonCount} 个大于四边的多边形面，分布在模型各区域。`,
        why: 'N-gon在引擎中会导致细分错误、光照异常和烘焙 artifacts。' + (isAnimation ? '在骨骼动画中会产生不可预测的变形结果。' : ''),
        howToFix: `将所有 ${faceStats.ngonCount} 个N-gon转换为四边面或三角面的组合。优先使用四边面，关键区域（${isAnimation ? '关节、面部' : '视觉焦点'}）禁止出现N-gon。`,
        relatedCriterionId: 'ngon-count',
      })
    }

    // Non-manifold edges
    if (nonManifold.count > 0) {
      critical.push({
        title: `检测到 ${nonManifold.count} 条非流形边`,
        description: `模型存在 ${nonManifold.count} 条被三个或以上面共用的非流形边。`,
        why: '非流形边是严重拓扑错误，导致法线计算异常、渲染错误及物理碰撞失效。' + (isAnimation ? '骨骼驱动变形时会导致面片撕裂或穿透。' : ''),
        howToFix: '使用3D软件的非流形检测工具定位所有问题边，通过焊接顶点、删除冗余面或重建局部拓扑来修复。',
        relatedCriterionId: 'non-manifold',
      })
    }

    // Boundary edges (holes)
    if (boundary.count > 0) {
      const severity = boundary.count > 10 ? '严重' : '少量'
      ;(boundary.count > 10 ? critical : warning).push({
        title: `检测到 ${boundary.count} 条边界边（破洞）`,
        description: `模型存在 ${boundary.count} 条仅连接一个面的边界边，${severity}影响网格完整性。`,
        why: '破洞面意味着模型非水密，会导致渲染漏光、阴影异常、3D打印失败及物理碰撞穿透。' + (isAnimation ? '骨骼动画中破洞会因蒙皮变形进一步扩大，产生视觉撕裂。' : ''),
        howToFix: '使用3D软件的封洞工具（Cap Holes / Fill Holes）填补破洞，或手动创建面片闭合开放区域。优先修复视觉可见和变形区域附近的破洞。',
        relatedCriterionId: 'boundary-holes',
      })
    }

    // Overlapping faces
    if (overlapping.count > 0) {
      const severity = overlapping.count > 5 ? '严重' : '少量'
      ;(overlapping.count > 5 ? critical : warning).push({
        title: `检测到 ${overlapping.count} 组重叠面`,
        description: `模型存在 ${overlapping.count} 组相互重叠的面片对，${severity}影响渲染质量。`,
        why: '重叠面导致Z-fighting闪烁、法线冲突及光照烘焙异常。' + (isAnimation ? '动画播放时重叠面会产生严重的视觉闪烁和法线抖动。' : ''),
        howToFix: '逐一检查重叠面组，删除重叠的多余面片或调整顶点位置消除重叠。优先处理视觉焦点区域的重叠面。',
        relatedCriterionId: 'overlapping',
      })
    }

    // Triangle ratio
    const triRatio = faceStats.triPct / 100
    const isGame = evaluationType.startsWith('game-')
    const threshold = isGame ? 0.15 : 0.30
    if (triRatio > threshold) {
      const label = triRatio > threshold * 2 ? '严重偏高' : '偏高'
      ;(triRatio > threshold * 2 ? critical : warning).push({
        title: `三角面占比${label}（${faceStats.triPct.toFixed(1)}%）`,
        description: `模型 ${faceStats.triPct.toFixed(1)}% 的面为三角面，${isGame ? '远超游戏模型' + (threshold * 100) + '%的建议上限' : '超过通用模型' + (threshold * 100) + '%的建议上限'}。`,
        why: `过高的三角面占比${isGame ? '影响游戏性能，增加面数开销' : '降低模型可编辑性，不利于细分曲面'}。${isAnimation ? '三角面在变形区域会导致纹理扭曲和光照异常。' : ''}`,
        howToFix: '将非关键区域的三角面重构为四边面。优先处理大面积连续三角面区域，使用四边形重拓扑工具系统性转换。',
        relatedCriterionId: 'quad-tri-ratio',
      })
    }
  }

  // ===== 维度得分分析 =====
  for (const dim of dimensionScores) {
    const ratio = dim.score / dim.maxScore

    if (ratio < 0.4) {
      critical.push({
        title: `${dim.dimensionName}得分率仅 ${Math.round(ratio * 100)}%`,
        description: `${dim.dimensionName}维度得分 ${dim.score}/${dim.maxScore}，处于严重不足水平。`,
        why: getDimensionWhy(dim.dimensionId, isAnimation),
        howToFix: getDimensionFix(dim.dimensionId, isAnimation),
        relatedCriterionId: dim.dimensionId,
      })
    } else if (ratio < 0.7 && ratio >= 0.4) {
      warning.push({
        title: `${dim.dimensionName}有提升空间（${Math.round(ratio * 100)}%）`,
        description: `${dim.dimensionName}维度得分 ${dim.score}/${dim.maxScore}，处于可接受但有提升空间的水平。`,
        why: getDimensionWhy(dim.dimensionId, isAnimation),
        howToFix: getDimensionFix(dim.dimensionId, isAnimation),
        relatedCriterionId: dim.dimensionId,
      })
    } else if (ratio > 0.85) {
      good.push({
        title: `${dim.dimensionName}表现优秀（${Math.round(ratio * 100)}%）`,
        description: `${dim.dimensionName}维度得分 ${dim.score}/${dim.maxScore}，达到优秀水平。`,
        why: '',
        howToFix: '',
        relatedCriterionId: dim.dimensionId,
      })
    }
  }

  // ===== 特别检查 =====
  if (autoReport && autoReport.faceStats.ngonCount === 0 &&
      autoReport.nonManifold.count === 0 && autoReport.overlapping.count === 0 &&
      autoReport.boundary.count === 0) {
    good.unshift({
      title: '零拓扑错误',
      description: '模型无非流形边、无重叠面、无破洞、无N-gon面，基础拓扑完全干净。',
      why: '零拓扑错误是专业3D资产的基本标准，体现了建模的细致程度。',
      howToFix: '',
      relatedCriterionId: 'non-manifold',
    })
  }

  // Generate summary
  const totalScore = dimensionScores.reduce((s, d) => s + d.score, 0)
  const totalMax = dimensionScores.reduce((s, d) => s + d.maxScore, 0)
  const totalRatio = totalMax > 0 ? totalScore / totalMax : 0

  let summary = ''
  if (totalRatio >= 0.85) {
    summary = `该模型整体拓扑质量优秀（${Math.round(totalRatio * 100)}分），各项指标表现均衡。${
      critical.length > 0 ? `存在 ${critical.length} 个需关注的问题。` : ''
    }${good.length > 0 ? `在 ${good.map(g => g.title).slice(0, 2).join('、')}等方面表现突出。` : ''}`
  } else if (totalRatio >= 0.6) {
    summary = `该模型拓扑质量良好（${Math.round(totalRatio * 100)}分），${
      critical.length > 0 ? `但存在 ${critical.length} 个需要优先修复的问题。` : ''
    }${warning.length > 0 ? `还有 ${warning.length} 个建议优化的方面。` : ''}建议从${critical.length > 0 ? '严重问题' : '建议优化项'}入手进行改进。`
  } else {
    summary = `该模型拓扑质量需要改进（${Math.round(totalRatio * 100)}分），${
      critical.length > 0 ? `存在 ${critical.length} 个严重问题必须修复。` : ''
    }${warning.length > 0 ? `另有 ${warning.length} 个建议优化项。` : ''}建议系统性重拓扑以提升模型质量。`
  }

  return {
    critical: deduplicateSuggestions(critical),
    warning: deduplicateSuggestions(warning),
    good: deduplicateSuggestions(good),
    summary,
  }
}

function deduplicateSuggestions(items: SuggestionItem[]): SuggestionItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.title)) return false
    seen.add(item.title)
    return true
  })
}

function getDimensionWhy(dimId: string, isAnimation: boolean): string {
  switch (dimId) {
    case 'face-quality':
      return '面型质量直接影响模型的渲染正确性、可编辑性和引擎兼容性。四边面为主的拓扑是行业标准。'
    case 'face-errors':
      return '面错误（非流形边、重叠面、破洞面）是致命缺陷，会导致渲染异常、碰撞检测失败和3D打印错误。'
    case 'edge-flow':
      return '布线合理性决定了模型的UV展开质量、细分结果和视觉效果。好的布线是高质量3D资产的基础。'
    case 'animation-friendly':
      return isAnimation ? '绑定动画友好性是可动模型的核心竞争力，直接决定动画制作效率和最终动画质量。' : ''
    default:
      return '该维度是模型整体质量的重要组成部分。'
  }
}

function getDimensionFix(dimId: string, isAnimation: boolean): string {
  switch (dimId) {
    case 'face-quality':
      return '使用重拓扑工具将三角面和N-gon转换为四边面。重点关注视觉焦点区域和非隐蔽区域的面型。保持四边面占比在90%以上。'
    case 'face-errors':
      return '使用3D软件的网格检测工具（如Blender的Mesh Analysis或Maya的Mesh Cleanup）系统性地修复所有拓扑错误。'
    case 'edge-flow':
      return '沿结构轮廓重新规划布线方向。使用"先建立关键循环线，再填充过渡区域"的策略。参考行业布线范例。'
    case 'animation-friendly':
      return isAnimation ? '在关节处建立3圈以上环形线结构。增加可动区域的面数预算。参考解剖结构规划布线方向。' : ''
    default:
      return '参考评测标准中的详细要求，有针对性地改进该维度。'
  }
}
