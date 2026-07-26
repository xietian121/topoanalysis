import { useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { CompareCanvas } from '@/components/viewer/CompareCanvas'
import { ModelInfoOverlay } from '@/components/viewer/ModelInfoOverlay'
import { ViewerToolbar } from '@/components/viewer/ViewerToolbar'
import { ScoringHeader } from '@/components/evaluation/ScoringHeader'
import { ScoringPanel } from '@/components/evaluation/ScoringPanel'
import { useModelStore } from '@/stores/modelStore'
import { useViewerStore } from '@/stores/viewerStore'
import { useHighlightStore } from '@/stores/highlightStore'
import { useEvalFlowStore } from '@/stores/evalFlowStore'

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
  const isFlowActive = useEvalFlowStore((s) => s.isActive)
  const flowCurrentIndex = useEvalFlowStore((s) => s.currentIndex)
  const flowCriteria = useEvalFlowStore((s) => s.criteria)
  const flowGoTo = useEvalFlowStore((s) => s.goTo)
  const flowSetScore = useEvalFlowStore((s) => s.setScore)
  const flowScores = useEvalFlowStore((s) => s.reviewScores)

  // 结构跟随性叠加模式
  const isStructureMode = criterionId === 'structure' && referenceModel !== null

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isFlowActive) return

    // Number keys 1-0 for scoring
    const numKey = parseInt(e.key)
    if (numKey >= 1 && numKey <= 9) {
      e.preventDefault()
      const crit = flowCriteria[flowCurrentIndex]
      if (crit) flowSetScore(crit.id, numKey)
      return
    }
    if (e.key === '0') {
      e.preventDefault()
      const crit = flowCriteria[flowCurrentIndex]
      if (crit) flowSetScore(crit.id, 10)
      return
    }

    // Arrow keys for navigation
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      flowGoTo(flowCurrentIndex + 1)
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      flowGoTo(flowCurrentIndex - 1)
    }

    // Enter for next
    if (e.key === 'Enter') {
      e.preventDefault()
      if (flowCurrentIndex < flowCriteria.length - 1) {
        flowGoTo(flowCurrentIndex + 1)
      }
    }
  }, [isFlowActive, flowCurrentIndex, flowCriteria, flowGoTo, flowSetScore])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-primary">
      {/* Top status bar */}
      <ScoringHeader />

      <div className="flex-1 flex min-h-0">
        {/* Left: 3D viewport area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Structure overlay mode: single viewport with dual model overlay */}
            {isStructureMode ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="h-8 flex items-center px-4 glass border-b border-black/5 shrink-0 gap-2">
                  <span className="text-[12px] font-semibold text-text-primary">结构对比</span>
                  <span className="text-[10px] text-text-tertiary">高低模重合</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-600 ml-2">
                    叠加模式
                  </span>
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
                      model={referenceModel!}
                      modelInfo={referenceModelInfo || currentModel}
                      label="结构对比"
                      labelDesc="高低模重合"
                    />
                  )}
                  <CompareCanvas
                    model={referenceModel}
                    renderMode={renderMode}
                    showGrid={showGrid}
                    side="right"
                    objFaceData={objFaceData}
                    overlayModel={modelObject}
                  />
                </div>
              </div>
            ) : (
              /* Normal mode: single viewport with evaluation model, or dual viewport */
              <>
                {/* Left viewport: reference model (if loaded) */}
                {referenceModel ? (
                  <>
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="h-8 flex items-center px-4 glass border-b border-black/5 shrink-0 gap-2">
                        <span className="text-[12px] font-semibold text-text-primary">高模</span>
                        <span className="text-[10px] text-text-tertiary">参考模型</span>
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
                        <ModelInfoOverlay
                          model={referenceModel}
                          modelInfo={referenceModelInfo}
                          faceData={null}
                          label="高模"
                          labelDesc="参考模型"
                        />
                        <CompareCanvas
                          model={referenceModel}
                          renderMode={renderMode}
                          showGrid={showGrid}
                          side="left"
                          objFaceData={null}
                          forceSolid
                        />
                      </div>
                    </div>
                    <div className="w-px bg-black/5 shrink-0" />
                  </>
                ) : null}

                {/* Main viewport: evaluation model */}
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
              </>
            )}
          </div>
        </div>

        {/* Vertical toolbar */}
        {modelObject && (
          <div className="flex items-center px-1 shrink-0">
            <ViewerToolbar />
          </div>
        )}

        {/* Right scoring panel */}
        {modelObject && <ScoringPanel />}
      </div>
    </div>
  )
}
