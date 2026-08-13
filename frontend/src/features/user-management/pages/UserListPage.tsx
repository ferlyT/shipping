import { useState, useEffect, useMemo } from 'react'
import { RotateCcw, Trash2, Users, Trash, Shield, RefreshCw } from 'lucide-react'
import apiClient from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { SearchBar } from '@/components/ui/SearchBar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { toast } from '@/stores/toastStore'
import { formatDate } from '@/lib/utils'

interface User {
  id: string
  username: string
  fullName: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export default function UserListPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId: string; username: string; type: 'soft' | 'hard' }>({
    isOpen: false,
    userId: '',
    username: '',
    type: 'soft',
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const [restoreModal, setRestoreModal] = useState<{ isOpen: boolean; userId: string; username: string }>({
    isOpen: false,
    userId: '',
    username: '',
  })
  const [isRestoring, setIsRestoring] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const endpoint = viewMode === 'trash' ? '/users/trash' : '/users'
      const [usersRes, rolesRes] = await Promise.all([
        apiClient.get(endpoint),
        apiClient.get('/roles'),
      ])
      setUsers(usersRes.data.data ?? [])
      setRoles(rolesRes.data.data ?? [])
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Gagal memuat data pengguna.'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [viewMode])

  const handleStatusChange = async (userId: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/users/${userId}/status`, { isActive: !currentStatus })
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u)))
      toast.success('Status pengguna berhasil diubah')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Gagal mengubah status pengguna.')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiClient.patch(`/users/${userId}/role`, { role: newRole })
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      toast.success('Peran pengguna berhasil diubah')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Gagal mengubah peran pengguna.')
    }
  }

  const executeDeleteUser = async () => {
    if (!deleteModal.userId) return
    setIsDeleting(true)
    try {
      if (deleteModal.type === 'hard') {
        await apiClient.delete(`/users/${deleteModal.userId}/permanent`)
      } else {
        await apiClient.delete(`/users/${deleteModal.userId}`)
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteModal.userId))
      toast.success(deleteModal.type === 'hard' ? 'Pengguna berhasil dihapus permanen' : 'Pengguna dipindahkan ke tempat sampah')
      setDeleteModal({ isOpen: false, userId: '', username: '', type: 'soft' })
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Gagal menghapus pengguna.')
    } finally {
      setIsDeleting(false)
    }
  }

  const executeRestoreUser = async () => {
    if (!restoreModal.userId) return
    setIsRestoring(true)
    try {
      await apiClient.patch(`/users/${restoreModal.userId}/restore`)
      setUsers((prev) => prev.filter((u) => u.id !== restoreModal.userId))
      toast.success('Pengguna berhasil dipulihkan')
      setRestoreModal({ isOpen: false, userId: '', username: '' })
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Gagal memulihkan pengguna.')
    } finally {
      setIsRestoring(false)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchQuery =
        !searchQuery.trim() ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchRole = selectedRoleFilter === 'all' || u.role.toLowerCase() === selectedRoleFilter.toLowerCase()
      return matchQuery && matchRole
    })
  }, [users, searchQuery, selectedRoleFilter])

  if (isLoading && users.length === 0) return <LoadingSpinner message="Memuat daftar pengguna..." />

  const columns = [
    {
      key: 'username',
      header: 'Pengguna',
      fixed: true,
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white font-bold flex items-center justify-center text-xs shrink-0 font-[var(--font-display)] uppercase">
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
            onChange={(e) => handleRoleChange(user.id, e.target.value)}
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
          {user.isActive ? 'Aktif' : 'Suspended'}
        </Badge>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Terakhir Login',
      render: (user: User) => (
        <span className="text-xs text-[var(--color-secondary)] font-mono">
          {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Belum pernah'}
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
              title="Pulihkan Pengguna"
              onClick={() => setRestoreModal({ isOpen: true, userId: user.id, username: user.username })}
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Hapus Permanen"
              onClick={() => setDeleteModal({ isOpen: true, userId: user.id, username: user.username, type: 'hard' })}
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
              onClick={() => handleStatusChange(user.id, user.isActive)}
            >
              {user.isActive ? 'Suspend' : 'Aktifkan'}
            </Button>
            <button
              type="button"
              title="Hapus ke tempat sampah"
              onClick={() => setDeleteModal({ isOpen: true, userId: user.id, username: user.username, type: 'soft' })}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
    },
  ]

  return (
    <div className="p-4 sm:p-6 w-full space-y-6 animate-fadeIn pb-24 font-[var(--font-body)]">
      <PageHeader
        title={t('nav.userManagement')}
        subtitle="Kelola pengguna, status lisensi, dan otorisasi peran pengguna sistem"
        breadcrumbs={[
          { label: t('module.admin'), path: ROUTES.USERS },
          { label: t('nav.userManagement') },
        ]}
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* Pill Tab Active vs Trash */}
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
                Pengguna Aktif
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
                Tempat Sampah
              </button>
            </div>

            <Button variant="secondary" onClick={fetchData} className="shrink-0">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      {/* Filter & Toolbar */}
      <div className="card p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari berdasarkan nama atau username..."
          />
        </div>

        {/* Role Pill Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-semibold text-[var(--color-secondary)] mr-1 shrink-0 flex items-center gap-1">
            <Shield size={13} />
            Filter Role:
          </span>
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedRoleFilter === 'all'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] hover:bg-gray-200'
            }`}
          >
            Semua Role ({users.length})
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
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] hover:bg-gray-200'
                }`}
              >
                {r} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* User Table */}
      <div className="card bg-[var(--color-surface)] rounded-xl shadow-xs border border-[var(--color-border)] overflow-hidden">
        <Table
          columns={columns}
          data={filteredUsers}
          keyExtractor={(user) => user.id}
          isLoading={isLoading}
          emptyMessage={
            viewMode === 'trash'
              ? 'Tempat sampah kosong. Tidak ada pengguna yang terhapus.'
              : 'Tidak ada data pengguna yang sesuai dengan filter.'
          }
        />
      </div>

      {/* Confirm Soft & Hard Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.type === 'hard' ? 'Hapus Permanen Pengguna' : 'Pindahkan ke Tempat Sampah'}
        message={
          deleteModal.type === 'hard'
            ? `Apakah Anda yakin ingin menghapus pengguna "${deleteModal.username}" secara permanen? Data tidak dapat dikembalikan lagi.`
            : `Apakah Anda yakin ingin memindahkan pengguna "${deleteModal.username}" ke tempat sampah?`
        }
        confirmText={deleteModal.type === 'hard' ? 'Hapus Permanen' : 'Pindahkan ke Sampah'}
        onConfirm={executeDeleteUser}
        onCancel={() => setDeleteModal({ isOpen: false, userId: '', username: '', type: 'soft' })}
        isLoading={isDeleting}
      />

      {/* Confirm Restore Modal */}
      <ConfirmModal
        isOpen={restoreModal.isOpen}
        title="Pulihkan Pengguna"
        message={`Apakah Anda yakin ingin memulihkan pengguna "${restoreModal.username}" kembali aktif?`}
        confirmText="Pulihkan Pengguna"
        onConfirm={executeRestoreUser}
        onCancel={() => setRestoreModal({ isOpen: false, userId: '', username: '' })}
        isLoading={isRestoring}
      />
    </div>
  )
}
