import { ChevronLeft, ChevronRight, Check, Lightbulb, Columns2 } from 'lucide-react'
import type { TopologyReport } from '@/lib/topology-analyzer'
import { computeAutoScore } from '@/stores/evalStore'
import type { FlattenedCriterion } from '@/stores/evalFlowStore'

// ── Helpers ──

function getAutoData(criterionId: string, report: TopologyReport): string | null {
  const { faceStats, nonManifold, overlapping, boundary, poleStats } = report
  switch (criterionId) {
    case 'quad-tri-ratio': {
      let tier = ''
      if (faceStats.totalFaces < 15000) tier = '阈值 30%'
      else if (faceStats.totalFaces <= 25000) tier = '阈值 20%'
      else tier = '阈值 10%'
      return `四边面 ${faceStats.quadCount} 个（${faceStats.quadPct.toFixed(1)}%），三角面 ${faceStats.triCount} 个（${faceStats.triPct.toFixed(1)}%），总面数 ${faceStats.totalFaces.toLocaleString()} — ${tier}`
    }
    case 'tri-distribution':
      return faceStats.triCount > 0
        ? `三角面共 ${faceStats.triCount} 个（${faceStats.triPct.toFixed(1)}%）。请观察 3D 视图橙色标记区域，判断三角面是否位于非关键部位`
        : `未检测到三角面 ✓`
    case 'pole-distribution':
      return `六极点及以上（≥6 条边）${poleStats.count} 个。请观察 3D 视图蓝色圆点，判断极点是否避开关节、高光及形变区`
    case 'ngon-count':
      return `检测到 N-gon（多边形面）${faceStats.ngonCount} 个` + (
        faceStats.ngonCount === 0 ? ' ✓' : ` — 每 1 个扣除 1 分`
      )
    case 'non-manifold':
      return `检测到非流形边 ${nonManifold.count} 条` + (
        nonManifold.count === 0 ? ' ✓' : ` — 每条扣除 1 分`
      )
    case 'overlapping':
      return `检测到重叠面对 ${overlapping.count} 组` + (
        overlapping.count === 0 ? ' ✓' : ` — 每组扣除 1 分`
      )
    case 'density':
      return report.density
        ? '已计算顶点密度分布。蓝色=高密度区域（面细小密集），红色=低密度区域（面粗大稀疏），请判断重点区域是否获得足够面数支撑'
        : null
    case 'loop-edges':
      return report.edgeLoops
        ? `检测到 ${report.edgeLoops.loops.length} 条闭合循环线（3D 视图绿色线段）。请检查各部位循环线是否完整连续`
        : '未检测到闭合循环线，可能存在布线断裂'
    case 'boundary-holes':
      if (boundary.count === 0) return '未检测到破洞边，模型完全水密'
      return `检测到 ${boundary.count} 条边界边（破洞），模型非水密。请检查是否存在未闭合的面片区域`
    default:
      return null
  }
}

