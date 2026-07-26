import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SidebarNavItem } from './SidebarNavItem'
import { useUIStore } from '@/stores/uiStore'
import { NAV_ITEMS, APP_NAME } from '@/lib/constants'

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <aside
      className={`relative flex shrink-0 flex-col glass border-r border-black/5 transition-[width] duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-[60px]' : 'w-[220px]'
      }`}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/10 text-[11px] font-bold text-text-secondary">
          TE
        </div>
        {!sidebarCollapsed && (
          <span className="font-semibold text-[15px] tracking-tight">{APP_NAME}</span>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-0.5 px-2 py-2">
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.to}
              item={item}
              collapsed={sidebarCollapsed}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* Collapse toggle */}
      <div className="border-t border-black/5 p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-xl py-2 text-text-tertiary hover:bg-black/5 hover:text-text-secondary transition-colors duration-200"
          title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  )
}
