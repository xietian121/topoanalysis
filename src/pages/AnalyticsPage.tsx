import { useMemo, useState } from 'react'
import { BarChart4, TrendingUp, Star, AlertTriangle, Lightbulb, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useEvalHistoryStore } from '@/stores/evalHistoryStore'
import { getExampleRecords } from '@/data/example-models'
import { RadarChart } from '@/components/evaluation/RadarChart'
import type { EvaluationType } from '@/types/evaluation'

type FilterType = 'all' | 'example' | 'user' | 'game' | 'general'

export function AnalyticsPage() {
  const historyRecords = useEvalHistoryStore((s) => s.records)
  const exampleRecords = useMemo(() => getExampleRecords(), [])
  const [filterType, setFilterType] = useState<FilterType>('all')

  // Merge all records
  const allRecords = useMemo(() => {
    const map = new Map<string, typeof exampleRecords[number]>()
    for (const r of exampleRecords) map.set(r.id, r)
    for (const r of historyRecords) {
      if (!map.has(r.id) && r.evalStatus === 'completed') map.set(r.id, r)
    }
    return Array.from(map.values()).filter(r => r.total > 0)
  }, [exampleRecords, historyRecords])

  // Filter
  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      switch (filterType) {
        case 'example': return r.isExample
        case 'user': return !r.isExample
        case 'game': return r.evaluationType?.startsWith('game-')
        case 'general': return r.evaluationType?.startsWith('general-')
        default: return true
      }
    })
  }, [allRecords, filterType])

  // Stats calculation
  const stats = useMemo(() => {
    const total = filteredRecords.length
    if (total === 0) return null

    const avgScore = Math.round(filteredRecords.reduce((s, r) => s + r.total, 0) / total)
    const excellentCount = filteredRecords.filter(r => r.total >= 80).length
    const excellentRate = Math.round((excellentCount / total) * 100)

    // Score distribution
    const distribution = [
      { range: '0-40', label: '需改进', min: 0, max: 40 },
      { range: '40-60', label: '一般', min: 40, max: 60 },
      { range: '60-80', label: '良好', min: 60, max: 80 },
      { range: '80-100', label: '优秀', min: 80, max: 100 },
    ].map(d => ({
      ...d,
      count: filteredRecords.filter(r => r.total >= d.min && (r.total < d.max || (d.max === 100 && r.total === 100))).length,
    }))

    // Quality breakdown
    const qualityBreakdown = [
      { level: '优秀 (80-100)', min: 80, max: 100, color: 'bg-emerald-500' },
      { level: '良好 (60-80)', min: 60, max: 80, color: 'bg-accent' },
      { level: '一般 (40-60)', min: 40, max: 60, color: 'bg-amber-500' },
      { level: '需改进 (0-40)', min: 0, max: 40, color: 'bg-red-500' },
    ].map(d => {
      const count = filteredRecords.filter(r => r.total >= d.min && (r.total < d.max || (d.max === 100 && r.total === 100))).length
      return { ...d, count, pct: Math.round((count / total) * 100) }
    })

    // Dimension averages
    const dimMap = new Map<string, { total: number; maxTotal: number; count: number }>()
    for (const r of filteredRecords) {
      for (const dim of r.dimensionScores) {
        const existing = dimMap.get(dim.dimensionName) || { total: 0, maxTotal: 0, count: 0 }
        existing.total += dim.score
        existing.maxTotal += dim.maxScore
        existing.count++
        dimMap.set(dim.dimensionName, existing)
      }
    }
    const dimensionAverages = Array.from(dimMap.entries()).map(([name, data]) => ({
      dimensionName: name,
      avgScore: Math.round(data.total / data.count),
      maxScore: Math.round(data.maxTotal / data.count),
    }))

    // Frequent issues (simulated based on dimension scores)
    const frequentIssues = dimensionAverages
      .filter(d => d.avgScore / d.maxScore < 0.7)
      .sort((a, b) => (a.avgScore / a.maxScore) - (b.avgScore / b.maxScore))
      .map(d => ({
        name: `${d.dimensionName}得分偏低`,
        rate: Math.round((1 - d.avgScore / d.maxScore) * 100),
        severity: (d.avgScore / d.maxScore < 0.5 ? 'high' : 'medium') as 'high' | 'medium',
        suggestion: getDimensionSuggestion(d.dimensionName),
      }))

    // Category comparison (game vs general)
    const gameRecords = filteredRecords.filter(r => r.evaluationType?.startsWith('game-'))
    const generalRecords = filteredRecords.filter(r => r.evaluationType?.startsWith('general-'))

    const getCategoryDims = (records: typeof filteredRecords) => {
      const map = new Map<string, { total: number; maxTotal: number; count: number }>()
      for (const r of records) {
        for (const dim of r.dimensionScores) {
          const existing = map.get(dim.dimensionName) || { total: 0, maxTotal: 0, count: 0 }
          existing.total += dim.score
          existing.maxTotal += dim.maxScore
          existing.count++
          map.set(dim.dimensionName, existing)
        }
      }
      return Array.from(map.entries()).map(([name, data]) => ({
        dimensionName: name,
        avgScore: data.count > 0 ? Math.round(data.total / data.count) : 0,
        maxScore: data.count > 0 ? Math.round(data.maxTotal / data.count) : 1,
      }))
    }

    const categoryComparison = [
      { label: '游戏模型', dimensions: getCategoryDims(gameRecords), count: gameRecords.length },
      { label: '通用模型', dimensions: getCategoryDims(generalRecords), count: generalRecords.length },
    ]

    // Top issue
    const topIssue = frequentIssues[0] || { name: '数据不足', rate: 0 }

    // Insights
    const insights: string[] = []
    if (dimensionAverages.length > 0) {
      const worst = dimensionAverages.reduce((a, b) =>
        (a.avgScore / a.maxScore) < (b.avgScore / b.maxScore) ? a : b
      )
      insights.push(
        `目前 ${Math.round((worst.avgScore / worst.maxScore) * 100)}% 的模型在"${worst.dimensionName}"上得分低于70%，这是最普遍的短板。建议在制作时重点关注该维度的改进。`
      )
    }
    if (excellentRate < 40) {
      insights.push(
        `优秀率仅 ${excellentRate}%，超过 ${Math.round(100 - excellentRate)}% 的模型存在可改进空间。建议建立内部拓扑质量标准，将优秀率提升至50%以上。`
      )
    }
    if (gameRecords.length > 0 && generalRecords.length > 0) {
      const gameAvg = Math.round(gameRecords.reduce((s, r) => s + r.total, 0) / gameRecords.length)
      const generalAvg = Math.round(generalRecords.reduce((s, r) => s + r.total, 0) / generalRecords.length)
      if (gameAvg < generalAvg) {
        insights.push(
          `游戏模型平均分（${gameAvg}）低于通用模型（${generalAvg}），说明游戏资产的拓扑标准需要更严格的执行。建议加强对游戏模型的布线规范培训。`
        )
      }
    }
    if (frequentIssues.filter(i => i.severity === 'high').length > 0) {
      insights.push(
        `存在 ${frequentIssues.filter(i => i.severity === 'high').length} 个高严重度问题类型，建议将其纳入团队的模型验收checklist中。`
      )
    }
    insights.push(
      '对比优秀案例和问题案例可以发现：优秀的拓扑不是面数越多越好，而是面数用在关键位置、布线跟随结构、错误为零。建议新项目从参考优秀案例开始。'
    )

    return {
      total,
      avgScore,
      excellentRate,
      topIssue,
      distribution,
      qualityBreakdown,
      dimensionAverages,
      frequentIssues,
      categoryComparison,
      insights,
    }
  }, [filteredRecords])

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-[1000px] px-8 py-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.02em] flex items-center gap-2">
            📊 拓扑质量分析中心
          </h1>
          <p className="mt-1 text-[14px] text-text-secondary">
            基于所有已评测模型的质量统计与专业洞察
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1">
          {([
            { key: 'all' as const, label: '全部模型' },
            { key: 'example' as const, label: '仅示例' },
            { key: 'user' as const, label: '仅我的' },
            { key: 'game' as const, label: '游戏' },
            { key: 'general' as const, label: '通用' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                filterType === key
                  ? 'bg-black/[0.06] text-text-primary'
                  : 'text-text-tertiary hover:bg-black/[0.04] hover:text-text-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!stats ? (
          <div className="rounded-2xl glass p-16 text-center space-y-4">
            <BarChart4 className="h-10 w-10 mx-auto text-text-tertiary" />
            <p className="text-[15px] text-text-secondary">暂无足够的数据进行分析</p>
            <p className="text-[13px] text-text-tertiary">完成一些模型评测后，数据将自动汇总到这里</p>
          </div>
        ) : (
          <>
            {/* Core Stats */}
            <div className="grid grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04]">
                    <BarChart4 className="h-5 w-5 text-text-secondary" />
                  </div>
                  <div>
                    <p className="mono text-[22px] font-bold text-text-primary">{stats.total}</p>
                    <p className="text-[11px] text-text-tertiary">总评测模型数</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04]">
                    <TrendingUp className="h-5 w-5 text-text-secondary" />
                  </div>
                  <div>
                    <p className="mono text-[22px] font-bold text-text-primary">{stats.avgScore}</p>
                    <p className="text-[11px] text-text-tertiary">平均总分 / 100</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04]">
                    <Star className="h-5 w-5 text-text-secondary" />
                  </div>
                  <div>
                    <p className="mono text-[22px] font-bold text-text-primary">{stats.excellentRate}%</p>
                    <p className="text-[11px] text-text-tertiary">优秀率（≥80分）</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04]">
                    <AlertTriangle className="h-5 w-5 text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-text-primary truncate">{stats.topIssue.name}</p>
                    <p className="text-[11px] text-text-tertiary">最常见问题（{stats.topIssue.rate}%）</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Distribution + Dimension Radar */}
            <div className="grid grid-cols-2 gap-6">
              {/* Score distribution */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-[14px] font-semibold mb-4">质量分布分析</h3>
                  <div className="space-y-3">
                    {stats.distribution.map((d) => {
                      const maxCount = Math.max(...stats.distribution.map(x => x.count), 1)
                      return (
                        <div key={d.range} className="space-y-1">
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="text-text-primary">{d.label}</span>
                            <span className="mono text-text-tertiary">{d.count} 个</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-black/[0.04] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                d.label === '优秀' ? 'bg-emerald-500' :
                                d.label === '良好' ? 'bg-accent' :
                                d.label === '一般' ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${(d.count / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Quality pie (visual) */}
                  <div className="mt-5 space-y-2">
                    <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">质量等级分布</h4>
                    <div className="flex items-center gap-1 h-6 rounded-full overflow-hidden">
                      {stats.qualityBreakdown.map((q) =>
                        q.pct > 0 ? (
                          <div
                            key={q.level}
                            className={`h-full ${q.color} transition-all`}
                            style={{ width: `${q.pct}%` }}
                            title={`${q.level}: ${q.count}个 (${q.pct}%)`}
                          />
                        ) : null
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px]">
                      {stats.qualityBreakdown.map((q) => (
                        <span key={q.level} className="flex items-center gap-1 text-text-tertiary">
                          <span className={`w-2 h-2 rounded-full ${q.color}`} />
                          {q.level}: {q.count}个 ({q.pct}%)
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dimension radar */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-[14px] font-semibold mb-4">整体维度能力分析</h3>
                  {stats.dimensionAverages.length > 0 ? (
                    <div className="flex justify-center">
                      <RadarChart
                        dimensions={stats.dimensionAverages.map(d => ({
                          name: d.dimensionName,
                          score: d.avgScore,
                          maxScore: d.maxScore,
                        }))}
                        size={200}
                      />
                    </div>
                  ) : (
                    <p className="text-center py-8 text-[13px] text-text-tertiary">数据不足</p>
                  )}
                  <div className="mt-4 space-y-1.5">
                    {stats.dimensionAverages.map((d) => {
                      const ratio = d.avgScore / d.maxScore
                      return (
                        <div key={d.dimensionName} className="flex items-center justify-between text-[12px]">
                          <span className="text-text-secondary">{d.dimensionName}</span>
                          <span className={`mono ${ratio < 0.6 ? 'text-red-500' : ratio < 0.8 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {d.avgScore}/{d.maxScore} ({Math.round(ratio * 100)}%)
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Frequent Issues */}
            <section>
              <h3 className="text-[14px] font-semibold flex items-center gap-2 mb-4">
                <Target className="h-4 w-4" />
                常见问题诊断
              </h3>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-black/5">
                          <th className="text-left px-4 py-3 font-semibold text-text-tertiary w-8">#</th>
                          <th className="text-left px-4 py-3 font-semibold text-text-tertiary">问题类型</th>
                          <th className="text-left px-4 py-3 font-semibold text-text-tertiary">出现率</th>
                          <th className="text-left px-4 py-3 font-semibold text-text-tertiary">影响程度</th>
                          <th className="text-left px-4 py-3 font-semibold text-text-tertiary">改进建议</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.frequentIssues.map((issue, i) => (
                          <tr key={i} className="border-b border-black/[0.03] hover:bg-black/[0.01]">
                            <td className="px-4 py-3 text-text-tertiary">{i + 1}</td>
                            <td className="px-4 py-3 font-medium text-text-primary">{issue.name}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden max-w-[80px]">
                                  <div className={`h-full rounded-full ${issue.rate > 60 ? 'bg-red-500' : issue.rate > 30 ? 'bg-amber-500' : 'bg-accent'}`} style={{ width: `${issue.rate}%` }} />
                                </div>
                                <span className="mono text-text-tertiary">{issue.rate}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                issue.severity === 'high' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                              }`}>
                                {issue.severity === 'high' ? '高' : '中'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-text-tertiary max-w-[300px] truncate">{issue.suggestion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Category Comparison */}
            {stats.categoryComparison.filter(c => c.count > 0).length >= 2 && (
              <section>
                <h3 className="text-[14px] font-semibold mb-4">分类对比分析</h3>
                <div className="grid grid-cols-2 gap-4">
                  {stats.categoryComparison.filter(c => c.count > 0).map((cat) => (
                    <Card key={cat.label}>
                      <CardContent className="p-4">
                        <h4 className="text-[13px] font-semibold mb-3">
                          {cat.label}
                          <span className="text-[11px] text-text-tertiary ml-1.5">({cat.count}个模型)</span>
                        </h4>
                        <div className="space-y-2">
                          {cat.dimensions.map((d) => {
                            const ratio = d.avgScore / d.maxScore
                            return (
                              <div key={d.dimensionName} className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-text-secondary">{d.dimensionName}</span>
                                  <span className={`mono ${ratio < 0.6 ? 'text-red-500' : ratio < 0.8 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {d.avgScore}/{d.maxScore}
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-black/[0.04] overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${ratio < 0.6 ? 'bg-red-400' : ratio < 0.8 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                    style={{ width: `${ratio * 100}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Professional Insights */}
            <section>
              <h3 className="text-[14px] font-semibold flex items-center gap-2 mb-4">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                专业洞察与建议
              </h3>
              <div className="space-y-3">
                {stats.insights.map((insight, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/[0.06] mt-0.5">
                        <span className="text-[12px] font-bold text-accent">💡</span>
                      </div>
                      <p className="text-[13px] text-text-secondary leading-relaxed">
                        <span className="font-medium text-text-primary">洞察 {i + 1}：</span>
                        {insight}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function getDimensionSuggestion(dimName: string): string {
  switch (dimName) {
    case '面型质量': return '使用重拓扑工具提升四边面占比，控制在90%以上'
    case '面错误': return '使用网格检测工具系统修复所有非流形边和重叠面'
    case '布线合理性': return '沿结构轮廓重布线，先建立关键循环线再填充过渡区域'
    case '绑定动画友好性': return '在关节处建立3圈以上环形线，增加可动区域面数预算'
    default: return '参考评测标准中的详细要求进行改进'
  }
}
