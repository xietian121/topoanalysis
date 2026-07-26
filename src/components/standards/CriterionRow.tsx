import { Badge } from '@/components/ui/badge'
import type { EvaluationCriterion } from '@/types/evaluation'

interface CriterionRowProps {
  criterion: EvaluationCriterion
  index: number
}

export function CriterionRow({ criterion, index }: CriterionRowProps) {
  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <span className="mono mt-0.5 text-xs text-text-tertiary shrink-0 w-5">
          {String(index).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h5 className="text-sm font-medium text-text-primary">
              {criterion.name}
            </h5>
            <span className="mono text-xs font-medium text-text-secondary">
              {criterion.maxScore}分
            </span>
            <Badge
              variant={criterion.method === 'auto' ? 'default' : 'secondary'}
              className="text-[10px] px-1.5 py-0"
            >
              {criterion.method === 'auto' ? '自动检测' : '人工评测'}
            </Badge>
          </div>
        </div>
      </div>
      {/* Description */}
      <p className="pl-8 text-xs text-text-secondary leading-relaxed">
        {criterion.description}
      </p>
      {/* Sub-items */}
      {criterion.subItems && criterion.subItems.length > 0 && (
        <ul className="pl-12 space-y-1">
          {criterion.subItems.map((sub, i) => (
            <li
              key={i}
              className="text-xs text-text-secondary list-disc list-inside"
            >
              <span className="font-medium">{sub.name}</span>
              {sub.description && ` — ${sub.description}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
