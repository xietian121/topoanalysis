import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, AlertTriangle } from 'lucide-react'
import { useLoadingStore } from '@/stores/loadingStore'

const STAGE_LABELS: Record<string, string> = {
  download: '正在下载模型文件...',
  parse: '正在解析模型数据...',
  analyze: '正在分析拓扑结构...',
  init: '正在准备 3D 场景...',
  done: '加载完成',
}

export function LoadingScreen() {
  const navigate = useNavigate()
  const isLoading = useLoadingStore((s) => s.isLoading)
  const progress = useLoadingStore((s) => s.progress)
  const stage = useLoadingStore((s) => s.stage)
  const stageText = useLoadingStore((s) => s.stageText)
  const error = useLoadingStore((s) => s.error)
  const startedAt = useLoadingStore((s) => s.startedAt)
  const cancelLoading = useLoadingStore((s) => s.cancelLoading)
  const resetLoading = useLoadingStore((s) => s.resetLoading)

  const [visible, setVisible] = useState(false)
  const [showTimeoutHint, setShowTimeoutHint] = useState(false)
  const [animProgress, setAnimProgress] = useState(0)

  // Smooth progress animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimProgress(progress)
    }, 50)
    return () => clearTimeout(timer)
  }, [progress])

  // Show/hide with delay for smooth transitions
  useEffect(() => {
    if (isLoading || error) {
      setVisible(true)
      setShowTimeoutHint(false)
    } else if (!isLoading && !error) {
      const timer = setTimeout(() => setVisible(false), 400)
      return () => clearTimeout(timer)
    }
  }, [isLoading, error])

  // Timeout hint after 10 seconds
  useEffect(() => {
    if (!isLoading || !startedAt) return
    const timer = setTimeout(() => {
      setShowTimeoutHint(true)
    }, 10000)
    return () => clearTimeout(timer)
  }, [isLoading, startedAt])

  const handleCancel = useCallback(() => {
    cancelLoading()
  }, [cancelLoading])

  const handleRetry = useCallback(() => {
    resetLoading()
    // The caller should re-trigger loading
  }, [resetLoading])

  const handleBack = useCallback(() => {
    resetLoading()
    navigate(-1)
  }, [resetLoading, navigate])

  if (!visible) return null

  const displayLabel = stage ? STAGE_LABELS[stage] || stageText : stageText

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        isLoading || error ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-xl" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[400px] mx-4">
        <div className="rounded-2xl glass border border-black/[0.06] p-8 space-y-6 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5">
              <Box className="h-7 w-7 text-accent" />
            </div>
          </div>

          {/* Error state */}
          {error ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-text-primary mb-1">加载失败</h3>
                <p className="text-[13px] text-text-secondary">{error}</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleRetry}
                  className="rounded-full glass-btn-accent px-5 py-2 text-[13px] font-medium text-white transition-all duration-200"
                >
                  重试
                </button>
                <button
                  onClick={handleBack}
                  className="rounded-full glass-btn px-5 py-2 text-[13px] font-medium text-text-primary transition-all duration-200"
                >
                  返回
                </button>
              </div>
            </div>
          ) : (
            /* Loading state */
            <div className="space-y-5 text-center">
              <div>
                <h3 className="text-[15px] font-semibold text-text-primary mb-1">
                  📦 正在加载模型
                </h3>
                <p className="text-[13px] text-text-secondary min-h-[20px]">
                  {displayLabel}
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500 ease-out shadow-[0_0_8px_rgba(0,122,255,0.3)]"
                    style={{ width: `${animProgress}%` }}
                  />
                </div>
                <p className="text-[11px] mono text-text-tertiary">
                  {Math.round(animProgress)}%
                </p>
              </div>

              {/* Timeout hint */}
              {showTimeoutHint && (
                <p className="text-[11px] text-amber-500">
                  模型较大，请耐心等待...
                </p>
              )}

              {/* Cancel button */}
              <button
                onClick={handleCancel}
                className="text-[12px] text-text-tertiary hover:text-text-secondary transition-colors"
              >
                取消加载
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
