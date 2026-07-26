import { create } from 'zustand'
import type { ModelUsage, ModelAnimation, EvaluationType } from '@/types/evaluation'

interface WizardStore {
  /** 向导是否活跃 */
  isActive: boolean
  /** 当前步骤 (0=用途, 1=动效, 2=上传) */
  step: number
  /** 已选模型用途 */
  usage: ModelUsage | null
  /** 已选动效类型 */
  animation: ModelAnimation | null
  /** 是否已锁定（进入3D视图后） */
  locked: boolean

  setStep: (step: number) => void
  setUsage: (usage: ModelUsage) => void
  setAnimation: (animation: ModelAnimation) => void
  /** 获取最终 EvaluationType */
  getEvaluationType: () => EvaluationType | null
  /** 锁定类型并获取 EvaluationType */
  lockAndGetType: () => EvaluationType | null
  /** 开始向导 */
  startWizard: () => void
  /** 完成向导 */
  finishWizard: () => void
  /** 取消向导 */
  cancelWizard: () => void
  /** 重置（修改类型时） */
  reset: () => void
}

export const useWizardStore = create<WizardStore>()((set, get) => ({
  isActive: false,
  step: 0,
  usage: null,
  animation: null,
  locked: false,

  setStep: (step) => set({ step }),
  setUsage: (usage) => {
    set({ usage, step: 1 })
  },
  setAnimation: (animation) => {
    set({ animation, step: 2 })
  },

  getEvaluationType: () => {
    const { usage, animation } = get()
    if (usage && animation) {
      return `${usage}-${animation}` as EvaluationType
    }
    return null
  },

  lockAndGetType: () => {
    const type = get().getEvaluationType()
    if (type) {
      set({ locked: true, isActive: false })
    }
    return type
  },

  startWizard: () => set({ isActive: true, step: 0, usage: null, animation: null, locked: false }),
  finishWizard: () => set({ isActive: false }),
  cancelWizard: () => set({ isActive: false, step: 0, usage: null, animation: null }),
  reset: () => set({ step: 0, usage: null, animation: null, locked: false, isActive: false }),
}))
