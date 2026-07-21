import { useState, useEffect } from 'react'
import apiClient from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { toast } from '@/stores/toastStore'
import { Trash2, RotateCcw, Users, Trash } from 'lucide-react'

interface User {
  id: string
  username: string
  fullName: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active')

  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, userId: string, username: string, type: 'soft' | 'hard'}>({
    isOpen: false,
    userId: '',
    username: '',
    type: 'soft'
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [restoreModal, setRestoreModal] = useState<{isOpen: boolean, userId: string, username: string}>({
    isOpen: false,
    userId: '',
    username: ''
  })
  const [isRestoring, setIsRestoring] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const endpoint = viewMode === 'trash' ? '/users/trash' : '/users'
      const [usersRes, rolesRes] = await Promise.all([
        apiClient.get(endpoint),
        apiClient.get('/roles')
      ])
      setUsers(usersRes.data.data)
      setRoles(rolesRes.data.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data.')
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
      setUsers(users.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u))
      toast.success('Status pengguna berhasil diubah')
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Gagal mengubah status pengguna.')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiClient.patch(`/users/${userId}/role`, { role: newRole })
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success('Peran pengguna berhasil diubah')
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Gagal mengubah peran pengguna.')
    }
  }

  const promptDeleteUser = (userId: string, username: string, type: 'soft' | 'hard' = 'soft') => {
    setDeleteModal({ isOpen: true, userId, username, type })
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
      setUsers(users.filter(u => u.id !== deleteModal.userId))
      toast.success('Pengguna berhasil dihapus')
      setDeleteModal({ isOpen: false, userId: '', username: '', type: 'soft' })
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Gagal menghapus pengguna.')
    } finally {
      setIsDeleting(false)
    }
  }

  const promptRestoreUser = (userId: string, username: string) => {
    setRestoreModal({ isOpen: true, userId, username })
  }

  const executeRestoreUser = async () => {
    if (!restoreModal.userId) return
    setIsRestoring(true)
    try {
      await apiClient.patch(`/users/${restoreModal.userId}/restore`)
      setUsers(users.filter(u => u.id !== restoreModal.userId))
      toast.success('Pengguna berhasil dipulihkan')
      setRestoreModal({ isOpen: false, userId: '', username: '' })
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Gagal memulihkan pengguna.')
    } finally {
      setIsRestoring(false)
    }
  }

  const columns = [
    {
      key: 'username',
      header: 'Username',
      fixed: true,
      render: (user: User) => <span className="font-medium">{user.username}</span>,
    },
    {
      key: 'fullName',
      header: 'Full Name',
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => (
        viewMode === 'trash' ? (
          <span className="capitalize">{user.role}</span>
        ) : (
          <select
            value={user.role}
            onChange={(e) => handleRoleChange(user.id, e.target.value)}
            className="text-sm border-gray-300 rounded-md py-1 px-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
          >
            {roles.map(r => (
              <option key={r} value={r} className="capitalize">{r}</option>
            ))}
          </select>
        )
      )
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (user: User) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {user.isActive ? 'Aktif' : 'Pending/Suspended'}
        </span>
      )
    },
    {
      key: 'lastLoginAt',
      header: 'Terakhir Login',
      render: (user: User) => user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('id-ID') : '-'
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (user: User) => (
        viewMode === 'trash' ? (
          <div className="flex items-center justify-end gap-2">
            <button
              title="Pulihkan Pengguna"
              onClick={() => promptRestoreUser(user.id, user.username)}
              className="text-green-500 hover:text-green-600 transition-colors focus:outline-none p-1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              title="Hapus Permanen"
              onClick={() => promptDeleteUser(user.id, user.username, 'hard')}
              className="text-red-500 hover:text-red-700 transition-colors focus:outline-none p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Button 
              variant={user.isActive ? "danger" : "primary"} 
              size="sm"
              onClick={() => handleStatusChange(user.id, user.isActive)}
            >
              {user.isActive ? 'Suspend' : 'Approve'}
            </Button>
            <button
              title="Hapus Pengguna"
              onClick={() => promptDeleteUser(user.id, user.username, 'soft')}
              className="text-red-400 hover:text-red-600 transition-colors focus:outline-none"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )
      )
    }
  ]

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-[var(--font-display)] font-medium text-[40px] m-0 mb-1 tracking-[-0.02em] text-[var(--color-primary)]">User Management</h1>
          <p className="text-[var(--color-secondary)]">Kelola akses dan peran pengguna sistem.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 rounded-[var(--radius-md)] border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('active')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all ${viewMode === 'active' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-slate-50'}`}
            >
              <Users className="w-4 h-4" />
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setViewMode('trash')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all ${viewMode === 'trash' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-slate-50'}`}
            >
              <Trash className="w-4 h-4" />
              Sampah
            </button>
          </div>
          <Button variant="secondary" onClick={fetchData} className="w-full sm:w-auto">Refresh</Button>
        </div>
      </div>

      {error && (
        <div className="rounded-[var(--radius-md)] bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-medium text-[var(--color-danger)]">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-[var(--radius-lg)] shadow-sm border border-[var(--color-border)] overflow-x-auto">
        <Table
          columns={columns}
          data={users}
          keyExtractor={(user) => user.id}
          isLoading={isLoading}
          emptyMessage="Tidak ada data pengguna."
          tableClassName="min-w-[800px]"
        />
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.type === 'hard' ? "Hapus Permanen" : "Hapus Pengguna"}
        message={
          deleteModal.type === 'hard'
            ? `Apakah Anda yakin ingin menghapus pengguna "${deleteModal.username}" secara permanen? Data yang sudah dihapus tidak dapat dikembalikan.`
            : `Apakah Anda yakin ingin menghapus pengguna "${deleteModal.username}"?`
        }
        confirmText={deleteModal.type === 'hard' ? "Hapus Permanen" : "Hapus Pengguna"}
        onConfirm={executeDeleteUser}
        onCancel={() => setDeleteModal({ isOpen: false, userId: '', username: '', type: 'soft' })}
        isLoading={isDeleting}
      />
      
      <ConfirmModal
        isOpen={restoreModal.isOpen}
        title="Pulihkan Pengguna"
        message={`Apakah Anda yakin ingin memulihkan pengguna "${restoreModal.username}"?`}
        confirmText="Pulihkan Pengguna"
        onConfirm={executeRestoreUser}
        onCancel={() => setRestoreModal({ isOpen: false, userId: '', username: '' })}
        isLoading={isRestoring}
      />
    </div>
  )
}
