import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DimensionSection } from './DimensionSection'
import type { EvaluationStandard } from '@/types/evaluation'

interface StandardCardProps {
  standard: EvaluationStandard
}

export function StandardCard({ standard }: StandardCardProps) {
  const totalAuto = standard.dimensions.reduce(
    (sum, d) => sum + d.criteria.filter((c) => c.method === 'auto').length,
    0,
  )
  const totalManual = standard.dimensions.reduce(
    (sum, d) => sum + d.criteria.filter((c) => c.method === 'manual').length,
    0,
  )

  return (
    <Card className="glass">
      <CardHeader className="pb-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[18px] font-semibold tracking-[-0.01em]">
              {standard.name}
            </CardTitle>
            <p className="mt-1 text-[13px] text-text-secondary">
              共 {standard.dimensions.length} 个评测维度，{totalAuto + totalManual} 项指标
            </p>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div className="flex items-center gap-1.5">
              <Badge variant="default" className="text-[10px]">{totalAuto}项自动</Badge>
              <Badge variant="secondary" className="text-[10px]">{totalManual}项人工</Badge>
            </div>
            <span className="mono text-[28px] font-bold text-text-primary">
              {standard.totalScore}
            </span>
            <span className="text-[13px] text-text-secondary">总分</span>
          </div>
        </div>
      </CardHeader>
      <Separator className="bg-black/5" />
      <CardContent className="pt-4">
        <div className="divide-y divide-black/5 rounded-xl border border-black/[0.06] overflow-hidden">
          {standard.dimensions.map((dimension) => (
            <DimensionSection key={dimension.id} dimension={dimension} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
