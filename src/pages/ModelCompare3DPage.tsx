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
import { useComparePoolStore } from '@/stores/comparePoolStore'
import { useEvalHistoryStore, type EvalHistoryRecord } from '@/stores/evalHistoryStore'
import { getExampleRecords } from '@/data/example-models'
import { getStandardByType } from '@/data/evaluation-standards'
import { generateAICompareAnalysis } from '@/lib/ai-analysis'
import { MODEL_TYPE_LABELS } from '@/types/evaluation'
import type { OBJFaceData } from '@/lib/model-parser'
import type { TopologyReport } from '@/lib/topology-analyzer'
import * as THREE from 'three'

// ============================================================================
// Types & helpers
// ============================================================================

interface LoadedModel {
  group: THREE.Group
  faceData: OBJFaceData | null
  name: string
  fileSize: number
  report: TopologyReport | null
}

function getGradeLabel(score: number): { name: string; color: string } {
  if (score >= 90) return { name: '优质模型', color: 'text-emerald-500' }
  if (score >= 80) return { name: '良好模型', color: 'text-amber-500' }
  if (score >= 70) return { name: '入门模型', color: 'text-orange-500' }
  if (score >= 60) return { name: '问题模型', color: 'text-red-500' }
  return { name: '不合格', color: 'text-red-600' }
}

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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function cleanName(name: string) {
  return name.replace(/\s*\(OBJ\).*/, '')
}

// ============================================================================
// Model not available placeholder
// ============================================================================

