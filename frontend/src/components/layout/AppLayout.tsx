import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUiStore } from '@/stores/uiStore'
import { ToastContainer } from '@/components/ui/ToastContainer'

export function AppLayout() {
  const { isSidebarOpen, setSidebarOpen } = useUiStore()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-neutral)] text-[var(--color-primary)]">
      <ToastContainer />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto animate-fadeIn relative min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
