import { useEffect, useMemo, useCallback, useState } from 'react'
import { Save, ListChecks } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { useEvalStore, computeTotalScore, computeAutoScore, computeManualScore, roundScore } from '@/stores/evalStore'
import { useCompareStore } from '@/stores/compareStore'
import { useViewerStore } from '@/stores/viewerStore'
import { useEvalHistoryStore, type EvalHistoryRecord } from '@/stores/evalHistoryStore'
import { useEvalFlowStore, isAllScored, computeFlowTotal, type FlattenedCriterion } from '@/stores/evalFlowStore'
import { useHighlightStore } from '@/stores/highlightStore'

import { analyzeTopology } from '@/lib/topology-analyzer'
import { getStandardByType } from '@/data/evaluation-standards'
import { MODEL_TYPE_LABELS, type EvaluationType } from '@/types/evaluation'
import { RadarChart } from './RadarChart'
import { ScoreBadge } from './ScoreBadge'
import { FlowReviewCard } from './FlowReviewCard'

export function CompareEvalPanel() {
  const lowModel = useCompareStore((s) => s.lowModel)
  const evaluationType = useEvalStore((s) => s.evaluationType)
  const symmetryEnabled = useEvalStore((s) => s.symmetryEnabled)
  const setSymmetryEnabled = useEvalStore((s) => s.setSymmetryEnabled)
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

  // Run auto-analysis when low model loads
  useEffect(() => {
    if (lowModel.object) {
      const report = analyzeTopology(lowModel.object, lowModel.faceData)
      setAutoReport(report)
    } else {
      resetEval()
    }
  }, [lowModel.object, lowModel.faceData, setAutoReport, resetEval])

  const standard = getStandardByType(evaluationType, symmetryEnabled)
  const scores = autoReport
    ? computeTotalScore(evaluationType, autoReport, manualRatings, symmetryEnabled)
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
        optional: c.optional,
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
        optional: c.optional,
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
    if (!lowModel.info || !autoReport) return
    const record: EvalHistoryRecord = {
      id: '',
      modelName: lowModel.info.name,
      modelFormat: lowModel.info.format,
      modelFileSize: lowModel.info.fileSize,
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
  }, [lowModel.info, autoReport, evaluationType, symmetryEnabled, scores, displayScores, manualRatings, flowReviewScores, addRecord])

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
        {lowModel.info && (
          <>
            <section>
              <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                文件信息
              </h4>
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-text-primary truncate" title={lowModel.info.name}>
                  {lowModel.info.name}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                    {lowModel.info.format.toUpperCase()}
                  </Badge>
                  <span className="mono text-[12px] text-text-tertiary">
                    {formatSize(lowModel.info.fileSize)}
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

        {/* Model type — Phase 2: 4-type toggle */}
        <section>
          <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            评测标准
          </h4>
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
        </section>

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
              {allCriteria.map((crit, _idx) => {
                const score = isFlowActive ? (flowScores[crit.id] ?? 0) : 0
                const isExpanded = expandedId === crit.id
                // Use flowCriteria index for navigation so it stays correct
                // even if allCriteria and flowCriteria differ
                const flowIdx = isFlowActive ? flowCriteria.findIndex(c => c.id === crit.id) : -1
                const isCurrent = isFlowActive && flowIdx === flowCurrentIndex
                const pct = (score / 10) * 100
                const dimIdx = standard.dimensions.findIndex((d) =>
                  d.criteria.some((c) => c.id === crit.id),
                )
                const dimColor = ['#4a90d9', '#34c759', '#ff9500', '#af52de'][dimIdx] ?? '#4a90d9'
                const isOptional = crit.optional === true
                const isOptDisabled = isOptional && !symmetryEnabled
                const canClick = isFlowActive || isOptional
                return (
                  <div key={crit.id}>
                    <button
                      onClick={() => {
                        if (!canClick) return
                        if (expandedId === crit.id) {
                          setExpandedId(null)
                        } else {
                          setExpandedId(crit.id)
                          if (isFlowActive && !isOptDisabled && flowIdx >= 0) flowGoTo(flowIdx)
                        }
                      }}
                      className={`w-full text-left rounded-lg px-3 py-2 transition-all duration-150 ${
                        canClick
                          ? isCurrent
                            ? 'bg-accent/[0.08] border-l-[3px] border-accent pl-[9px] hover:bg-accent/[0.12]'
                            : isOptDisabled
                              ? 'border-l-[3px] border-transparent pl-[9px] hover:bg-black/[0.04] cursor-pointer opacity-60'
                              : 'border-l-[3px] border-transparent pl-[9px] hover:bg-black/[0.04] cursor-pointer'
                          : 'border-l-[3px] border-transparent pl-[9px] cursor-default'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[12px] font-medium truncate ${
                          isCurrent ? 'text-accent' : isOptDisabled ? 'text-text-tertiary' : 'text-text-primary'
                        }`}>
                          {crit.name}
                        </span>
                        <span className={`mono text-[11px] ml-2 shrink-0 ${
                          score > 0 ? 'text-accent font-semibold' : 'text-text-tertiary'
                        }`}>
                          {isOptDisabled ? '—' : `${score}/10`}
                        </span>
                      </div>
                      {/* Slider bar */}
                      <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${isOptDisabled ? 0 : pct}%`, backgroundColor: score > 0 ? dimColor : 'transparent' }}
                        />
                      </div>
                      {/* Dimension name + criterion weight */}
                      <p className="text-[10px] text-text-tertiary mt-1 truncate">
                        {crit.dimensionName}{isOptional ? ' · 可选模块' : ` · 满分 ${crit.maxScore} 分`}
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
                            onPrev={() => {
                              if (flowIdx > 0) flowGoTo(flowIdx - 1)
                            }}
                            onNext={() => {
                              if (flowIdx >= 0 && flowIdx < flowCriteria.length - 1) flowGoTo(flowIdx + 1)
                            }}
                            onFinish={() => {
                              const { total } = computeFlowTotal(flowCriteria, flowScores)
                              setFlowResult({ ...flowScores }, total)
                              setHighlight(null)
                              flowFinish()
                            }}
                            isFirst={flowIdx === 0}
                            isLast={flowIdx === flowCriteria.length - 1}
                            allScored={isAllScored(isFlowActive ? flowCriteria : allCriteria, flowScores)}
                            autoReport={autoReport}
                            scoredCount={Object.keys(flowScores).length}
                            totalCount={isFlowActive ? flowCriteria.length : allCriteria.length}
                            optional={isOptional}
                            optionalEnabled={symmetryEnabled}
                            onToggleOptional={(v) => {
                              if (isFlowActive) {
                                // Update symmetry state and rebuild flow criteria
                                // WITHOUT canceling the flow — scores preserved
                                setSymmetryEnabled(v)
                                setShowSymmetry(v)
                                const newStandard = getStandardByType(evaluationType, v)
                                const newCriteria = newStandard.dimensions.flatMap((dim) =>
                                  dim.criteria.map((c) => ({
                                    id: c.id,
                                    name: c.name,
                                    description: c.description,
                                    maxScore: c.maxScore,
                                    method: c.method,
                                    dimensionName: dim.name,
                                    scoringRule: c.scoringRule,
                                    optional: c.optional,
                                  })),
                                )
                                // Update flow criteria in-place (scores survive)
                                useEvalFlowStore.getState().updateCriteria(newCriteria)
                                return
                              }
                              setSymmetryEnabled(v)
                              setShowSymmetry(v)
                            }}
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
