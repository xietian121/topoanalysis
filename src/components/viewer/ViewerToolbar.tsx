import { useState } from 'react'
import { Grid3X3, RotateCcw, Trash2, Palette, Columns2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useViewerStore } from '@/stores/viewerStore'
import { useModelStore } from '@/stores/modelStore'
import { MaterialControls } from './MaterialControls'
import type { RenderMode } from '@/types/viewer'

const MODES: { mode: RenderMode; icon: typeof Grid3X3; label: string }[] = [
  { mode: 'wireframe', icon: Grid3X3, label: '线框' },
  { mode: 'wireframe-solid', icon: Grid3X3, label: '线框+实体' },
  { mode: 'solid', icon: Grid3X3, label: '白模' },
]

interface ViewerToolbarProps {
  onClear?: () => void
  /** 水平排列，悬浮工具栏 */
  horizontal?: boolean
  /** 显示底部操作按钮（重置/清除），默认 true */
  showActions?: boolean
}

export function ViewerToolbar({ onClear, horizontal = false, showActions = true }: ViewerToolbarProps) {
  const [showMaterial, setShowMaterial] = useState(false)
  const settings = useViewerStore((s) => s.settings)
  const setRenderMode = useViewerStore((s) => s.setRenderMode)
  const toggleGrid = useViewerStore((s) => s.toggleGrid)
  const toggleSymmetry = useViewerStore((s) => s.toggleSymmetry)
  const resetCamera = useViewerStore((s) => s.resetCamera)
  const clearModel = useModelStore((s) => s.clearModel)

  const btnBaseV = 'flex flex-col items-center justify-center gap-0.5 w-10 h-10 rounded-lg text-[10px] font-medium transition-all duration-150'
  const btnBaseH = 'flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150'
  const btnBase = horizontal ? btnBaseH : btnBaseV

  const activeClass = 'bg-black/[0.06] text-text-primary'
  const inactiveClass = 'text-text-tertiary hover:bg-black/[0.04] hover:text-text-primary'

  const containerClass = horizontal
    ? 'relative inline-flex'
    : 'relative flex flex-col items-center gap-1'

  const panelClass = horizontal
    ? 'inline-flex items-center gap-1 rounded-full glass px-2 py-1.5 shadow-lg shadow-black/[0.08]'
    : 'flex flex-col items-center gap-0.5 rounded-2xl glass px-1.5 py-2 shadow-lg shadow-black/[0.04]'

  return (
    <div className={containerClass}>
      <div className={panelClass}>
        {/* Render mode buttons */}
        {MODES.map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => setRenderMode(mode)}
            className={`${btnBase} ${settings.renderMode === mode ? activeClass : inactiveClass}`}
            title={label}
          >
            <span className="text-[14px] font-bold leading-none">
              {mode === 'wireframe' ? '◇' : mode === 'wireframe-solid' ? '◈' : '◆'}
            </span>
            <span className={horizontal ? 'text-[11px] leading-none' : 'text-[9px] leading-none'}>
              {label === '线框+实体' ? (horizontal ? '混合' : '混合') : label}
            </span>
          </button>
        ))}

        <Separator className={horizontal ? 'h-5 w-px mx-0.5 bg-black/[0.08]' : 'w-6 my-1 bg-black/[0.06]'} />

        <button
          onClick={toggleGrid}
          className={`${btnBase} ${settings.showGrid ? activeClass : inactiveClass}`}
          title="网格显示"
        >
          <Grid3X3 className="h-4 w-4" />
          {!horizontal && <span className="text-[9px] leading-none">网格</span>}
        </button>

        <button
          onClick={toggleSymmetry}
          className={`${btnBase} ${settings.showSymmetry ? activeClass : inactiveClass}`}
          title="对称性参考面"
        >
          <Columns2 className="h-4 w-4" />
          {!horizontal && <span className="text-[9px] leading-none">对称</span>}
        </button>

        <button
          onClick={() => setShowMaterial(!showMaterial)}
          className={`${btnBase} ${showMaterial ? activeClass : inactiveClass}`}
          title="材质设置"
        >
          <Palette className="h-4 w-4" />
          {!horizontal && <span className="text-[9px] leading-none">材质</span>}
        </button>

        {showActions && (
          <>
            <Separator className={horizontal ? 'h-5 w-px mx-0.5 bg-black/[0.08]' : 'w-6 my-1 bg-black/[0.06]'} />

            <button onClick={resetCamera} className={`${btnBase} ${inactiveClass}`} title="重置视角">
              <RotateCcw className="h-4 w-4" />
              {!horizontal && <span className="text-[9px] leading-none">重置</span>}
            </button>

            <button
              onClick={() => {
                if (onClear) {
                  onClear()
                } else {
                  clearModel()
                }
              }}
              className={`${btnBase} text-text-tertiary hover:bg-black/[0.04] hover:text-text-primary`}
              title="清除模型"
            >
              <Trash2 className="h-4 w-4" />
              {!horizontal && <span className="text-[9px] leading-none">清除</span>}
            </button>
          </>
        )}
      </div>

      {showMaterial && (
        <div className={`absolute rounded-2xl glass p-4 shadow-lg shadow-black/[0.06] w-56 z-50 ${
          horizontal ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : 'right-full mr-3 top-0'
        }`}>
          <MaterialControls />
        </div>
      )}
    </div>
  )
}
