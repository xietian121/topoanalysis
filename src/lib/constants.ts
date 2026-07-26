import { LayoutDashboard, Box, ClipboardCheck, BarChart4 } from 'lucide-react'
import type { NavItem } from '@/types/viewer'

export const APP_NAME = 'TopoEval'
export const APP_TITLE = 'AI 3D 拓扑评测工具'
export const APP_DESCRIPTION = '评估AI生成低多边形模型的拓扑质量 — 自动检测 + 人工评测'

export const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: '首页', to: '/' },
  { icon: Box, label: '模型查看器', to: '/viewer' },
  { icon: ClipboardCheck, label: '评估标准', to: '/standards' },
  { icon: BarChart4, label: '评测历史', to: '/history' },
]

export const ACCEPTED_MODEL_FORMATS = ['.obj', '.fbx']
export const MAX_FILE_SIZE_MB = 100
export const HIGH_POLY_MAX_FILE_SIZE_MB = 1024
