import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ToastContainer } from '@/components/ui/Toast'
import { useComparePoolStore } from '@/stores/comparePoolStore'
import { ModelCompare3DPage } from '@/pages/ModelCompare3DPage'

export function AppLayout() {
  const activeCompareIds = useComparePoolStore((s) => s.activeCompareIds)
  const clearActiveCompare = useComparePoolStore((s) => s.clearActiveCompare)

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Outlet />
      </main>
      <LoadingScreen />
      <ToastContainer />

      {/* Persistent 3D comparison overlay — survives tab switching */}
      {activeCompareIds && (
        <div className="fixed inset-0 z-40 flex flex-col bg-surface-primary">
          <ModelCompare3DPage
            id1={activeCompareIds.id1}
            id2={activeCompareIds.id2}
            onBack={clearActiveCompare}
          />
        </div>
      )}
    </div>
  )
}
