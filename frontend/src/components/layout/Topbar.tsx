import { Menu, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { getInitials } from '@/lib/utils'

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuthStore()
  
  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-medium hidden sm:block">Logistics View</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-medium text-xs">
            {user?.fullName ? getInitials(user.fullName) : 'AD'}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-[var(--color-primary)] leading-none">{user?.fullName || 'Administrator'}</span>
            <span className="text-xs text-[var(--color-muted)] mt-1 leading-none">{user?.role || 'Admin'}</span>
          </div>
        </div>
        
        <div className="h-6 w-px bg-[var(--color-border)] hidden sm:block" />
        
        <button
          onClick={logout}
          className="flex items-center gap-2 p-2 text-sm font-medium text-[var(--color-secondary)] hover:text-[var(--color-tertiary)] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
