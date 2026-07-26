import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { CriterionRow } from './CriterionRow'
import type { EvaluationDimension } from '@/types/evaluation'

interface DimensionSectionProps {
  dimension: EvaluationDimension
  defaultOpen?: boolean
}

export function DimensionSection({ dimension, defaultOpen = true }: DimensionSectionProps) {
  const autoCount = dimension.criteria.filter((c) => c.method === 'auto').length
  const manualCount = dimension.criteria.filter((c) => c.method === 'manual').length

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="group flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-black/[0.04] transition-colors duration-200">
        <ChevronDown className="h-4 w-4 text-text-tertiary transition-transform group-data-[state=open]:rotate-180" />
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <span className="text-sm font-semibold text-text-primary">
            {dimension.name}
          </span>
          <span className="mono text-sm font-bold text-text-primary">
            {dimension.weight}分
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {autoCount > 0 && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">
              {autoCount}项自动
            </Badge>
          )}
          {manualCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {manualCount}项人工
            </Badge>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-4 px-4 pb-4 pt-2">
          {/* Weight bar — monochrome */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary">权重占比</span>
            <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-text-tertiary transition-all"
                style={{ width: `${dimension.weight}%` }}
              />
            </div>
            <span className="mono text-xs text-text-tertiary">{dimension.weight}%</span>
          </div>
          {/* Criteria */}
          <div className="space-y-5">
            {dimension.criteria.map((criterion, i) => (
              <CriterionRow key={criterion.id} criterion={criterion} index={i + 1} />
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
