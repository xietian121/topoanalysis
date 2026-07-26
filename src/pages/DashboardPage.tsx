import { useNavigate } from 'react-router-dom'
import { Box, ClipboardCheck, Upload, ArrowRight, Zap, Scale, BarChart4 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { APP_TITLE, APP_DESCRIPTION } from '@/lib/constants'
import { STORAGE_KEYS, getItem } from '@/lib/storage'
import { useEvalHistoryStore } from '@/stores/evalHistoryStore'
import type { ModelInfo } from '@/types/model'
import { useState, useEffect } from 'react'

const features = [
  { icon: Zap, label: '自动拓扑检测', desc: '面型质量 + 错误检测' },
  { icon: Scale, label: '人工评测打分', desc: '滑块 + 雷达图 + 标记' },
  { icon: Box, label: '模型PK对比', desc: '双屏3D对比 + 分数PK' },
  { icon: BarChart4, label: '数据统计分析', desc: '质量分布 + 缺陷统计' },
]

function RecentEvals() {
  const navigate = useNavigate()
  const records = useEvalHistoryStore((s) => s.records)
  const recent = records.slice(0, 5)

  if (recent.length === 0) return null

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.01em]">最近评测</h2>
          <p className="mt-1 text-[14px] text-text-secondary">
            最近的评测结果
          </p>
        </div>
        <button
          onClick={() => navigate('/history')}
          className="text-[13px] text-text-tertiary hover:text-text-secondary transition-colors duration-150"
        >
          查看全部 →
        </button>
      </div>
      <div className="rounded-2xl glass overflow-hidden">
        {recent.map((record, i) => {
          const ratio = record.maxTotal > 0 ? record.total / record.maxTotal : 0
          const gradeColor =
            ratio < 0.4 ? 'text-red-500' : ratio < 0.7 ? 'text-amber-500' : 'text-emerald-500'
          return (
            <div
              key={record.id}
              className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors duration-200 hover:bg-black/[0.04] ${
                i > 0 ? 'border-t border-black/5' : ''
              }`}
              onClick={() => navigate('/history')}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-text-tertiary">
                <BarChart4 className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-text-primary truncate">
                  {record.modelName}
                </p>
                <p className="text-[12px] text-text-tertiary mt-0.5">
                  {record.modelType === 'static' ? '静态' : '可动'} · {formatDate(record.createdAt)}
                </p>
              </div>
              <span className={`mono text-[15px] font-bold shrink-0 ${gradeColor}`}>
                {record.total}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [recentModels, setRecentModels] = useState<ModelInfo[]>([])

  useEffect(() => {
    setRecentModels(getItem<ModelInfo[]>(STORAGE_KEYS.RECENT_MODELS, []))
  }, [])

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="h-full overflow-auto">
    <div className="mx-auto max-w-[960px] px-8 py-12 space-y-16">
      {/* ===== Hero ===== */}
      <section className="relative pt-6 pb-4 text-center">
        {/* Background glow — very subtle */}
        <div className="absolute inset-0 -top-20 flex items-start justify-center pointer-events-none">
          <div className="h-64 w-[600px] rounded-full bg-black/[0.02] blur-[120px]" />
        </div>

        <h1 className="relative text-[42px] font-bold tracking-[-0.02em] leading-[1.1]">
          <span className="text-text-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]">{APP_TITLE}</span>
        </h1>
        <p className="relative mt-4 text-[17px] text-text-secondary leading-relaxed max-w-[520px] mx-auto">
          {APP_DESCRIPTION}
        </p>

        {/* Quick actions — only primary CTA uses accent */}
        <div className="relative mt-10 flex items-center justify-center gap-4">
          <button
            onClick={() => navigate('/viewer')}
            className="inline-flex items-center gap-2 rounded-full glass-btn-accent px-6 py-3 text-[15px] font-medium active:scale-[0.97]"
          >
            <Upload className="h-4 w-4" />
            加载模型开始评测
          </button>
          <button
            onClick={() => navigate('/standards')}
            className="inline-flex items-center gap-2 rounded-full glass-btn px-6 py-3 text-[15px] font-medium text-text-primary"
          >
            <ClipboardCheck className="h-4 w-4" />
            查看评估标准
          </button>
        </div>
      </section>

      {/* ===== Recent Models ===== */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.01em]">最近模型</h2>
            <p className="mt-1 text-[14px] text-text-secondary">
              最近加载的模型文件
            </p>
          </div>
          <Badge variant="secondary" className="px-2.5 py-1 text-[12px]">
            {recentModels.length} 个
          </Badge>
        </div>

        {recentModels.length === 0 ? (
          <div className="rounded-2xl glass p-12 text-center">
            <Box className="h-8 w-8 mx-auto text-text-tertiary mb-4" />
            <p className="text-[15px] text-text-secondary">暂无已加载模型</p>
            <p className="text-[13px] text-text-tertiary mt-1.5">
              前往模型查看器，拖放 OBJ 或 FBX 文件开始
            </p>
            <button
              onClick={() => navigate('/viewer')}
              className="mt-6 inline-flex items-center gap-2 rounded-full glass-btn px-5 py-2 text-[14px] font-medium text-text-primary"
            >
              前往查看器
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="rounded-2xl glass overflow-hidden">
            {recentModels.map((model, i) => (
              <div
                key={model.id}
                className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors duration-200 hover:bg-black/[0.04] ${
                  i > 0 ? 'border-t border-black/5' : ''
                }`}
                onClick={() => navigate('/viewer')}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-text-tertiary">
                  <Box className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-text-primary truncate">
                    {model.name}
                  </p>
                  <p className="text-[12px] text-text-tertiary mt-0.5">
                    {formatSize(model.fileSize)} · {formatDate(model.uploadedAt)}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-2 py-0.5 font-mono shrink-0"
                >
                  {model.format.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Recent Evaluations ===== */}
      <section>
        <RecentEvals />
      </section>

      {/* ===== Feature Preview ===== */}
      <section>
        <h2 className="text-[20px] font-semibold tracking-[-0.01em] mb-5">功能预览</h2>
        <div className="grid grid-cols-2 gap-3">
          {features.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="group rounded-2xl glass p-5 transition-all duration-400 card-elevate cursor-default"
            >
              {/* Monochrome icon — flat, no color */}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.04] text-text-secondary mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-[15px] font-semibold text-text-primary">{label}</h3>
              <p className="mt-1 text-[13px] text-text-tertiary">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Footer note ===== */}
      <p className="text-center text-[12px] text-text-tertiary pb-8">
        AI 3D 拓扑低模评测工具 · Phase 1 · 即将支持更多功能
      </p>
    </div>
    </div>
  )
}
