import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { toast } from '@/stores/toastStore'
import { userManagementApi } from '../services'
import { AVAILABLE_PATHS, type AvailablePath } from '../types'

export function useRoleList() {
  const { t } = useTranslation()
  const [roles, setRoles] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({})
  const [defaultPath, setDefaultPath] = useState<string>('')
  const [isLoadingRoles, setIsLoadingRoles] = useState(true)
  const [isLoadingPerms, setIsLoadingPerms] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [newRoleName, setNewRoleName] = useState('')
  const [isCreatingRole, setIsCreatingRole] = useState(false)

  const fetchRoles = async () => {
    setIsLoadingRoles(true)
    try {
      const response = await userManagementApi.getRoles()
      const fetchedRoles: string[] = response.data.data ?? []
      setRoles(fetchedRoles)
      if (fetchedRoles.length > 0 && !selectedRole) {
        setSelectedRole(fetchedRoles[0])
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gagal memuat daftar role')
    } finally {
      setIsLoadingRoles(false)
    }
  }

  const fetchRolePermissions = async (role: string) => {
    setIsLoadingPerms(true)
    try {
      const response = await userManagementApi.getRolePermissions(role)
      const perms = response.data.data ?? []
      const permMap: Record<string, boolean> = {}
      let dPath = ''
      perms.forEach((p: any) => {
        permMap[p.path] = p.canView
        if (p.isDefault) dPath = p.path
      })
      setRolePermissions(permMap)
      setDefaultPath(dPath)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gagal memuat hak akses role')
    } finally {
      setIsLoadingPerms(false)
    }
  }

  useEffect(() => {
    fetchRoles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole])

  const handleSave = async () => {
    if (!selectedRole) return
    setIsSaving(true)
    try {
      const payload = AVAILABLE_PATHS.map((ap) => ({
        path: ap.path,
        canView: !!rolePermissions[ap.path],
        isDefault: defaultPath === ap.path,
      }))
      await userManagementApi.saveRolePermissions(selectedRole, payload)
      toast.success(t('roles.saveSuccess', { role: selectedRole }))
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gagal menyimpan konfigurasi role')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newRoleName.trim().toLowerCase()
    if (!trimmed) return
    setIsCreatingRole(true)
    try {
      await userManagementApi.createRole(trimmed)
      setNewRoleName('')
      await fetchRoles()
      setSelectedRole(trimmed)
      toast.success(t('roles.createSuccess', { role: trimmed }))
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? t('roles.createError'))
    } finally {
      setIsCreatingRole(false)
    }
  }

  const handleToggleModule = (items: AvailablePath[], enable: boolean) => {
    setRolePermissions((prev) => {
      const next = { ...prev }
      items.forEach((it) => {
        next[it.path] = enable
      })
      return next
    })
  }

  const handleToggleSinglePath = (path: string, checked: boolean) => {
    setRolePermissions((prev) => ({
      ...prev,
      [path]: checked,
    }))
  }

  const filteredPaths = useMemo(() => {
    if (!searchQuery.trim()) return AVAILABLE_PATHS
    const q = searchQuery.toLowerCase()
    return AVAILABLE_PATHS.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q) ||
        p.moduleLabel.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const groupedModules = useMemo(() => {
    const modulesMap = new Map<string, AvailablePath[]>()
    for (const item of filteredPaths) {
      const existing = modulesMap.get(item.module) ?? []
      existing.push(item)
      modulesMap.set(item.module, existing)
    }
    return Array.from(modulesMap.entries()).map(([moduleKey, items]) => ({
      moduleKey,
      moduleLabel: items[0].moduleLabel,
      accentColor: items[0].accentColor,
      items,
    }))
  }, [filteredPaths])

  return {
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
  }
}
