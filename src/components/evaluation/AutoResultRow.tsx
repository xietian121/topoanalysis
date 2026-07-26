import type { EvaluationCriterion } from '@/types/evaluation'
import type { TopologyReport } from '@/lib/topology-analyzer'
import { computeAutoScore } from '@/stores/evalStore'

interface AutoResultRowProps {
  criterion: EvaluationCriterion
  report: TopologyReport
}

export function AutoResultRow({ criterion, report }: AutoResultRowProps) {
  const score = computeAutoScore(criterion, report)
  const pct = criterion.maxScore > 0 ? (score / criterion.maxScore) * 100 : 0

  // Color based on score percentage
  const barColor =
    pct >= 80 ? 'bg-success' :
    pct >= 50 ? 'bg-warning' :
    'bg-danger'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-text-secondary">{criterion.name}</span>
        <span className="mono text-[12px] font-medium text-text-primary">
          {score}<span className="text-text-tertiary">/{criterion.maxScore}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}
