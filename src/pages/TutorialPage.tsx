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

  // AI section toggle
  const [showAI, setShowAI] = useState(true)

  const { problemDef, excellentDef } = useMemo(() => {
    const defs = getExampleDefs().filter((d) => d.type === evalType)
    const prob = defs.find((d) => d.quality === 'problematic')
    const exc = defs.find((d) => d.quality === 'excellent')
    return { problemDef: prob ?? null, excellentDef: exc ?? null }
  }, [evalType])

  const standard = useMemo(() => getStandardByType(evalType), [evalType])

  // Load models + run topology analysis
  // 两个模型并行下载+解析，全部完成后（通过完整性校验）才展示对比界面
  useEffect(() => {
    if (!problemDef || !excellentDef) return

    const { startLoading, setProgress, finishLoading } = useLoadingStore.getState()
    startLoading()

    const loadAll = async () => {
      try {
        const { parseOBJFile, extractOBJFaceData } = await import('@/lib/model-parser')
        const { analyzeTopology } = await import('@/lib/topology-analyzer')

        /** 校验模型解析结果：确保包含有效几何体 */
        function validateModel(group: THREE.Group, label: string): void {
          let meshCount = 0
          let totalVerts = 0
          group.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              meshCount++
              const geo = (child as THREE.Mesh).geometry
              if (geo.getAttribute('position')) {
                totalVerts += geo.getAttribute('position').count
              }
            }
          })
          if (meshCount === 0 || totalVerts === 0) {
            throw new Error(`${label} 解析结果无效（无几何体或顶点数据），请检查文件完整性`)
          }
          console.log(`[Tutorial] ${label} 校验通过: ${meshCount} mesh(es), ${totalVerts} verts`)
        }

        /** 加载单个模型：下载 → 解析 → 拓扑分析 → 校验 */
        async function loadOne(
          def: NonNullable<typeof problemDef>,
          label: string,
          startPct: number,
        ): Promise<LoadedModel> {
          setLoadStage(`正在下载${label}...`)
          setProgress(startPct, 'download', `正在下载${label}...`)
          const res = await fetch(def.modelUrl)
          if (!res.ok) throw new Error(`${label} 下载失败 (HTTP ${res.status})`)
          const text = await res.text()
          if (!text || text.length < 100) throw new Error(`${label} 文件内容为空或不完整`)

          setProgress(startPct + 10, 'parse', `正在解析${label}...`)
          const group = await parseOBJFile(new File([text], `${def.id}.obj`, { type: 'text/plain' }))
          const faceData = extractOBJFaceData(text)

          setProgress(startPct + 15, 'analyze', `正在分析${label}拓扑...`)
          const report = analyzeTopology(group, faceData)

          validateModel(group, label)

          return {
            group, faceData,
            name: def.name, fileSize: def.record.modelFileSize,
            report,
          }
        }

        // 两个模型并行加载，全部完成后才继续
        setLoadStage('正在加载对比模型...')
        setProgress(0, 'download', '正在并行下载两个模型...')
        const [probResult, excResult] = await Promise.all([
          loadOne(problemDef, '问题案例', 5),
          loadOne(excellentDef, '优秀案例', 45),
        ])

        // 一次性更新所有状态
        setProblemModel(probResult)
        setExcellentModel(excResult)
        setProgress(85, 'analyze', '模型加载完成')
        setLoadStage('')

        // 触发 AI 对比分析
        setAiLoading(true)
        const probAugmented = { ...problemDef.record, autoReport: probResult.report }
        const excAugmented = { ...excellentDef.record, autoReport: excResult.report }
        try {
          const result = await generateAICompareAnalysis(probAugmented, excAugmented)
          setAiResult(result)
        } catch (e) {
          console.error('AI comparison failed:', e)
          setAiError(e instanceof Error ? e.message : 'AI 分析服务暂时不可用')
        } finally {
          setAiLoading(false)
        }

        setProgress(100, 'done', '加载完成')
        finishLoading()
        setLoading(false)
      } catch (err) {
        console.error('Model load error:', err)
        setError(err instanceof Error ? err.message : '模型加载失败')
        finishLoading()
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
          <div className="w-[420px] shrink-0 border-x border-black/5 overflow-y-auto">
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
                  <span className={`mono text-[13px] font-semibold ${excTotal > probTotal ? 'text-blue-500' : excTotal < probTotal ? 'text-blue-500' : 'text-text-tertiary'}`}>
                    {(excTotal - probTotal).toFixed(1)}
                  </span>
                </div>
              </div>

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

                    return (
                      <div key={dim.id} className="rounded-lg bg-black/[0.02] overflow-hidden">
                        {/* Dimension header */}
                        <div className="flex items-center gap-2 px-3 py-2">
                          <span className="text-[12px] font-semibold text-text-primary truncate">{dim.name}</span>
                          <span className="text-[10px] text-text-tertiary shrink-0">{dim.weight}分</span>
                          {/* Mini score bars */}
                          <div className="flex items-center gap-1 ml-auto">
                            <div className="w-12 h-1.5 rounded-full bg-black/[0.06] overflow-hidden flex justify-end">
                              <div className="h-full rounded-full bg-blue-300/70" style={{ width: `${probPct * 100}%` }} />
                            </div>
                            <span className="mono text-[10px] text-blue-400 w-6 text-right shrink-0">{probScore?.score.toFixed(1) ?? '0'}</span>
                            <span className="text-[9px] text-text-tertiary">│</span>
                            <span className="mono text-[10px] text-blue-500 w-6 text-left shrink-0">{excScore?.score.toFixed(1) ?? '0'}</span>
                            <div className="w-12 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                              <div className="h-full rounded-full bg-blue-400/70" style={{ width: `${excPct * 100}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Criteria list — always visible */}
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
                                        className={`h-full rounded-full transition-all duration-300 ${isActive ? 'bg-blue-400' : 'bg-blue-300/60'}`}
                                        style={{ width: `${pPct * 100}%` }}
                                      />
                                    </div>
                                    <span className={`mono text-[11px] font-semibold w-5 text-right shrink-0 ${isActive ? 'text-blue-500' : 'text-blue-400'}`}>
                                      {pRaw}
                                    </span>
                                    <span className="text-[9px] text-text-tertiary shrink-0">│</span>
                                    <span className={`mono text-[11px] font-semibold w-5 text-left shrink-0 ${isActive ? 'text-blue-600' : 'text-blue-500'}`}>
                                      {eRaw}
                                    </span>
                                    <div className="flex-1 h-1 rounded-full bg-black/[0.05] overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${isActive ? 'bg-blue-500' : 'bg-blue-400/60'}`}
                                        style={{ width: `${ePct * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                      </div>
                    )
                  })}
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
                    深度对比分析
                  </h3>
                  {showAI ? <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" /> : <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />}
                </button>

                {showAI && (
                  <div className="mt-2">
                    {aiLoading && (
                      <div className="flex items-center gap-2 py-3 px-3 rounded-lg bg-black/[0.02]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                        <span className="text-[12px] text-text-tertiary">正在对比分析...</span>
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
                          再次分析
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-black/[0.06]" />

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
              {/* 悬浮工具栏 — 放在右侧视口内，不遮挡中间面板 */}
              <div className="absolute bottom-3 right-3 z-40">
                <ViewerToolbar horizontal showActions={false} />
              </div>
            </div>
            <div className="h-10 flex items-center justify-center glass border-t border-black/5 shrink-0 gap-2">
              <span className={`mono text-[20px] font-bold ${excGrade.color}`}>{excTotal.toFixed(1)}</span>
              <span className="text-[12px] text-text-tertiary">/ 100</span>
              <span className={`text-[11px] font-medium ml-1 ${excGrade.color}`}>{excGrade.emoji} {excGrade.name}</span>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
