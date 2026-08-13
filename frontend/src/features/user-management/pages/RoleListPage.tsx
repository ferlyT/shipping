import { useState, useEffect, useMemo } from 'react'
import { Plus, Shield, Search, CheckSquare, Square, Save, AlertCircle } from 'lucide-react'
import apiClient from '@/api/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { toast } from '@/stores/toastStore'

export interface AvailablePath {
  path: string
  label: string
  module: 'overview' | 'logistics' | 'finance' | 'masterdata' | 'administrasi'
  moduleLabel: string
  accentColor: string
}

export const AVAILABLE_PATHS: AvailablePath[] = [
  // Overview
  { path: ROUTES.DASHBOARD, label: 'Overview Dashboard', module: 'overview', moduleLabel: 'Overview', accentColor: '#3B82F6' },

  // Logistik
  { path: ROUTES.SHIPMENTS, label: 'Shipment Dashboard', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },
  { path: ROUTES.SHIPMENTS_LIST, label: 'Daftar Shipment', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },
  { path: ROUTES.SHIPMENT_BATCHES, label: 'Batch Marking Dashboard', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },
  { path: ROUTES.SHIPMENT_BATCHES_LIST, label: 'Daftar Batch Marking', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },
  { path: ROUTES.DELIVERY_ORDERS, label: 'Delivery Orders', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },

  // Keuangan
  { path: ROUTES.BILLING, label: 'Billing Dashboard', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.BILLING_TARGET, label: 'Target Bill Hari Ini', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.BILLING_LIST, label: 'Daftar Billing', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.PRICE_LIST, label: 'Price List Dashboard', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.PRICE_LIST_LOOKUP, label: 'Pencarian Master Price List', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.PRICE_LIST_UPLOAD, label: 'Upload Price List', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.PRICE_LIST_HISTORY, label: 'Riwayat Upload Price List', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.CUSTOMER_PRICE_LIST, label: 'Customer Price List', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.CUSTOMER_PRICE_LIST_LOOKUP, label: 'Pencarian Harga Customer', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.CUSTOMER_PRICE_LIST_UPLOAD, label: 'Upload Customer Price List', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },

  // Master Data
  { path: ROUTES.CUSTOMERS, label: 'Customer Master Data', module: 'masterdata', moduleLabel: 'Master Data', accentColor: '#8B5CF6' },

  // Administrasi
  { path: ROUTES.USERS, label: 'User Management', module: 'administrasi', moduleLabel: 'Administrasi', accentColor: '#EC4899' },
  { path: ROUTES.ROLES, label: 'Role Management', module: 'administrasi', moduleLabel: 'Administrasi', accentColor: '#EC4899' },
]

