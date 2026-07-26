import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StandardCard } from '@/components/standards/StandardCard'
import { STATIC_MODEL_STANDARD, DYNAMIC_MODEL_STANDARD } from '@/data/evaluation-standards'

export function StandardsPage() {
  return (
    <div className="h-full overflow-auto">
    <div className="mx-auto max-w-[840px] px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">评估标准</h1>
        <p className="mt-2 text-[15px] text-text-secondary max-w-xl">
          完整的评测维度与评分标准。选择模型类型查看对应的评测体系，了解每个指标的评分细则。
        </p>
      </div>

      <Tabs defaultValue="static">
        <TabsList className="mb-6">
          <TabsTrigger value="static">静态模型</TabsTrigger>
          <TabsTrigger value="dynamic">可动模型</TabsTrigger>
        </TabsList>
        <TabsContent value="static">
          <StandardCard standard={STATIC_MODEL_STANDARD} />
        </TabsContent>
        <TabsContent value="dynamic">
          <StandardCard standard={DYNAMIC_MODEL_STANDARD} />
        </TabsContent>
      </Tabs>
    </div>
    </div>
  )
}
