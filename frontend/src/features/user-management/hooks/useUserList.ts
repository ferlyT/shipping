import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { toast } from '@/stores/toastStore'
import { userManagementApi } from '../services'
import type { User, DeleteModalState, RestoreModalState } from '../types'

export function useUserList() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')

  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    userId: '',
    username: '',
    type: 'soft',
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const [restoreModal, setRestoreModal] = useState<RestoreModalState>({
    isOpen: false,
    userId: '',
    username: '',
  })
  const [isRestoring, setIsRestoring] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        viewMode === 'trash'
          ? userManagementApi.getTrashUsers()
          : userManagementApi.getUsers(),
        userManagementApi.getRoles(),
      ])
      setUsers(usersRes.data.data ?? [])
      setRoles(rolesRes.data.data ?? [])
    } catch (err: any) {
      const msg = err.response?.data?.message ?? t('common.noData')
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  const handleStatusChange = async (userId: string, currentStatus: boolean) => {
    try {
      await userManagementApi.updateUserStatus(userId, !currentStatus)
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u))
      )
      toast.success(t('users.statusSuccess'))
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Gagal mengubah status pengguna.')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await userManagementApi.updateUserRole(userId, newRole)
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      )
      toast.success(t('users.roleSuccess'))
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Gagal mengubah peran pengguna.')
    }
  }

  const executeDeleteUser = async () => {
    if (!deleteModal.userId) return
    setIsDeleting(true)
    try {
      if (deleteModal.type === 'hard') {
        await userManagementApi.permanentDeleteUser(deleteModal.userId)
        toast.success(t('users.hardDeleteSuccess'))
      } else {
        await userManagementApi.softDeleteUser(deleteModal.userId)
        toast.success(t('users.deleteSuccess'))
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteModal.userId))
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
      await userManagementApi.restoreUser(restoreModal.userId)
      setUsers((prev) => prev.filter((u) => u.id !== restoreModal.userId))
      toast.success(t('users.restoreSuccess'))
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
      const matchRole =
        selectedRoleFilter === 'all' ||
        u.role.toLowerCase() === selectedRoleFilter.toLowerCase()
      return matchQuery && matchRole
    })
  }, [users, searchQuery, selectedRoleFilter])

  return {
    t,
    users,
    roles,
    filteredUsers,
    isLoading,
    error,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    selectedRoleFilter,
    setSelectedRoleFilter,
    deleteModal,
    setDeleteModal,
    isDeleting,
    restoreModal,
    setRestoreModal,
    isRestoring,
    fetchData,
    handleStatusChange,
    handleRoleChange,
    executeDeleteUser,
    executeRestoreUser,
  }
}
