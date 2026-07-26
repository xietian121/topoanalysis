import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, X, TrendingUp, TrendingDown, Minus, Plus, Trophy, Swords } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useEvalHistoryStore, type EvalHistoryRecord } from '@/stores/evalHistoryStore'
import { getExampleRecords } from '@/data/example-models'
import { RadarChart } from '@/components/evaluation/RadarChart'
import { ScoreBadge } from '@/components/evaluation/ScoreBadge'
import { MODEL_TYPE_LABELS, type EvaluationType } from '@/types/evaluation'

function ModelPickerDialog({ onSelect, onClose, selected }: {
  onSelect: (record: EvalHistoryRecord) => void
  onClose: () => void
  selected: EvalHistoryRecord | null
}) {
  const historyRecords = useEvalHistoryStore((s) => s.records)
  const exampleRecords = useMemo(() => getExampleRecords(), [])
  const allRecords = useMemo(() => {
    const map = new Map<string, EvalHistoryRecord>()
    for (const r of exampleRecords) map.set(r.id, r)
    for (const r of historyRecords) {
      if (!map.has(r.id) && r.evalStatus === 'completed') map.set(r.id, r)
    }
    return Array.from(map.values()).filter(r => r.evalStatus === 'completed' || r.total > 0)
  }, [exampleRecords, historyRecords])

  const [search, setSearch] = useState('')
  const filtered = allRecords.filter(r =>
    r.modelName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-[560px] max-h-[80vh] rounded-3xl glass-strong shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
          <h2 className="text-[16px] font-semibold">选择模型</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-black/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="搜索模型名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-[13px] rounded-xl bg-black/[0.03] border border-black/5 outline-none focus:border-accent/30 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[50vh] p-2">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-[13px] text-text-tertiary">未找到匹配的模型</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((r) => {
                const ratio = r.maxTotal > 0 ? r.total / r.maxTotal : 0
                const gradeColor = ratio < 0.4 ? 'text-red-500' : ratio < 0.7 ? 'text-amber-500' : 'text-emerald-500'
                const isAlreadySelected = selected?.id === r.id
                return (
                  <button
                    key={r.id}
                    disabled={isAlreadySelected}
                    onClick={() => { onSelect(r); onClose() }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      isAlreadySelected
                        ? 'bg-accent/[0.04] opacity-50 cursor-not-allowed'
                        : 'hover:bg-black/[0.03]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-text-primary truncate">
                          {r.modelName.replace(/\s*\(OBJ\).*/, '')}
                        </p>
                        {r.isExample && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-accent/10 text-accent shrink-0">示例</span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-tertiary mt-0.5">
                        {MODEL_TYPE_LABELS[r.evaluationType] ?? r.evaluationType}
                      </p>
                    </div>
                    <span className={`mono text-[16px] font-bold shrink-0 ${gradeColor}`}>
                      {r.total}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CompareAnalysis({ modelA, modelB }: { modelA: EvalHistoryRecord; modelB: EvalHistoryRecord }) {
  const analysis = useMemo(() => {
    const diff = modelA.total - modelB.total
    const winner = diff > 5 ? 'A' as const : diff < -5 ? 'B' as const : 'draw' as const

    // Dimension comparison
    const dimMapA = new Map(modelA.dimensionScores.map(d => [d.dimensionName, d]))
    const dimMapB = new Map(modelB.dimensionScores.map(d => [d.dimensionName, d]))
    const allDims = [...new Set([...dimMapA.keys(), ...dimMapB.keys()])]

    const dimensionDiffs = allDims.map(name => {
      const a = dimMapA.get(name)
      const b = dimMapB.get(name)
      const scoreA = a ? a.score / a.maxScore : 0
      const scoreB = b ? b.score / b.maxScore : 0
      const dimDiff = Math.round((scoreA - scoreB) * 100)
      const significant = Math.abs(dimDiff) > 15
      return {
        dimensionName: name,
        scoreA: a?.score ?? 0, maxScoreA: a?.maxScore ?? 1,
        scoreB: b?.score ?? 0, maxScoreB: b?.maxScore ?? 1,
        diff: dimDiff,
        winner: dimDiff > 5 ? 'A' as const : dimDiff < -5 ? 'B' as const : 'draw' as const,
        significant,
      }
    })

    // Analysis text
    const lines: string[] = []
    const aBetter = dimensionDiffs.filter(d => d.winner === 'A').map(d => d.dimensionName)
    const bBetter = dimensionDiffs.filter(d => d.winner === 'B').map(d => d.dimensionName)
    const tie = dimensionDiffs.filter(d => d.winner === 'draw').map(d => d.dimensionName)

    if (winner === 'A') {
      lines.push(`${modelA.modelName.replace(/\s*\(OBJ\).*/, '')} 在拓扑质量上整体优于 ${modelB.modelName.replace(/\s*\(OBJ\).*/, '')}，总分领先 ${Math.abs(diff)} 分。`)
    } else if (winner === 'B') {
      lines.push(`${modelB.modelName.replace(/\s*\(OBJ\).*/, '')} 在拓扑质量上整体优于 ${modelA.modelName.replace(/\s*\(OBJ\).*/, '')}，总分领先 ${Math.abs(diff)} 分。`)
    } else {
      lines.push(`两个模型的拓扑质量基本持平，总分仅差 ${Math.abs(diff)} 分。`)
    }

    if (aBetter.length > 0) {
      lines.push(`模型A在 ${aBetter.join('、')} 方面表现更优。`)
    }
    if (bBetter.length > 0) {
      lines.push(`模型B在 ${bBetter.join('、')} 方面表现更优。`)
    }
    if (tie.length > 0) {
      lines.push(`在 ${tie.join('、')} 方面两者水平相当。`)
    }

    // Common issues
    const commonIssues = dimensionDiffs
      .filter(d => d.scoreA / d.maxScoreA < 0.6 && d.scoreB / d.maxScoreB < 0.6)
      .map(d => `${d.dimensionName}：两个模型均需改进`)

    return { winner, diff: Math.abs(diff), dimensionDiffs, analysis: lines, commonIssues }
  }, [modelA, modelB])

  return (
    <div className="space-y-6">
      {/* PK Conclusion */}
      <section>
        <h3 className="text-[14px] font-semibold flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-amber-500" />
          PK 结论
        </h3>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 text-[18px] font-bold ${
                analysis.winner === 'A' ? 'text-accent' : analysis.winner === 'B' ? 'text-text-secondary' : 'text-text-tertiary'
              }`}>
                <Swords className="h-5 w-5" />
                {analysis.winner === 'A' ? '模型A 胜' : analysis.winner === 'B' ? '模型B 胜' : '平局'}
              </div>
              <span className="text-[13px] text-text-tertiary">总分差 {analysis.diff} 分</span>
            </div>
            {analysis.analysis.map((line, i) => (
              <p key={i} className="text-[13px] text-text-secondary leading-relaxed">{line}</p>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Dimension comparison chart */}
      <section>
        <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
          📊 维度对比
        </h3>
        <div className="space-y-3">
          {analysis.dimensionDiffs.map((dim) => (
            <div key={dim.dimensionName} className="space-y-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-text-primary">{dim.dimensionName}</span>
                <span className={`mono text-[11px] ${
                  dim.winner === 'A' ? 'text-accent' : dim.winner === 'B' ? 'text-text-secondary' : 'text-text-tertiary'
                }`}>
                  A: {dim.scoreA}/{dim.maxScoreA} vs B: {dim.scoreB}/{dim.maxScoreB}
                  {dim.significant && (
                    <span className="ml-1 text-red-500">显著差异</span>
                  )}
                </span>
              </div>
              {/* Comparison bars */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-black/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent/60 transition-all"
                    style={{ width: `${(dim.scoreA / dim.maxScoreA) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-text-tertiary w-8 text-center shrink-0">
                  {dim.diff > 0 ? `+${dim.diff}%` : dim.diff < 0 ? `${dim.diff}%` : '持平'}
                </span>
                <div className="flex-1 h-2 rounded-full bg-black/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-text-secondary/40 transition-all"
                    style={{ width: `${(dim.scoreB / dim.maxScoreB) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Common issues */}
      {analysis.commonIssues.length > 0 && (
        <section>
          <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            ⚠️ 共性问题
          </h3>
          <div className="space-y-2">
            {analysis.commonIssues.map((issue, i) => (
              <div key={i} className="text-[12px] text-text-secondary px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                {issue}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export function ModelComparePage() {
  const navigate = useNavigate()
  const [modelA, setModelA] = useState<EvalHistoryRecord | null>(null)
  const [modelB, setModelB] = useState<EvalHistoryRecord | null>(null)
  const [pickerTarget, setPickerTarget] = useState<'A' | 'B' | null>(null)

  const bothSelected = modelA && modelB
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

        {/* Swap button */}
        {bothSelected && (
          <div className="flex justify-center">
            <button
              onClick={handleSwap}
              className="flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <Minus className="h-3 w-3 rotate-90" />
              交换对比位置
            </button>
          </div>
        )}

        {/* Comparison Analysis */}
        {bothSelected && (
          <>
            <Separator className="bg-black/5" />
            <CompareAnalysis modelA={modelA} modelB={modelB} />
          </>
        )}
      </div>

      {/* Picker dialog */}
      {pickerTarget && (
        <ModelPickerDialog
          selected={pickerTarget === 'A' ? modelA : modelB}
          onSelect={(record) => {
            if (pickerTarget === 'A') setModelA(record)
            else setModelB(record)
          }}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  )
}
