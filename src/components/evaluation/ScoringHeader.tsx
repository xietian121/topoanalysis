import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useEvalStore, roundScore } from '@/stores/evalStore'
import { useEvalFlowStore, computeFlowTotal, isAllScored } from '@/stores/evalFlowStore'
import { useEvalHistoryStore, makeId, type EvalHistoryRecord } from '@/stores/evalHistoryStore'
import { useModelStore } from '@/stores/modelStore'
import { useHighlightStore } from '@/stores/highlightStore'
import { useToastStore } from '@/stores/toastStore'
import { getStandardByType } from '@/data/evaluation-standards'
import { generateSuggestions } from '@/lib/suggestion-engine'
import { MODEL_TYPE_LABELS } from '@/types/evaluation'

export function ScoringHeader() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false)

  const currentModel = useModelStore((s) => s.currentModel)
  const modelText = useModelStore((s) => s.modelText)
  const autoReport = useEvalStore((s) => s.autoReport)
  const evaluationType = useEvalStore((s) => s.evaluationType)
  const setFlowResult = useEvalStore((s) => s.setFlowResult)
  const flowCriteria = useEvalFlowStore((s) => s.criteria)
  const flowScores = useEvalFlowStore((s) => s.reviewScores)
  const finishFlow = useEvalFlowStore((s) => s.finishFlow)
  const addRecord = useEvalHistoryStore((s) => s.addRecord)
  const setHighlight = useHighlightStore((s) => s.setCriterion)
  const addToast = useToastStore((s) => s.addToast)

  const allCriteria = flowCriteria
  const scoredCount = Object.values(flowScores).filter((s) => s > 0).length
  const totalCount = allCriteria.length
  const allScored = isAllScored(allCriteria, flowScores)
  const progressPct = totalCount > 0 ? Math.round((scoredCount / totalCount) * 100) : 0

  const handleSubmit = useCallback(async (force = false) => {
    if (!currentModel) {
      addToast('模型数据缺失，请重新加载模型', 'error')
      return
    }
    if (!autoReport) {
      addToast('自动分析尚未完成，请等待拓扑分析结束后再提交', 'error')
      return
    }

    if (!allScored && !force) {
      setShowIncompleteConfirm(true)
      return
    }

    setSubmitting(true)
    setShowIncompleteConfirm(false)
    try {
      // Compute final scores
      const { total } = computeFlowTotal(allCriteria, flowScores)

      // Transfer flow scores to evalStore
      setFlowResult({ ...flowScores }, total)

      // Generate suggestions
      const standard = getStandardByType(evaluationType)
      const dimScores = standard.dimensions.map((dim) => {
        let score = 0
        for (const crit of dim.criteria) {
          const raw = flowScores[crit.id] ?? 0
          score += roundScore((raw / 10) * crit.maxScore)
        }
        return { dimensionId: dim.id, dimensionName: dim.name, score, maxScore: dim.weight }
      })

      const suggestions = generateSuggestions({
        evaluationType,
        autoReport,
        dimensionScores: dimScores,
        reviewScores: flowScores,
      })

      // Create record
      const recordId = makeId()
      const record: EvalHistoryRecord = {
        id: recordId,
        modelName: currentModel.name,
        modelFormat: currentModel.format,
        modelFileSize: currentModel.fileSize,
        evaluationType,
        createdAt: new Date().toISOString(),
        autoTotal: roundScore(dimScores
          .filter((d) => {
            const dim = standard.dimensions.find((sd) => sd.id === d.dimensionId)
            if (!dim) return false
            return dim.criteria.some((c) => c.method === 'auto')
          })
          .reduce((s, d) => s + d.score, 0)),
        manualTotal: roundScore(dimScores
          .filter((d) => {
            const dim = standard.dimensions.find((sd) => sd.id === d.dimensionId)
            if (!dim) return false
            return dim.criteria.some((c) => c.method === 'manual')
          })
          .reduce((s, d) => s + d.score, 0)),
        total,
        maxTotal: 100,
        dimensionScores: dimScores,
        autoReport,
        manualRatings: {},
        reviewScores: flowScores,
        suggestions,
        evalStatus: 'completed',
        modelText: modelText ?? undefined,
        modelInfoSnapshot: currentModel,
      }

      addRecord(record)
      finishFlow()
      setHighlight(null)

      // Show success toast before navigating
      addToast('✅ 评测完成，正在跳转分析页...', 'success', 2500)

      // Brief delay so the toast is visible
      await new Promise((r) => setTimeout(r, 600))
      navigate(`/report/${recordId}`)
    } catch (err) {
      console.error('提交评测失败:', err)
      addToast(`提交失败: ${err instanceof Error ? err.message : '未知错误'}`, 'error', 4000)
    } finally {
      setSubmitting(false)
    }
  }, [
    currentModel, autoReport, evaluationType, allScored, allCriteria, flowScores,
    setFlowResult, addRecord, finishFlow, navigate, setHighlight, modelText, addToast,
  ])

  const handleForceSubmit = useCallback(() => {
    handleSubmit(true)
  }, [handleSubmit])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
      <div className="h-12 flex items-center px-4 glass border-b border-black/5 shrink-0 gap-3">
        {/* Back */}
        <button
          onClick={() => {
            if (scoredCount > 0) {
              if (window.confirm('评测进度尚未保存，确定离开吗？')) {
                navigate('/')
              }
            } else {
              navigate('/')
            }
          }}
          className="flex items-center gap-1 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </button>

        {/* Model info */}
        {currentModel && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] font-semibold text-text-primary truncate max-w-[200px]">
              {currentModel.name}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              {currentModel.format.toUpperCase()}
            </Badge>
            <span className="mono text-[11px] text-text-tertiary shrink-0">
              {formatSize(currentModel.fileSize)}
            </span>
          </div>
        )}

        {/* Type tag */}
        <span className="text-[11px] font-medium text-accent px-2 py-0.5 rounded-full bg-accent/[0.06] shrink-0">
          {MODEL_TYPE_LABELS[evaluationType] ?? evaluationType}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Progress */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[12px] text-text-tertiary">
            进度: <span className="mono text-text-secondary font-medium">{scoredCount}/{totalCount}</span>
          </span>
          <div className="w-24 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Submit button */}
        <button
          onClick={() => handleSubmit()}
          disabled={submitting}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-medium transition-all duration-200 shrink-0 ${
            allScored && !submitting
              ? 'glass-btn-accent text-white cursor-pointer'
              : submitting
                ? 'bg-accent/50 text-white cursor-wait'
                : 'bg-black/[0.04] text-text-tertiary cursor-not-allowed'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? '提交中...' : '提交打分'}
        </button>
      </div>

      {/* Incomplete confirmation dialog */}
      {showIncompleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="rounded-2xl glass p-6 max-w-[360px] mx-4 space-y-4 shadow-xl">
            <h3 className="text-[15px] font-semibold text-text-primary">未完成评测</h3>
            <p className="text-[13px] text-text-secondary">
              还有 <span className="font-semibold text-amber-500">{totalCount - scoredCount}</span> 项未打分，是否提交未完成的评测？
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowIncompleteConfirm(false)}
                className="text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
              >
                继续打分
              </button>
              <button
                onClick={handleForceSubmit}
                className="rounded-full glass-btn-accent px-4 py-2 text-[13px] font-medium text-white"
              >
                仍然提交
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
