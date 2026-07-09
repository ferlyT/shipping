import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { ToastContainer } from '@/components/ui/ToastContainer'

export function AppLayout() {
  const { isSidebarOpen, setSidebarOpen, isSidebarCollapsed } = useUiStore()

  return (
    <div className="h-screen bg-[var(--color-neutral)] text-[var(--color-primary)] overflow-hidden">
      <ToastContainer />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div 
        className={cn(
          "flex flex-col h-screen transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "lg:pl-[var(--sidebar-mini-width)]" : "lg:pl-[var(--sidebar-width)]"
        )}
      >
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-auto animate-fadeIn relative">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
