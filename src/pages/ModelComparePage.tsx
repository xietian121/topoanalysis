import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X, Minus, Plus, Swords } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { EvalHistoryRecord } from '@/stores/evalHistoryStore'
import { useComparePoolStore } from '@/stores/comparePoolStore'
import { MODEL_TYPE_LABELS } from '@/types/evaluation'
import { ModelPickerDialog } from '@/components/compare/ModelPickerDialog'

export function ModelComparePage() {
  const navigate = useNavigate()
  const setActiveCompare = useComparePoolStore((s) => s.setActiveCompare)
  const [modelA, setModelA] = useState<EvalHistoryRecord | null>(null)
  const [modelB, setModelB] = useState<EvalHistoryRecord | null>(null)
  const [pickerTarget, setPickerTarget] = useState<'A' | 'B' | null>(null)

  const bothSelected = modelA && modelB
  const isEvaluated = (r: EvalHistoryRecord | null): boolean => {
    if (!r) return false
    return r.evalStatus === 'completed' && r.total > 0
  }
  const aOk = isEvaluated(modelA)
  const bOk = isEvaluated(modelB)
  const bothEvaluated = aOk && bOk
  const handleSwap = () => {
    setModelA(modelB)
    setModelB(modelA)
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-[1000px] px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-[13px] text-text-tertiary hover:text-text-secondary transition-colors mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回
            </button>
            <h1 className="text-[24px] font-bold tracking-[-0.02em]">模型 PK 对比</h1>
            <p className="mt-1 text-[14px] text-text-secondary">
              选择两个已评测模型进行横向对比分析
            </p>
          </div>
          <button
            onClick={() => navigate('/eval/wizard')}
            className="inline-flex items-center gap-1.5 rounded-full glass-btn-accent px-4 py-2 text-[13px] font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            新评测
          </button>
        </div>

        {/* Model selection */}
        <div className="grid grid-cols-2 gap-6">
          {/* Model A */}
          <div>
            {modelA ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] bg-accent/10 text-accent">模型A</Badge>
                      {modelA.isExample && <Badge variant="secondary" className="text-[10px]">示例</Badge>}
                    </div>
                    <button onClick={() => setModelA(null)} className="text-text-tertiary hover:text-red-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[14px] font-medium text-text-primary truncate">
                    {modelA.modelName.replace(/\s*\(OBJ\).*/, '')}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-1">
                    {MODEL_TYPE_LABELS[modelA.evaluationType] ?? modelA.evaluationType}
                  </p>
                  <div className="flex items-end gap-2 mt-3">
                    <span className="mono text-[28px] font-bold text-text-primary">{modelA.total}</span>
                    <span className="text-[12px] text-text-tertiary mb-1">/ {modelA.maxTotal}</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <button
                onClick={() => setPickerTarget('A')}
                className="w-full rounded-2xl border-2 border-dashed border-black/10 p-8 text-center hover:border-accent/30 hover:bg-accent/[0.02] transition-all duration-200"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.03] mx-auto mb-3">
                  <Plus className="h-6 w-6 text-text-tertiary" />
                </div>
                <p className="text-[14px] font-medium text-text-secondary">选择模型 A</p>
                <p className="text-[12px] text-text-tertiary mt-1">从已评测模型中选取</p>
              </button>
            )}
          </div>

          {/* Model B */}
          <div>
            {modelB ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-600">模型B</Badge>
                      {modelB.isExample && <Badge variant="secondary" className="text-[10px]">示例</Badge>}
                    </div>
                    <button onClick={() => setModelB(null)} className="text-text-tertiary hover:text-red-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[14px] font-medium text-text-primary truncate">
                    {modelB.modelName.replace(/\s*\(OBJ\).*/, '')}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-1">
                    {MODEL_TYPE_LABELS[modelB.evaluationType] ?? modelB.evaluationType}
                  </p>
                  <div className="flex items-end gap-2 mt-3">
                    <span className="mono text-[28px] font-bold text-text-primary">{modelB.total}</span>
                    <span className="text-[12px] text-text-tertiary mb-1">/ {modelB.maxTotal}</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <button
                onClick={() => setPickerTarget('B')}
                className="w-full rounded-2xl border-2 border-dashed border-black/10 p-8 text-center hover:border-purple-300/30 hover:bg-purple-50/[0.02] transition-all duration-200"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.03] mx-auto mb-3">
                  <Plus className="h-6 w-6 text-text-tertiary" />
                </div>
                <p className="text-[14px] font-medium text-text-secondary">选择模型 B</p>
                <p className="text-[12px] text-text-tertiary mt-1">从已评测模型中选取</p>
              </button>
            )}
          </div>
        </div>

        {/* Swap + Start Compare */}
        {bothSelected && (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleSwap}
              className="flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <Minus className="h-3 w-3 rotate-90" />
              交换对比位置
            </button>

            {/* Validation check */}
            {!bothEvaluated && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-center max-w-md">
                <p className="text-[13px] font-medium text-red-700 mb-1">暂无法开始对比</p>
                <div className="text-[12px] text-red-600 space-y-0.5">
                  {!aOk && <p>模型A「{modelA?.modelName.replace(/\s*\(OBJ\).*/, '') ?? ''}」暂未完成评测</p>}
                  {!bOk && <p>模型B「{modelB?.modelName.replace(/\s*\(OBJ\).*/, '') ?? ''}」暂未完成评测</p>}
                </div>
                <p className="text-[11px] text-red-500/70 mt-1">请先完成模型评测后再进行对比</p>
              </div>
            )}

            {/* Start compare button */}
            {bothEvaluated && (
              <button
                onClick={() => setActiveCompare(modelA!.id, modelB!.id)}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-[14px] font-semibold text-white shadow-md hover:bg-accent/90 transition-all active:scale-[0.98]"
              >
                <Swords className="h-4 w-4" />
                开始对比
              </button>
            )}
          </div>
        )}

      </div>

      {/* Picker dialog */}
      {pickerTarget && (
        <ModelPickerDialog
          selected={pickerTarget === 'A' ? modelA : modelB}
          onSelect={(record) => {
            if (pickerTarget === 'A') setModelA(record)
            else setModelB(record)
            setPickerTarget(null)
          }}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  )
}
