import { Badge } from '@/components/ui/badge'
import { CompareCanvas } from './CompareCanvas'
import { ModelInfoOverlay } from './ModelInfoOverlay'
import { useViewerStore } from '@/stores/viewerStore'
import { useCompareStore } from '@/stores/compareStore'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DualViewport() {
  const renderMode = useViewerStore((s) => s.settings.renderMode)
  const showGrid = useViewerStore((s) => s.settings.showGrid)
  const highModel = useCompareStore((s) => s.highModel)
  const lowModel = useCompareStore((s) => s.lowModel)

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Left: High-poly */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-8 flex items-center px-4 glass border-b border-black/5 shrink-0 gap-2">
          <span className="text-[12px] font-semibold text-text-primary">高模</span>
          <span className="text-[10px] text-text-tertiary">参考模型</span>
          {highModel.info && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] text-text-tertiary truncate max-w-[120px]">
                {highModel.info.name}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {highModel.info.format.toUpperCase()}
              </Badge>
              <span className="mono text-[10px] text-text-tertiary">
                {formatSize(highModel.info.fileSize)}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 relative min-h-0">
          <ModelInfoOverlay
            model={highModel.object}
            modelInfo={highModel.info}
            label="高模"
            labelDesc="参考模型"
          />
          <CompareCanvas
            model={highModel.object}
            renderMode={renderMode}
            showGrid={showGrid}
            side="left"
            objFaceData={null}
            forceSolid
          />
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-black/5 shrink-0" />

      {/* Right: Low-poly */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-8 flex items-center px-4 glass border-b border-black/5 shrink-0 gap-2">
          <span className="text-[12px] font-semibold text-text-primary">低模</span>
          <span className="text-[10px] text-text-tertiary">评测模型</span>
          {lowModel.info && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] text-text-tertiary truncate max-w-[120px]">
                {lowModel.info.name}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {lowModel.info.format.toUpperCase()}
              </Badge>
              <span className="mono text-[10px] text-text-tertiary">
                {formatSize(lowModel.info.fileSize)}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 relative min-h-0">
          <ModelInfoOverlay
            model={lowModel.object}
            modelInfo={lowModel.info}
            faceData={lowModel.faceData}
            label="低模"
            labelDesc="评测模型"
          />
          <CompareCanvas
            model={lowModel.object}
            renderMode={renderMode}
            showGrid={showGrid}
            side="right"
            objFaceData={lowModel.faceData}
          />
        </div>
      </div>
    </div>
  )
}
