import { useMemo, useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useEvalHistoryStore } from '@/stores/evalHistoryStore'
import { useHighlightStore } from '@/stores/highlightStore'
import { getExampleRecords } from '@/data/example-models'
import { getStandardByType } from '@/data/evaluation-standards'
import { RadarChart } from '@/components/evaluation/RadarChart'
import { DimensionAccordion } from '@/components/report/DimensionAccordion'
import { Report3DPreview } from '@/components/report/Report3DPreview'
import { generateAICompareAnalysis } from '@/lib/ai-analysis'
import { roundScore } from '@/stores/evalStore'
import { MODEL_TYPE_LABELS } from '@/types/evaluation'

export function CompareReportPage() {
  const { id1, id2 } = useParams<{ id1: string; id2: string }>()
  const navigate = useNavigate()
  const historyRecords = useEvalHistoryStore((s) => s.records)
  const setHighlight = useHighlightStore((s) => s.setCriterion)
  const exampleRecords = useMemo(() => getExampleRecords(), [])

  const allRecords = useMemo(() => [...exampleRecords, ...historyRecords], [exampleRecords, historyRecords])

  const recordA = useMemo(() => allRecords.find((r) => r.id === id1) ?? null, [allRecords, id1])
  const recordB = useMemo(() => allRecords.find((r) => r.id === id2) ?? null, [allRecords, id2])

  // Compute comparison analysis
  const comparison = useMemo(() => {
    if (!recordA || !recordB) return null

    const diff = roundScore(recordA.total - recordB.total)
    let winner: 'A' | 'B' | 'draw' = 'draw'
    if (diff > 0) winner = 'A'
    else if (diff < 0) winner = 'B'

    // Compare dimensions (use percentage for cross-type comparison)
    const dimComparisons: { dimensionName: string; scoreA: number; maxA: number; pctA: number; scoreB: number; maxB: number; pctB: number; diff: number }[] = []

    const allDimNames = new Set([
      ...recordA.dimensionScores.map((d) => d.dimensionName),
      ...recordB.dimensionScores.map((d) => d.dimensionName),
    ])

    for (const dimName of allDimNames) {
      const dA = recordA.dimensionScores.find((d) => d.dimensionName === dimName)
      const dB = recordB.dimensionScores.find((d) => d.dimensionName === dimName)
      const pctA = dA ? dA.score / dA.maxScore : 0
      const pctB = dB ? dB.score / dB.maxScore : 0
      dimComparisons.push({
        dimensionName: dimName,
        scoreA: dA?.score ?? 0,
        maxA: dA?.maxScore ?? 1,
        pctA,
        scoreB: dB?.score ?? 0,
        maxB: dB?.maxScore ?? 1,
        pctB,
        diff: roundScore(pctA - pctB),
      })
    }

    // Find common issues (dimensions where both score below 60%)
    const commonIssues = dimComparisons.filter((d) => d.pctA < 0.6 && d.pctB < 0.6)

    return { diff, winner, dimComparisons, commonIssues }
  }, [recordA, recordB])

  // ────── AI 对比分析 ──────
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const aiTriggered = useRef(false)

  useEffect(() => {
    if (!recordA || !recordB || aiTriggered.current) return
    if (!recordA.autoReport && !recordB.autoReport) return

    aiTriggered.current = true
    setAiLoading(true)
    setAiError(null)

    generateAICompareAnalysis(recordA, recordB)
      .then(setAiResult)
      .catch((err) => {
        console.error('AI 对比分析失败:', err)
        setAiError(err instanceof Error ? err.message : 'AI 对比分析服务暂时不可用')
      })
      .finally(() => setAiLoading(false))
  }, [recordA, recordB])

  // Markdown renderer
  function renderMD(md: string): string {
    let html = md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    html = html.replace(/^### (.+)$/gm, '<h3 class="text-[13px] font-bold text-text-primary mt-3 mb-2">$1</h3>')
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-[14px] font-bold text-text-primary mt-4 mb-2">$1</h2>')
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-text-primary">$1</strong>')
    html = html.replace(/^- (.+)$/gm, '<li class="ml-4 mt-1 text-[12px] text-text-secondary list-disc">$1</li>')
    html = html.replace(/\n\n/g, '</p><p class="text-[12px] text-text-secondary leading-relaxed">')
    html = '<p class="text-[12px] text-text-secondary leading-relaxed">' + html + '</p>'
    html = html.replace(/<p[^>]*><\/p>/g, '')
    return html
  }

  if (!recordA || !recordB) {
    return (
      <div className="h-full overflow-auto flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-[16px] text-text-secondary">未找到对比记录</p>
          <button onClick={() => navigate('/compare')} className="text-[14px] text-accent hover:underline">
            返回对比选择
          </button>
        </div>
      </div>
    )
  }

  const totalA = recordA.total
  const totalB = recordB.total
  const ratioA = recordA.maxTotal > 0 ? totalA / recordA.maxTotal : 0
  const ratioB = recordB.maxTotal > 0 ? totalB / recordB.maxTotal : 0

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-[1100px] px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回
          </button>
          <h1 className="text-[18px] font-bold tracking-[-0.02em]">模型 PK 对比报告</h1>
        </div>

        {/* Winner callout */}
        {comparison && (
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Trophy className="h-5 w-5 text-amber-500" />
                <span className="text-[15px] font-semibold text-text-primary">对比结论</span>
              </div>
              <p className="text-[14px] text-text-secondary leading-relaxed">
                {comparison.winner === 'A'
                  ? `${recordA.modelName.replace(/\s*\(OBJ\).*/, '')} 以 ${comparison.diff.toFixed(1)} 分的优势胜出，综合拓扑质量优于 ${recordB.modelName.replace(/\s*\(OBJ\).*/, '')}。`
                  : comparison.winner === 'B'
                    ? `${recordB.modelName.replace(/\s*\(OBJ\).*/, '')} 以 ${Math.abs(comparison.diff).toFixed(1)} 分的优势胜出，综合拓扑质量优于 ${recordA.modelName.replace(/\s*\(OBJ\).*/, '')}。`
                    : `两个模型得分相同（${totalA.toFixed(1)} 分），拓扑质量相当。`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Side-by-side score + model info */}
        <div className="grid grid-cols-2 gap-6">
          {/* Model A */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-600">模型 A</Badge>
              <h2 className="text-[16px] font-semibold text-text-primary truncate">
                {recordA.modelName.replace(/\s*\(OBJ\).*/, '')}
              </h2>
            </div>
            <Report3DPreview record={recordA} />
            <div className="flex items-end gap-2">
              <span className={`mono text-[42px] font-bold leading-none ${
                ratioA < 0.4 ? 'text-red-500' : ratioA < 0.7 ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {totalA.toFixed(1)}
              </span>
              <span className="text-[14px] text-text-tertiary pb-1">/ {recordA.maxTotal}</span>
            </div>
          </div>

          {/* Model B */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-600">模型 B</Badge>
              <h2 className="text-[16px] font-semibold text-text-primary truncate">
                {recordB.modelName.replace(/\s*\(OBJ\).*/, '')}
              </h2>
            </div>
            <Report3DPreview record={recordB} />
            <div className="flex items-end gap-2">
              <span className={`mono text-[42px] font-bold leading-none ${
                ratioB < 0.4 ? 'text-red-500' : ratioB < 0.7 ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {totalB.toFixed(1)}
              </span>
              <span className="text-[14px] text-text-tertiary pb-1">/ {recordB.maxTotal}</span>
            </div>
          </div>
        </div>

        {/* Dual Radar */}
        <div className="grid grid-cols-2 gap-6">
          <div className="flex justify-center">
            <RadarChart
              dimensions={recordA.dimensionScores.map(d => ({
                name: d.dimensionName,
                score: d.score,
                maxScore: d.maxScore,
              }))}
              size={200}
            />
          </div>
          <div className="flex justify-center">
            <RadarChart
              dimensions={recordB.dimensionScores.map(d => ({
                name: d.dimensionName,
                score: d.score,
                maxScore: d.maxScore,
              }))}
              size={200}
            />
          </div>
        </div>

        <Separator className="bg-black/5" />

        {/* Dimension comparison table */}
        {comparison && (
          <section>
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] mb-4">
              📊 维度对比分析
            </h2>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-black/5">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_120px_40px_120px] gap-3 px-4 py-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                    <span>维度</span>
                    <span className="text-right">{recordA.modelName.replace(/\s*\(OBJ\).*/, '').slice(0, 10)}</span>
                    <span />
                    <span className="text-right">{recordB.modelName.replace(/\s*\(OBJ\).*/, '').slice(0, 10)}</span>
                  </div>
                  {comparison.dimComparisons.map((dim) => (
                    <div
                      key={dim.dimensionName}
                      className="grid grid-cols-[1fr_120px_40px_120px] gap-3 px-4 py-3 items-center"
                    >
                      <span className="text-[13px] text-text-primary">{dim.dimensionName}</span>
                      <div className="text-right">
                        <span className="text-[12px] text-text-secondary">
                          {dim.scoreA}/{dim.maxA}
                        </span>
                        <span className="text-[10px] text-text-tertiary ml-1">
                          ({Math.round(dim.pctA * 100)}%)
                        </span>
                      </div>
                      <div className="flex justify-center">
                        {Math.abs(dim.diff) > 0.15 ? (
                          dim.diff > 0 ? (
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                          )
                        ) : (
                          <Minus className="h-3.5 w-3.5 text-text-tertiary" />
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[12px] text-text-secondary">
                          {dim.scoreB}/{dim.maxB}
                        </span>
                        <span className="text-[10px] text-text-tertiary ml-1">
                          ({Math.round(dim.pctB * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Common issues */}
        {comparison && comparison.commonIssues.length > 0 && (
          <section>
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              共同问题
            </h2>
            <Card>
              <CardContent className="p-4">
                <p className="text-[13px] text-text-secondary leading-relaxed">
                  两个模型在以下维度均得分偏低（&lt;60%），存在共同的改进空间：
                </p>
                <ul className="mt-2 space-y-1">
                  {comparison.commonIssues.map((d) => (
                    <li key={d.dimensionName} className="text-[12px] text-text-secondary flex items-center gap-2">
                      <Lightbulb className="h-3 w-3 text-amber-500" />
                      {d.dimensionName}：模型A {Math.round(d.pctA * 100)}%，模型B {Math.round(d.pctB * 100)}%
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        <Separator className="bg-black/5" />

        {/* ===== AI 对比分析 ===== */}
        <section>
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent" />
            对比分析
            <span className="text-[10px] font-normal text-text-tertiary">DeepSeek</span>
          </h2>

          {aiLoading && (
            <Card>
              <CardContent className="p-6 flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 text-accent animate-spin" />
                <p className="text-[13px] text-text-secondary">正在对比分析两个模型...</p>
                <p className="text-[11px] text-text-tertiary">通常需要 10-20 秒，请耐心等待</p>
              </CardContent>
            </Card>
          )}

          {aiError && !aiLoading && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[12px] font-medium text-text-primary">对比分析暂时不可用</p>
                    <p className="text-[11px] text-text-tertiary mt-1">{aiError}</p>
                    <button
                      onClick={() => {
                        if (!recordA || !recordB) return
                        setAiError(null)
                        setAiLoading(true)
                        generateAICompareAnalysis(recordA, recordB)
                          .then(setAiResult)
                          .catch((err) => setAiError(err instanceof Error ? err.message : 'AI 分析失败'))
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

          {aiResult && !aiLoading && (
            <Card>
              <CardContent className="p-4">
                <div
                  className="text-[12px] text-text-secondary leading-relaxed space-y-3"
                  dangerouslySetInnerHTML={{ __html: renderMD(aiResult) }}
                />
                <div className="mt-4 pt-3 border-t border-black/5 flex justify-end">
                  <button
                    onClick={() => {
                      if (!recordA || !recordB) return
                      setAiResult(null)
                      setAiLoading(true)
                      setAiError(null)
                      generateAICompareAnalysis(recordA, recordB)
                        .then(setAiResult)
                        .catch((err) => setAiError(err instanceof Error ? err.message : 'AI 分析失败'))
                        .finally(() => setAiLoading(false))
                    }}
                    className="inline-flex items-center gap-1 text-[10px] text-text-tertiary hover:text-accent transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    再次分析
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        <Separator className="bg-black/5" />

        {/* Dimension accordions for both */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-text-primary mb-3">模型 A 得分详情</h3>
            {(() => {
              const stdA = getStandardByType(recordA.evaluationType)
              return (
                <DimensionAccordion
                  dimensions={stdA.dimensions.map((dim) => ({
                    dimensionId: dim.id,
                    dimensionName: dim.name,
                    score: recordA.dimensionScores.find((d) => d.dimensionId === dim.id)?.score ?? 0,
                    maxScore: dim.weight,
                    criteria: dim.criteria,
                  }))}
                  reviewScores={recordA.reviewScores}
                  autoReport={recordA.autoReport}
                  onCriterionClick={(id) => setHighlight(id)}
                />
              )
            })()}
          </div>

          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-text-primary mb-3">模型 B 得分详情</h3>
            {(() => {
              const stdB = getStandardByType(recordB.evaluationType)
              return (
                <DimensionAccordion
                  dimensions={stdB.dimensions.map((dim) => ({
                    dimensionId: dim.id,
                    dimensionName: dim.name,
                    score: recordB.dimensionScores.find((d) => d.dimensionId === dim.id)?.score ?? 0,
                    maxScore: dim.weight,
                    criteria: dim.criteria,
                  }))}
                  reviewScores={recordB.reviewScores}
                  autoReport={recordB.autoReport}
                  onCriterionClick={(id) => setHighlight(id)}
                />
              )
            })()}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/compare')}
            className="text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            ← 返回对比选择
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-text-tertiary">
              {MODEL_TYPE_LABELS[recordA.evaluationType] ?? recordA.evaluationType} vs {MODEL_TYPE_LABELS[recordB.evaluationType] ?? recordB.evaluationType}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
