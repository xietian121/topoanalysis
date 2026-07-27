import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, Loader2, RefreshCw, ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CompareCanvas } from '@/components/viewer/CompareCanvas'
import { ViewerToolbar } from '@/components/viewer/ViewerToolbar'
import { ModelInfoOverlay } from '@/components/viewer/ModelInfoOverlay'
import { useViewerStore } from '@/stores/viewerStore'
import { useLoadingStore } from '@/stores/loadingStore'
import { useHighlightStore } from '@/stores/highlightStore'
import { getExampleDefs } from '@/data/example-models'
import { getStandardByType } from '@/data/evaluation-standards'
import { generateAICompareAnalysis } from '@/lib/ai-analysis'
import { MODEL_TYPE_LABELS, type EvaluationType } from '@/types/evaluation'
import type { OBJFaceData } from '@/lib/model-parser'
import type { TopologyReport } from '@/lib/topology-analyzer'
import * as THREE from 'three'

interface LoadedModel {
  group: THREE.Group
  faceData: OBJFaceData | null
  name: string
  fileSize: number
  report: TopologyReport | null
}

/** 简易 Markdown → HTML */
function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-[12px] font-semibold text-text-primary mt-3 mb-1">$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-[13px] font-bold text-text-primary mt-4 mb-2">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-[14px] font-bold text-text-primary mt-4 mb-2">$1</h2>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-text-primary">$1</strong>')
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 mt-1 text-[12px] text-text-secondary list-disc">$1</li>')
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mt-1 text-[12px] text-text-secondary list-decimal" value="$1">$2</li>')
  html = html.replace(/\n\n/g, '</p><p class="text-[12px] text-text-secondary leading-relaxed">')
  html = '<p class="text-[12px] text-text-secondary leading-relaxed">' + html + '</p>'
  html = html.replace(/<p[^>]*><\/p>/g, '')
  return html
}

function getGradeLabel(score: number): { emoji: string; name: string; color: string } {
  if (score >= 90) return { emoji: '🏆', name: '优质模型', color: 'text-emerald-500' }
  if (score >= 80) return { emoji: '⚠️', name: '良好模型', color: 'text-amber-500' }
  if (score >= 70) return { emoji: '🔶', name: '入门模型', color: 'text-orange-500' }
  if (score >= 60) return { emoji: '🔴', name: '问题模型', color: 'text-red-500' }
  return { emoji: '❌', name: '不合格', color: 'text-red-600' }
}

