import { RotateCcw } from 'lucide-react'
import { useViewerStore } from '@/stores/viewerStore'

const COLOR_PRESETS = [
  { label: '纯白', hex: '#f5f5f5' },
  { label: '暖白', hex: '#e8e4dd' },
  { label: '浅灰', hex: '#d0d0d0' },
  { label: '中灰', hex: '#a0a0a0' },
  { label: '深灰', hex: '#707070' },
  { label: '冷白', hex: '#e0e4e8' },
]

const DEFAULTS = {
  color: '#d0d0d0',
  roughness: 0.4,
  metalness: 0,
}

export function MaterialControls() {
  const materialColor = useViewerStore((s) => s.settings.materialColor)
  const materialRoughness = useViewerStore((s) => s.settings.materialRoughness)
  const materialMetalness = useViewerStore((s) => s.settings.materialMetalness)
  const setMaterialColor = useViewerStore((s) => s.setMaterialColor)
  const setMaterialRoughness = useViewerStore((s) => s.setMaterialRoughness)
  const setMaterialMetalness = useViewerStore((s) => s.setMaterialMetalness)

  return (
    <div className="space-y-5">
      {/* Color presets */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
            颜色
          </span>
          <div className="flex items-center gap-1.5">
            {/* Color reset */}
            <button
              onClick={() => setMaterialColor(DEFAULTS.color)}
              disabled={materialColor === DEFAULTS.color}
              className={`p-0.5 rounded transition-colors ${
                materialColor === DEFAULTS.color
                  ? 'text-text-tertiary/40 cursor-default'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-black/[0.04]'
              }`}
              title="重置颜色"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <div
              className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
              style={{ backgroundColor: materialColor }}
            />
            <input
              type="color"
              value={materialColor}
              onChange={(e) => setMaterialColor(e.target.value)}
              className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
              title="自定义颜色"
            />
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {COLOR_PRESETS.map(({ label, hex }) => (
            <button
              key={hex}
              onClick={() => setMaterialColor(hex)}
              className={`h-7 w-full rounded-lg border transition-all duration-150 hover:scale-110 active:scale-95 ${
                materialColor === hex
                  ? 'border-black/20 ring-1 ring-black/10 scale-105'
                  : 'border-black/[0.06]'
              }`}
              style={{ backgroundColor: hex }}
              title={label}
            />
          ))}
        </div>
      </div>

      {/* Roughness slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
            粗糙度
          </span>
          <div className="flex items-center gap-1">
            <span className="mono text-[12px] text-text-secondary">
              {materialRoughness.toFixed(2)}
            </span>
            <button
              onClick={() => setMaterialRoughness(DEFAULTS.roughness)}
              disabled={materialRoughness === DEFAULTS.roughness}
              className={`p-0.5 rounded transition-colors ${
                materialRoughness === DEFAULTS.roughness
                  ? 'text-text-tertiary/40 cursor-default'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-black/[0.04]'
              }`}
              title="重置粗糙度"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={materialRoughness}
          onChange={(e) => setMaterialRoughness(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-black/[0.06] cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/10
            [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
        />
      </div>

      {/* Metalness slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
            金属度
          </span>
          <div className="flex items-center gap-1">
            <span className="mono text-[12px] text-text-secondary">
              {materialMetalness.toFixed(2)}
            </span>
            <button
              onClick={() => setMaterialMetalness(DEFAULTS.metalness)}
              disabled={materialMetalness === DEFAULTS.metalness}
              className={`p-0.5 rounded transition-colors ${
                materialMetalness === DEFAULTS.metalness
                  ? 'text-text-tertiary/40 cursor-default'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-black/[0.04]'
              }`}
              title="重置金属度"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={materialMetalness}
          onChange={(e) => setMaterialMetalness(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-black/[0.06] cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/10
            [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
        />
      </div>
    </div>
  )
}
