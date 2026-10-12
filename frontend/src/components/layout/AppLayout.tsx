import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUiStore } from '@/stores/uiStore'
import { useVoiceAssistantStore } from '@/stores/voiceAssistantStore'
import { useVoiceAssistantPermission } from '@/hooks/useVoiceAssistantPermission'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { GlobalVoiceHud } from '@/components/ui/GlobalVoiceHud'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export function AppLayout() {
  const { isSidebarOpen, setSidebarOpen, toggleSidebar } = useUiStore()
  const { toggleVoiceMute } = useVoiceAssistantStore()
  const canUseVoice = useVoiceAssistantPermission()

  // Global shortcut Alt+V untuk toggle mikrofon Voice Assistant jika memiliki hak akses role
  useEffect(() => {
    if (!canUseVoice) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const isAltV = e.altKey && (e.key?.toLowerCase() === 'v' || e.code === 'KeyV')
      if (isAltV) {
        // Jangan toggle suara jika sedang disupresi oleh dialog modal lokal
        if (useVoiceAssistantStore.getState().isSuppressed) return
        e.preventDefault()
        e.stopPropagation()
        toggleVoiceMute()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [canUseVoice, toggleVoiceMute])

  return (
    <div className="flex h-screen h-[100dvh] w-screen overflow-hidden bg-[var(--color-neutral)] text-[var(--color-primary)]">
      <ToastContainer />
      {canUseVoice && <GlobalVoiceHud />}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        <Topbar onMenuClick={toggleSidebar} />
        
        <main className="flex-1 overflow-auto animate-fadeIn relative min-w-0">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
