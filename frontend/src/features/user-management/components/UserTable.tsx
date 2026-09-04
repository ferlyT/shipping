import { RotateCcw, Trash2 } from 'lucide-react'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDate } from '@/lib/utils'
import type { User, DeleteModalState, RestoreModalState } from '../types'

interface UserTableProps {
  users: User[]
  roles: string[]
  employees?: import('../types').EmployeeOption[]
  isLoading: boolean
  viewMode: 'active' | 'trash'
  onStatusChange: (userId: string, currentStatus: boolean) => void
  onRoleChange: (userId: string, newRole: string) => void
  onEmployeeChange?: (userId: string, fdEmpCode: string | null) => void
  onRequestDelete: (modal: DeleteModalState) => void
  onRequestRestore: (modal: RestoreModalState) => void
}

export function UserTable({
  users,
  roles,
  employees = [],
  isLoading,
  viewMode,
  onStatusChange,
  onRoleChange,
  onEmployeeChange,
  onRequestDelete,
  onRequestRestore,
}: UserTableProps) {
  const { t } = useTranslation()

  const columns = [
    {
      key: 'username',
      header: 'Pengguna',
      fixed: true,
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-bold flex items-center justify-center text-xs shrink-0 font-[var(--font-display)] uppercase">
            {user.username.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[var(--color-primary)] text-sm">{user.username}</div>
            <div className="text-xs text-[var(--color-secondary)] truncate">{user.fullName || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role Peran',
      render: (user: User) =>
        viewMode === 'trash' ? (
          <Badge variant={user.role === 'admin' ? 'warning' : 'info'} className="capitalize">
            {user.role}
          </Badge>
        ) : (
          <select
            value={user.role}
            onChange={(e) => onRoleChange(user.id, e.target.value)}
            className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-tertiary)] cursor-pointer capitalize"
          >
            {roles.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </select>
        ),
    },
    {
      key: 'employee',
      header: 'Karyawan (tbEmployees)',
      render: (user: User) =>
        viewMode === 'trash' ? (
          <span className="text-xs text-[var(--color-secondary)]">
            {user.fdEmpName ? `${user.fdEmpCode} - ${user.fdEmpName}` : '—'}
          </span>
        ) : (
          <select
            value={user.fdEmpCode || ''}
            onChange={(e) => onEmployeeChange?.(user.id, e.target.value || null)}
            className="text-xs font-semibold py-1 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-tertiary)] cursor-pointer max-w-[190px] truncate"
          >
            <option value="">— Belum Dipetakan —</option>
            {employees.map((emp) => (
              <option key={emp.fdEmpCode} value={emp.fdEmpCode}>
                {emp.fdEmpCode} - {emp.fdEmpName}
              </option>
            ))}
          </select>
        ),
    },
    {
      key: 'isActive',
      header: 'Status Sign-in',
      render: (user: User) => (
        <Badge variant={user.isActive ? 'success' : 'warning'}>
          {user.isActive ? t('users.statusActive') : t('users.statusSuspended')}
        </Badge>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Terakhir Login',
      render: (user: User) => (
        <span className="text-xs text-[var(--color-secondary)] font-mono">
          {user.lastLoginAt ? formatDate(user.lastLoginAt) : t('users.neverLoggedIn')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (user: User) =>
        viewMode === 'trash' ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              title={t('users.restore')}
              onClick={() => onRequestRestore({ isOpen: true, userId: user.id, username: user.username })}
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              title={t('users.permanentDelete')}
              onClick={() =>
                onRequestDelete({ isOpen: true, userId: user.id, username: user.username, type: 'hard' })
              }
              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant={user.isActive ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => onStatusChange(user.id, user.isActive)}
            >
              {user.isActive ? t('users.suspend') : t('users.activate')}
            </Button>
            <button
              type="button"
              title={t('users.moveToTrash')}
              onClick={() =>
                onRequestDelete({ isOpen: true, userId: user.id, username: user.username, type: 'soft' })
              }
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
    },
  ]

  return (
    <div className="card bg-[var(--color-surface)] rounded-xl shadow-xs border border-[var(--color-border)] overflow-hidden">
      {/* Mobile Card List View (< sm) */}
      <div className="sm:hidden divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3.5 flex flex-col gap-2.5 bg-[var(--color-surface)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full skeleton-shimmer shrink-0" />
                  <div className="space-y-1">
                    <div className="h-4 w-24 rounded-md skeleton-shimmer" />
                    <div className="h-3 w-32 rounded-md skeleton-shimmer" />
                  </div>
                </div>
                <div className="h-5 w-16 rounded-full skeleton-shimmer shrink-0" />
              </div>
              <div className="h-8 w-full rounded-lg skeleton-shimmer" />
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--color-secondary)]">
            {viewMode === 'trash' ? t('users.emptyTrash') : t('users.emptyData')}
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="p-3.5 flex flex-col gap-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/20 transition-colors">
              {/* User Info Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-bold flex items-center justify-center text-xs shrink-0 font-[var(--font-display)] uppercase">
                    {user.username.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[var(--color-primary)] text-sm truncate">{user.username}</div>
                    <div className="text-[11px] text-[var(--color-secondary)] truncate">{user.fullName || '—'}</div>
                  </div>
                </div>
                <Badge variant={user.isActive ? 'success' : 'warning'} className="shrink-0 text-[10px]">
                  {user.isActive ? t('users.statusActive') : t('users.statusSuspended')}
                </Badge>
              </div>

              {/* Role & Login Row */}
              <div className="flex items-center justify-between gap-2 text-xs bg-[var(--color-neutral)]/50 p-2 rounded-lg border border-[var(--color-border)]/70">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">Role:</span>
                  {viewMode === 'trash' ? (
                    <Badge variant={user.role === 'admin' ? 'warning' : 'info'} className="capitalize text-[10px]">
                      {user.role}
                    </Badge>
                  ) : (
                    <select
                      value={user.role}
                      onChange={(e) => onRoleChange(user.id, e.target.value)}
                      className="text-xs font-semibold py-0.5 px-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] cursor-pointer capitalize"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r} className="capitalize">
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <span className="text-[10px] text-[var(--color-secondary)] font-mono shrink-0">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : t('users.neverLoggedIn')}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-0.5">
                {viewMode === 'trash' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onRequestRestore({ isOpen: true, userId: user.id, username: user.username })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t('users.restore')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete({ isOpen: true, userId: user.id, username: user.username, type: 'hard' })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  </>
                ) : (
                  <>
                    <Button
                      variant={user.isActive ? 'secondary' : 'primary'}
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => onStatusChange(user.id, user.isActive)}
                    >
                      {user.isActive ? t('users.suspend') : t('users.activate')}
                    </Button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete({ isOpen: true, userId: user.id, username: user.username, type: 'soft' })}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-500/20 transition-colors cursor-pointer"
                      title={t('users.moveToTrash')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (>= sm) */}
      <div className="hidden sm:block">
        <Table
          columns={columns}
          data={users}
          keyExtractor={(user) => user.id}
          isLoading={isLoading}
          emptyMessage={viewMode === 'trash' ? t('users.emptyTrash') : t('users.emptyData')}
        />
      </div>
    </div>
  )
}
