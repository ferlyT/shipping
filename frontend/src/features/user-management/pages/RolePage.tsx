import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ROUTES } from '@/lib/constants'
import { useRoleList } from '../hooks'
import { RoleSidebar, RolePermissionMatrix } from '../components'

export default function RolePage() {
  const {
    t,
    roles,
    selectedRole,
    setSelectedRole,
    rolePermissions,
    defaultPath,
    setDefaultPath,
    isLoadingRoles,
    isLoadingPerms,
    isSaving,
    searchQuery,
    setSearchQuery,
    newRoleName,
    setNewRoleName,
    isCreatingRole,
    handleSave,
    handleCreateRole,
    handleToggleModule,
    handleToggleSinglePath,
    groupedModules,
  } = useRoleList()

  if (isLoadingRoles) {
    return <LoadingSpinner message={t('common.loading')} />
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      <PageHeader
        title={t('roles.title')}
        subtitle={t('roles.subtitle')}
        breadcrumbs={[
          { label: t('module.admin'), path: ROUTES.ROLES },
          { label: t('nav.roleManagement') },
          { label: selectedRole ? selectedRole.toUpperCase() : t('roles.roleList') },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel Kiri: Daftar Role */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <RoleSidebar
            roles={roles}
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            newRoleName={newRoleName}
            setNewRoleName={setNewRoleName}
            onCreateRole={handleCreateRole}
            isCreatingRole={isCreatingRole}
          />
        </div>

        {/* Panel Kanan: Matriks Permission Role */}
        <div className="lg:col-span-8 xl:col-span-9">
          <RolePermissionMatrix
            selectedRole={selectedRole}
            isLoadingPerms={isLoadingPerms}
            isSaving={isSaving}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            groupedModules={groupedModules}
            rolePermissions={rolePermissions}
            defaultPath={defaultPath}
            setDefaultPath={setDefaultPath}
            onToggleModule={handleToggleModule}
            onToggleSinglePath={handleToggleSinglePath}
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  )
}
