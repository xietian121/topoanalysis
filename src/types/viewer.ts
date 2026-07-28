import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  icon: LucideIcon
  label: string
  to: string
}

export type RenderMode = 'solid' | 'wireframe' | 'wireframe-solid'

export interface ViewerSettings {
  renderMode: RenderMode
  showGrid: boolean
  autoRotate: boolean
  materialColor: string
  materialRoughness: number
  materialMetalness: number
  /** 是否显示对称性辅助面 */
  showSymmetry: boolean
  /** 对称面轴方向：x=左右(YZ平面), y=上下(XZ平面), z=前后(XY平面) */
  symmetryAxis: 'x' | 'y' | 'z'
}
