import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, AlertCircle, CheckCircle2, ExternalLink, RefreshCw, Sparkles, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ViewerCanvas } from '@/components/viewer/ViewerCanvas'
import { ViewerToolbar } from '@/components/viewer/ViewerToolbar'
import { useEvalHistoryStore } from '@/stores/evalHistoryStore'
import { useModelStore } from '@/stores/modelStore'
import { useHighlightStore } from '@/stores/highlightStore'
import { useLoadingStore } from '@/stores/loadingStore'
import { generateAIAnalysis } from '@/lib/ai-analysis'
import type { AIAnalysisResult } from '@/lib/ai-analysis'
import { getExampleRecords } from '@/data/example-models'
import { getStandardByType } from '@/data/evaluation-standards'
import { RadarChart } from '@/components/evaluation/RadarChart'
import { ScoreBadge } from '@/components/evaluation/ScoreBadge'
import { DimensionAccordion } from '@/components/report/DimensionAccordion'
import { MODEL_TYPE_LABELS } from '@/types/evaluation'
import type { SuggestionItem } from '@/types/evaluation'

/** 简易 Markdown → HTML，支持 ### ## ** - 列表 */
function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 标题
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-[12px] font-semibold text-text-primary mt-3 mb-1">$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-[13px] font-bold text-text-primary mt-4 mb-2">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-[14px] font-bold text-text-primary mt-4 mb-2">$1</h2>')

  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-text-primary">$1</strong>')

  // 列表项
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 mt-1 text-[12px] text-text-secondary list-disc">$1</li>')
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mt-1 text-[12px] text-text-secondary list-decimal" value="$1">$2</li>')

  // 段落（连续非空行 → <p>）
  html = html.replace(/\n\n/g, '</p><p class="text-[12px] text-text-secondary leading-relaxed">')
  html = '<p class="text-[12px] text-text-secondary leading-relaxed">' + html + '</p>'

  // 清理空 <p>
  html = html.replace(/<p[^>]*><\/p>/g, '')

  return html
}

