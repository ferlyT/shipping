import { Shield, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'

interface RoleSidebarProps {
  roles: string[]
  selectedRole: string | null
  onSelectRole: (role: string) => void
  newRoleName: string
  setNewRoleName: (name: string) => void
  onCreateRole: (e: React.FormEvent) => void
  isCreatingRole: boolean
}

export function RoleSidebar({
  roles,
  selectedRole,
  onSelectRole,
  newRoleName,
  setNewRoleName,
  onCreateRole,
  isCreatingRole,
}: RoleSidebarProps) {
  const { t } = useTranslation()

  return (
    <div className="card p-4 sm:p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
        <h2 className="font-semibold text-base text-[var(--color-primary)] font-[var(--font-display)] flex items-center gap-2">
          <Shield size={18} className="text-[var(--color-tertiary)]" />
          {t('roles.roleList')}
        </h2>
        <Badge variant="default">{roles.length} Role</Badge>
      </div>

      <ul className="space-y-1.5">
        {roles.map((role) => {
          const isSelected = selectedRole === role
          return (
            <li key={role}>
              <button
                type="button"
                onClick={() => onSelectRole(role)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xs'
                    : 'text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
                }`}
              >
                <span className="capitalize">{role}</span>
                {role === 'admin' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      isSelected ? 'bg-[var(--color-on-primary)]/20 text-[var(--color-on-primary)]' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    Super
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {/* Form Tambah Role */}
      <form onSubmit={onCreateRole} className="pt-4 border-t border-[var(--color-border)] space-y-2.5">
        <label
          htmlFor="newRoleInput"
          className="block text-xs font-semibold text-[var(--color-secondary)] uppercase tracking-wider"
        >
          {t('roles.newRole')}
        </label>
        <div className="flex gap-2">
          <input
            id="newRoleInput"
            type="text"
            placeholder={t('roles.newRolePlaceholder')}
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            className="form-input text-xs py-1.5 px-3 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]"
          />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            isLoading={isCreatingRole}
            disabled={!newRoleName.trim()}
          >
            <Plus size={14} />
          </Button>
        </div>
      </form>
    </div>
  )
}
