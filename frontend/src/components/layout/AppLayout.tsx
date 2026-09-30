import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUiStore } from '@/stores/uiStore'
import { useVoiceAssistantStore } from '@/stores/voiceAssistantStore'
import { useVoiceAssistantPermission } from '@/hooks/useVoiceAssistantPermission'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { VoiceAssistantModal } from '@/components/ui/VoiceAssistantModal'

export function AppLayout() {
  const { isSidebarOpen, setSidebarOpen } = useUiStore()
  const { toggleAssistant } = useVoiceAssistantStore()
  const canUseVoice = useVoiceAssistantPermission()

  // Global shortcut Alt+V untuk membuka Voice Assistant jika memiliki hak akses role
  useEffect(() => {
    if (!canUseVoice) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const isAltV = e.altKey && (e.key?.toLowerCase() === 'v' || e.code === 'KeyV')
      if (isAltV) {
        // Jangan buka modal asisten suara global jika sedang disupresi oleh dialog modal lokal
        if (useVoiceAssistantStore.getState().isSuppressed) return
        e.preventDefault()
        e.stopPropagation()
        toggleAssistant()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [canUseVoice, toggleAssistant])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-neutral)] text-[var(--color-primary)]">
      <ToastContainer />
      {canUseVoice && <VoiceAssistantModal />}
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
