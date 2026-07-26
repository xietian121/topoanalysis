import { Badge } from '@/components/ui/badge'
import { CompareCanvas } from '@/components/viewer/CompareCanvas'
import { ModelInfoOverlay } from '@/components/viewer/ModelInfoOverlay'
import { ViewerToolbar } from '@/components/viewer/ViewerToolbar'
import { EvalPanel } from '@/components/evaluation/EvalPanel'
import { useModelStore } from '@/stores/modelStore'
import { useViewerStore } from '@/stores/viewerStore'
import { useHighlightStore } from '@/stores/highlightStore'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ViewerPage() {
  const modelObject = useModelStore((s) => s.modelObject)
  const currentModel = useModelStore((s) => s.currentModel)
  const objFaceData = useModelStore((s) => s.objFaceData)
  const referenceModel = useModelStore((s) => s.referenceModel)
  const referenceModelInfo = useModelStore((s) => s.referenceModelInfo)
  const renderMode = useViewerStore((s) => s.settings.renderMode)
  const showGrid = useViewerStore((s) => s.settings.showGrid)
  const criterionId = useHighlightStore((s) => s.criterionId)

  // 结构跟随性叠加模式：高低模重合在同一视口
  const isStructureMode = criterionId === 'structure' && referenceModel !== null

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-primary">
      <div className="flex-1 flex min-h-0">
        {/* Left: Dual viewport area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Left viewport: Structure overlay mode or regular reference/model view */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-8 flex items-center px-4 glass border-b border-black/5 shrink-0 gap-2">
                <span className="text-[12px] font-semibold text-text-primary">
                  {isStructureMode ? '结构对比' : referenceModel ? '高模' : '视图 A'}
                </span>
                <span className="text-[10px] text-text-tertiary">
                  {isStructureMode ? '高低模重合' : referenceModel ? '参考模型' : '评测模型'}
                </span>
                {isStructureMode && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-600 ml-2">
                    叠加模式
                  </span>
                )}
                {referenceModelInfo && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[11px] text-text-tertiary truncate max-w-[120px]">
                      {referenceModelInfo.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {referenceModelInfo.format.toUpperCase()}
                    </Badge>
                    <span className="mono text-[10px] text-text-tertiary">
                      {formatSize(referenceModelInfo.fileSize)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 relative min-h-0">
                {modelObject && (
                  <ModelInfoOverlay
                    model={isStructureMode ? referenceModel! : (referenceModel || modelObject)}
                    modelInfo={referenceModelInfo || currentModel}
                    label={isStructureMode ? '结构对比' : referenceModel ? '高模' : '视图 A'}
                    labelDesc={isStructureMode ? '高低模重合' : referenceModel ? '参考模型' : '评测模型'}
                  />
                )}
                <CompareCanvas
                  model={isStructureMode ? referenceModel : (referenceModel || modelObject)}
                  renderMode={renderMode}
                  showGrid={showGrid}
                  side="left"
                  objFaceData={isStructureMode ? objFaceData : null}
                  forceSolid={!!referenceModel && !isStructureMode}
                  overlayModel={isStructureMode ? modelObject : null}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="w-px bg-black/5 shrink-0" />

            {/* Right viewport: Main evaluation model */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-8 flex items-center px-4 glass border-b border-black/5 shrink-0 gap-2">
                <span className="text-[12px] font-semibold text-text-primary">低模</span>
                <span className="text-[10px] text-text-tertiary">评测模型</span>
                {currentModel && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[11px] text-text-tertiary truncate max-w-[120px]">
                      {currentModel.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {currentModel.format.toUpperCase()}
                    </Badge>
                    <span className="mono text-[10px] text-text-tertiary">
                      {formatSize(currentModel.fileSize)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 relative min-h-0">
                {modelObject && (
                  <ModelInfoOverlay
                    model={modelObject}
                    modelInfo={currentModel}
                    faceData={objFaceData}
                    label="低模"
                    labelDesc="评测模型"
                  />
                )}
                <CompareCanvas
                  model={modelObject}
                  renderMode={renderMode}
                  showGrid={showGrid}
                  side="right"
                  objFaceData={objFaceData}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vertical toolbar — docked between viewport and right panel */}
        {modelObject && (
          <div className="flex items-center px-1 shrink-0">
            <ViewerToolbar />
          </div>
        )}

        {/* Right panel — evaluation type locked from wizard */}
        {modelObject && <EvalPanel locked />}
      </div>
    </div>
  )
}
