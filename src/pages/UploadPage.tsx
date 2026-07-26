import { useNavigate } from 'react-router-dom'
import { ArrowRight, Box } from 'lucide-react'
import { ModelDropZone } from '@/components/viewer/ModelDropZone'
import { useCompareStore } from '@/stores/compareStore'
import { HIGH_POLY_MAX_FILE_SIZE_MB } from '@/lib/constants'

export function UploadPage() {
  const navigate = useNavigate()
  const highModel = useCompareStore((s) => s.highModel)
  const lowModel = useCompareStore((s) => s.lowModel)
  const loadHighPolyModel = useCompareStore((s) => s.loadHighPolyModel)
  const loadLowPolyModel = useCompareStore((s) => s.loadLowPolyModel)

  const bothLoaded = highModel.object !== null && lowModel.object !== null
  const anyLoading = highModel.isLoading || lowModel.isLoading

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-primary">
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div className="w-full max-w-[900px] space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.06]">
                <Box className="h-4 w-4 text-text-secondary" />
              </div>
              <h1 className="text-[22px] font-bold tracking-[-0.02em]">AI 3D 拓扑低模评测</h1>
            </div>
            <p className="text-[14px] text-text-secondary">
              上传高精度参考模型与AI生成的低模进行对比评测
            </p>
          </div>

          {/* Dual drop zones */}
          <div className="grid grid-cols-2 gap-6">
            {/* High-poly */}
            <div className="space-y-3">
              <ModelDropZone
                isLoading={highModel.isLoading}
                error={highModel.error}
                onFilesAccepted={(files) => loadHighPolyModel(files[0])}
                label="拖放高模文件到此处"
                description="高精度原始模型（参考用）— 支持 OBJ / FBX"
                maxSizeMB={HIGH_POLY_MAX_FILE_SIZE_MB}
              />
              {highModel.info && !highModel.isLoading && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/[0.03]">
                  <span className="text-[13px] font-medium text-text-primary truncate flex-1">
                    {highModel.info.name}
                  </span>
                  <span className="mono text-[11px] text-text-tertiary">
                    {(highModel.info.fileSize / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">
                    ✓ 已加载
                  </span>
                </div>
              )}
            </div>

            {/* Low-poly */}
            <div className="space-y-3">
              <ModelDropZone
                isLoading={lowModel.isLoading}
                error={lowModel.error}
                onFilesAccepted={(files) => loadLowPolyModel(files[0])}
                label="拖放低模文件到此处"
                description="待评测AI生成低模 — 支持 OBJ / FBX"
              />
              {lowModel.info && !lowModel.isLoading && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/[0.03]">
                  <span className="text-[13px] font-medium text-text-primary truncate flex-1">
                    {lowModel.info.name}
                  </span>
                  <span className="mono text-[11px] text-text-tertiary">
                    {(lowModel.info.fileSize / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">
                    ✓ 已加载
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Enter button */}
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/viewer/compare')}
              disabled={!bothLoaded || anyLoading}
              className={`inline-flex items-center gap-2 rounded-full px-8 py-3 text-[15px] font-medium transition-all duration-300 ${
                bothLoaded && !anyLoading
                  ? 'glass-btn-accent cursor-pointer'
                  : 'glass-btn text-text-tertiary cursor-not-allowed opacity-40'
              }`}
            >
              进入3D查看界面
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
