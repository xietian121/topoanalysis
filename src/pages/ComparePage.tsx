import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ViewerToolbar } from '@/components/viewer/ViewerToolbar'
import { DualViewport } from '@/components/viewer/DualViewport'
import { CompareEvalPanel } from '@/components/evaluation/CompareEvalPanel'
import { useCompareStore } from '@/stores/compareStore'

export function ComparePage() {
  const navigate = useNavigate()
  const highModel = useCompareStore((s) => s.highModel)
  const lowModel = useCompareStore((s) => s.lowModel)
  const clearAll = useCompareStore((s) => s.clearAll)

  const bothLoaded = highModel.object !== null && lowModel.object !== null

  // Navigation guard: redirect to upload if no models
  useEffect(() => {
    if (!bothLoaded) {
      navigate('/viewer', { replace: true })
    }
  }, [bothLoaded, navigate])

  if (!bothLoaded) {
    return null
  }

  const handleClear = () => {
    clearAll()
    navigate('/viewer', { replace: true })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-surface-primary">
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: 3D viewport — full height */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <DualViewport />
        </div>
        {/* Vertical toolbar — docked between viewport and right panel */}
        <div className="flex items-center px-1 shrink-0">
          <ViewerToolbar onClear={handleClear} />
        </div>
        <CompareEvalPanel />
      </div>
    </div>
  )
}
