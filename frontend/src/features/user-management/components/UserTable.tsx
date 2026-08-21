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
  isLoading: boolean
  viewMode: 'active' | 'trash'
  onStatusChange: (userId: string, currentStatus: boolean) => void
  onRoleChange: (userId: string, newRole: string) => void
  onRequestDelete: (modal: DeleteModalState) => void
  onRequestRestore: (modal: RestoreModalState) => void
}

export function UserTable({
  users,
  roles,
  isLoading,
  viewMode,
  onStatusChange,
  onRoleChange,
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
      <Table
        columns={columns}
        data={users}
        keyExtractor={(user) => user.id}
        isLoading={isLoading}
        emptyMessage={viewMode === 'trash' ? t('users.emptyTrash') : t('users.emptyData')}
      />
    </div>
  )
}