export default function RoleListPage() {
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

  useEffect(() => {
    fetchRoles()
  }, [])

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole)
    }
  }, [selectedRole])

  const fetchRoles = async () => {
    setIsLoadingRoles(true)
    try {
      const response = await apiClient.get('/roles')
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
      const response = await apiClient.get(`/roles/${role}`)
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

  const handleSave = async () => {
    if (!selectedRole) return
    setIsSaving(true)
    try {
      const payload = AVAILABLE_PATHS.map((ap) => ({
        path: ap.path,
        canView: !!rolePermissions[ap.path],
        isDefault: defaultPath === ap.path,
      }))
      await apiClient.put(`/roles/${selectedRole}`, { permissions: payload })
      toast.success(`Hak akses untuk role "${selectedRole}" berhasil diperbarui`)
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
      await apiClient.post(`/roles/${trimmed}`)
      setNewRoleName('')
      await fetchRoles()
      setSelectedRole(trimmed)
      toast.success(`Role "${trimmed}" berhasil dibuat`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gagal membuat role baru. Nama role mungkin sudah ada.')
    } finally {
      setIsCreatingRole(false)
    }
  }

  const filteredPaths = useMemo(() => {
    if (!searchQuery.trim()) return AVAILABLE_PATHS
    const q = searchQuery.toLowerCase()
    return AVAILABLE_PATHS.filter(
      (p) => p.label.toLowerCase().includes(q) || p.path.toLowerCase().includes(q) || p.moduleLabel.toLowerCase().includes(q)
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

  const handleToggleModule = (items: AvailablePath[], enable: boolean) => {
    setRolePermissions((prev) => {
      const next = { ...prev }
      items.forEach((it) => {
        next[it.path] = enable
      })
      return next
    })
  }

  if (isLoadingRoles) return <LoadingSpinner message="Memuat daftar role & modul..." />

  return (
    <div className="p-4 sm:p-6 w-full space-y-6 animate-fadeIn pb-24 font-[var(--font-body)]">
      <PageHeader
        title={t('nav.roleManagement')}
        subtitle="Kelola peran dan matriks hak akses halaman modul ERP"
        breadcrumbs={[
          { label: t('module.admin'), path: ROUTES.ROLES },
          { label: t('nav.roleManagement') },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel Kiri: Daftar Role */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4 sm:p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--color-border)]">
              <h2 className="font-semibold text-base text-[var(--color-primary)] font-[var(--font-display)] flex items-center gap-2">
                <Shield size={18} className="text-[var(--color-tertiary)]" />
                Daftar Peran
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
                      onClick={() => setSelectedRole(role)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
                      }`}
                    >
                      <span className="capitalize">{role}</span>
                      {role === 'admin' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                          Super
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Form Tambah Role */}
            <form onSubmit={handleCreateRole} className="mt-5 pt-4 border-t border-[var(--color-border)] space-y-2.5">
              <label htmlFor="newRoleInput" className="block text-xs font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
                + Role Baru
              </label>
              <div className="flex gap-2">
                <input
                  id="newRoleInput"
                  type="text"
                  placeholder="Nama role (mis. staff)"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="form-input text-xs py-1.5 px-3 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]"
                />
                <Button type="submit" size="sm" variant="secondary" isLoading={isCreatingRole} disabled={!newRoleName.trim()}>
                  <Plus size={14} />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Panel Kanan: Matriks Permission Role */}
        <div className="lg:col-span-3">
          <div className="card p-4 sm:p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs space-y-6">
            {selectedRole ? (
              isLoadingPerms ? (
                <div className="py-20">
                  <LoadingSpinner message={`Memuat konfigurasi hak akses role "${selectedRole}"...`} fullscreen={false} />
                </div>
              ) : (
                <>
                  {/* Header Matriks */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] capitalize">
                          Matriks Hak Akses: {selectedRole}
                        </h2>
                        <Badge variant={selectedRole === 'admin' ? 'warning' : 'info'}>
                          {selectedRole.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--color-secondary)] mt-1">
                        Centang halaman yang diizinkan untuk diakses oleh role ini, dan pilih satu halaman utama (default route).
                      </p>
                    </div>

                    <Button variant="primary" onClick={handleSave} isLoading={isSaving} className="shrink-0">
                      <Save size={15} className="mr-1.5" />
                      Simpan Perubahan
                    </Button>
                  </div>

                  {selectedRole === 'admin' && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
                      <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Role Admin Super:</strong> Pengguna dengan role <code>admin</code> secara sistem selalu memiliki izin akses ke seluruh halaman aplikasi. Konfigurasi ini disimpan untuk referensi dan pengalihan ke default route.
                      </div>
                    </div>
                  )}

                  {/* Toolbar Pencarian */}
                  <div className="relative max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
                    <input
                      type="text"
                      placeholder="Cari halaman atau modul..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="form-input py-1.5 pl-9 pr-3 text-xs w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)]"
                    />
                  </div>

                  {/* Daftar Modul & Sub-Halaman */}
                  <div className="space-y-6">
                    {groupedModules.map(({ moduleKey, moduleLabel, accentColor, items }) => {
                      const allChecked = items.every((it) => !!rolePermissions[it.path])
                      return (
                        <div key={moduleKey} className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                          {/* Header Modul */}
                          <div className="px-4 py-3 bg-[var(--color-neutral)] border-b border-[var(--color-border)] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                              <span className="font-semibold text-xs uppercase tracking-wider text-[var(--color-primary)] font-[var(--font-display)]">
                                {moduleLabel}
                              </span>
                              <Badge variant="default">{items.length} Halaman</Badge>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleModule(items, !allChecked)}
                                className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                {allChecked ? <Square size={13} /> : <CheckSquare size={13} />}
                                {allChecked ? 'Batal Semua' : 'Pilih Semua'}
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
                                      onChange={(e) =>
                                        setRolePermissions((prev) => ({
                                          ...prev,
                                          [item.path]: e.target.checked,
                                        }))
                                      }
                                      className="w-4 h-4 mt-0.5 sm:mt-0 rounded accent-[var(--color-tertiary)] cursor-pointer"
                                    />
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-[var(--color-primary)]">{item.label}</div>
                                      <div className="text-xs font-mono text-[var(--color-secondary)] truncate">{item.path}</div>
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
                                    <span>{isDefault ? 'Default Page' : 'Jadikan Default'}</span>
                                  </label>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}

                    {groupedModules.length === 0 && (
                      <div className="text-center py-10 text-xs text-[var(--color-secondary)]">
                        Tidak ada halaman yang cocok dengan kata kunci pencarian.
                      </div>
                    )}
                  </div>
                </>
              )
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-[var(--color-secondary)] text-sm">
                Pilih salah satu role di panel sebelah kiri untuk melihat dan mengatur konfigurasi hak akses.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
