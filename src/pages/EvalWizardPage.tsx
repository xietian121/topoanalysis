import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Gamepad2, Palette, Bone, Box, Upload } from 'lucide-react'
import { useWizardStore } from '@/stores/wizardStore'
import { useEvalStore } from '@/stores/evalStore'
import { useModelStore } from '@/stores/modelStore'
import { useLoadingStore } from '@/stores/loadingStore'
import { ModelDropZone } from '@/components/viewer/ModelDropZone'
import { LOW_POLY_MODEL_FORMATS, HIGH_POLY_MODEL_FORMATS, HIGH_POLY_MAX_FILE_SIZE_MB } from '@/lib/constants'
import { MODEL_USAGE_LABELS, MODEL_ANIMATION_LABELS, type ModelUsage, type ModelAnimation } from '@/types/evaluation'

const STEPS = ['选择用途', '选择模型类型', '上传模型']

export function EvalWizardPage() {
  const navigate = useNavigate()
  const { step, usage, animation, setUsage, setAnimation, lockAndGetType, startWizard, cancelWizard } = useWizardStore()
  const setEvaluationType = useEvalStore((s) => s.setEvaluationType)
  const isLoading = useModelStore((s) => s.isLoading)
  const error = useModelStore((s) => s.error)
  const loadModel = useModelStore((s) => s.loadModel)
  const modelObject = useModelStore((s) => s.modelObject)
  const referenceModel = useModelStore((s) => s.referenceModel)

  // Low-poly upload state
  const [uploadDone, setUploadDone] = useState(false)

  // High-poly upload state
  const [highUploadDone, setHighUploadDone] = useState(false)
  const [highLoading, setHighLoading] = useState(false)
  const [highError, setHighError] = useState<string | null>(null)
  const [highModelName, setHighModelName] = useState('')

  // Ensure wizard is initialized on first mount
  useEffect(() => {
    startWizard()
  }, [])

  // Reset upload states when models change externally
  useEffect(() => {
    if (modelObject) setUploadDone(true)
    else setUploadDone(false)
  }, [modelObject])

  useEffect(() => {
    if (referenceModel) {
      setHighUploadDone(true)
      setHighModelName(useModelStore.getState().referenceModelInfo?.name ?? '')
    } else {
      setHighUploadDone(false)
      setHighModelName('')
    }
  }, [referenceModel])

  const handleSelectUsage = (u: ModelUsage) => {
    setUsage(u)
  }

  const handleSelectAnimation = (a: ModelAnimation) => {
    setAnimation(a)
  }

  const handleLowFileAccepted = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    const { startLoading, setProgress, setError: setLoadError, finishLoading, abortController } = useLoadingStore.getState()
    startLoading()
    try {
      await loadModel(files[0], {
        onProgress: (progress, stage, text) => {
          setProgress(progress, stage as 'download' | 'parse' | 'analyze' | 'init' | 'done', text)
        },
        signal: abortController?.signal,
      })
      setUploadDone(true)
      finishLoading()
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败'
      setLoadError(message)
    }
  }, [loadModel])

  const handleHighFileAccepted = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    setHighLoading(true)
    setHighError(null)
    try {
      const { loadReferenceModel } = useModelStore.getState()
      await loadReferenceModel(files[0])
      setHighUploadDone(true)
      setHighModelName(files[0].name)
    } catch (err) {
      const message = err instanceof Error ? err.message : '高模加载失败'
      setHighError(message)
    } finally {
      setHighLoading(false)
    }
  }, [])

  const handleStartEval = useCallback(() => {
    const type = lockAndGetType()
    if (type) {
      setEvaluationType(type)
      navigate('/viewer/single')
    }
  }, [lockAndGetType, setEvaluationType, navigate])

  const handleBack = () => {
    if (step === 1) {
      useWizardStore.setState({ step: 0, usage: null })
    } else if (step === 2) {
      useWizardStore.setState({ step: 1 })
    }
  }

  const handleCancel = () => {
    cancelWizard()
    navigate('/')
  }

  const canProceed = step === 0 ? !!usage : step === 1 ? !!animation : (uploadDone && highUploadDone)

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-primary">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[640px] space-y-8">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium transition-all duration-300 ${
                    i === step
                      ? 'bg-accent text-white'
                      : i < step
                        ? 'bg-black/[0.06] text-text-secondary'
                        : 'bg-black/[0.02] text-text-tertiary'
                  }`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                    i === step ? 'bg-white/20' : i < step ? 'bg-accent/20 text-accent' : 'bg-black/10 text-text-tertiary'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </span>
                  {label}
                </div>
                {i < 2 && <div className="h-px w-6 bg-black/10" />}
              </div>
            ))}
          </div>

          {/* Step 0: Usage selection */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-[22px] font-bold tracking-[-0.02em]">这个模型用于什么场景？</h2>
                <p className="text-[14px] text-text-secondary max-w-md mx-auto">
                  不同场景的模型有不同的评测标准侧重，选择正确的用途以获得准确的评测结果。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {([
                  { key: 'game' as ModelUsage, icon: Gamepad2, title: MODEL_USAGE_LABELS.game, desc: '用于游戏引擎实时渲染，对面数、性能、绑定有严格要求，评测标准更严格。', tag: '游戏引擎 / 实时渲染' },
                  { key: 'general' as ModelUsage, icon: Palette, title: MODEL_USAGE_LABELS.general, desc: '用于影视、动画、3D打印、展示等非游戏场景，标准相对宽松，注重造型和布线流畅度。', tag: '影视动画 / 3D打印 / 展示' },
                ]).map(({ key, icon: Icon, title, desc, tag }) => (
                  <button
                    key={key}
                    onClick={() => handleSelectUsage(key)}
                    className={`relative text-left rounded-2xl p-6 border-2 transition-all duration-300 ${
                      usage === key
                        ? 'border-accent bg-accent/[0.04] shadow-[0_0_0_4px_rgba(0,122,255,0.08)]'
                        : 'border-black/5 bg-white/40 hover:border-black/10 hover:bg-white/60 card-elevate'
                    }`}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl mb-4 transition-colors ${
                      usage === key ? 'bg-accent/10 text-accent' : 'bg-black/[0.04] text-text-secondary'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-text-primary mb-1.5">{title}</h3>
                    <p className="text-[12px] text-text-tertiary leading-relaxed mb-3">{desc}</p>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-black/[0.04] text-text-tertiary">
                      {tag}
                    </span>
                    {usage === key && (
                      <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                        <span className="text-[10px]">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Animation type selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-[22px] font-bold tracking-[-0.02em]">这个模型需要绑定动画吗？</h2>
                <p className="text-[14px] text-text-secondary max-w-md mx-auto">
                  可动模型需要额外的关节布线和变形区域考量，评测标准中会增加"绑定动画友好性"维度。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {([
                  { key: 'dynamic' as ModelAnimation, icon: Bone, title: MODEL_ANIMATION_LABELS.dynamic, desc: '需要绑定骨骼、制作动画的角色或道具。对关节布线、变形区域面数有严格要求。', highlight: '绑定动画友好性权重 30~40%' },
                  { key: 'static' as ModelAnimation, icon: Box, title: MODEL_ANIMATION_LABELS.static, desc: '不需要变形动画的场景、道具、建筑等静态模型。评测重点在面型质量和布线合理性。', highlight: '无绑定维度考核' },
                ]).map(({ key, icon: Icon, title, desc, highlight }) => (
                  <button
                    key={key}
                    onClick={() => handleSelectAnimation(key)}
                    className={`relative text-left rounded-2xl p-6 border-2 transition-all duration-300 ${
                      animation === key
                        ? 'border-accent bg-accent/[0.04] shadow-[0_0_0_4px_rgba(0,122,255,0.08)]'
                        : 'border-black/5 bg-white/40 hover:border-black/10 hover:bg-white/60 card-elevate'
                    }`}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl mb-4 transition-colors ${
                      animation === key ? 'bg-accent/10 text-accent' : 'bg-black/[0.04] text-text-secondary'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-text-primary mb-1.5">{title}</h3>
                    <p className="text-[12px] text-text-tertiary leading-relaxed mb-3">{desc}</p>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full ${
                      key === 'dynamic' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {highlight}
                    </span>
                    {animation === key && (
                      <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                        <span className="text-[10px]">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {usage && (
                <div className="text-center text-[12px] text-text-tertiary">
                  已选用途：<span className="font-medium text-text-secondary">{MODEL_USAGE_LABELS[usage]}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Upload low-poly + high-poly models */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-[22px] font-bold tracking-[-0.02em]">上传模型文件</h2>
                <p className="text-[14px] text-text-secondary max-w-md mx-auto">
                  请上传待评测的低模和作为参考的高模，用于拓扑结构对比分析。
                </p>
              </div>

              {/* Selected type summary */}
              {usage && animation && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[12px] text-text-tertiary">评测标准：</span>
                  <span className="text-[12px] font-medium text-text-primary px-2.5 py-1 rounded-full bg-accent/[0.06]">
                    {MODEL_USAGE_LABELS[usage]} · {MODEL_ANIMATION_LABELS[animation]}
                  </span>
                  <button onClick={handleBack} className="text-[11px] text-accent hover:underline">
                    修改
                  </button>
                </div>
              )}

              {/* ── Low-poly upload ── */}
              <div className="space-y-2">
                <h3 className="text-[13px] font-semibold text-text-primary">
                  📦 待评测模型（低模）
                </h3>
                <p className="text-[11px] text-text-tertiary">
                  需要评测拓扑质量的低精度模型
                </p>
                {!uploadDone ? (
                  <ModelDropZone
                    isLoading={isLoading}
                    error={error}
                    onFilesAccepted={handleLowFileAccepted}
                    label="拖放待评测的低模文件到此处"
                    description="仅支持 OBJ 格式 — 最大 100MB"
                    acceptFormats={LOW_POLY_MODEL_FORMATS}
                  />
                ) : (
                  <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-emerald-200/50 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 shrink-0">
                      <Upload className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-text-primary truncate">
                        {useModelStore.getState().currentModel?.name ?? '低模文件'}
                      </p>
                      <p className="text-[11px] text-text-tertiary">
                        {useModelStore.getState().currentModel
                          ? `${useModelStore.getState().currentModel!.format.toUpperCase()} · ${formatSize(useModelStore.getState().currentModel!.fileSize)}`
                          : '已上传'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        useModelStore.getState().clearModel()
                        setUploadDone(false)
                      }}
                      className="text-[11px] text-text-tertiary hover:text-danger transition-colors shrink-0"
                    >
                      移除
                    </button>
                  </div>
                )}
              </div>

              {/* ── High-poly upload ── */}
              <div className="space-y-2">
                <h3 className="text-[13px] font-semibold text-text-primary">
                  🏆 参考模型（高模）
                </h3>
                <p className="text-[11px] text-text-tertiary">
                  用于结构对比的高精度参考模型（可选）
                </p>
                <div className="rounded-lg bg-blue-50/60 border border-blue-200/60 px-4 py-2.5">
                  <p className="text-[12px] text-blue-700 leading-relaxed">
                    💡 <span className="font-semibold">强烈建议上传高模参考</span> — 高模是评判低模拓扑匹配度的核心参照。
                    上传后可对比分析低模布线是否精准还原了高模的结构轮廓，评测结论将更具参考价值。
                    为兼顾加载速度与分析精度，<span className="font-semibold">推荐上传 1GB 以内</span>的高模文件。
                  </p>
                </div>
                {!highUploadDone ? (
                  <ModelDropZone
                    isLoading={highLoading}
                    error={highError}
                    onFilesAccepted={handleHighFileAccepted}
                    label="拖放参考高模文件到此处"
                    description="支持 OBJ / FBX — 最大 5GB，推荐 1GB 以内"
                    maxSizeMB={HIGH_POLY_MAX_FILE_SIZE_MB}
                    acceptFormats={HIGH_POLY_MODEL_FORMATS}
                  />
                ) : (
                  <div className="flex items-center gap-3 rounded-xl bg-white/60 border border-emerald-200/50 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 shrink-0">
                      <Upload className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-text-primary truncate">
                        {highModelName}
                      </p>
                      <p className="text-[11px] text-text-tertiary">
                        {useModelStore.getState().referenceModelInfo
                          ? `${useModelStore.getState().referenceModelInfo!.format.toUpperCase()} · ${formatSize(useModelStore.getState().referenceModelInfo!.fileSize)}`
                          : '已上传'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        useModelStore.getState().clearReferenceModel()
                        setHighUploadDone(false)
                        setHighModelName('')
                      }}
                      className="text-[11px] text-text-tertiary hover:text-danger transition-colors shrink-0"
                    >
                      移除
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {step > 0 && (
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  上一步
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
              >
                取消
              </button>
              {step < 2 ? (
                <button
                  disabled={!canProceed}
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-medium transition-all duration-300 ${
                    canProceed
                      ? 'glass-btn-accent cursor-pointer'
                      : 'glass-btn text-text-tertiary cursor-not-allowed opacity-40'
                  }`}
                  onClick={() => {
                    // setUsage/setAnimation already advances the step
                  }}
                >
                  下一步
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleStartEval}
                  disabled={!uploadDone || isLoading || highLoading}
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-medium transition-all duration-300 ${
                    uploadDone && !isLoading && !highLoading
                      ? 'glass-btn-accent cursor-pointer'
                      : 'glass-btn text-text-tertiary cursor-not-allowed opacity-40'
                  }`}
                >
                  开始评测
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
