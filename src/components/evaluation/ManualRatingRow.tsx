import type { EvaluationCriterion } from '@/types/evaluation'
import type { RatingLevel } from '@/stores/evalStore'
import { RATING_LABELS, RATING_PCTS } from '@/stores/evalStore'

interface ManualRatingRowProps {
  criterion: EvaluationCriterion
  currentLevel: RatingLevel | undefined
  onRate: (criterionId: string, level: RatingLevel) => void
}

const LEVELS: RatingLevel[] = [1, 2, 3, 4, 5]

export function ManualRatingRow({ criterion, currentLevel, onRate }: ManualRatingRowProps) {
  const score = currentLevel
    ? Math.round(RATING_PCTS[currentLevel] * criterion.maxScore)
    : 0

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-text-secondary">{criterion.name}</span>
        <span className="mono text-[12px] font-medium text-text-primary">
          {score}<span className="text-text-tertiary">/{criterion.maxScore}</span>
        </span>
      </div>
      <div className="flex gap-1.5">
        {LEVELS.map((level) => (
          <button
            key={level}
            onClick={() => onRate(criterion.id, level)}
            className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-all duration-200 ${
              currentLevel === level
                ? 'bg-black/[0.08] text-text-primary'
                : 'bg-black/[0.03] text-text-tertiary hover:bg-black/[0.05] hover:text-text-secondary'
            }`}
            title={`${RATING_LABELS[level]}: ${Math.round(RATING_PCTS[level] * criterion.maxScore)}分`}
          >
            {RATING_LABELS[level]}
          </button>
        ))}
      </div>
    </div>
  )
}
