import { Users, Trash, RefreshCw, Shield } from 'lucide-react'
import { SearchBar } from '@/components/ui/SearchBar'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'
import type { User } from '../types'

interface UserToolbarProps {
  viewMode: 'active' | 'trash'
  setViewMode: (mode: 'active' | 'trash') => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  roles: string[]
  users: User[]
  selectedRoleFilter: string
  setSelectedRoleFilter: (role: string) => void
  onRefresh: () => void
}

export function UserToolbar({
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  roles,
  users,
  selectedRoleFilter,
  setSelectedRoleFilter,
  onRefresh,
}: UserToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      {/* Top Header Actions (Pill Tab & Refresh) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center p-1 bg-[var(--color-neutral)] rounded-lg border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setViewMode('active')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'active'
                ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {t('users.activeTab')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('trash')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'trash'
                ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            <Trash className="w-3.5 h-3.5" />
            {t('users.trashTab')}
          </button>
        </div>

        <Button variant="secondary" onClick={onRefresh} className="shrink-0">
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('users.searchPlaceholder')}
          />
        </div>

        {/* Role Pill Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-semibold text-[var(--color-secondary)] mr-1 shrink-0 flex items-center gap-1">
            <Shield size={13} />
            {t('users.filterRole')}:
          </span>
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedRoleFilter === 'all'
                ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                : 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]/50'
            }`}
          >
            {t('users.allRoles')} ({users.length})
          </button>
          {roles.map((r) => {
            const count = users.filter((u) => u.role.toLowerCase() === r.toLowerCase()).length
            return (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRoleFilter(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer capitalize ${
                  selectedRoleFilter.toLowerCase() === r.toLowerCase()
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                    : 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]/50'
                }`}
              >
                {r} ({count})
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