function getRecommendation(
  criterion: FlattenedCriterion,
  report: TopologyReport | null,
): string | null {
  if (!report) return null
  const { faceStats, nonManifold, overlapping, boundary, poleStats } = report

  switch (criterion.id) {
    case 'quad-tri-ratio': {
      const autoScore = computeAutoScore(criterion, report)
      const triRatio = (faceStats.triPct).toFixed(1)
      let thresholdStr = ''
      if (faceStats.totalFaces < 15000) thresholdStr = '30%'
      else if (faceStats.totalFaces <= 25000) thresholdStr = '20%'
      else thresholdStr = '10%'
      if (autoScore >= criterion.maxScore) {
        return `三角面占比 ${triRatio}%，低于 ${thresholdStr} 阈值，满分通过`
      }
      return `三角面占比 ${triRatio}%，超出 ${thresholdStr} 阈值，推荐 ${autoScore.toFixed(1)}/${criterion.maxScore} 分`
    }
    case 'ngon-count': {
      if (faceStats.ngonCount === 0) return '未检测到 N-gon，满分通过'
      const autoScore = computeAutoScore(criterion, report)
      return `${faceStats.ngonCount} 个 N-gon，每 1 个扣 1 分，推荐 ${autoScore.toFixed(1)}/${criterion.maxScore} 分`
    }
    case 'non-manifold': {
      if (nonManifold.count === 0) return '未检测到非流形边，满分通过'
      const autoScore = computeAutoScore(criterion, report)
      return `${nonManifold.count} 条非流形边，每条扣 1 分，推荐 ${autoScore.toFixed(1)}/${criterion.maxScore} 分`
    }
    case 'overlapping': {
      if (overlapping.count === 0) return '未检测到重叠面，满分通过'
      const autoScore = computeAutoScore(criterion, report)
      return `${overlapping.count} 组重叠面，每组扣 1 分，推荐 ${autoScore.toFixed(1)}/${criterion.maxScore} 分`
    }
    case 'boundary-holes': {
      if (boundary.count === 0) return '未检测到破洞边，满分通过'
      const autoScore = computeAutoScore(criterion, report)
      return `${boundary.count} 条边界边（破洞），每条扣 1 分，推荐 ${autoScore.toFixed(1)}/${criterion.maxScore} 分`
    }
    case 'tri-distribution': {
      if (faceStats.triCount === 0) return '未检测到三角面，建议评分 10'
      const pct = faceStats.triPct
      if (pct <= 10) return `三角面仅 ${pct.toFixed(1)}%，若分布合理建议评分 8~10`
      if (pct <= 25) return `三角面占比 ${pct.toFixed(1)}%，若避开可动区建议评分 6~8`
      return `三角面占比较高（${pct.toFixed(1)}%），请重点检查可动区是否有三角面`
    }
    case 'pole-distribution': {
      if (poleStats.count === 0) return '未检测到极点（≥6 条边），建议评分 10'
      if (poleStats.count <= 3) return `仅 ${poleStats.count} 个极点，若避开敏感区域建议评分 7~9`
      if (poleStats.count <= 8) return `${poleStats.count} 个极点，请重点检查是否位于关节部位`
      return `${poleStats.count} 个极点，数量较多，建议仔细检查每个极点位置是否合理`
    }
    case 'structure':
      return '注意：结构偏差较大时得分不超过 6 分（6 分为阈值线）。顶点应位于轮廓转折处，边线流向应与形体走向一致'
    case 'density':
      return '请判断：关键区域（转折处、特征点）应偏蓝色（高密度），平坦区域偏红色（低密度）为合理分配'
    case 'loop-edges': {
      if (!report.edgeLoops) return '未检测到闭合循环线，可能布线存在断裂，建议评分 1~3'
      const count = report.edgeLoops.loops.length
      if (count >= 5) return `检测到 ${count} 条循环线，若各部位完整建议评分 7~10`
      if (count >= 2) return `检测到 ${count} 条循环线，请检查关键区域（关节、UV 接缝）是否完整`
      return `仅 ${count} 条循环线，建议评分 1~4，检查是否缺少必要环路边`
    }
    default:
      return null
  }
}

// ── Component ──

interface FlowReviewCardProps {
  criterion: FlattenedCriterion
  currentScore: number
  onSetScore: (id: string, score: number) => void
  onPrev: () => void
  onNext: () => void
  onFinish: () => void
  isFirst: boolean
  isLast: boolean
  allScored: boolean
  autoReport: TopologyReport | null
  scoredCount: number
  totalCount: number
  /** 可选准则（如对称性）的相关控制 */
  optional?: boolean
  optionalEnabled?: boolean
  onToggleOptional?: (enabled: boolean) => void
}

