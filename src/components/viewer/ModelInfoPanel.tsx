import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useModelStore } from '@/stores/modelStore'

export function ModelInfoPanel() {
  const currentModel = useModelStore((s) => s.currentModel)
  const stats = useModelStore((s) => s.stats)
  const objFaceData = useModelStore((s) => s.objFaceData)

  // Compute accurate face stats from OBJ data when available
  const faceStats = useMemo(() => {
    if (objFaceData) {
      let tris = 0, quads = 0, ngons = 0
      for (const group of objFaceData.groups) {
        for (const face of group) {
          if (face.length === 3) tris++
          else if (face.length === 4) quads++
          else ngons++
        }
      }
      const total = tris + quads + ngons
      return { tris, quads, ngons, total }
    }
    // Fallback to triangulated stats
    return {
      tris: stats?.triangleCount ?? 0,
      quads: stats?.quadCount ?? 0,
      ngons: stats?.ngonCount ?? 0,
      total: stats?.faceCount ?? 0,
    }
  }, [objFaceData, stats])

  if (!currentModel || !stats) return null

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const total = faceStats.total
  const triPct = total > 0 ? ((faceStats.tris / total) * 100).toFixed(1) : '0'
  const quadPct = total > 0 ? ((faceStats.quads / total) * 100).toFixed(1) : '0'

  const statRows = [
    { label: '顶点数', value: stats.vertexCount.toLocaleString() },
    { label: '总面数', value: total.toLocaleString() },
  ]

  return (
    <aside className="h-full w-64 shrink-0 border-l border-black/5 glass flex flex-col">
      <div className="p-4 space-y-5">
        {/* File info */}
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
                {currentModel.format === 'fbx' ? ' (实验性)' : ''}
              </Badge>
              <span className="mono text-[12px] text-text-tertiary">
                {formatSize(currentModel.fileSize)}
              </span>
            </div>
          </div>
        </section>

        <Separator className="bg-black/5" />

        {/* Geometry */}
        <section>
          <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            几何统计
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {statRows.map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-black/[0.04] px-3 py-2.5">
                <p className="mono text-[15px] font-semibold text-text-primary">{value}</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator className="bg-black/5" />

        {/* Face breakdown */}
        <section>
          <h4 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            面型分布
          </h4>
          <div className="space-y-3">
            {/* Triangles */}
            <div>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-text-secondary">三角面</span>
                <span className="mono text-text-primary">
                  {faceStats.tris.toLocaleString()} ({triPct}%)
                </span>
              </div>
              <div className="h-1 rounded-full bg-black/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-text-tertiary transition-all duration-500"
                  style={{ width: `${Math.min(Number(triPct), 100)}%` }}
                />
              </div>
            </div>
            {/* Quads */}
            <div>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-text-secondary">四边面</span>
                <span className="mono text-text-primary">
                  {faceStats.quads.toLocaleString()} ({quadPct}%)
                </span>
              </div>
              <div className="h-1 rounded-full bg-black/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-text-secondary transition-all duration-500"
                  style={{ width: `${Math.min(Number(quadPct), 100)}%` }}
                />
              </div>
            </div>
            {/* N-gons */}
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-text-secondary">多边面 (N-gon)</span>
              <span className="mono font-medium text-text-primary">
                {faceStats.ngons.toLocaleString()}
              </span>
            </div>
          </div>
        </section>
      </div>
    </aside>
  )
}
