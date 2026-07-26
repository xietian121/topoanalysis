import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
