import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Gamepad2, Palette, Bone, Box, Upload } from 'lucide-react'
import { useWizardStore } from '@/stores/wizardStore'
import { useEvalStore } from '@/stores/evalStore'
import { useModelStore } from '@/stores/modelStore'
import { ModelDropZone } from '@/components/viewer/ModelDropZone'
import { MODEL_USAGE_LABELS, MODEL_ANIMATION_LABELS, type ModelUsage, type ModelAnimation } from '@/types/evaluation'

const STEPS = ['选择用途', '选择动效', '上传模型']

export function EvalWizardPage() {
  const navigate = useNavigate()
  const { step, usage, animation, setUsage, setAnimation, lockAndGetType, startWizard, cancelWizard } = useWizardStore()
  const setEvaluationType = useEvalStore((s) => s.setEvaluationType)
  const isLoading = useModelStore((s) => s.isLoading)
  const error = useModelStore((s) => s.error)
  const loadModel = useModelStore((s) => s.loadModel)
  const modelObject = useModelStore((s) => s.modelObject)
  const [uploadDone, setUploadDone] = useState(false)

  // Ensure wizard is initialized on first mount
  useEffect(() => {
    startWizard()
  }, [])

  const handleSelectUsage = (u: ModelUsage) => {
    setUsage(u)
  }

  const handleSelectAnimation = (a: ModelAnimation) => {
    setAnimation(a)
  }

  const handleFileAccepted = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    await loadModel(files[0])
    setUploadDone(true)
  }, [loadModel])

  const handleStartEval = useCallback(() => {
    const type = lockAndGetType()
    if (type) {
      setEvaluationType(type)
      navigate('/viewer/single')
    }
  }, [lockAndGetType, setEvaluationType, navigate])

  const handleBack = () => {
    if (step === 1) {
      // Go back to usage selection
      useWizardStore.setState({ step: 0, usage: null })
    } else if (step === 2) {
      useWizardStore.setState({ step: 1 })
    }
  }

  const handleCancel = () => {
    cancelWizard()
    navigate('/')
  }

  const canProceed = step === 0 ? !!usage : step === 1 ? !!animation : uploadDone

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

              {/* Show current selection */}
              {usage && (
                <div className="text-center text-[12px] text-text-tertiary">
                  已选用途：<span className="font-medium text-text-secondary">{MODEL_USAGE_LABELS[usage]}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: File upload */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-[22px] font-bold tracking-[-0.02em]">上传模型文件</h2>
                <p className="text-[14px] text-text-secondary max-w-md mx-auto">
                  支持 OBJ（推荐，完整拓扑检测）和 FBX 格式。文件大小不超过 100MB。
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

              {/* Upload zone */}
              {!uploadDone ? (
                <ModelDropZone
                  isLoading={isLoading}
                  error={error}
                  onFilesAccepted={handleFileAccepted}
                  label="拖放模型文件到此处"
                  description="支持 OBJ / FBX — 最大 100MB"
                />
              ) : (
                <div className="rounded-2xl glass p-8 text-center space-y-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 mx-auto">
                    <Upload className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-text-primary">
                      {useModelStore.getState().currentModel?.name ?? '模型文件'}
                    </p>
                    <p className="text-[13px] text-text-tertiary mt-1">文件已就绪，点击下方按钮开始评测</p>
                  </div>
                </div>
              )}
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
                    if (step === 0 && usage) {
                      // Already moved by setUsage
                    } else if (step === 1 && animation) {
                      // Already moved by setAnimation
                    }
                  }}
                >
                  下一步
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleStartEval}
                  disabled={!uploadDone || isLoading}
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-medium transition-all duration-300 ${
                    uploadDone && !isLoading
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
