import { Upload, FileWarning, Box } from 'lucide-react'
import { useDragAndDrop } from '@/hooks/useDragAndDrop'
import { ACCEPTED_MODEL_FORMATS, MAX_FILE_SIZE_MB } from '@/lib/constants'

interface ModelDropZoneProps {
  isLoading: boolean
  error: string | null
  onFilesAccepted: (files: File[]) => void
  label?: string
  description?: string
  maxSizeMB?: number
}

export function ModelDropZone({
  isLoading,
  error,
  onFilesAccepted,
  label = '拖放模型文件到此处',
  description = '支持 OBJ 格式（推荐）和 FBX 格式（实验性）',
  maxSizeMB = MAX_FILE_SIZE_MB,
}: ModelDropZoneProps) {
  const { isDragOver, dropZoneProps, getInputProps } = useDragAndDrop({
    acceptFormats: ACCEPTED_MODEL_FORMATS,
    onFilesAccepted: (files) => {
      const maxBytes = maxSizeMB * 1024 * 1024
      const oversized = files.filter((f) => f.size > maxBytes)
      if (oversized.length > 0) {
        alert(
          `文件 "${oversized[0].name}" 超过 ${maxSizeMB}MB 限制（实际: ${(oversized[0].size / (1024 * 1024)).toFixed(1)}MB）`,
        )
      }
      const valid = files.filter((f) => f.size <= maxBytes)
      if (valid.length > 0) {
        onFilesAccepted(valid)
      }
    },
  })

  const inputId = `model-file-input-${label.replace(/\s+/g, '-')}`

  return (
    <div
      {...dropZoneProps}
      className={`flex flex-col items-center justify-center min-h-[280px] rounded-2xl border transition-all duration-300 cursor-pointer ${
        isDragOver
          ? 'border-black/[0.12] bg-black/[0.02] scale-[1.01]'
          : error
            ? 'border-danger/30 bg-danger/[0.02]'
            : 'border-dashed border-black/[0.06] hover:border-black/[0.08] hover:bg-black/[0.01]'
      }`}
    >
      <input {...getInputProps()} className="hidden" id={inputId} />

      {isLoading ? (
        <div className="text-center space-y-4">
          <div className="relative h-12 w-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-black/[0.08]" />
            <div className="absolute inset-0 rounded-full border-2 border-black/20 border-t-transparent animate-spin" />
            <Box className="absolute inset-0 m-auto h-5 w-5 text-text-tertiary" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-text-primary">正在解析模型...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center space-y-3 max-w-sm px-4">
          <FileWarning className="h-9 w-9 mx-auto text-danger/60" />
          <p className="text-[14px] font-medium text-danger">加载失败</p>
          <p className="text-[12px] text-text-secondary">{error}</p>
          <label
            htmlFor={inputId}
            className="inline-block text-[13px] text-accent hover:underline cursor-pointer mt-1"
          >
            重新选择
          </label>
        </div>
      ) : (
        <div className="text-center space-y-4 max-w-sm px-4">
          <div
            className={`h-12 w-12 mx-auto rounded-2xl flex items-center justify-center transition-colors duration-300 ${
              isDragOver ? 'bg-black/[0.06] text-text-secondary' : 'bg-black/[0.04] text-text-tertiary'
            }`}
          >
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-text-primary">
              {isDragOver ? '松开放入' : label}
            </p>
            <p className="text-[12px] text-text-secondary mt-1">{description}</p>
          </div>
          <label
            htmlFor={inputId}
            className="inline-flex items-center gap-2 rounded-full glass-btn px-4 py-2 text-[13px] font-medium text-text-primary cursor-pointer"
          >
            <Box className="h-4 w-4" />
            选择文件
          </label>
          <p className="text-[11px] text-text-tertiary">
            最大 {maxSizeMB}MB
          </p>
        </div>
      )}
    </div>
  )
}
