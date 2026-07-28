import { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useEvalHistoryStore, type EvalHistoryRecord } from '@/stores/evalHistoryStore'
import { getExampleRecords } from '@/data/example-models'
import { type EvaluationType } from '@/types/evaluation'
import { ModelCard } from './ModelCard'

// ── Filter config ──

const FILTER_CHIPS: { key: EvaluationType | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'game-dynamic', label: '实时渲染·可动' },
  { key: 'game-static', label: '实时渲染·静态' },
  { key: 'general-dynamic', label: '离线渲染·可动' },
  { key: 'general-static', label: '离线渲染·静态' },
]

type SortBy = 'score-desc' | 'score-asc' | 'date-desc'

// ── Component ──

interface ModelPickerDialogProps {
  selected: EvalHistoryRecord | null
  onSelect: (record: EvalHistoryRecord) => void
  onClose: () => void
}

export function ModelPickerDialog({ selected, onSelect, onClose }: ModelPickerDialogProps) {
  const historyRecords = useEvalHistoryStore((s) => s.records)
  const exampleRecords = useMemo(() => getExampleRecords(), [])

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<EvaluationType | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortBy>('score-desc')
  const [animatingOut, setAnimatingOut] = useState(false)

  // Merge + deduplicate (example first, then user completed)
  const allRecords = useMemo(() => {
    const map = new Map<string, EvalHistoryRecord>()
    for (const r of exampleRecords) map.set(r.id, r)
    for (const r of historyRecords) {
      if (!map.has(r.id) && (r.evalStatus === 'completed' || r.total > 0)) {
        map.set(r.id, r)
      }
    }
    return Array.from(map.values())
  }, [exampleRecords, historyRecords])

  // Filter
  const filtered = useMemo(() => {
    let result = allRecords
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((r) => r.modelName.toLowerCase().includes(q))
    }
    if (typeFilter !== 'all') {
      result = result.filter((r) => r.evaluationType === typeFilter)
    }
    return result
  }, [allRecords, search, typeFilter])

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sortBy) {
      case 'score-desc':
        arr.sort((a, b) => b.total - a.total)
        break
      case 'score-asc':
        arr.sort((a, b) => a.total - b.total)
        break
      case 'date-desc':
        arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
    }
    return arr
  }, [filtered, sortBy])

  // Close with animation
  const handleClose = useCallback(() => {
    setAnimatingOut(true)
    setTimeout(() => onClose(), 200)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: animatingOut ? 'transparent' : 'rgba(0,0,0,0.2)',
        backdropFilter: animatingOut ? 'none' : 'blur(4px)',
        transition: 'background-color 0.2s ease, backdrop-filter 0.2s ease',
      }}
      onClick={handleClose}
    >
      <div
        className="w-[1100px] max-w-[95vw] max-h-[85vh] rounded-3xl glass-strong shadow-xl overflow-hidden flex flex-col"
        style={{
          opacity: animatingOut ? 0 : 1,
          transform: animatingOut ? 'scale(0.95)' : 'scale(1)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 shrink-0">
          <h2 className="text-[16px] font-semibold text-text-primary">选择模型</h2>
          <button
            onClick={handleClose}
            className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-black/[0.04] text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Filter Bar ── */}
        <div className="px-5 py-3 border-b border-black/5 shrink-0 space-y-3">
          {/* Search */}
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

          {/* Type filter chips + sort */}
          <div className="flex items-center justify-between gap-3">
            {/* Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => setTypeFilter(chip.key)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-150 ${
                    typeFilter === chip.key
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-black/[0.04] text-text-secondary hover:bg-black/[0.08]'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-0.5 shrink-0">
              <span className="text-[10px] text-text-tertiary mr-1">排序</span>
              {([
                { key: 'score-desc' as const, label: '评分↓' },
                { key: 'score-asc' as const, label: '评分↑' },
                { key: 'date-desc' as const, label: '日期↓' },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`rounded-md px-2 py-1 text-[11px] transition-all duration-150 ${
                    sortBy === opt.key
                      ? 'text-accent font-semibold bg-accent/[0.06]'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result count */}
          <p className="text-[11px] text-text-tertiary">
            共 {sorted.length} 个模型
          </p>
        </div>

        {/* ── Card Grid ── */}
        <div className="flex-1 overflow-y-auto p-4">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-8 w-8 text-text-tertiary opacity-40 mb-3" />
              <p className="text-[14px] font-medium text-text-tertiary mb-1">
                未找到匹配的模型
              </p>
              <p className="text-[12px] text-text-tertiary opacity-70">
                尝试调整搜索条件或筛选类型
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {sorted.map((record) => (
                <ModelCard
                  key={record.id}
                  record={record}
                  isSelected={selected?.id === record.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
