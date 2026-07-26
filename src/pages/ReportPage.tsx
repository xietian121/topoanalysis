import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useEvalHistoryStore } from '@/stores/evalHistoryStore'
import { getExampleRecords } from '@/data/example-models'
import { RadarChart } from '@/components/evaluation/RadarChart'
import { ScoreBadge } from '@/components/evaluation/ScoreBadge'
import { MODEL_TYPE_LABELS } from '@/types/evaluation'
import type { EvaluationSuggestions, SuggestionItem } from '@/types/evaluation'

function SuggestionSection({ title, items, icon: Icon, colorClass, borderClass }: {
  title: string
  items: SuggestionItem[]
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
  borderClass: string
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-3">
      <h3 className={`flex items-center gap-2 text-[14px] font-semibold ${colorClass}`}>
        <Icon className="h-4 w-4" />
        {title}
        <span className="text-[11px] font-normal text-text-tertiary">({items.length}条)</span>
      </h3>
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <div key={i} className={`rounded-xl bg-white/60 border ${borderClass} p-4 space-y-2`}>
            <h4 className="text-[13px] font-semibold text-text-primary">{item.title}</h4>
            <p className="text-[12px] text-text-secondary leading-relaxed">{item.description}</p>
            {item.why && (
              <div className="flex items-start gap-1.5 text-[11px] text-text-tertiary">
                <span className="font-medium shrink-0">为什么重要：</span>
                <span>{item.why}</span>
              </div>
            )}
            {item.howToFix && (
              <div className="flex items-start gap-1.5 text-[11px] text-accent">
                <span className="font-medium shrink-0">改进方向：</span>
                <span>{item.howToFix}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const historyRecords = useEvalHistoryStore((s) => s.records)
  const exampleRecords = useMemo(() => getExampleRecords(), [])

  // Find record from both sources
  const record = useMemo(() => {
    const all = [...exampleRecords, ...historyRecords]
    return all.find((r) => r.id === id) ?? null
  }, [id, exampleRecords, historyRecords])

  if (!record) {
    return (
      <div className="h-full overflow-auto flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-[16px] text-text-secondary">未找到评测记录</p>
          <button
            onClick={() => navigate('/')}
            className="text-[14px] text-accent hover:underline"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const ratio = record.maxTotal > 0 ? record.total / record.maxTotal : 0
  const gradeColor = ratio < 0.4 ? 'text-red-500' : ratio < 0.7 ? 'text-amber-500' : 'text-emerald-500'
  const gradeLabel = ratio < 0.4 ? '需改进' : ratio < 0.7 ? '良好' : '优秀'
  const suggestions = record.suggestions

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-[900px] px-8 py-10 space-y-8">
        {/* Back + Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回
          </button>
          <div className="flex items-center gap-2">
            {record.isExample && (
              <Badge variant="secondary" className="text-[10px] bg-accent/10 text-accent">官方示例</Badge>
            )}
            <span className="text-[12px] text-text-tertiary">
              {MODEL_TYPE_LABELS[record.evaluationType] ?? record.evaluationType}
            </span>
          </div>
        </div>

        {/* Model name + basic info */}
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.02em]">{record.modelName.replace(/\s*\(OBJ\).*/, '')}</h1>
          <div className="flex items-center gap-3 mt-2 text-[13px] text-text-tertiary">
            <span>{record.modelFormat.toUpperCase()}</span>
            <span>·</span>
            <span>{formatSize(record.modelFileSize)}</span>
            <span>·</span>
            <span>{formatDate(record.createdAt)}</span>
          </div>
        </div>

        <Separator className="bg-black/5" />

        {/* Score + Radar + Dimensions */}
        <div className="grid grid-cols-[1fr_200px] gap-8">
          {/* Left: Score overview */}
          <div className="space-y-6">
            <div className="flex items-end gap-3">
              <span className={`mono text-[56px] font-bold leading-none ${gradeColor}`}>
                {record.total}
              </span>
              <div className="pb-1.5">
                <span className="text-[16px] text-text-tertiary">/ {record.maxTotal}</span>
                <p className={`text-[13px] font-medium mt-1 ${gradeColor}`}>{gradeLabel}</p>
              </div>
            </div>

            {/* Dimension scores */}
            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">维度得分</h3>
              {record.dimensionScores.map((dim) => (
                <div key={dim.dimensionId} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-black/[0.02]">
                  <span className="text-[13px] text-text-primary">{dim.dimensionName}</span>
                  <ScoreBadge score={dim.score} maxScore={dim.maxScore} />
                </div>
              ))}
            </div>

            {/* Auto / Manual breakdown */}
            <div className="flex gap-4 text-[12px] text-text-tertiary">
              <span>自动检测: <span className="mono text-text-secondary">{record.autoTotal}</span></span>
              <span>人工评测: <span className="mono text-text-secondary">{record.manualTotal}</span></span>
            </div>
          </div>

          {/* Right: Radar chart */}
          <div className="flex items-center justify-center">
            <RadarChart
              dimensions={record.dimensionScores.map(d => ({
                name: d.dimensionName,
                score: d.score,
                maxScore: d.maxScore,
              }))}
              size={180}
            />
          </div>
        </div>

        <Separator className="bg-black/5" />

        {/* Evaluation Summary */}
        {suggestions?.summary && (
          <section>
            <h2 className="text-[16px] font-semibold tracking-[-0.01em] flex items-center gap-2 mb-3">
              📝 评测总结
            </h2>
            <Card>
              <CardContent className="p-4">
                <p className="text-[13px] text-text-secondary leading-relaxed">{suggestions.summary}</p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Optimization Suggestions */}
        {suggestions && (
          <section className="space-y-6">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em] flex items-center gap-2">
              🔧 优化建议
            </h2>

            <SuggestionSection
              title="严重问题（必须修复）"
              items={suggestions.critical}
              icon={AlertTriangle}
              colorClass="text-red-500"
              borderClass="border-red-200/50"
            />
            <SuggestionSection
              title="建议优化（推荐改进）"
              items={suggestions.warning}
              icon={AlertCircle}
              colorClass="text-amber-500"
              borderClass="border-amber-200/50"
            />
            <SuggestionSection
              title="做得好的地方（继续保持）"
              items={suggestions.good}
              icon={CheckCircle2}
              colorClass="text-emerald-500"
              borderClass="border-emerald-200/50"
            />
          </section>
        )}

        {/* No suggestions fallback */}
        {!suggestions && (
          <section className="text-center py-12">
            <p className="text-[14px] text-text-tertiary">暂无优化建议数据</p>
          </section>
        )}

        {/* Bottom action bar */}
        <Separator className="bg-black/5" />
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            ← 返回首页
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/compare')}
              className="inline-flex items-center gap-1.5 rounded-full glass-btn px-4 py-2 text-[13px] font-medium text-text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              加入对比
            </button>
            <button
              onClick={() => navigate('/eval/wizard')}
              className="inline-flex items-center gap-1.5 rounded-full glass-btn-accent px-4 py-2 text-[13px] font-medium text-white"
            >
              开始新评测
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
