/**
 * Color-coded score badge with 1 decimal precision.
 * - Low (0-40%): red
 * - Medium (40-70%): amber/yellow
 * - High (70-100%): green
 */
export function ScoreBadge({ score, maxScore }: { score: number; maxScore: number }) {
  const ratio = maxScore > 0 ? score / maxScore : 0
  const pct = Math.round(ratio * 100)

  const colorClass =
    ratio < 0.4
      ? 'text-red-500'
      : ratio < 0.7
        ? 'text-amber-500'
        : 'text-emerald-500'

  return (
    <span className={`mono text-[11px] font-semibold ${colorClass}`}>
      {score.toFixed(1)}
      <span className="text-text-tertiary font-normal">/{maxScore}</span>
      <span className={`ml-1 text-[10px] ${colorClass.replace('500', '400')}`}>
        ({pct}%)
      </span>
    </span>
  )
}
