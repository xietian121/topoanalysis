import { NavLink, useLocation } from 'react-router-dom'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { NavItem } from '@/types/viewer'

interface SidebarNavItemProps {
  item: NavItem
  collapsed: boolean
}

export function SidebarNavItem({ item, collapsed }: SidebarNavItemProps) {
  const { pathname } = useLocation()
  const isActive =
    item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)

  const link = (
    <NavLink
      to={item.to}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 ${
        isActive
          ? 'bg-black/[0.06] text-text-primary font-medium'
          : 'text-text-secondary hover:bg-black/[0.04] hover:text-text-primary'
      }`}
    >
      <item.icon
        className={`h-[18px] w-[18px] shrink-0 transition-colors duration-300 ${
          isActive ? 'text-text-primary' : 'text-text-tertiary group-hover:text-text-secondary'
        }`}
      />
      {!collapsed && (
        <span>{item.label}</span>
      )}
      {/* Active indicator dot — subtle, monochrome */}
      {isActive && collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-text-primary/40 rounded-r-full" />
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return link
}
