import { LayoutDashboard, Upload, ClipboardCheck, Swords, BarChart4 } from 'lucide-react'
import type { NavItem } from '@/types/viewer'

export const APP_NAME = 'TopoEval'
export const APP_TITLE = 'AI 3D 拓扑质量评测'
export const APP_DESCRIPTION = '自动检测 + 专业评估，让拓扑质量可量化、可对比、可改进'

export const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: '首页', to: '/' },
  { icon: Upload, label: '开始评测', to: '/eval/wizard' },
  { icon: Swords, label: '模型对比', to: '/compare' },
  { icon: ClipboardCheck, label: '评测标准', to: '/standards' },
  { icon: BarChart4, label: '数据分析', to: '/analytics' },
]

export const ACCEPTED_MODEL_FORMATS = ['.obj', '.fbx']
export const MAX_FILE_SIZE_MB = 100
export const HIGH_POLY_MAX_FILE_SIZE_MB = 1024
