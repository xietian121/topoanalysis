import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, ArrowRight, Gamepad2, Palette, Bone, Box, BarChart4, ClipboardCheck, Search, Star, Clock, TrendingUp, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { APP_TITLE, APP_DESCRIPTION } from '@/lib/constants'
import { useEvalHistoryStore, type EvalHistoryRecord } from '@/stores/evalHistoryStore'
import { getExampleRecords } from '@/data/example-models'
import { MODEL_TYPE_LABELS, type EvaluationType } from '@/types/evaluation'

type FilterUsage = 'all' | 'game' | 'general'
type FilterAnimation = 'all' | 'static' | 'dynamic'
type FilterStatus = 'all' | 'evaluated' | 'not_evaluated'

function ModelCard({ record, isExample, onClick }: {
  record: EvalHistoryRecord
  isExample: boolean
  onClick: () => void
}) {
  const ratio = record.maxTotal > 0 ? record.total / record.maxTotal : 0
  const gradeColor = ratio < 0.4 ? 'bg-red-500' : ratio < 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
  const gradeText = ratio < 0.4 ? '差' : ratio < 0.7 ? '中' : '优'

  const usage = record.evaluationType?.startsWith('game-') ? 'game' : 'general'
  const animation = record.evaluationType?.endsWith('-dynamic') ? 'dynamic' : 'static'

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl glass card-elevate overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Thumbnail placeholder */}
      <div className="relative h-36 bg-black/[0.02] flex items-center justify-center overflow-hidden">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
          isExample ? 'bg-accent/[0.06] text-accent' : 'bg-black/[0.04] text-text-tertiary'
        }`}>
          <Box className="h-6 w-6" />
        </div>
        {/* Status & type badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {isExample && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-accent/10 text-accent">官方示例</span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            usage === 'game' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
          }`}>
            {usage === 'game' ? '游戏' : '通用'}
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            animation === 'dynamic' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
          }`}>
            {animation === 'dynamic' ? '可动' : '静态'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 space-y-2.5">
        <p className="text-[13px] font-medium text-text-primary truncate leading-snug">
          {record.modelName.replace(/\s*\(OBJ\).*/, '')}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
          <span>{record.modelFormat.toUpperCase()}</span>
          <span>·</span>
          <span>{(record.modelFileSize / 1024).toFixed(0)} KB</span>
        </div>

        {/* Score bar */}
        {record.evalStatus === 'completed' && (
          <div className="space-y-1">
            <div className="flex items-end justify-between">
              <span className={`mono text-[18px] font-bold ${ratio < 0.4 ? 'text-red-500' : ratio < 0.7 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {record.total}
              </span>
              <span className="text-[10px] text-text-tertiary mb-0.5">/ {record.maxTotal}</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${gradeColor}`}
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-text-tertiary">
              <span>{gradeText}</span>
              <span>{Math.round(ratio * 100)}分</span>
            </div>
          </div>
        )}

        {record.evalStatus !== 'completed' && (
          <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
            <Clock className="h-3 w-3" />
            <span>未评测</span>
          </div>
        )}
      </div>
    </button>
  )
}

function StatsCard({ icon: Icon, label, value, sub }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-2xl glass p-4 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-text-secondary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="mono text-[20px] font-bold text-text-primary leading-none">{value}</p>
        <p className="text-[11px] text-text-tertiary mt-1">{label}</p>
        {sub && <p className="text-[10px] text-text-tertiary">{sub}</p>}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const allHistoryRecords = useEvalHistoryStore((s) => s.records)

  // Derive user records (non-example) in useMemo to avoid new array on every selector call
  const userRecords = useMemo(
    () => allHistoryRecords.filter((r) => !r.isExample),
    [allHistoryRecords],
  )

  // Merge example models with user records
  const exampleRecords = useMemo(() => getExampleRecords(), [])

  const [filterUsage, setFilterUsage] = useState<FilterUsage>('all')
  const [filterAnimation, setFilterAnimation] = useState<FilterAnimation>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  // Combined records for filtering
  const allRecords = useMemo(() => {
    // Merge examples + user records, deduplicate by id
    const map = new Map<string, EvalHistoryRecord>()
    for (const r of exampleRecords) map.set(r.id, r)
    for (const r of allHistoryRecords) {
      if (!map.has(r.id)) map.set(r.id, r)
    }
    return Array.from(map.values())
  }, [exampleRecords, allHistoryRecords])

  // Filter
  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      const rUsage = r.evaluationType?.startsWith('game-') ? 'game' : 'general'
      const rAnim = r.evaluationType?.endsWith('-dynamic') ? 'dynamic' : 'static'
      const rEvaluated = r.evalStatus === 'completed'

      if (filterUsage !== 'all' && rUsage !== filterUsage) return false
      if (filterAnimation !== 'all' && rAnim !== filterAnimation) return false
      if (filterStatus === 'evaluated' && !rEvaluated) return false
      if (filterStatus === 'not_evaluated' && rEvaluated) return false
      return true
    })
  }, [allRecords, filterUsage, filterAnimation, filterStatus])

  // Stats
  const stats = useMemo(() => {
    const evaluated = allRecords.filter((r) => r.evalStatus === 'completed' || r.total > 0)
    const totalEvaluated = evaluated.length
    const avgScore = totalEvaluated > 0 ? Math.round(evaluated.reduce((s, r) => s + r.total, 0) / totalEvaluated) : 0
    const excellentCount = evaluated.filter((r) => r.total >= 80).length
    const excellentRate = totalEvaluated > 0 ? Math.round((excellentCount / totalEvaluated) * 100) : 0

    // Find top issue across all examples
    const topIssue = '三角面分布不合理'

    return { totalEvaluated, avgScore, excellentRate, topIssue }
  }, [allRecords])

  // Separate examples and user models
  const filteredExamples = filteredRecords.filter((r) => r.isExample)
  const filteredUserModels = filteredRecords.filter((r) => !r.isExample)

  const handleCardClick = (record: EvalHistoryRecord) => {
    if (record.evalStatus === 'completed' || record.total > 0) {
      navigate(`/report/${record.id}`)
    } else {
      navigate('/eval/wizard')
    }
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-[1100px] px-8 py-10 space-y-12">
        {/* ===== Hero Section ===== */}
        <section className="relative pt-4 pb-2">
          <div className="absolute inset-0 -top-20 flex items-start justify-center pointer-events-none">
            <div className="h-64 w-[600px] rounded-full bg-black/[0.02] blur-[120px]" />
          </div>

          <div className="relative flex items-start justify-between gap-8">
            <div className="flex-1">
              <h1 className="text-[40px] font-bold tracking-[-0.02em] leading-[1.15]">
                <span className="text-text-primary">{APP_TITLE}</span>
              </h1>
              <p className="mt-3 text-[16px] text-text-secondary leading-relaxed max-w-[480px]">
                自动检测 + 专业评估，让拓扑质量可量化、可对比、可改进
              </p>
              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={() => navigate('/eval/wizard')}
                  className="inline-flex items-center gap-2 rounded-full glass-btn-accent px-6 py-3 text-[15px] font-medium active:scale-[0.97] transition-transform"
                >
                  <Upload className="h-4 w-4" />
                  开始评测
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('examples-section')
                    el?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="inline-flex items-center gap-2 rounded-full glass-btn px-6 py-3 text-[15px] font-medium text-text-primary"
                >
                  <Search className="h-4 w-4" />
                  查看示例
                </button>
              </div>
            </div>

            {/* Stats overview */}
            <div className="grid grid-cols-2 gap-2 w-[320px] shrink-0">
              <StatsCard icon={BarChart4} label="已评测模型" value={stats.totalEvaluated} />
              <StatsCard icon={TrendingUp} label="平均总分" value={stats.avgScore} sub={`/ 100`} />
              <StatsCard icon={Star} label="优秀率" value={`${stats.excellentRate}%`} sub="≥80分" />
              <StatsCard icon={AlertTriangle} label="最常见问题" value={stats.topIssue} />
            </div>
          </div>
        </section>

        {/* ===== Quick Entry Cards ===== */}
        <section>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Upload, label: '开始新评测', desc: '上传模型进行拓扑质量评测', action: () => navigate('/eval/wizard') },
              { icon: Box, label: '模型PK对比', desc: '任意两个模型横向对比分析', action: () => navigate('/compare') },
              { icon: ClipboardCheck, label: '评测标准', desc: '查看4套评测标准详情', action: () => navigate('/standards') },
              { icon: BarChart4, label: '数据分析中心', desc: '全局质量统计与洞察', action: () => navigate('/analytics') },
            ].map(({ icon: Icon, label, desc, action }) => (
              <button
                key={label}
                onClick={action}
                className="group rounded-2xl glass p-4 text-left transition-all duration-300 card-elevate"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.04] text-text-secondary mb-3 group-hover:bg-accent/[0.08] group-hover:text-accent transition-colors">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-[14px] font-semibold text-text-primary">{label}</h3>
                <p className="mt-1 text-[12px] text-text-tertiary">{desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ===== Unified Filter Bar ===== */}
        <section>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[12px] font-medium text-text-tertiary shrink-0">筛选：</span>
            {/* Usage filter */}
            <div className="flex items-center gap-1">
              {([
                { key: 'all' as const, label: '全部用途' },
                { key: 'game' as const, label: '游戏模型' },
                { key: 'general' as const, label: '非游戏模型' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterUsage(key)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                    filterUsage === key
                      ? 'bg-black/[0.06] text-text-primary'
                      : 'text-text-tertiary hover:bg-black/[0.04] hover:text-text-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-black/10" />
            {/* Animation filter */}
            <div className="flex items-center gap-1">
              {([
                { key: 'all' as const, label: '全部动效' },
                { key: 'dynamic' as const, label: '可动模型' },
                { key: 'static' as const, label: '静态模型' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterAnimation(key)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                    filterAnimation === key
                      ? 'bg-black/[0.06] text-text-primary'
                      : 'text-text-tertiary hover:bg-black/[0.04] hover:text-text-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-black/10" />
            {/* Status filter */}
            <div className="flex items-center gap-1">
              {([
                { key: 'all' as const, label: '全部状态' },
                { key: 'evaluated' as const, label: '已评测' },
                { key: 'not_evaluated' as const, label: '未评测' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                    filterStatus === key
                      ? 'bg-black/[0.06] text-text-primary'
                      : 'text-text-tertiary hover:bg-black/[0.04] hover:text-text-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Official Example Models ===== */}
        <section id="examples-section">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="text-[20px] font-semibold tracking-[-0.01em] flex items-center gap-2">
                📚 官方示例模型
              </h2>
              <p className="mt-1 text-[14px] text-text-secondary">
                预置不同类型和质量的模型案例，查看完整评测报告与优化建议
              </p>
            </div>
            <Badge variant="secondary" className="px-2.5 py-1 text-[12px]">
              {filteredExamples.length} 个
            </Badge>
          </div>

          {filteredExamples.length === 0 ? (
            <div className="rounded-2xl glass p-12 text-center">
              <Box className="h-8 w-8 mx-auto text-text-tertiary mb-3" />
              <p className="text-[14px] text-text-secondary">没有匹配的示例模型</p>
              <p className="text-[12px] text-text-tertiary mt-1">尝试调整筛选条件</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filteredExamples.map((record) => (
                <ModelCard
                  key={record.id}
                  record={record}
                  isExample={true}
                  onClick={() => handleCardClick(record)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ===== My Models ===== */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="text-[20px] font-semibold tracking-[-0.01em] flex items-center gap-2">
                📁 我的模型
              </h2>
              <p className="mt-1 text-[14px] text-text-secondary">
                你上传过的所有模型，评测记录自动保存
              </p>
            </div>
            <Badge variant="secondary" className="px-2.5 py-1 text-[12px]">
              {userRecords.length} 个
            </Badge>
          </div>

          {userRecords.length === 0 ? (
            <div className="rounded-2xl glass p-12 text-center space-y-4">
              <Box className="h-10 w-10 mx-auto text-text-tertiary" />
              <div>
                <p className="text-[15px] text-text-secondary">还没有上传模型</p>
                <p className="text-[13px] text-text-tertiary mt-1.5">
                  上传你的第一个模型开始评测
                </p>
              </div>
              <button
                onClick={() => navigate('/eval/wizard')}
                className="inline-flex items-center gap-2 rounded-full glass-btn-accent px-5 py-2.5 text-[14px] font-medium"
              >
                <Upload className="h-4 w-4" />
                开始第一个评测
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filteredUserModels.map((record) => (
                <ModelCard
                  key={record.id}
                  record={record}
                  isExample={false}
                  onClick={() => handleCardClick(record)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ===== Footer ===== */}
        <p className="text-center text-[12px] text-text-tertiary pb-8">
          AI 3D 拓扑低模评测工具 · Phase 2 · 评测对比分析平台
        </p>
      </div>
    </div>
  )
}
