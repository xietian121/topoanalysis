import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ModelCardThumbnail } from '@/components/viewer/ModelCardThumbnail'
import { MODEL_TYPE_LABELS } from '@/types/evaluation'
import type { EvalHistoryRecord } from '@/stores/evalHistoryStore'

function getGradeColor(ratio: number) {
  if (ratio >= 0.9) return { bg: 'bg-emerald-500', text: 'text-emerald-500' }
  if (ratio >= 0.8) return { bg: 'bg-amber-500', text: 'text-amber-500' }
  if (ratio >= 0.7) return { bg: 'bg-orange-500', text: 'text-orange-500' }
  return { bg: 'bg-red-500', text: 'text-red-500' }
}

interface ModelCardProps {
  record: EvalHistoryRecord
  isSelected: boolean
  onSelect: (record: EvalHistoryRecord) => void
}

export function ModelCard({ record, isSelected, onSelect }: ModelCardProps) {
  const ratio = record.maxTotal > 0 ? record.total / record.maxTotal : 0
  const grade = getGradeColor(ratio)
  const typeLabel = MODEL_TYPE_LABELS[record.evaluationType] ?? record.evaluationType
  const modelUrl = record.thumbnailUrl || record.modelUrl

  return (
    <button
      onClick={() => onSelect(record)}
      className={`group relative text-left rounded-2xl glass card-elevate overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] ${
        isSelected ? 'ring-2 ring-accent/40' : ''
      }`}
    >
      {/* Thumbnail area */}
      <div className="relative h-24 overflow-hidden">
        {modelUrl ? (
          <ModelCardThumbnail modelUrl={modelUrl} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#e8e8ed] to-[#d8d8dd] flex items-center justify-center" />
        )}

        {/* Selected overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-accent/[0.06] flex items-center justify-center">
            <div className="flex items-center gap-1.5 rounded-full bg-accent/90 px-3 py-1.5 shadow-sm">
              <Check className="h-3.5 w-3.5 text-white" />
              <span className="text-[11px] font-semibold text-white">已选择</span>
            </div>
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="p-2.5 space-y-1.5">
        {/* Model name */}
        <p className="text-[12px] font-medium text-text-primary truncate leading-tight">
          {record.modelName.replace(/\s*\(OBJ\).*/, '')}
        </p>

        {/* Badge row */}
        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {typeLabel}
          </Badge>
          {record.isExample && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/10 text-accent">
              示例
            </Badge>
          )}
        </div>

        {/* Score bar */}
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className={`mono text-[15px] font-bold ${grade.text}`}>
              {record.total}
            </span>
            <span className="text-[11px] text-text-tertiary">
              / {record.maxTotal}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${grade.bg}`}
              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Dimension mini-bars */}
        {record.dimensionScores && record.dimensionScores.length > 0 && (
          <div className="flex items-end gap-1 pt-0.5">
            {record.dimensionScores.slice(0, 4).map((dim) => {
              const dimRatio = dim.maxScore > 0 ? dim.score / dim.maxScore : 0
              return (
                <div
                  key={dim.dimensionId}
                  className="flex-1 h-1 rounded-full bg-black/[0.05] overflow-hidden"
                  title={`${dim.dimensionName}: ${dim.score}/${dim.maxScore}`}
                >
                  <div
                    className="h-full rounded-full bg-text-secondary/30"
                    style={{ width: `${dimRatio * 100}%` }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </button>
  )
}
