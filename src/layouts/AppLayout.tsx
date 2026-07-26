import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ToastContainer } from '@/components/ui/Toast'

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Outlet />
      </main>
      <LoadingScreen />
      <ToastContainer />
    </div>
  )
}