export function FlowReviewCard({
  criterion,
  currentScore,
  onSetScore,
  onPrev,
  onNext,
  onFinish,
  isFirst,
  isLast,
  allScored,
  autoReport,
  scoredCount,
  totalCount,
  optional = false,
  optionalEnabled = false,
  onToggleOptional,
}: FlowReviewCardProps) {
  const autoData = (criterion.method === 'auto' || autoReport) && autoReport
    ? getAutoData(criterion.id, autoReport)
    : null
  const recommendation = autoReport ? getRecommendation(criterion, autoReport) : null

  const isOptionalDisabled = optional && !optionalEnabled

  return (
    <div className="mt-2 space-y-3 px-1">
      {/* ═══ 可选准则：开关卡片（始终可见） ═══ */}
      {optional && (
        <div className={`rounded-lg px-3 py-2.5 border transition-colors duration-200 ${
          optionalEnabled
            ? 'bg-accent/[0.04] border-accent/[0.12]'
            : 'bg-black/[0.03] border-black/[0.04]'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 transition-colors duration-200 ${
                optionalEnabled ? 'bg-accent/15' : 'bg-black/[0.06]'
              }`}>
                <Columns2 className={`h-3.5 w-3.5 transition-colors duration-200 ${
                  optionalEnabled ? 'text-accent' : 'text-text-tertiary'
                }`} />
              </div>
              <div className="min-w-0">
                <span className="text-[12px] font-semibold text-text-primary">对称性评测</span>
                {optionalEnabled ? (
                  <span className="ml-1.5 text-[10px] font-medium text-accent">已启用</span>
                ) : (
                  <span className="ml-1.5 text-[10px] text-text-tertiary">未启用</span>
                )}
              </div>
            </div>
            {/* Toggle switch */}
            <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
              <span className={`text-[10px] font-medium transition-colors duration-200 ${
                optionalEnabled ? 'text-text-tertiary' : 'text-text-secondary'
              }`}>
                关
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={optionalEnabled}
                  onChange={(e) => onToggleOptional?.(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-9 h-5 rounded-full flex items-center transition-colors duration-200 ${
                  optionalEnabled ? 'bg-accent' : 'bg-black/[0.15]'
                }`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    optionalEnabled ? 'translate-x-[19px]' : 'translate-x-[3px]'
                  }`} />
                </div>
              </div>
              <span className={`text-[10px] font-medium transition-colors duration-200 ${
                optionalEnabled ? 'text-accent' : 'text-text-tertiary'
              }`}>
                开
              </span>
            </label>
          </div>
          {/* Explanation — only when disabled */}
          {!optionalEnabled && (
            <p className="mt-2 text-[11px] text-text-secondary leading-relaxed">
              启用后布线合理性维度权重将重新分配，对称性准则满分值生效，3D 视口同步显示蓝色对称参考面辅助判断。总分保持 100 分不变。
            </p>
          )}
        </div>
      )}

      {/* Description */}
      <p className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
        {criterion.description}
      </p>

      {/* ═══ 打分区域（可选未启用时隐藏） ═══ */}
      {!isOptionalDisabled && (
        <>
          {/* Auto detection data */}
          {autoData && (
            <div className="rounded-lg bg-black/[0.03] px-3 py-2 border border-black/[0.04]">
              <p className="text-[11px] text-text-primary">{autoData}</p>
            </div>
          )}

          {/* Recommendation */}
          {recommendation && (
            <div className="rounded-lg bg-accent/[0.06] px-3 py-2 border border-accent/[0.1]">
              <div className="flex items-start gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">
                    推荐打分
                  </span>
                  <p className="mt-0.5 text-[11px] text-text-secondary leading-relaxed">{recommendation}</p>
                  {criterion.scoringRule && (
                    <p className="mt-0.5 text-[10px] text-text-tertiary">规则：{criterion.scoringRule}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Score dots — 0~10 */}
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: 11 }, (_, i) => {
              const s = i // 0,1,2,...,10
              const active = currentScore > 0 ? s <= currentScore : false
              const isZero = s === 0
              return (
                <button
                  key={s}
                  onClick={() => {
                    console.log('[FlowReviewCard] Score click:', { criterionId: criterion.id, score: s, optional, optionalEnabled, isOptionalDisabled })
                    onSetScore(criterion.id, s)
                  }}
                  className={`w-6 h-6 rounded-full text-[10px] font-semibold transition-all duration-150 flex items-center justify-center ${
                    active
                      ? 'bg-accent text-white shadow-sm scale-105'
                      : isZero && currentScore === 0
                        ? 'bg-accent text-white shadow-sm scale-105'
                        : 'bg-black/[0.04] text-text-tertiary hover:bg-black/[0.08] hover:text-text-secondary'
                  }`}
                  title={`${s}分`}
                >
                  {s}
                </button>
              )
            })}
          </div>
          <div className="text-center">
            <span className={`mono text-sm font-bold ${currentScore > 0 ? 'text-accent' : currentScore === 0 ? 'text-accent' : 'text-text-tertiary'}`}>
              {currentScore > 0 ? `${currentScore}/10` : currentScore === 0 ? '0/10' : '未打分'}
            </span>
            <span className="text-[10px] text-text-tertiary ml-2">
              {scoredCount}/{totalCount} 已评
            </span>
          </div>

          {/* Nav buttons */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onPrev}
              disabled={isFirst}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ${
                isFirst
                  ? 'text-text-tertiary opacity-30 cursor-not-allowed'
                  : 'glass-btn text-text-primary hover:bg-black/[0.06]'
              }`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              上条
            </button>
            {isLast ? (
              <button
                onClick={onFinish}
                disabled={!allScored}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition-all duration-200 ${
                  allScored
                    ? 'glass-btn-accent text-white'
                    : 'bg-black/[0.04] text-text-tertiary cursor-not-allowed'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                完成
              </button>
            ) : (
              <button
                onClick={onNext}
                className="flex items-center gap-1 rounded-full glass-btn px-2.5 py-1 text-[11px] font-medium text-text-primary"
              >
                下条
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
