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
}