export function TutorialPage() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const evalType = type as EvaluationType
  const renderMode = useViewerStore((s) => s.settings.renderMode)
  const showGrid = useViewerStore((s) => s.settings.showGrid)
  const activeCriterion = useHighlightStore((s) => s.criterionId)
  const setHighlight = useHighlightStore((s) => s.setCriterion)

  const [problemModel, setProblemModel] = useState<LoadedModel | null>(null)
  const [excellentModel, setExcellentModel] = useState<LoadedModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadStage, setLoadStage] = useState('')
  const [error, setError] = useState<string | null>(null)

  // AI compare analysis state
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  // Panel accordion state
  const [expandedDim, setExpandedDim] = useState<string | null>(null)
  const [showAI, setShowAI] = useState(true)

  const { problemDef, excellentDef } = useMemo(() => {
    const defs = getExampleDefs().filter((d) => d.type === evalType)
    const prob = defs.find((d) => d.quality === 'problematic')
    const exc = defs.find((d) => d.quality === 'excellent')
    return { problemDef: prob ?? null, excellentDef: exc ?? null }
  }, [evalType])

  const standard = useMemo(() => getStandardByType(evalType), [evalType])

  // Load models + run topology analysis
  useEffect(() => {
    if (!problemDef || !excellentDef) return

    const { startLoading, setProgress, finishLoading } = useLoadingStore.getState()
    startLoading()

    const loadAll = async () => {
      try {
        const { parseOBJFile, extractOBJFaceData } = await import('@/lib/model-parser')
        const { analyzeTopology } = await import('@/lib/topology-analyzer')

        // Step 1: Load problem model
        setLoadStage('正在加载问题模型...')
        setProgress(5, 'download', '正在加载问题模型...')
        const probRes = await fetch(problemDef.modelUrl)
        const probText = await probRes.text()
        setProgress(20, 'parse', '正在解析问题模型...')
        const probGroup = await parseOBJFile(new File([probText], 'problem.obj', { type: 'text/plain' }))
        const probFaceData = extractOBJFaceData(probText)
        setProgress(30, 'analyze', '正在分析问题模型拓扑...')
        const probReport = analyzeTopology(probGroup, probFaceData)
        setProblemModel({
          group: probGroup, faceData: probFaceData,
          name: problemDef.name, fileSize: problemDef.record.modelFileSize,
          report: probReport,
        })

        // Step 2: Load excellent model
        setLoadStage('正在加载优秀模型...')
        setProgress(50, 'download', '正在加载优秀模型...')
        const excRes = await fetch(excellentDef.modelUrl)
        const excText = await excRes.text()
        setProgress(70, 'parse', '正在解析优秀模型...')
        const excGroup = await parseOBJFile(new File([excText], 'excellent.obj', { type: 'text/plain' }))
        const excFaceData = extractOBJFaceData(excText)
        setProgress(80, 'analyze', '正在分析优秀模型拓扑...')
        const excReport = analyzeTopology(excGroup, excFaceData)
        setExcellentModel({
          group: excGroup, faceData: excFaceData,
          name: excellentDef.name, fileSize: excellentDef.record.modelFileSize,
          report: excReport,
        })

        setProgress(100, 'done', '加载完成')
        finishLoading()
        setLoading(false)
        setLoadStage('')

        // Trigger AI comparison with augmented records
        setAiLoading(true)
        const probAugmented = { ...problemDef.record, autoReport: probReport }
        const excAugmented = { ...excellentDef.record, autoReport: excReport }
        try {
          const result = await generateAICompareAnalysis(probAugmented, excAugmented)
          setAiResult(result)
        } catch (e) {
          console.error('AI comparison failed:', e)
          setAiError(e instanceof Error ? e.message : 'AI 分析服务暂时不可用')
        } finally {
          setAiLoading(false)
        }
      } catch (err) {
        console.error('Model load error:', err)
        setError(err instanceof Error ? err.message : '模型加载失败')
        setLoading(false)
      }
    }

    loadAll()
  }, [problemDef, excellentDef])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setHighlight(null)
      const dispose = (g: THREE.Group | null) => {
        if (!g) return
        g.traverse((child) => {
          if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose()
          if ((child as THREE.Mesh).material) {
            const mat = (child as THREE.Mesh).material
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
            else mat.dispose()
          }
        })
      }
      dispose(problemModel?.group ?? null)
      dispose(excellentModel?.group ?? null)
    }
  }, [])

  const handleCriterionClick = useCallback((criterionId: string) => {
    setHighlight(activeCriterion === criterionId ? null : criterionId)
  }, [activeCriterion, setHighlight])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!problemDef || !excellentDef) {
    return (
      <div className="h-full overflow-auto flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-[16px] text-text-secondary">该类型暂无双模型对比数据</p>
          <button onClick={() => navigate('/')} className="text-[14px] text-accent hover:underline">返回首页</button>
        </div>
      </div>
    )
  }

  const probTotal = problemDef.record.total
  const excTotal = excellentDef.record.total
  const probGrade = getGradeLabel(probTotal)
  const excGrade = getGradeLabel(excTotal)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-primary">
      {/* Top bar */}
      <div className="h-11 flex items-center px-4 glass border-b border-black/5 shrink-0 gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回首页
        </button>
        <span className="text-[13px] font-semibold text-text-primary">
          {MODEL_TYPE_LABELS[evalType]} · 拓扑对比
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">同屏对比</Badge>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-text-tertiary">{loadStage || '加载对比模型...'}</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-[14px] text-text-secondary">加载失败</p>
            <p className="text-[12px] text-text-tertiary">{error}</p>
            <button onClick={() => navigate('/')} className="text-[13px] text-accent hover:underline">返回首页</button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* ── Left: Problem model viewport ── */}
          <div className="flex-[3] flex flex-col min-h-0 min-w-0">
            <div className="h-8 flex items-center px-3 glass border-b border-black/5 shrink-0 gap-2">
              <span className="text-[11px] font-semibold text-red-500">❌ 问题案例</span>
              <span className="text-[10px] text-text-tertiary truncate">{problemDef.name}</span>
              <span className="mono text-[10px] text-text-tertiary ml-auto">{formatSize(problemDef.record.modelFileSize)}</span>
            </div>
            <div className="flex-1 relative min-h-0">
              {problemModel && (
                <CompareCanvas
                  model={problemModel.group}
                  renderMode={renderMode}
                  showGrid={showGrid}
                  side="left"
                  objFaceData={problemModel.faceData}
                  highlightAutoReport={problemModel.report}
                />
              )}
              {problemModel && (
                <ModelInfoOverlay
                  model={problemModel.group}
                  modelInfo={null}
                  faceData={problemModel.faceData}
                  label="问题案例"
                  labelDesc={problemModel.name}
                />
              )}
            </div>
            <div className="h-10 flex items-center justify-center glass border-t border-black/5 shrink-0 gap-2">
              <span className={`mono text-[20px] font-bold ${probGrade.color}`}>{probTotal.toFixed(1)}</span>
              <span className="text-[12px] text-text-tertiary">/ 100</span>
              <span className={`text-[11px] font-medium ml-1 ${probGrade.color}`}>{probGrade.emoji} {probGrade.name}</span>
            </div>
          </div>

          {/* ── Center: Professional analysis panel ── */}
          <div className="w-[340px] shrink-0 border-x border-black/5 overflow-y-auto">
            <div className="p-3 space-y-4">
              {/* Score comparison header */}
              <div className="text-center space-y-1">
                <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                  综合对比
                </h3>
                <div className="flex items-center justify-center gap-2">
                  <span className={`mono text-[24px] font-bold ${probGrade.color}`}>{probTotal.toFixed(1)}</span>
                  <span className="text-[12px] text-text-tertiary font-medium">VS</span>
                  <span className={`mono text-[24px] font-bold ${excGrade.color}`}>{excTotal.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-[11px]">
                  <span className={probGrade.color}>{probGrade.emoji} {probGrade.name}</span>
                  <span className="text-text-tertiary">—</span>
                  <span className={excGrade.color}>{excGrade.emoji} {excGrade.name}</span>
                </div>
                {/* Score gap */}
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] text-text-tertiary">分差</span>
                  <span className={`mono text-[13px] font-semibold ${excTotal > probTotal ? 'text-emerald-500' : 'text-red-500'}`}>
                    {(excTotal - probTotal).toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="border-t border-black/[0.06]" />

              {/* AI Analysis Section */}
              <div>
                <button
                  onClick={() => setShowAI(!showAI)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-[12px] font-semibold text-text-primary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    AI 深度对比分析
                  </h3>
                  {showAI ? <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" /> : <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />}
                </button>

                {showAI && (
                  <div className="mt-2">
                    {aiLoading && (
                      <div className="flex items-center gap-2 py-3 px-3 rounded-lg bg-black/[0.02]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                        <span className="text-[12px] text-text-tertiary">AI 正在对比分析...</span>
                      </div>
                    )}
                    {aiError && !aiLoading && (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
                        <p className="text-[12px] text-amber-700">{aiError}</p>
                        <button
                          onClick={async () => {
                            setAiError(null)
                            setAiLoading(true)
                            try {
                              const probAugmented = { ...problemDef.record, autoReport: problemModel?.report ?? null }
                              const excAugmented = { ...excellentDef.record, autoReport: excellentModel?.report ?? null }
                              const result = await generateAICompareAnalysis(probAugmented, excAugmented)
                              setAiResult(result)
                            } catch (e) {
                              setAiError(e instanceof Error ? e.message : 'AI 分析服务暂时不可用')
                            } finally { setAiLoading(false) }
                          }}
                          className="flex items-center gap-1.5 text-[12px] text-accent hover:underline"
                        >
                          <RefreshCw className="h-3 w-3" />
                          重试
                        </button>
                      </div>
                    )}
                    {aiResult && !aiLoading && (
                      <div className="rounded-lg bg-black/[0.02] p-3 space-y-3">
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(aiResult) }}
                        />
                        <button
                          onClick={async () => {
                            setAiResult(null)
                            setAiLoading(true)
                            try {
                              const probAugmented = { ...problemDef.record, autoReport: problemModel?.report ?? null }
                              const excAugmented = { ...excellentDef.record, autoReport: excellentModel?.report ?? null }
                              const result = await generateAICompareAnalysis(probAugmented, excAugmented)
                              setAiResult(result)
                            } catch (e) {
                              setAiError(e instanceof Error ? e.message : 'AI 分析服务暂时不可用')
                            } finally { setAiLoading(false) }
                          }}
                          className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-accent transition-colors"
                        >
                          <RefreshCw className="h-3 w-3" />
                          重新生成
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-black/[0.06]" />

              {/* Dimension-by-dimension comparison */}
              <div>
                <h3 className="text-[12px] font-semibold text-text-primary mb-2 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-accent" />
                  逐维度对比
                  <span className="text-[10px] text-text-tertiary font-normal ml-auto">点击准则高亮</span>
                </h3>

                <div className="space-y-1.5">
                  {standard.dimensions.map((dim) => {
                    const probScore = problemDef.record.dimensionScores.find((d) => d.dimensionId === dim.id)
                    const excScore = excellentDef.record.dimensionScores.find((d) => d.dimensionId === dim.id)
                    const probPct = probScore ? probScore.score / probScore.maxScore : 0
                    const excPct = excScore ? excScore.score / excScore.maxScore : 0
                    const isExpanded = expandedDim === dim.id

                    return (
                      <div key={dim.id} className="rounded-lg bg-black/[0.02] overflow-hidden">
                        {/* Dimension header — clickable to expand */}
                        <button
                          onClick={() => setExpandedDim(isExpanded ? null : dim.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-black/[0.03] transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="h-3 w-3 text-text-tertiary shrink-0" /> : <ChevronRight className="h-3 w-3 text-text-tertiary shrink-0" />}
                          <span className="text-[12px] font-medium text-text-primary truncate">{dim.name}</span>
                          <span className="text-[10px] text-text-tertiary shrink-0">{dim.weight}分</span>
                          {/* Mini score bars */}
                          <div className="flex items-center gap-1 ml-auto">
                            <div className="w-12 h-1.5 rounded-full bg-black/[0.06] overflow-hidden flex justify-end">
                              <div className="h-full rounded-full bg-red-300/70" style={{ width: `${probPct * 100}%` }} />
                            </div>
                            <span className="mono text-[10px] text-red-400 w-6 text-right shrink-0">{probScore?.score.toFixed(1) ?? '0'}</span>
                            <span className="text-[9px] text-text-tertiary">│</span>
                            <span className="mono text-[10px] text-emerald-400 w-6 text-left shrink-0">{excScore?.score.toFixed(1) ?? '0'}</span>
                            <div className="w-12 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-300/70" style={{ width: `${excPct * 100}%` }} />
                            </div>
                          </div>
                        </button>

                        {/* Expanded: criteria list */}
                        {isExpanded && (
                          <div className="px-3 pb-2 space-y-0.5">
                            {dim.criteria.map((crit) => {
                              const pRaw = problemDef.record.reviewScores?.[crit.id] ?? 0
                              const eRaw = excellentDef.record.reviewScores?.[crit.id] ?? 0
                              const pPct = pRaw / 10
                              const ePct = eRaw / 10
                              const isActive = activeCriterion === crit.id

                              return (
                                <button
                                  key={crit.id}
                                  onClick={(e) => { e.stopPropagation(); handleCriterionClick(crit.id) }}
                                  className={`w-full text-left rounded-md px-2 py-1.5 transition-all duration-150 ${
                                    isActive
                                      ? 'bg-accent/[0.08] border-l-[3px] border-accent pl-[5px]'
                                      : 'border-l-[3px] border-transparent pl-[5px] hover:bg-black/[0.03]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className={`text-[11px] font-medium truncate ${isActive ? 'text-accent' : 'text-text-secondary'}`}>
                                      {crit.name}
                                    </span>
                                    <span className={`text-[9px] ml-1 shrink-0 ${isActive ? 'text-accent' : 'text-text-tertiary'}`}>
                                      {crit.maxScore}分
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="flex-1 h-1 rounded-full bg-black/[0.05] overflow-hidden flex justify-end">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${isActive ? 'bg-red-400' : 'bg-red-300/60'}`}
                                        style={{ width: `${pPct * 100}%` }}
                                      />
                                    </div>
                                    <span className={`mono text-[11px] font-semibold w-5 text-right shrink-0 ${isActive ? 'text-red-500' : 'text-red-400'}`}>
                                      {pRaw}
                                    </span>
                                    <span className="text-[9px] text-text-tertiary shrink-0">│</span>
                                    <span className={`mono text-[11px] font-semibold w-5 text-left shrink-0 ${isActive ? 'text-emerald-500' : 'text-emerald-400'}`}>
                                      {eRaw}
                                    </span>
                                    <div className="flex-1 h-1 rounded-full bg-black/[0.05] overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${isActive ? 'bg-emerald-400' : 'bg-emerald-300/60'}`}
                                        style={{ width: `${ePct * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Excellent model viewport ── */}
          <div className="flex-[3] flex flex-col min-h-0 min-w-0">
            <div className="h-8 flex items-center px-3 glass border-b border-black/5 shrink-0 gap-2">
              <span className="text-[11px] font-semibold text-emerald-500">✅ 优秀案例</span>
              <span className="text-[10px] text-text-tertiary truncate">{excellentDef.name}</span>
              <span className="mono text-[10px] text-text-tertiary ml-auto">{formatSize(excellentDef.record.modelFileSize)}</span>
            </div>
            <div className="flex-1 relative min-h-0">
              {excellentModel && (
                <CompareCanvas
                  model={excellentModel.group}
                  renderMode={renderMode}
                  showGrid={showGrid}
                  side="right"
                  objFaceData={excellentModel.faceData}
                  highlightAutoReport={excellentModel.report}
                />
              )}
              {excellentModel && (
                <ModelInfoOverlay
                  model={excellentModel.group}
                  modelInfo={null}
                  faceData={excellentModel.faceData}
                  label="优秀案例"
                  labelDesc={excellentModel.name}
                />
              )}
            </div>
            <div className="h-10 flex items-center justify-center glass border-t border-black/5 shrink-0 gap-2">
              <span className={`mono text-[20px] font-bold ${excGrade.color}`}>{excTotal.toFixed(1)}</span>
              <span className="text-[12px] text-text-tertiary">/ 100</span>
              <span className={`text-[11px] font-medium ml-1 ${excGrade.color}`}>{excGrade.emoji} {excGrade.name}</span>
            </div>
          </div>

          {/* ── Floating toolbar ── */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
            <ViewerToolbar horizontal showActions={false} />
          </div>
        </div>
      )}
    </div>
  )
}
