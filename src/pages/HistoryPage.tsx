import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, ChevronDown, ChevronUp, Clock, BarChart4 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useEvalHistoryStore } from '@/stores/evalHistoryStore'
import { RadarChart } from '@/components/evaluation/RadarChart'
import { ScoreBadge } from '@/components/evaluation/ScoreBadge'
import type { EvalHistoryRecord } from '@/stores/evalHistoryStore'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function HistoryCard({ record }: { record: EvalHistoryRecord }) {
  const [expanded, setExpanded] = useState(false)
  const removeRecord = useEvalHistoryStore((s) => s.removeRecord)

  const ratio = record.maxTotal > 0 ? record.total / record.maxTotal : 0
  const gradeColor =
    ratio < 0.4 ? 'text-red-500' : ratio < 0.7 ? 'text-amber-500' : 'text-emerald-500'
  const gradeLabel = ratio < 0.4 ? '差' : ratio < 0.7 ? '中' : '优'

  return (
    <Card className="overflow-hidden">
      {/* Summary row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-black/[0.02] transition-colors duration-150"
      >
        {/* Expand toggle */}
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-text-tertiary shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-tertiary shrink-0" />
        )}

        {/* Model info */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-text-primary truncate">
            {record.modelName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {record.modelFormat.toUpperCase()}
            </Badge>
            <span className="text-[11px] text-text-tertiary">
              {formatSize(record.modelFileSize)}
            </span>
            <span className="text-[11px] text-text-tertiary">·</span>
            <span className="text-[11px] text-text-tertiary flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(record.createdAt)}
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          <p className={`mono text-[20px] font-bold ${gradeColor} leading-none`}>
            {record.total}
          </p>
          <p className="text-[10px] text-text-tertiary mt-1">
            / {record.maxTotal} · {gradeLabel}
          </p>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <CardContent className="px-4 pb-4 pt-0 border-t border-black/5 space-y-4">
          {/* Radar chart */}
          <div className="flex justify-center pt-4">
            <RadarChart
              dimensions={record.dimensionScores}
              size={200}
            />
          </div>

          {/* Dimension breakdown */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
              维度得分
            </h4>
            {record.dimensionScores.map((dim) => (
              <div
                key={dim.dimensionId}
                className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-black/[0.02]"
              >
                <span className="text-[13px] text-text-primary">{dim.dimensionName}</span>
                <ScoreBadge score={dim.score} maxScore={dim.maxScore} />
              </div>
            ))}
          </div>

          {/* Auto / Manual breakdown */}
          <div className="flex gap-4 text-[11px] text-text-tertiary pt-1">
            <span>自动检测: <span className="mono text-text-secondary">{record.autoTotal}</span></span>
            <span>人工评测: <span className="mono text-text-secondary">{record.manualTotal}</span></span>
          </div>

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeRecord(record.id)
            }}
            className="flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-red-500 transition-colors duration-150"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除此记录
          </button>
        </CardContent>
      )}
    </Card>
  )
}

export function HistoryPage() {
  const records = useEvalHistoryStore((s) => s.records)
  const clearAll = useEvalHistoryStore((s) => s.clearAll)
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-[720px] px-8 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.02em]">评测历史</h1>
            <p className="mt-2 text-[15px] text-text-secondary max-w-xl">
              过往评测记录，包含自动检测与人工评分的完整结果。
            </p>
          </div>
          {records.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 text-[13px] text-text-tertiary hover:text-red-500 transition-colors duration-150"
            >
              <Trash2 className="h-4 w-4" />
              清空全部
            </button>
          )}
        </div>

        {records.length === 0 ? (
          <div className="rounded-2xl glass p-16 text-center space-y-4">
            <BarChart4 className="h-10 w-10 mx-auto text-text-tertiary" />
            <div>
              <p className="text-[15px] text-text-secondary">暂无评测记录</p>
              <p className="text-[13px] text-text-tertiary mt-1.5">
                完成模型评测后，结果将自动保存在这里
              </p>
            </div>
            <button
              onClick={() => navigate('/viewer')}
              className="inline-flex items-center gap-2 rounded-full glass-btn px-5 py-2 text-[14px] font-medium text-text-primary"
            >
              前往模型查看器
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <HistoryCard key={record.id} record={record} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