function ModelUnavailablePlaceholder({ name }: { name: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-2 px-6">
        <p className="text-[24px]">📦</p>
        <p className="text-[14px] font-medium text-text-primary">无法加载3D模型</p>
        <p className="text-[12px] text-text-tertiary leading-relaxed">
          {cleanName(name)} 的 OBJ 文件数据已过期，无法重新加载。<br />
          评分数据仍然可用。
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Main page
// ============================================================================

export function ModelCompare3DPage({ id1: propId1, id2: propId2, onBack: propOnBack }: {
  id1?: string
  id2?: string
  onBack?: () => void
} = {}) {
  const params = useParams<{ id1: string; id2: string }>()
  const navigate = useNavigate()
  const id1 = propId1 ?? params.id1!
  const id2 = propId2 ?? params.id2!

  // Store actions (must be before handleBack which references them)
  const clearActiveCompare = useComparePoolStore((s) => s.clearActiveCompare)
  const setActiveCompare = useComparePoolStore((s) => s.setActiveCompare)

  const handleBack = useCallback(() => {
    if (propOnBack) { propOnBack(); return }
    clearActiveCompare()
    navigate('/compare')
  }, [propOnBack, clearActiveCompare, navigate])

  // Viewer settings
  const renderMode = useViewerStore((s) => s.settings.renderMode)
  const showGrid = useViewerStore((s) => s.settings.showGrid)
  const activeCriterion = useHighlightStore((s) => s.criterionId)
  const setHighlight = useHighlightStore((s) => s.setCriterion)

  // Records
  const historyRecords = useEvalHistoryStore((s) => s.records)
  const exampleRecords = useMemo(() => getExampleRecords(), [])
  const allRecords = useMemo(() => [...exampleRecords, ...historyRecords], [exampleRecords, historyRecords])

  const recordA = useMemo(() => allRecords.find((r) => r.id === id1) ?? null, [allRecords, id1])
  const recordB = useMemo(() => allRecords.find((r) => r.id === id2) ?? null, [allRecords, id2])

  // Model loading
  const [modelA, setModelA] = useState<LoadedModel | null>(null)
  const [modelB, setModelB] = useState<LoadedModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadStage, setLoadStage] = useState('')
  const [error, setError] = useState<string | null>(null)

  // AI analysis
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showAI, setShowAI] = useState(true)

  // Persist active comparison IDs so tab-switching auto-restores
  // Note: do NOT clear on unmount — that would defeat the purpose.
  // Only clear when user explicitly clicks "返回选择".
  useEffect(() => {
    if (id1 && id2) setActiveCompare(id1, id2)
  }, [id1, id2, setActiveCompare])

  // Standard (based on record A's type, or fallback to game-dynamic)
  const standard = useMemo(() => {
    const type = recordA?.evaluationType ?? recordB?.evaluationType ?? 'game-dynamic'
    return getStandardByType(type)
  }, [recordA, recordB])

  // Load models
  useEffect(() => {
    if (!recordA || !recordB) return

    const { startLoading, setProgress, finishLoading } = useLoadingStore.getState()
    startLoading()

    const loadAll = async () => {
      try {
        const { parseOBJFile, extractOBJFaceData } = await import('@/lib/model-parser')
        const { analyzeTopology } = await import('@/lib/topology-analyzer')

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
        }

        async function loadOne(
          record: EvalHistoryRecord,
          label: string,
          startPct: number,
        ): Promise<LoadedModel | null> {
          setLoadStage(`正在加载${label}...`)
          setProgress(startPct, 'download', `正在下载${label}...`)

          let text: string

          if (record.modelUrl) {
            // Example model: fetch from public URL
            const res = await fetch(record.modelUrl)
            if (!res.ok) throw new Error(`${label} 下载失败 (HTTP ${res.status})`)
            text = await res.text()
          } else if (record.modelText) {
            // User model: use in-memory text
            text = record.modelText
          } else {
            // Cannot load 3D model data
            console.warn(`[Compare3D] ${label}: 无可用模型数据（modelUrl和modelText均缺失）`)
            return null
          }

          if (!text || text.length < 100) throw new Error(`${label} 文件内容为空或不完整`)

          setProgress(startPct + 10, 'parse', `正在解析${label}...`)
          const group = await parseOBJFile(new File([text], `${record.id}.obj`, { type: 'text/plain' }))
          const faceData = extractOBJFaceData(text)

          setProgress(startPct + 15, 'analyze', `正在分析${label}拓扑...`)
          const report = analyzeTopology(group, faceData)

          validateModel(group, label)

          return {
            group, faceData,
            name: record.modelName,
            fileSize: record.modelFileSize,
            report,
          }
        }

        setLoadStage('正在加载对比模型...')
        setProgress(0, 'download', '正在并行下载两个模型...')
        const [resultA, resultB] = await Promise.all([
          loadOne(recordA, cleanName(recordA.modelName), 5),
          loadOne(recordB, cleanName(recordB.modelName), 45),
        ])

        setModelA(resultA)
        setModelB(resultB)
        setProgress(85, 'analyze', '模型加载完成')
        setLoadStage('')

        // Trigger AI analysis
        setAiLoading(true)
        try {
          const augA = { ...recordA, autoReport: resultA?.report ?? null }
          const augB = { ...recordB, autoReport: resultB?.report ?? null }
          const result = await generateAICompareAnalysis(augA, augB)
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
  }, [recordA, recordB])

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
      dispose(modelA?.group ?? null)
      dispose(modelB?.group ?? null)
    }
  }, [])

  const handleCriterionClick = useCallback((criterionId: string) => {
    setHighlight(activeCriterion === criterionId ? null : criterionId)
  }, [activeCriterion, setHighlight])

  // Not found
  if (!recordA || !recordB) {
    return (
      <div className="h-full overflow-auto flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-[16px] text-text-secondary">未找到对比记录</p>
          <button onClick={handleBack} className="text-[14px] text-accent hover:underline">
            返回模型选择
          </button>
        </div>
      </div>
    )
  }

  const totalA = recordA.total
  const totalB = recordB.total
  const gradeA = getGradeLabel(totalA)
  const gradeB = getGradeLabel(totalB)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-primary">
      {/* Top bar */}
      <div className="h-11 flex items-center px-4 glass border-b border-black/5 shrink-0 gap-3">
        <button
          onClick={() => { handleBack() }}
          className="flex items-center gap-1 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回选择
        </button>
        <span className="text-[13px] font-semibold text-text-primary">
          {cleanName(recordA.modelName)} vs {cleanName(recordB.modelName)}
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">3D同屏对比</Badge>
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
            <button onClick={handleBack} className="text-[13px] text-accent hover:underline">返回选择</button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* ── Left: Model A viewport ── */}
          <div className="flex-[3] flex flex-col min-h-0 min-w-0">
            <div className="h-8 flex items-center px-3 glass border-b border-black/5 shrink-0 gap-2">
              <span className={`text-[11px] font-semibold ${gradeA.color}`}>模型A</span>
              <span className="text-[10px] text-text-tertiary truncate">{cleanName(recordA.modelName)}</span>
              <span className="text-[10px] text-text-tertiary ml-auto">
                {MODEL_TYPE_LABELS[recordA.evaluationType] ?? recordA.evaluationType}
              </span>
            </div>
            {modelA ? (
              <div className="flex-1 relative min-h-0">
                <CompareCanvas
                  model={modelA.group}
                  renderMode={renderMode}
                  showGrid={showGrid}
                  side="left"
                  objFaceData={modelA.faceData}
                  highlightAutoReport={modelA.report}
                />
                <ModelInfoOverlay
                  model={modelA.group}
                  modelInfo={null}
                  faceData={modelA.faceData}
                  label="模型A"
                  labelDesc={modelA.name}
                />
              </div>
            ) : (
              <ModelUnavailablePlaceholder name={recordA.modelName} />
            )}
            <div className="h-10 flex items-center justify-center glass border-t border-black/5 shrink-0 gap-2">
              <span className={`mono text-[20px] font-bold ${gradeA.color}`}>{totalA.toFixed(1)}</span>
              <span className="text-[12px] text-text-tertiary">/ {recordA.maxTotal}</span>
              <span className={`text-[11px] font-medium ml-1 ${gradeA.color}`}>{gradeA.name}</span>
            </div>
          </div>

          {/* ── Center: Comparison panel ── */}
          <div className="w-[420px] shrink-0 border-x border-black/5 overflow-y-auto">
            <div className="p-3 space-y-4">
              {/* Score comparison header */}
              <div className="text-center space-y-1">
                <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">综合对比</h3>
                <div className="flex items-center justify-center gap-2">
                  <span className={`mono text-[24px] font-bold ${gradeA.color}`}>{totalA.toFixed(1)}</span>
                  <span className="text-[12px] text-text-tertiary font-medium">VS</span>
                  <span className={`mono text-[24px] font-bold ${gradeB.color}`}>{totalB.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-[11px]">
                  <span className={gradeA.color}>{gradeA.name}</span>
                  <span className="text-text-tertiary">—</span>
                  <span className={gradeB.color}>{gradeB.name}</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] text-text-tertiary">分差</span>
                  <span className={`mono text-[13px] font-semibold ${totalB > totalA ? 'text-blue-500' : totalB < totalA ? 'text-blue-500' : 'text-text-tertiary'}`}>
                    {(totalB - totalA) > 0 ? '+' : ''}{(totalB - totalA).toFixed(1)}
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
                    const scoreA = recordA.dimensionScores.find((d) => d.dimensionId === dim.id)
                    const scoreB = recordB.dimensionScores.find((d) => d.dimensionId === dim.id)
                    const pctA = scoreA ? scoreA.score / scoreA.maxScore : 0
                    const pctB = scoreB ? scoreB.score / scoreB.maxScore : 0

                    return (
                      <div key={dim.id} className="rounded-lg bg-black/[0.02] overflow-hidden">
                        {/* Dimension header */}
                        <div className="flex items-center gap-2 px-3 py-2">
                          <span className="text-[12px] font-semibold text-text-primary truncate">{dim.name}</span>
                          <span className="text-[10px] text-text-tertiary shrink-0">{dim.weight}分</span>
                          <div className="flex items-center gap-1 ml-auto">
                            <div className="w-12 h-1.5 rounded-full bg-black/[0.06] overflow-hidden flex justify-end">
                              <div className="h-full rounded-full bg-blue-300/70" style={{ width: `${pctA * 100}%` }} />
                            </div>
                            <span className="mono text-[10px] text-blue-400 w-6 text-right shrink-0">{scoreA?.score.toFixed(1) ?? '—'}</span>
                            <span className="text-[9px] text-text-tertiary">│</span>
                            <span className="mono text-[10px] text-blue-500 w-6 text-left shrink-0">{scoreB?.score.toFixed(1) ?? '—'}</span>
                            <div className="w-12 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                              <div className="h-full rounded-full bg-blue-400/70" style={{ width: `${pctB * 100}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Criteria list */}
                        <div className="px-3 pb-2 space-y-0.5">
                          {dim.criteria.map((crit) => {
                            const rA = recordA.reviewScores?.[crit.id] ?? 0
                            const rB = recordB.reviewScores?.[crit.id] ?? 0
                            const pA = rA / 10
                            const pB = rB / 10
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
                                      style={{ width: `${pA * 100}%` }}
                                    />
                                  </div>
                                  <span className={`mono text-[11px] font-semibold w-5 text-right shrink-0 ${isActive ? 'text-blue-500' : 'text-blue-400'}`}>
                                    {rA}
                                  </span>
                                  <span className="text-[9px] text-text-tertiary shrink-0">│</span>
                                  <span className={`mono text-[11px] font-semibold w-5 text-left shrink-0 ${isActive ? 'text-blue-600' : 'text-blue-500'}`}>
                                    {rB}
                                  </span>
                                  <div className="flex-1 h-1 rounded-full bg-black/[0.05] overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${isActive ? 'bg-blue-500' : 'bg-blue-400/60'}`}
                                      style={{ width: `${pB * 100}%` }}
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
                              const augA = { ...recordA, autoReport: modelA?.report ?? null }
                              const augB = { ...recordB, autoReport: modelB?.report ?? null }
                              const result = await generateAICompareAnalysis(augA, augB)
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
                              const augA = { ...recordA, autoReport: modelA?.report ?? null }
                              const augB = { ...recordB, autoReport: modelB?.report ?? null }
                              const result = await generateAICompareAnalysis(augA, augB)
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

          {/* ── Right: Model B viewport ── */}
          <div className="flex-[3] flex flex-col min-h-0 min-w-0">
            <div className="h-8 flex items-center px-3 glass border-b border-black/5 shrink-0 gap-2">
              <span className={`text-[11px] font-semibold ${gradeB.color}`}>模型B</span>
              <span className="text-[10px] text-text-tertiary truncate">{cleanName(recordB.modelName)}</span>
              <span className="text-[10px] text-text-tertiary ml-auto">
                {MODEL_TYPE_LABELS[recordB.evaluationType] ?? recordB.evaluationType}
              </span>
            </div>
            {modelB ? (
              <div className="flex-1 relative min-h-0">
                <CompareCanvas
                  model={modelB.group}
                  renderMode={renderMode}
                  showGrid={showGrid}
                  side="right"
                  objFaceData={modelB.faceData}
                  highlightAutoReport={modelB.report}
                />
                <ModelInfoOverlay
                  model={modelB.group}
                  modelInfo={null}
                  faceData={modelB.faceData}
                  label="模型B"
                  labelDesc={modelB.name}
                />
                {/* Viewer toolbar — placed in right viewport */}
                <div className="absolute bottom-3 right-3 z-40">
                  <ViewerToolbar horizontal showActions={false} />
                </div>
              </div>
            ) : (
              <ModelUnavailablePlaceholder name={recordB.modelName} />
            )}
            <div className="h-10 flex items-center justify-center glass border-t border-black/5 shrink-0 gap-2">
              <span className={`mono text-[20px] font-bold ${gradeB.color}`}>{totalB.toFixed(1)}</span>
              <span className="text-[12px] text-text-tertiary">/ {recordB.maxTotal}</span>
              <span className={`text-[11px] font-medium ml-1 ${gradeB.color}`}>{gradeB.name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
