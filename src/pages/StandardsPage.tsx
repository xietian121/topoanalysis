import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StandardCard } from '@/components/standards/StandardCard'
import { EVALUATION_STANDARDS, STANDARDS_META } from '@/data/evaluation-standards'
import type { EvaluationType } from '@/types/evaluation'

const TAB_GROUPS = [
  {
    label: '游戏模型',
    types: [
      { value: 'game-static' as const, label: '游戏·静态' },
      { value: 'game-dynamic' as const, label: '游戏·可动' },
    ],
  },
  {
    label: '通用模型',
    types: [
      { value: 'general-static' as const, label: '通用·静态' },
      { value: 'general-dynamic' as const, label: '通用·可动' },
    ],
  },
]

export function StandardsPage() {
  const [activeTab, setActiveTab] = useState<string>('game-static')

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-[840px] px-8 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">评测标准</h1>
          <p className="mt-2 text-[15px] text-text-secondary max-w-xl">
            4套差异化评测标准，覆盖游戏和通用3D资产的静态/可动模型。选择标准查看详细维度和评分规则。
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="space-y-4">
            {TAB_GROUPS.map((group) => (
              <div key={group.label} className="space-y-2">
                <h3 className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">
                  {group.label}
                </h3>
                <TabsList className="mb-0">
                  {group.types.map((t) => (
                    <TabsTrigger key={t.value} value={t.value}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            ))}
          </div>

          {TAB_GROUPS.flatMap(g => g.types).map((t) => (
            <TabsContent key={t.value} value={t.value}>
              <StandardCard standard={EVALUATION_STANDARDS[t.value]} />
            </TabsContent>
          ))}
        </Tabs>

        {/* Standards comparison summary */}
        <section className="rounded-2xl glass p-6 space-y-4">
          <h2 className="text-[16px] font-semibold">标准差异总览</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left py-2 pr-4 font-semibold text-text-tertiary">标准类型</th>
                  <th className="text-left py-2 px-3 font-semibold text-text-tertiary">面型质量</th>
                  <th className="text-left py-2 px-3 font-semibold text-text-tertiary">面错误</th>
                  <th className="text-left py-2 px-3 font-semibold text-text-tertiary">布线合理性</th>
                  <th className="text-left py-2 px-3 font-semibold text-text-tertiary">绑定友好性</th>
                  <th className="text-left py-2 pl-3 font-semibold text-text-tertiary">总分</th>
                </tr>
              </thead>
              <tbody>
                {STANDARDS_META.map((meta) => {
                  const std = EVALUATION_STANDARDS[meta.type]
                  return (
                    <tr key={meta.type} className="border-b border-black/[0.03] hover:bg-black/[0.01]">
                      <td className="py-2.5 pr-4 font-medium text-text-primary">{meta.name}</td>
                      {std.dimensions.map((dim) => (
                        <td key={dim.id} className="py-2.5 px-3 mono text-text-secondary">{dim.weight}</td>
                      ))}
                      {std.dimensions.length < 4 && <td className="py-2.5 px-3 text-text-tertiary">—</td>}
                      <td className="py-2.5 pl-3 mono font-semibold text-text-primary">{std.totalScore}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-text-tertiary space-y-1 pt-2">
            <p>• <strong>游戏模型</strong>：对面错误容忍度更低，面数效率要求更高，三角面阈值更严格</p>
            <p>• <strong>通用模型</strong>：对面型要求相对宽松，更注重整体造型和布线流畅度</p>
            <p>• <strong>可动模型</strong>：增加绑定动画友好性维度，关节布线为核心考核点</p>
            <p>• <strong>静态模型</strong>：不考核绑定相关维度，权重分配到面型和布线</p>
          </div>
        </section>
      </div>
    </div>
  )
}