function SuggestionSection({ title, items, icon: Icon, colorClass, borderClass, onItemClick }: {
  title: string
  items: SuggestionItem[]
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
  borderClass: string
  onItemClick?: (criterionId: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-2">
      <h3 className={`flex items-center gap-1.5 text-[13px] font-semibold ${colorClass}`}>
        <Icon className="h-3.5 w-3.5" />
        {title}
        <span className="text-[10px] font-normal text-text-tertiary">({items.length}条)</span>
      </h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => item.relatedCriterionId && onItemClick?.(item.relatedCriterionId)}
            className={`w-full text-left rounded-lg bg-white/60 border ${borderClass} p-3 space-y-1.5 transition-all duration-200 ${
              item.relatedCriterionId ? 'hover:shadow-sm hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'
            }`}
          >
            <h4 className="text-[12px] font-semibold text-text-primary">{item.title}</h4>
            <p className="text-[11px] text-text-secondary leading-relaxed">{item.description}</p>
            {item.why && (
              <p className="text-[10px] text-text-tertiary">
                <span className="font-medium">为什么重要：</span>{item.why}
              </p>
            )}
            {item.howToFix && (
              <p className="text-[10px] text-accent">
                <span className="font-medium">改进方向：</span>{item.howToFix}
              </p>
            )}
            {item.relatedCriterionId && (
              <p className="text-[10px] text-accent/60 text-right">点击高亮 →</p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const historyRecords = useEvalHistoryStore((s) => s.records)
  const updateRecord = useEvalHistoryStore((s) => s.updateRecord)
  const setHighlight = useHighlightStore((s) => s.setCriterion)
  const exampleRecords = useMemo(() => getExampleRecords(), [])

  // 3D model loading state
  const [modelReady, setModelReady] = useState(false)
  const [loadingModel, setLoadingModel] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  const modelObject = useModelStore((s) => s.modelObject)
  const currentModel = useModelStore((s) => s.currentModel)

  const record = useMemo(() => {
    const all = [...exampleRecords, ...historyRecords]
    return all.find((r) => r.id === id) ?? null
  }, [id, exampleRecords, historyRecords])

  // Load 3D model when record is available
  const alreadyLoaded = modelObject !== null && currentModel?.name === record?.modelName

  useEffect(() => {
    if (!record) return
    if (alreadyLoaded) {
      setModelReady(true)
      return
    }
    if (loadingRef.current) return

    const loadModel = async () => {
      loadingRef.current = true
      setLoadingModel(true)
      setLoadError(null)

      try {
        const { loadModelFromUrl, loadModelFromText } = useModelStore.getState()
        const { startLoading, setProgress, finishLoading } = useLoadingStore.getState()

        if (record.modelUrl) {
          startLoading()
          await loadModelFromUrl(record.modelUrl, record.modelName, {
            onProgress: (progress, stage, text) => {
              setProgress(progress, stage as Parameters<typeof setProgress>[1], text)
            },
          })
          finishLoading()
        } else if (record.modelText) {
          startLoading()
          await loadModelFromText(record.modelText, record.modelName, record.modelFileSize, {
            onProgress: (progress, stage, text) => {
              setProgress(progress, stage as Parameters<typeof setProgress>[1], text)
            },
          })
          finishLoading()
        } else {
          setLoadError('模型数据不可用（无 URL 或文本内容）')
          return
        }

        setModelReady(true)
      } catch (err) {
        console.error('ReportPage model load error:', err)
        setLoadError(err instanceof Error ? err.message : '模型加载失败')
      } finally {
        setLoadingModel(false)
        loadingRef.current = false
      }
    }

    loadModel()
  }, [record, alreadyLoaded])

  // ────── AI 深度分析 ──────
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(record?.aiAnalysis ?? null)
  const [aiError, setAiError] = useState<string | null>(null)
  const aiTriggered = useRef(false)

  useEffect(() => {
    if (!record || aiTriggered.current) return
    // 如果已有缓存的 AI 分析，直接使用
    if (record.aiAnalysis) {
      setAiResult(record.aiAnalysis)
      return
    }
    // 只有有自动检测数据的记录才触发 AI 分析
    if (!record.autoReport) return

    aiTriggered.current = true
    setAiLoading(true)
    setAiError(null)

    generateAIAnalysis(record)
      .then((result) => {
        setAiResult(result)
        updateRecord(record.id, { aiAnalysis: result })
      })
      .catch((err) => {
        console.error('AI 分析失败:', err)
        setAiError(err instanceof Error ? err.message : 'AI 分析服务暂时不可用')
      })
      .finally(() => setAiLoading(false))
  }, [record, updateRecord])

  // Clean up highlight on unmount
  useEffect(() => {
    return () => { setHighlight(null) }
  }, [setHighlight])

  const handleHighlight = useCallback((criterionId: string) => {
    setHighlight(criterionId)
  }, [setHighlight])

  const handleRescore = useCallback(() => {
    if (!record) return
    if (!window.confirm('重新打分将覆盖当前评测结果，确定吗？')) return

    // Model is already loaded in store, navigate directly
    navigate('/viewer/single')
  }, [record, navigate])

  // ────── Not Found ──────
  if (!record) {
    return (
      <div className="h-full flex items-center justify-center">
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

  const standard = getStandardByType(record.evaluationType)
  const dimensionAccordionData = useMemo(() => {
    return standard.dimensions.map((dim) => ({
      dimensionId: dim.id,
      dimensionName: dim.name,
      score: record.dimensionScores.find((d) => d.dimensionId === dim.id)?.score ?? 0,
      maxScore: dim.weight,
      criteria: dim.criteria,
    }))
  }, [standard, record.dimensionScores])

  return (
    <div className="flex-1 flex min-h-0 bg-surface-primary">
      {/* ===== Left: 3D Viewport ===== */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Top bar for report page */}
        <div className="h-10 flex items-center px-4 glass border-b border-black/5 shrink-0 gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回
          </button>

          <span className="text-[11px] text-text-tertiary">
            {MODEL_TYPE_LABELS[record.evaluationType] ?? record.evaluationType}
          </span>

          {record.isExample && (
            <Badge variant="secondary" className="text-[10px] bg-accent/10 text-accent">示例</Badge>
          )}

          <div className="flex-1" />

          <button
            onClick={handleRescore}
            className="inline-flex items-center gap-1.5 rounded-full glass-btn px-3 py-1 text-[12px] font-medium text-text-primary transition-all duration-200"
          >
            <RefreshCw className="h-3 w-3" />
            重新打分
          </button>
        </div>

        {/* 3D canvas area */}
        <div className="flex-1 relative min-h-0">
          {/* Loading overlay */}
          {loadingModel && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <div className="text-center space-y-2">
                <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[12px] text-text-tertiary">加载模型预览...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {loadError && !loadingModel && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-[13px] text-text-tertiary">3D 预览不可用</p>
                <p className="text-[11px] text-text-tertiary/60">{loadError}</p>
              </div>
            </div>
          )}

          {/* No model data */}
          {!loadingModel && !loadError && !modelReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[13px] text-text-tertiary">无模型数据</p>
            </div>
          )}

          {/* ViewerCanvas — fills parent */}
          {modelReady && <ViewerCanvas />}
        </div>

        {/* ViewerToolbar at bottom */}
        {modelReady && (
          <div className="flex justify-center pb-3 pt-1 shrink-0">
            <ViewerToolbar horizontal showActions={false} />
          </div>
        )}
      </div>

      {/* ===== Right: Analysis Panel ===== */}
      <div className="w-[430px] shrink-0 border-l border-black/5 glass overflow-y-auto">
        <div className="p-5 pb-8 space-y-5">
          {/* Model name + meta */}
          <div>
            <h1 className="text-[18px] font-bold tracking-[-0.02em] leading-tight">
              {record.modelName.replace(/\s*\(OBJ\).*/, '')}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-text-tertiary">
              <span>{record.modelFormat.toUpperCase()}</span>
              <span>·</span>
              <span>{formatSize(record.modelFileSize)}</span>
              <span>·</span>
              <span>{formatDate(record.createdAt)}</span>
            </div>
          </div>

          <Separator className="bg-black/5" />

          {/* Score + Grade */}
          <section>
            <div className="flex items-end gap-3 mb-3">
              <span className={`mono text-[48px] font-bold leading-none ${gradeColor}`}>
                {record.total.toFixed(1)}
              </span>
              <div className="pb-1">
                <span className="text-[14px] text-text-tertiary">/ {record.maxTotal}</span>
                <p className={`text-[12px] font-medium mt-0.5 ${gradeColor}`}>{gradeLabel}</p>
              </div>
            </div>

            {/* Radar chart + Dimension scores side by side */}
            <div className="flex items-start gap-4">
              <RadarChart
                dimensions={record.dimensionScores.map(d => ({
                  name: d.dimensionName,
                  score: d.score,
                  maxScore: d.maxScore,
                }))}
                size={130}
              />
              <div className="flex-1 space-y-1.5">
                {record.dimensionScores.map((dim) => (
                  <div key={dim.dimensionId} className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-black/[0.02]">
                    <span className="text-[12px] text-text-primary">{dim.dimensionName}</span>
                    <ScoreBadge score={dim.score} maxScore={dim.maxScore} />
                  </div>
                ))}
              </div>
            </div>

            {/* Auto / Manual breakdown */}
            <div className="flex gap-3 mt-3 text-[11px] text-text-tertiary">
              <span>自动检测: <span className="mono text-text-secondary">{record.autoTotal.toFixed(1)}</span></span>
              <span>人工评测: <span className="mono text-text-secondary">{record.manualTotal.toFixed(1)}</span></span>
            </div>
          </section>

          <Separator className="bg-black/5" />

          {/* Dimension Accordion */}
          <section>
            <h2 className="text-[13px] font-semibold tracking-[-0.01em] flex items-center gap-2 mb-2">
              📊 各维度得分详情
            </h2>
            <DimensionAccordion
              dimensions={dimensionAccordionData}
              reviewScores={record.reviewScores}
              autoReport={record.autoReport}
              onCriterionClick={handleHighlight}
            />
          </section>

          <Separator className="bg-black/5" />

          {/* Evaluation Summary */}
          {suggestions?.summary && (
            <section>
              <h2 className="text-[13px] font-semibold tracking-[-0.01em] flex items-center gap-2 mb-2">
                📝 评测总结
              </h2>
              <Card>
                <CardContent className="p-3">
                  <p className="text-[12px] text-text-secondary leading-relaxed">{suggestions.summary}</p>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Optimization Suggestions */}
          {suggestions && (
            <section className="space-y-4">
              <h2 className="text-[13px] font-semibold tracking-[-0.01em] flex items-center gap-2">
                🔧 优化建议
              </h2>

              <SuggestionSection
                title="严重问题（必须修复）"
                items={suggestions.critical}
                icon={AlertTriangle}
                colorClass="text-red-500"
                borderClass="border-red-200/50"
                onItemClick={handleHighlight}
              />
              <SuggestionSection
                title="建议优化（推荐改进）"
                items={suggestions.warning}
                icon={AlertCircle}
                colorClass="text-amber-500"
                borderClass="border-amber-200/50"
                onItemClick={handleHighlight}
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

          {!suggestions && !aiLoading && !aiResult && !aiError && (
            <section className="text-center py-8">
              <p className="text-[13px] text-text-tertiary">暂无优化建议数据</p>
            </section>
          )}

          {/* ===== AI 深度分析 ===== */}
          <Separator className="bg-black/5" />

          <section>
            <h2 className="text-[13px] font-semibold tracking-[-0.01em] flex items-center gap-2 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              AI 深度分析
              <span className="text-[10px] font-normal text-text-tertiary">DeepSeek</span>
            </h2>

            {/* Loading */}
            {aiLoading && (
              <Card>
                <CardContent className="p-6 flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 text-accent animate-spin" />
                  <p className="text-[13px] text-text-secondary">AI 正在分析模型拓扑数据...</p>
                  <p className="text-[11px] text-text-tertiary">通常需要 5-15 秒，请耐心等待</p>
                </CardContent>
              </Card>
            )}

            {/* Error */}
            {aiError && !aiLoading && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[12px] font-medium text-text-primary">AI 分析暂时不可用</p>
                      <p className="text-[11px] text-text-tertiary mt-1">{aiError}</p>
                      <button
                        onClick={() => {
                          if (!record) return
                          setAiError(null)
                          setAiLoading(true)
                          generateAIAnalysis(record)
                            .then((result) => {
                              setAiResult(result)
                              updateRecord(record.id, { aiAnalysis: result })
                            })
                            .catch((err) => {
                              setAiError(err instanceof Error ? err.message : 'AI 分析失败')
                            })
                            .finally(() => setAiLoading(false))
                        }}
                        className="mt-2 text-[11px] text-accent hover:underline"
                      >
                        重试
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Result */}
            {aiResult && !aiLoading && (
              <Card>
                <CardContent className="p-4">
                  <div
                    className="text-[12px] text-text-secondary leading-relaxed space-y-3 ai-analysis-content"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(aiResult.content) }}
                  />
                  <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
                    <span className="text-[10px] text-text-tertiary">
                      {formatDate(aiResult.generatedAt)}
                    </span>
                    <button
                      onClick={() => {
                        if (!record) return
                        setAiResult(null)
                        setAiLoading(true)
                        setAiError(null)
                        generateAIAnalysis(record)
                          .then((result) => {
                            setAiResult(result)
                            updateRecord(record.id, { aiAnalysis: result })
                          })
                          .catch((err) => {
                            setAiError(err instanceof Error ? err.message : 'AI 分析失败')
                          })
                          .finally(() => setAiLoading(false))
                      }}
                      className="inline-flex items-center gap-1 text-[10px] text-text-tertiary hover:text-accent transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                      重新生成
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <Separator className="bg-black/5" />

          {/* Bottom actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="text-[12px] text-text-tertiary hover:text-text-secondary transition-colors"
            >
              ← 返回首页
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/compare')}
                className="inline-flex items-center gap-1.5 rounded-full glass-btn px-3 py-1.5 text-[12px] font-medium text-text-primary"
              >
                <ExternalLink className="h-3 w-3" />
                加入对比
              </button>
              <button
                onClick={() => navigate('/eval/wizard')}
                className="inline-flex items-center gap-1.5 rounded-full glass-btn-accent px-3 py-1.5 text-[12px] font-medium text-white"
              >
                开始新评测
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
