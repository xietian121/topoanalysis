import { ModelDropZone } from '@/components/viewer/ModelDropZone'
import { ViewerCanvas } from '@/components/viewer/ViewerCanvas'
import { ViewerToolbar } from '@/components/viewer/ViewerToolbar'
import { EvalPanel } from '@/components/evaluation/EvalPanel'
import { useModelStore } from '@/stores/modelStore'

export function ViewerPage() {
  const modelObject = useModelStore((s) => s.modelObject)
  const isLoading = useModelStore((s) => s.isLoading)
  const error = useModelStore((s) => s.error)
  const loadModel = useModelStore((s) => s.loadModel)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-primary">
      <div className="flex-1 flex min-h-0">
        {/* Left: 3D viewport — full height */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div className="flex-1 relative">
            {modelObject ? (
              <ViewerCanvas />
            ) : (
              <div className="flex items-center justify-center p-8 h-full">
                <div className="w-full max-w-[560px]">
                  <ModelDropZone
                    isLoading={isLoading}
                    error={error}
                    onFilesAccepted={(files) => {
                      loadModel(files[0])
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Vertical toolbar — docked between viewport and right panel */}
        {modelObject && (
          <div className="flex items-center px-1 shrink-0">
            <ViewerToolbar />
          </div>
        )}
        {modelObject && <EvalPanel />}
      </div>
    </div>
  )
}
