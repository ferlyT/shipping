import { PageHeader } from '@/components/ui/PageHeader'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ROUTES } from '@/lib/constants'
import { useUserList } from '../hooks'
import { UserToolbar, UserTable } from '../components'

export default function ListPage() {
  const {
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
  } = useUserList()

  if (isLoading && users.length === 0) {
    return <LoadingSpinner message={t('common.loading')} />
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        breadcrumbs={[
          { label: t('module.admin'), path: ROUTES.USERS },
          { label: t('nav.userManagement') },
          { label: viewMode === 'active' ? t('users.activeTab') : t('users.trashTab') },
        ]}
      />

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      {/* Toolbar & Filter */}
      <UserToolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        roles={roles}
        users={users}
        selectedRoleFilter={selectedRoleFilter}
        setSelectedRoleFilter={setSelectedRoleFilter}
        onRefresh={fetchData}
      />

      {/* User Data Table */}
      <UserTable
        users={filteredUsers}
        roles={roles}
        isLoading={isLoading}
        viewMode={viewMode}
        onStatusChange={handleStatusChange}
        onRoleChange={handleRoleChange}
        onRequestDelete={setDeleteModal}
        onRequestRestore={setRestoreModal}
      />

      {/* Confirm Soft & Hard Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.type === 'hard' ? t('users.hardDeleteModalTitle') : t('users.deleteModalTitle')}
        message={
          deleteModal.type === 'hard'
            ? t('users.hardDeleteModalMessage', { username: deleteModal.username })
            : t('users.deleteModalMessage', { username: deleteModal.username })
        }
        confirmText={deleteModal.type === 'hard' ? t('users.permanentDelete') : t('users.moveToTrash')}
        onConfirm={executeDeleteUser}
        onCancel={() => setDeleteModal({ isOpen: false, userId: '', username: '', type: 'soft' })}
        isLoading={isDeleting}
      />

      {/* Confirm Restore Modal */}
      <ConfirmModal
        isOpen={restoreModal.isOpen}
        title={t('users.restoreModalTitle')}
        message={t('users.restoreModalMessage', { username: restoreModal.username })}
        confirmText={t('users.restore')}
        onConfirm={executeRestoreUser}
        onCancel={() => setRestoreModal({ isOpen: false, userId: '', username: '' })}
        isLoading={isRestoring}
      />
    </div>
  )
}
