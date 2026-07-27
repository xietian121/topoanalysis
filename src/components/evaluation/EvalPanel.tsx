import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { Save, ListChecks, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { useEvalStore, computeTotalScore, computeAutoScore, computeManualScore, roundScore } from '@/stores/evalStore'
import { useModelStore } from '@/stores/modelStore'
import { useViewerStore } from '@/stores/viewerStore'
import { useEvalHistoryStore, type EvalHistoryRecord } from '@/stores/evalHistoryStore'
import { useEvalFlowStore, computeFlowTotal, isAllScored, type FlattenedCriterion } from '@/stores/evalFlowStore'
import { useHighlightStore } from '@/stores/highlightStore'

import { analyzeTopology } from '@/lib/topology-analyzer'
import { getStandardByType } from '@/data/evaluation-standards'
import { MODEL_TYPE_LABELS, type EvaluationType } from '@/types/evaluation'
import { RadarChart } from './RadarChart'
import { ScoreBadge } from './ScoreBadge'
import { FlowReviewCard } from './FlowReviewCard'

interface EvalPanelProps {
  /** 是否锁定评测标准（从向导进入后不可更改） */
  locked?: boolean
}

export function EvalPanel({ locked = false }: EvalPanelProps) {
  const currentModel = useModelStore((s) => s.currentModel)
  const modelObject = useModelStore((s) => s.modelObject)
  const objFaceData = useModelStore((s) => s.objFaceData)
  const referenceModelInfo = useModelStore((s) => s.referenceModelInfo)
  const loadReferenceModel = useModelStore((s) => s.loadReferenceModel)
  const clearReferenceModel = useModelStore((s) => s.clearReferenceModel)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const evaluationType = useEvalStore((s) => s.evaluationType)
  const setEvaluationType = useEvalStore((s) => s.setEvaluationType)
  const autoReport = useEvalStore((s) => s.autoReport)
  const setAutoReport = useEvalStore((s) => s.setAutoReport)
  const manualRatings = useEvalStore((s) => s.manualRatings)
  const resetEval = useEvalStore((s) => s.resetEval)
  const addRecord = useEvalHistoryStore((s) => s.addRecord)
  const flowReviewScores = useEvalStore((s) => s.flowReviewScores)
  const flowTotal = useEvalStore((s) => s.flowTotal)
  const setFlowResult = useEvalStore((s) => s.setFlowResult)
  const resetFlowResult = useEvalStore((s) => s.resetFlowResult)
  const flowSaved = useEvalStore((s) => s.flowSaved)
  const setFlowSaved = useEvalStore((s) => s.setFlowSaved)
  const startFlow = useEvalFlowStore((s) => s.startFlow)
  const isFlowActive = useEvalFlowStore((s) => s.isActive)
  const flowCriteria = useEvalFlowStore((s) => s.criteria)
  const flowCurrentIndex = useEvalFlowStore((s) => s.currentIndex)
  const flowScores = useEvalFlowStore((s) => s.reviewScores)
  const flowGoTo = useEvalFlowStore((s) => s.goTo)
  const flowSetScore = useEvalFlowStore((s) => s.setScore)
  const flowFinish = useEvalFlowStore((s) => s.finishFlow)
  const setHighlight = useHighlightStore((s) => s.setCriterion)
  const setShowSymmetry = useViewerStore((s) => s.setShowSymmetry)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [symmetryEnabled, setSymmetryEnabled] = useState(false)

  // Sync expandedId with flow currentIndex when navigating via prev/next buttons
  useEffect(() => {
    if (isFlowActive && flowCriteria[flowCurrentIndex]) {
      setExpandedId(flowCriteria[flowCurrentIndex].id)
    }
  }, [isFlowActive, flowCurrentIndex, flowCriteria])

  // Clear expanded when flow closes
  useEffect(() => {
    if (!isFlowActive) setExpandedId(null)
  }, [isFlowActive])

  // Sync highlight to current criterion + auto-switch render mode for density
  useEffect(() => {
    const c = flowCriteria[flowCurrentIndex]
    if (!c || !isFlowActive) return
    setHighlight(c.id)
  }, [flowCurrentIndex, flowCriteria, isFlowActive, setHighlight])

  // Clear highlight when flow closes
  useEffect(() => {
    if (!isFlowActive) setHighlight(null)
  }, [isFlowActive, setHighlight])

  useEffect(() => {
    return () => { setHighlight(null) }
  }, [setHighlight])

  // Run auto-analysis when model loads
  useEffect(() => {
    if (modelObject) {
      const report = analyzeTopology(modelObject, objFaceData)
      setAutoReport(report)
    } else {
      resetEval()
    }
  }, [modelObject, objFaceData, setAutoReport, resetEval])

  const standard = getStandardByType(evaluationType, symmetryEnabled)
  const scores = autoReport
    ? computeTotalScore(evaluationType, autoReport, manualRatings)
    : { autoTotal: 0, manualTotal: 0, total: 0, maxTotal: 100 }

  // Derive full criteria list from standard — always available once model is loaded
  const allCriteria = useMemo(() => {
    return standard.dimensions.flatMap((dim) =>
      dim.criteria.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        maxScore: c.maxScore,
        method: c.method,
        dimensionName: dim.name,
      })),
    )
  }, [standard])

  // Per-dimension scores for radar chart
  const dimensionScores = useMemo(() => {
    return standard.dimensions.map((dim) => {
      let score = 0
      for (const crit of dim.criteria) {
        if (crit.method === 'auto' && autoReport) {
          score += computeAutoScore(crit, autoReport)
        } else if (crit.method === 'manual') {
          const level = manualRatings[crit.id]
          if (level) score += computeManualScore(crit, level)
        }
      }
      return {
        dimensionId: dim.id,
        dimensionName: dim.name,
        score,
        maxScore: dim.weight,
      }
    })
  }, [standard, autoReport, manualRatings])

  // Start the sequential review flow
  const handleStartFlow = useCallback(() => {
    resetFlowResult()
    const flattened: FlattenedCriterion[] = standard.dimensions.flatMap((dim) =>
      dim.criteria.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        maxScore: c.maxScore,
        method: c.method,
        dimensionName: dim.name,
        scoringRule: c.scoringRule,
      })),
    )
    startFlow(flattened)
  }, [standard, startFlow, resetFlowResult])

  // Compute flow-based dimension scores when flow results exist
  const flowDimensionScores = useMemo(() => {
    if (!flowReviewScores) return null
    return standard.dimensions.map((dim) => {
      let score = 0
      for (const crit of dim.criteria) {
        const raw = flowReviewScores[crit.id] ?? 0
        score += roundScore((raw / 10) * crit.maxScore)
      }
      return {
        dimensionId: dim.id,
        dimensionName: dim.name,
        score,
        maxScore: dim.weight,
      }
    })
  }, [standard, flowReviewScores])

  // Which scores to display
  const displayScores = flowReviewScores
    ? { total: flowTotal ?? 0, maxTotal: 100, dimensionScores: flowDimensionScores! }
    : { total: scores.total, maxTotal: scores.maxTotal, dimensionScores }

  // Total score ratio for color coding
  const totalRatio = displayScores.maxTotal > 0 ? displayScores.total / displayScores.maxTotal : 0
  const totalColor =
    totalRatio < 0.4 ? 'text-red-500' : totalRatio < 0.7 ? 'text-amber-500' : 'text-emerald-500'

  const handleSave = useCallback(() => {
    if (!currentModel || !autoReport) return
    const record: EvalHistoryRecord = {
      id: '',
      modelName: currentModel.name,
      modelFormat: currentModel.format,
      modelFileSize: currentModel.fileSize,
      evaluationType,
      createdAt: new Date().toISOString(),
      autoTotal: scores.autoTotal,
      manualTotal: scores.manualTotal,
      total: displayScores.total,
      maxTotal: displayScores.maxTotal,
      dimensionScores: displayScores.dimensionScores,
      autoReport,
      manualRatings,
      reviewScores: flowReviewScores ?? undefined,
      symmetryEnabled: symmetryEnabled || undefined,
    }
    addRecord(record)
  }, [currentModel, autoReport, evaluationType, scores, displayScores, manualRatings, flowReviewScores, addRecord])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <aside
      className="w-[27rem] shrink-0 border-l border-black/5 glass overflow-y-auto"
      style={{ height: 'calc(100vh - 48px)' }}
    >
      <div className="p-4 space-y-7">
        {/* Model info */}
        {currentModel && (
          <>
            <section>
              <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                文件信息
              </h4>
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-text-primary truncate" title={currentModel.name}>
                  {currentModel.name}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                    {currentModel.format.toUpperCase()}
                  </Badge>
                  <span className="mono text-[12px] text-text-tertiary">
                    {formatSize(currentModel.fileSize)}
                  </span>
                </div>
              </div>
            </section>
            <Separator className="bg-black/5" />

            {/* Start flow button — right below file info */}
            {!isFlowActive && !flowReviewScores && autoReport && (
              <button
                onClick={handleStartFlow}
                className="w-full flex items-center justify-center gap-2 rounded-full glass-btn-accent px-4 py-2.5 text-[13px] font-medium text-white transition-all duration-200"
              >
                <ListChecks className="h-4 w-4" />
                开始逐条审核
              </button>
            )}
          </>
        )}

        {/* Model type — locked after wizard, shown as label; otherwise toggleable */}
        <section>
          <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            评测标准
          </h4>
          {locked ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-text-primary px-2.5 py-1 rounded-full bg-accent/[0.06]">
                {MODEL_TYPE_LABELS[evaluationType]}
              </span>
              <span className="text-[10px] text-text-tertiary">已在向导中设定</span>
            </div>
          ) : (
            <div className="flex gap-1 flex-wrap">
              {(['game-static', 'game-dynamic', 'general-static', 'general-dynamic'] as EvaluationType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setEvaluationType(t)}
                  className={`rounded-lg py-1.5 px-2.5 text-[11px] font-medium transition-all duration-200 ${
                    evaluationType === t
                      ? 'bg-black/[0.06] text-text-primary'
                      : 'text-text-tertiary hover:bg-black/[0.04]'
                  }`}
                >
                  {MODEL_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          )}
        </section>

        <Separator className="bg-black/5" />

        {/* Symmetry toggle */}
        {currentModel && (
          <section>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={symmetryEnabled}
                  onChange={(e) => {
                    setSymmetryEnabled(e.target.checked)
                    setShowSymmetry(e.target.checked)
                  }}
                  className="sr-only"
                />
                <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${symmetryEnabled ? 'bg-accent' : 'bg-black/[0.12]'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 mt-[3px] ${symmetryEnabled ? 'translate-x-[19px]' : 'translate-x-[3px]'}`} />
                </div>
              </div>
              <div>
                <span className="text-[12px] font-medium text-text-primary">启用对称性评测</span>
                <p className="text-[10px] text-text-tertiary mt-0.5">
                  勾选后将在布线合理性维度新增对称性准则，权重自动调整，3D 视口显示对称参考面
                </p>
              </div>
            </label>
          </section>
        )}

        <Separator className="bg-black/5" />

        {/* Reference model upload for structure comparison */}
        {currentModel && (
          <section>
            <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
              参考模型（可选）
            </h4>
            {referenceModelInfo ? (
              <div className="space-y-2">
                <p className="text-[12px] text-text-primary truncate" title={referenceModelInfo.name}>
                  {referenceModelInfo.name}
                </p>
                <button
                  onClick={clearReferenceModel}
                  className="text-[11px] text-text-tertiary hover:text-danger transition-colors"
                >
                  移除参考模型
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".obj,.fbx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) loadReferenceModel(file)
                    e.target.value = ''
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-black/10 px-3 py-2.5 text-[12px] text-text-tertiary hover:bg-black/[0.03] hover:text-text-secondary transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  上传高模参考文件
                </button>
              </>
            )}
          </section>
        )}
        <Separator className="bg-black/5" />

        {/* Criteria list — always visible when model is loaded, shows scores once flow starts */}
        {autoReport && (
          <section>
            <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
              逐条评测进度
              {isFlowActive && (
                <span className="ml-1.5 mono text-accent font-semibold">
                  {Object.keys(flowScores).length}/{allCriteria.length}
                </span>
              )}
            </h4>
            <div className="space-y-1">
              {allCriteria.map((crit, idx) => {
                const score = isFlowActive ? (flowScores[crit.id] ?? 0) : 0
                const isExpanded = expandedId === crit.id
                const isCurrent = isFlowActive && idx === flowCurrentIndex
                const pct = (score / 10) * 100
                const dimIdx = standard.dimensions.findIndex((d) =>
                  d.criteria.some((c) => c.id === crit.id),
                )
                const dimColor = ['#4a90d9', '#34c759', '#ff9500', '#af52de'][dimIdx] ?? '#4a90d9'
                const canClick = isFlowActive
                return (
                  <div key={crit.id}>
                    <button
                      onClick={() => {
                        if (!canClick) return
                        if (expandedId === crit.id) {
                          setExpandedId(null)
                        } else {
                          setExpandedId(crit.id)
                          flowGoTo(idx)
                        }
                      }}
                      className={`w-full text-left rounded-lg px-3 py-2 transition-all duration-150 ${
                        canClick
                          ? isCurrent
                            ? 'bg-accent/[0.08] border-l-[3px] border-accent pl-[9px] hover:bg-accent/[0.12]'
                            : 'border-l-[3px] border-transparent pl-[9px] hover:bg-black/[0.04] cursor-pointer'
                          : 'border-l-[3px] border-transparent pl-[9px] cursor-default'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[12px] font-medium truncate ${
                          isCurrent ? 'text-accent' : 'text-text-primary'
                        }`}>
                          {crit.name}
                        </span>
                        <span className={`mono text-[11px] ml-2 shrink-0 ${
                          score > 0 ? 'text-accent font-semibold' : 'text-text-tertiary'
                        }`}>
                          {score}/10
                        </span>
                      </div>
                      {/* Slider bar */}
                      <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: score > 0 ? dimColor : 'transparent' }}
                        />
                      </div>
                      {/* Dimension name + criterion weight */}
                      <p className="text-[10px] text-text-tertiary mt-1 truncate">
                        {crit.dimensionName} · 满分 {crit.maxScore} 分
                      </p>
                    </button>
                    {/* Animated expand/collapse */}
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                        isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mx-1 mt-1 mb-2 rounded-lg bg-white/60 border border-black/[0.06] p-3">
                          <FlowReviewCard
                            criterion={crit}
                            currentScore={score}
                            onSetScore={flowSetScore}
                            onPrev={() => flowGoTo(idx - 1)}
                            onNext={() => flowGoTo(idx + 1)}
                            onFinish={() => {
                              const { total } = computeFlowTotal(flowCriteria, flowScores)
                              setFlowResult({ ...flowScores }, total)
                              setHighlight(null)
                              flowFinish()
                            }}
                            isFirst={idx === 0}
                            isLast={idx === allCriteria.length - 1}
                            allScored={isAllScored(allCriteria, flowScores)}
                            autoReport={autoReport}
                            scoredCount={Object.keys(flowScores).length}
                            totalCount={allCriteria.length}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
        <Separator className="bg-black/5" />

        {/* "开始逐条审核" moved to after file-info section */}

        {/* After flow completion: show full results */}
        {flowReviewScores && (
          <>
            <Separator className="bg-black/5" />

            {/* Total score */}
            <section>
              <div className="flex items-end justify-between">
                <div>
                  <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                    评测总分
                    <span className="ml-1.5 text-[10px] text-accent font-medium">逐条审核</span>
                  </h4>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={`mono text-[32px] font-bold leading-none ${totalColor}`}>
                      {displayScores.total.toFixed(1)}
                    </span>
                    <span className="text-[13px] text-text-tertiary">/ {displayScores.maxTotal}</span>
                  </div>
                </div>
                <div className="text-right text-[11px]">
                  <p className="text-text-tertiary">
                    已评 <span className="mono text-text-secondary">{Object.keys(flowReviewScores).filter(k => flowReviewScores[k] > 0).length}</span> 条
                  </p>
                </div>
              </div>
            </section>

            {/* Re-evaluate button — prominent position right after total */}
            <button
              onClick={() => { resetFlowResult() }}
              className="w-full flex items-center justify-center gap-2 rounded-full glass-btn px-4 py-2.5 text-[13px] font-medium text-text-primary transition-all duration-200"
            >
              <ListChecks className="h-4 w-4" />
              重新开始逐条审核
            </button>

            {/* Radar chart */}
            <section>
              <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                得分分布
              </h4>
              <RadarChart dimensions={displayScores.dimensionScores.map(d => ({ name: d.dimensionName, score: d.score, maxScore: d.maxScore }))} size={180} />
              <div className="mt-3 space-y-1.5">
                {displayScores.dimensionScores.map((dim) => (
                  <div key={dim.dimensionId} className="flex items-center justify-between">
                    <span className="text-[11px] text-text-secondary">{dim.dimensionName}</span>
                    <ScoreBadge score={dim.score} maxScore={dim.maxScore} />
                  </div>
                ))}
              </div>
            </section>

            {/* Per-criterion scores */}
            <Separator className="bg-black/5" />
            <section>
              <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                逐条评分详情
              </h4>
              <div className="space-y-3">
                {standard.dimensions.map((dim) => (
                  <Card key={dim.id}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-text-primary">{dim.name}</span>
                        <ScoreBadge
                          score={displayScores.dimensionScores.find((d) => d.dimensionId === dim.id)?.score ?? 0}
                          maxScore={dim.weight}
                        />
                      </div>
                      {dim.criteria.map((crit) => {
                        const raw = flowReviewScores[crit.id] ?? 0
                        const mapped = roundScore((raw / 10) * crit.maxScore)
                        return (
                          <div key={crit.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-text-secondary">{crit.name}</span>
                            <span className="mono text-text-primary">
                              {raw}/10 → {mapped.toFixed(1)}/{crit.maxScore}
                            </span>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Save button */}
            <Separator className="bg-black/5" />
            <button
              onClick={() => { handleSave(); setFlowSaved() }}
              disabled={flowSaved}
              className={`w-full flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                flowSaved
                  ? 'bg-black/[0.04] text-text-tertiary cursor-not-allowed'
                  : 'glass-btn text-text-primary'
              }`}
            >
              <Save className="h-4 w-4" />
              {flowSaved ? '已保存' : '保存评测结果'}
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
