import { Search, Save, CheckSquare, Square, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useTranslation } from '@/hooks/useTranslation'
import type { ModuleGroup, AvailablePath } from '../types'

interface RolePermissionMatrixProps {
  selectedRole: string | null
  isLoadingPerms: boolean
  isSaving: boolean
  searchQuery: string
  setSearchQuery: (q: string) => void
  groupedModules: ModuleGroup[]
  rolePermissions: Record<string, boolean>
  defaultPath: string
  setDefaultPath: (path: string) => void
  onToggleModule: (items: AvailablePath[], enable: boolean) => void
  onToggleSinglePath: (path: string, checked: boolean) => void
  onSave: () => void
}

export function RolePermissionMatrix({
  selectedRole,
  isLoadingPerms,
  isSaving,
  searchQuery,
  setSearchQuery,
  groupedModules,
  rolePermissions,
  defaultPath,
  setDefaultPath,
  onToggleModule,
  onToggleSinglePath,
  onSave,
}: RolePermissionMatrixProps) {
  const { t } = useTranslation()

  if (!selectedRole) return null

  if (isLoadingPerms) {
    return (
      <div className="card p-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs">
        <LoadingSpinner
          message={t('roles.loadingPermissions', { role: selectedRole })}
          fullscreen={false}
        />
      </div>
    )
  }

  return (
    <div className="card p-4 sm:p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs space-y-6">
      {/* Header Matriks */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] capitalize">
              {t('roles.matrixTitle', { role: selectedRole })}
            </h2>
            <Badge variant={selectedRole === 'admin' ? 'warning' : 'info'}>
              {selectedRole.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-[var(--color-secondary)] mt-1">
            {t('roles.matrixSubtitle')}
          </p>
        </div>

        <Button variant="primary" onClick={onSave} isLoading={isSaving} className="shrink-0">
          <Save size={15} className="mr-1.5" />
          {t('roles.saveConfig')}
        </Button>
      </div>

      {/* Filter / Search Bar Modul */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
          <input
            type="text"
            placeholder={t('roles.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs py-1.5 pl-8 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]"
          />
        </div>

        <span className="text-xs text-[var(--color-secondary)]">
          {groupedModules.reduce((acc, m) => acc + m.items.length, 0)} Halaman Terdaftar
        </span>
      </div>

      {/* Daftar Modul & Sub-Halaman */}
      <div className="space-y-4">
        {groupedModules.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--color-secondary)] flex flex-col items-center gap-2">
            <AlertCircle size={20} />
            Tidak ada halaman yang cocok dengan kata kunci pencarian.
          </div>
        ) : (
          groupedModules.map(({ moduleKey, moduleLabel, accentColor, items }) => {
            const allChecked = items.every((it) => !!rolePermissions[it.path])
            return (
              <div
                key={moduleKey}
                className="border border-[var(--color-border)] rounded-xl overflow-hidden shadow-xs"
              >
                {/* Header Modul */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-neutral)] border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                      {moduleLabel}
                    </span>
                    <span className="text-[11px] text-[var(--color-secondary)] font-mono">
                      ({items.filter((it) => !!rolePermissions[it.path]).length}/{items.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleModule(items, !allChecked)}
                      className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {allChecked ? <Square size={13} /> : <CheckSquare size={13} />}
                      {allChecked ? t('roles.deselectAll') : t('roles.selectAll')}
                    </button>
                  </div>
                </div>

                {/* List Halaman */}
                <div className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                  {items.map((item) => {
                    const isChecked = !!rolePermissions[item.path]
                    const isDefault = defaultPath === item.path
                    return (
                      <div
                        key={item.path}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 transition-colors gap-3 ${
                          isChecked ? 'bg-[var(--color-surface)]' : 'bg-gray-50/40 opacity-75'
                        }`}
                      >
                        <label className="flex items-start sm:items-center gap-3 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => onToggleSinglePath(item.path, e.target.checked)}
                            className="w-4 h-4 mt-0.5 sm:mt-0 rounded accent-[var(--color-tertiary)] cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[var(--color-primary)]">
                              {item.label}
                            </div>
                            <div className="text-xs font-mono text-[var(--color-secondary)] truncate">
                              {item.path}
                            </div>
                          </div>
                        </label>

                        <label
                          className={`flex items-center gap-2 cursor-pointer text-xs font-medium shrink-0 px-2.5 py-1 rounded-md border transition-all ${
                            isDefault
                              ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                              : isChecked
                              ? 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border-[var(--color-border)] hover:bg-gray-200'
                              : 'opacity-40 cursor-not-allowed border-transparent'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`defaultRoute-${selectedRole}`}
                            checked={isDefault}
                            onChange={() => setDefaultPath(item.path)}
                            disabled={!isChecked}
                            className="w-3.5 h-3.5 accent-[var(--color-tertiary)] cursor-pointer"
                          />
                          <span>{isDefault ? t('roles.defaultPage') : t('roles.setDefault')}</span>
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
