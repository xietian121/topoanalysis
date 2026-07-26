import { NavLink } from 'react-router-dom'
import { NAV_ITEMS, APP_NAME } from '@/lib/constants'

export function Header() {
  return (
    <header className="flex h-12 items-center glass border-b border-black/5 px-4">
      {/* Left: Logo + App name */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-black/[0.08] text-[10px] font-bold text-text-secondary">
          TE
        </div>
        <span className="font-semibold text-[14px] tracking-tight text-text-primary">
          {APP_NAME}
        </span>
      </div>

      {/* Center: Navigation */}
      <nav className="flex items-center gap-1 mx-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-all duration-200 ${
                isActive
                  ? 'bg-black/[0.06] text-text-primary font-medium'
                  : 'text-text-secondary hover:bg-black/[0.04] hover:text-text-primary'
              }`
            }
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Right: placeholder for future actions */}
      <div className="w-[100px] shrink-0" />
    </header>
  )
}
