import { Menu, LogOut, Bell } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useLangStore } from '@/stores/langStore'
import { useTranslation } from '@/hooks/useTranslation'
import { getInitials } from '@/lib/utils'

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuthStore()
  const { lang, toggleLang } = useLangStore()
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 lg:px-8 shadow-xs">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-neutral)] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-secondary)] hidden sm:inline-block">
          {t('common.systemErp')}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Placeholder */}
        <button
          className="p-2 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors relative"
          title="Notifikasi"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--color-tertiary)]" />
        </button>

        {/* Language Toggle */}
        <button
          onClick={toggleLang}
          title={t('topbar.language')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all duration-200 select-none"
        >
          <span className="text-sm leading-none">{lang === 'id' ? '🇮🇩' : '🇬🇧'}</span>
          <span className="uppercase tracking-wide">{lang}</span>
        </button>

        <div className="hidden sm:flex items-center gap-3 text-sm">
          <div className="h-5 w-px bg-[var(--color-border)]" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-semibold text-xs shadow-sm">
            {user?.fullName ? getInitials(user.fullName) : 'AD'}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[var(--color-primary)] text-xs leading-none">{user?.fullName || 'Administrator'}</span>
            <span className="text-[10px] font-medium text-[var(--color-secondary)] mt-1 leading-none uppercase tracking-wider">{user?.role || 'Admin'}</span>
          </div>
        </div>

        <div className="h-5 w-px bg-[var(--color-border)] hidden sm:block" />

        <button
          onClick={logout}
          className="flex items-center gap-2 p-2 rounded-lg text-sm font-medium text-[var(--color-secondary)] hover:text-[var(--color-tertiary)] hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline text-xs font-semibold">{t('topbar.logout')}</span>
        </button>
      </div>
    </header>
  )
}
