import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { isSidebarOpen, setSidebarOpen, isSidebarCollapsed } = useUiStore()

  return (
    <div className="min-h-screen bg-[var(--color-neutral)] text-[var(--color-primary)]">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div 
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "lg:pl-[var(--sidebar-mini-width)]" : "lg:pl-[var(--sidebar-width)]"
        )}
      >
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 p-4 lg:p-8 animate-fadeIn">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
