import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ScoreBadge } from '@/components/evaluation/ScoreBadge'
import { roundScore } from '@/stores/evalStore'
import type { TopologyReport } from '@/lib/topology-analyzer'
import type { EvaluationCriterion } from '@/types/evaluation'

interface DimensionData {
  dimensionId: string
  dimensionName: string
  score: number
  maxScore: number
  criteria: EvaluationCriterion[]
}

interface DimensionAccordionProps {
  dimensions: DimensionData[]
  reviewScores?: Record<string, number>
  autoReport?: TopologyReport | null
  /** Called when user clicks a criterion, for 3D highlighting */
  onCriterionClick?: (criterionId: string) => void
}

export function DimensionAccordion({
  dimensions,
  reviewScores,
  autoReport,
  onCriterionClick,
}: DimensionAccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-2">
      {dimensions.map((dim) => {
        const isOpen = openIds.has(dim.dimensionId)
        const ratio = dim.maxScore > 0 ? dim.score / dim.maxScore : 0
        const colorClass = ratio < 0.4 ? 'text-red-500' : ratio < 0.7 ? 'text-amber-500' : 'text-emerald-500'

        return (
          <div
            key={dim.dimensionId}
            className="rounded-xl bg-white/60 border border-black/[0.06] overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() => toggle(dim.dimensionId)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.02] transition-colors"
            >
              <div className="flex-1 flex items-center gap-3">
                <span className="text-[13px] font-semibold text-text-primary">
                  {dim.dimensionName}
                </span>
                <ScoreBadge score={dim.score} maxScore={dim.maxScore} />
              </div>
              <ChevronDown
                className={`h-4 w-4 text-text-tertiary transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Content */}
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 space-y-2 pt-1">
                  {dim.criteria.map((crit) => {
                    const raw = reviewScores?.[crit.id] ?? 0
                    const mapped = roundScore((raw / 10) * crit.maxScore)
                    const hasAutoData = crit.method === 'auto' && autoReport

                    return (
                      <div
                        key={crit.id}
                        className="flex items-center justify-between py-1.5"
                      >
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => onCriterionClick?.(crit.id)}
                            className="text-[12px] text-text-secondary hover:text-accent transition-colors text-left truncate"
                          >
                            {crit.name}
                          </button>
                          {hasAutoData && (
                            <p className="text-[10px] text-text-tertiary mt-0.5">
                              {getAutoDataSummary(crit.id, autoReport!)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {reviewScores ? (
                            <span className="mono text-[11px] text-text-primary">
                              {raw}/10 → {mapped.toFixed(1)}/{crit.maxScore}
                            </span>
                          ) : (
                            <ScoreBadge score={mapped} maxScore={crit.maxScore} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Get a short summary of auto-detection data for display */
function getAutoDataSummary(criterionId: string, report: TopologyReport): string {
  const { faceStats, nonManifold, overlapping, boundary, poleStats } = report
  switch (criterionId) {
    case 'quad-tri-ratio':
      return `四边面: ${faceStats.quadCount} (${faceStats.quadPct.toFixed(1)}%), 三角面: ${faceStats.triCount} (${faceStats.triPct.toFixed(1)}%)`
    case 'ngon-count':
      return `检测到 ${faceStats.ngonCount} 个N-gon面`
    case 'non-manifold':
      return `检测到 ${nonManifold.count} 条非流形边`
    case 'overlapping':
      return `检测到 ${overlapping.count} 组重叠面`
    case 'boundary-holes':
      return `检测到 ${boundary.count} 条边界边`
    case 'pole-distribution':
      return `检测到 ${poleStats.count} 个极点(≥6边)`
    case 'tri-distribution':
      return `三角面占比: ${faceStats.triPct.toFixed(1)}%`
    default:
      return ''
  }
}
