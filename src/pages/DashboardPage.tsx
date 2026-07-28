import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, ArrowRight, Gamepad2, Palette, Bone, Box, BarChart4, ClipboardCheck, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ModelCardThumbnail } from '@/components/viewer/ModelCardThumbnail'
import { APP_TITLE } from '@/lib/constants'
import { useEvalHistoryStore, type EvalHistoryRecord } from '@/stores/evalHistoryStore'
import { useModelStore } from '@/stores/modelStore'
import { useEvalStore } from '@/stores/evalStore'
import { useLoadingStore } from '@/stores/loadingStore'
import { getExampleDefs, type ExampleModelDef } from '@/data/example-models'
import { MODEL_TYPE_LABELS, type EvaluationType } from '@/types/evaluation'

type FilterUsage = 'all' | 'game' | 'general'
type FilterAnimation = 'all' | 'static' | 'dynamic'
type FilterEvalStatus = 'all' | 'evaluated' | 'unevaluated'

function ModelCard({ record, isExample, modelUrl, onClick }: {
  record: EvalHistoryRecord
  isExample: boolean
  modelUrl?: string
  onClick: () => void
}) {
  const ratio = record.maxTotal > 0 ? record.total / record.maxTotal : 0
  const gradeColor = ratio < 0.4 ? 'bg-red-500' : ratio < 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
  const gradeText = ratio < 0.4 ? '差' : ratio < 0.7 ? '中' : '优'

  const usage = record.evaluationType?.startsWith('game-') ? 'game' : 'general'
  const animation = record.evaluationType?.endsWith('-dynamic') ? 'dynamic' : 'static'

  // 根据模型类型选择不同的缩略图视觉
  const isGame = usage === 'game'
  const isDynamic = animation === 'dynamic'

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl glass card-elevate overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Thumbnail — 真实3D缩略图 或 类型图标占位 */}
      <div className="relative h-36 overflow-hidden">
        {modelUrl ? (
          <ModelCardThumbnail modelUrl={modelUrl} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#e8e8ed] to-[#d8d8dd] flex items-center justify-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
              isGame
                ? 'bg-gradient-to-br from-blue-400/20 to-blue-600/10 text-blue-500'
                : 'bg-gradient-to-br from-purple-400/20 to-purple-600/10 text-purple-500'
            }`}>
              {isGame && isDynamic && <Bone className="h-6 w-6" />}
              {isGame && !isDynamic && <Box className="h-6 w-6" />}
              {!isGame && isDynamic && <Palette className="h-6 w-6" />}
              {!isGame && !isDynamic && <Gamepad2 className="h-6 w-6" />}
            </div>
          </div>
        )}

        {/* Status & type badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {isExample && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-accent/10 text-accent">示例</span>
          )}
          {/* 评测状态标签 */}
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            record.evalStatus === 'completed' || record.total > 0
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-slate-100 text-slate-500'
          }`}>
            {record.evalStatus === 'completed' || record.total > 0 ? '已评测' : '未评测'}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            isGame ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
          }`}>
            {isGame ? '游戏' : '通用'}
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            isDynamic ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
          }`}>
            {isDynamic ? '可动' : '静态'}
          </span>
        </div>

        {/* 质量评级角标 */}
        {record.evalStatus === 'completed' && record.total > 0 && (
          <div className="absolute bottom-2.5 right-2.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              ratio >= 0.7 ? 'bg-emerald-100 text-emerald-700' :
              ratio >= 0.4 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {gradeText}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 space-y-2.5">
        <p className="text-[13px] font-medium text-text-primary truncate leading-snug">
          {record.modelName.replace(/\s*\(OBJ\).*/, '')}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
          <span>{record.modelFormat.toUpperCase()}</span>
          <span>·</span>
          <span>{record.modelFileSize >= 1048576 ? `${(record.modelFileSize / 1048576).toFixed(1)} MB` : `${(record.modelFileSize / 1024).toFixed(0)} KB`}</span>
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
              <span>{record.total.toFixed(1)}分</span>
            </div>
          </div>
        )}

      </div>
    </button>
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

  const [userUsage, setUserUsage] = useState<FilterUsage>('all')
  const [userAnimation, setUserAnimation] = useState<FilterAnimation>('all')
  const [userEvalStatus, setUserEvalStatus] = useState<FilterEvalStatus>('all')

  // Filter helpers
  function filterRecords(records: EvalHistoryRecord[], usage: FilterUsage, animation: FilterAnimation, evalStatus: FilterEvalStatus) {
    return records.filter((r) => {
      const rUsage = r.evaluationType?.startsWith('game-') ? 'game' : 'general'
      const rAnim = r.evaluationType?.endsWith('-dynamic') ? 'dynamic' : 'static'
      const isEvaluated = r.evalStatus === 'completed' || r.total > 0
      if (usage !== 'all' && rUsage !== usage) return false
      if (animation !== 'all' && rAnim !== animation) return false
      if (evalStatus === 'evaluated' && !isEvaluated) return false
      if (evalStatus === 'unevaluated' && isEvaluated) return false
      return true
    })
  }

  const filteredUserModels = useMemo(
    () => filterRecords(userRecords, userUsage, userAnimation, userEvalStatus),
    [userRecords, userUsage, userAnimation, userEvalStatus],
  )

  const handleCardClick = useCallback(async (record: EvalHistoryRecord) => {
    // 示例模型 → 加载模型后直接进入分析报告页
    if (record.isExample && record.modelUrl) {
      const { startLoading, setProgress, setError, finishLoading, abortController } = useLoadingStore.getState()
      startLoading()
      try {
        const loadModelFromUrl = useModelStore.getState().loadModelFromUrl
        const setEvaluationType = useEvalStore.getState().setEvaluationType

        // 设置评测标准
        if (record.evaluationType) {
          setEvaluationType(record.evaluationType)
        }

        // 加载低模（带进度）
        await loadModelFromUrl(record.modelUrl, `${record.modelName}.obj`, {
          onProgress: (progress, stage, text) => {
            setProgress(progress, stage as 'download' | 'parse' | 'analyze' | 'init' | 'done', text)
          },
          signal: abortController?.signal,
          isExample: true,
        })

        // 尝试加载对应高模
        const def = getExampleDefs().find((d) => d.id === record.id)
        if (def?.referenceModelUrl) {
          try {
            const loadReferenceModel = useModelStore.getState().loadReferenceModel
            const highRes = await fetch(def.referenceModelUrl)
            if (highRes.ok) {
              const highText = await highRes.text()
              const highFile = new File([highText], 'high.obj', { type: 'application/octet-stream' })
              await loadReferenceModel(highFile)
            }
          } catch {
            // 高模加载失败不影响主流程
            console.warn('参考高模加载失败，继续评测')
          }
        }

        finishLoading()
        navigate(`/report/${record.id}`)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.error('示例模型加载失败:', err)
        setError(err instanceof Error ? err.message : '模型加载失败')
      }
      return
    }

    // 我的模型 → 已评测去报告，未评测去向导
    if (record.evalStatus === 'completed' || record.total > 0) {
      navigate(`/report/${record.id}`)
    } else {
      navigate('/eval/wizard')
    }
  }, [navigate])

  // ── 示例模型按类型分组 ──
  const allExampleDefs = useMemo(() => getExampleDefs(), [])
  const typeOrder: EvaluationType[] = ['game-dynamic', 'game-static', 'general-dynamic', 'general-static']
  const typeGroups = useMemo(() => {
    return typeOrder.map((type) => {
      const defs = allExampleDefs.filter((d) => d.type === type)
      return {
        type,
        excellent: defs.find((d) => d.quality === 'excellent') ?? null,
        problematic: defs.find((d) => d.quality === 'problematic') ?? null,
      }
    })
  }, [allExampleDefs])

  // 单独查看某个示例模型 → 直接进入分析报告页
  const handleViewModel = useCallback(async (def: ExampleModelDef) => {
    const { startLoading, setProgress, setError, finishLoading, abortController } = useLoadingStore.getState()
    startLoading()
    try {
      const loadModelFromUrl = useModelStore.getState().loadModelFromUrl
      const setEvaluationType = useEvalStore.getState().setEvaluationType
      if (def.record.evaluationType) setEvaluationType(def.record.evaluationType)
      await loadModelFromUrl(def.modelUrl, `${def.name}.obj`, {
        onProgress: (progress, stage, text) => {
          setProgress(progress, stage as 'download' | 'parse' | 'analyze' | 'init' | 'done', text)
        },
        signal: abortController?.signal,
        isExample: true,
      })
      if (def.referenceModelUrl) {
        try {
          const loadReferenceModel = useModelStore.getState().loadReferenceModel
          const highRes = await fetch(def.referenceModelUrl)
          if (highRes.ok) {
            const highText = await highRes.text()
            const highFile = new File([highText], 'high.obj', { type: 'application/octet-stream' })
            await loadReferenceModel(highFile)
          }
        } catch { /* 高模加载失败不影响 */ }
      }
      finishLoading()
      navigate(`/report/${def.record.id}`)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error('示例模型加载失败:', err)
      setError(err instanceof Error ? err.message : '模型加载失败')
    }
  }, [navigate])

  // 同屏对比查看
  const handleCompareView = useCallback((type: EvaluationType) => {
    navigate(`/tutorial/${type}`)
  }, [navigate])

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


        {/* ===== Official Example Models ===== */}
        <section id="examples-section">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="text-[20px] font-semibold tracking-[-0.01em] flex items-center gap-2">
                📚 示例模型
              </h2>
              <p className="mt-1 text-[14px] text-text-secondary">
                每种类型提供优秀案例与问题案例，支持同屏对比查看
              </p>
            </div>
            <Badge variant="secondary" className="px-2.5 py-1 text-[12px]">
              {typeGroups.length} 类
            </Badge>
          </div>

          <div className="space-y-2.5">
            {typeGroups.map(({ type, excellent, problematic }) => {
              if (!excellent || !problematic) return null
              const excScore = excellent.record.total
              const probScore = problematic.record.total
              const excRatio = excScore / excellent.record.maxTotal
              const probRatio = probScore / problematic.record.maxTotal

              return (
                <div
                  key={type}
                  className="rounded-2xl glass overflow-hidden transition-all duration-300"
                >
                  {/* Body: 3 columns */}
                  <div className="flex divide-x divide-black/[0.04]">
                    {/* ── Column 1: Compare View ── */}
                    <button
                      onClick={() => handleCompareView(type)}
                      className="flex-[4] p-3 group text-left hover:bg-black/[0.01] transition-colors min-w-0"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-semibold text-text-primary">
                          {MODEL_TYPE_LABELS[type]}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">同高模</Badge>
                      </div>

                      {/* Score comparison */}
                      <div className="space-y-2">
                        {/* Dual score + bar */}
                        <div className="flex items-center gap-3">
                          <span className="mono text-[20px] font-bold text-red-500 leading-none">{probScore.toFixed(1)}</span>
                          <div className="flex-1 h-1 rounded-full bg-black/[0.06] overflow-hidden flex justify-end">
                            <div className="h-full rounded-full bg-red-400" style={{ width: `${probRatio * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-text-tertiary shrink-0">VS</span>
                          <div className="flex-1 h-1 rounded-full bg-black/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${excRatio * 100}%` }} />
                          </div>
                          <span className="mono text-[20px] font-bold text-emerald-500 leading-none">{excScore.toFixed(1)}</span>
                        </div>

                        {/* Dimension mini bars */}
                        <div className="space-y-0.5">
                          {excellent.record.dimensionScores.map((dim) => {
                            const probDim = problematic.record.dimensionScores.find((d) => d.dimensionName === dim.dimensionName)
                            const probPct = probDim ? probDim.score / probDim.maxScore : 0
                            const excPct = dim.score / dim.maxScore
                            return (
                              <div key={dim.dimensionName} className="flex items-center gap-1">
                                <span className="text-[10px] text-text-tertiary w-14 text-right shrink-0 truncate leading-tight">{dim.dimensionName}</span>
                                <div className="flex-1 h-1 rounded-full bg-black/[0.04] overflow-hidden flex justify-end">
                                  <div className="h-full rounded-full bg-red-300/60" style={{ width: `${probPct * 100}%` }} />
                                </div>
                                <span className="w-px h-2 bg-black/10 shrink-0" />
                                <div className="flex-1 h-1 rounded-full bg-black/[0.04] overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-300/60" style={{ width: `${excPct * 100}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="mt-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-4 py-1.5 text-[12px] font-medium group-hover:shadow-md group-hover:shadow-accent/20 transition-all duration-200">
                          同屏对比
                          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </button>

                    {/* ── Column 2: Excellent Case ── */}
                    <button
                      onClick={() => handleViewModel(excellent)}
                      className="flex-[2] p-2.5 group text-left hover:bg-black/[0.01] transition-colors"
                    >
                      <div className="rounded-lg overflow-hidden border border-emerald-200/40">
                        <div className="aspect-[3/2] bg-[#e8e8ed] relative">
                          <ModelCardThumbnail modelUrl={excellent.modelUrl} />
                          <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-emerald-600">已评测</span>
                        </div>
                        <div className="px-2.5 py-2 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-text-primary truncate">{excellent.name}</p>
                            <span className={`mono text-[15px] font-bold ${
                              excRatio < 0.4 ? 'text-red-500' : excRatio < 0.7 ? 'text-amber-500' : 'text-emerald-500'
                            }`}>
                              {excScore.toFixed(1)}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-accent font-medium shrink-0 ml-2">
                            查看 <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* ── Column 3: Problem Case ── */}
                    <button
                      onClick={() => handleViewModel(problematic)}
                      className="flex-[2] p-2.5 group text-left hover:bg-black/[0.01] transition-colors"
                    >
                      <div className="rounded-lg overflow-hidden border border-red-200/40">
                        <div className="aspect-[3/2] bg-[#e8e8ed] relative">
                          <ModelCardThumbnail modelUrl={problematic.modelUrl} />
                          <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-emerald-600">已评测</span>
                        </div>
                        <div className="px-2.5 py-2 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-text-primary truncate">{problematic.name}</p>
                            <span className={`mono text-[15px] font-bold ${
                              probRatio < 0.4 ? 'text-red-500' : probRatio < 0.7 ? 'text-amber-500' : 'text-emerald-500'
                            }`}>
                              {probScore.toFixed(1)}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-accent font-medium shrink-0 ml-2">
                            查看 <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
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

          {/* User models filter bar — 评测状态（大筛） */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-semibold text-text-secondary shrink-0">筛选：</span>
            <div className="flex items-center gap-2">
              {([
                { key: 'all' as const, label: '全部状态' },
                { key: 'evaluated' as const, label: '已评测' },
                { key: 'unevaluated' as const, label: '未评测' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setUserEvalStatus(key)}
                  className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
                    userEvalStatus === key
                      ? 'bg-accent text-white shadow-sm shadow-accent/20'
                      : 'bg-black/[0.04] text-text-tertiary hover:bg-black/[0.07] hover:text-text-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary filter bar — 用途 + 类型 */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-medium text-text-tertiary shrink-0">类型：</span>
            <div className="flex items-center gap-1">
              {([
                { key: 'all' as const, label: '全部用途' },
                { key: 'game' as const, label: '游戏' },
                { key: 'general' as const, label: '通用' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setUserUsage(key)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ${
                    userUsage === key
                      ? 'bg-black/[0.06] text-text-primary'
                      : 'text-text-tertiary hover:bg-black/[0.04] hover:text-text-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-text-tertiary">·</span>
            <div className="flex items-center gap-1">
              {([
                { key: 'all' as const, label: '全部类型' },
                { key: 'dynamic' as const, label: '可动模型' },
                { key: 'static' as const, label: '静态模型' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setUserAnimation(key)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ${
                    userAnimation === key
                      ? 'bg-black/[0.06] text-text-primary'
                      : 'text-text-tertiary hover:bg-black/[0.04] hover:text-text-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
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
                  modelUrl={record.thumbnailUrl || undefined}
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
