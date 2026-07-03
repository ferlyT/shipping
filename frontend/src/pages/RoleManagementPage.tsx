import { useState, useEffect } from 'react'
import apiClient from '@/api/client'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toastStore'

const AVAILABLE_PATHS = [
  { path: '/shipping/dashboard', label: 'Dashboard' },
  { path: '/shipping/customers', label: 'Customers' },
  { path: '/shipping/shipments', label: 'Shipments' },
  { path: '/shipping/shipment-batches', label: 'Batch Marking' },
  { path: '/shipping/delivery-orders', label: 'Delivery Orders' },
  { path: '/shipping/billing', label: 'Billing' }
]

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({})
  const [defaultPath, setDefaultPath] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')

  useEffect(() => {
    fetchRoles()
  }, [])

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole)
    }
  }, [selectedRole])

  const fetchRoles = async () => {
    try {
      const response = await apiClient.get('/roles')
      setRoles(response.data.data)
      if (response.data.data.length > 0 && !selectedRole) {
        setSelectedRole(response.data.data[0])
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Gagal memuat daftar role')
    }
  }

  const fetchRolePermissions = async (role: string) => {
    setIsLoading(true)
    try {
      const response = await apiClient.get(`/roles/${role}`)
      const perms = response.data.data // { path, canView, isDefault }[]
      const permMap: Record<string, boolean> = {}
      let dPath = ''
      perms.forEach((p: any) => {
        permMap[p.path] = p.canView
        if (p.isDefault) dPath = p.path
      })
      setRolePermissions(permMap)
      setDefaultPath(dPath)
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat permission role')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedRole) return
    setIsSaving(true)
    try {
      const payload = AVAILABLE_PATHS.map(ap => ({
        path: ap.path,
        canView: !!rolePermissions[ap.path],
        isDefault: defaultPath === ap.path
      }))
      await apiClient.put(`/roles/${selectedRole}`, { permissions: payload })
      toast.success('Berhasil menyimpan konfigurasi role')
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan konfigurasi role')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return
    try {
      await apiClient.post(`/roles/${newRoleName.trim()}`)
      setNewRoleName('')
      await fetchRoles()
      setSelectedRole(newRoleName.trim())
      toast.success(`Role ${newRoleName.trim()} berhasil dibuat`)
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat role. Mungkin nama sudah ada.')
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-primary)] font-[var(--font-display)]">Role Management</h1>
        <p className="text-[var(--color-secondary)]">Atur hak akses halaman untuk masing-masing peran.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-[var(--radius-lg)] shadow-sm border border-[var(--color-border)]">
          <h2 className="font-medium text-lg mb-4">Daftar Role</h2>
          <ul className="space-y-2">
            {roles.map(role => (
              <li key={role}>
                <button
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left px-3 py-2 rounded-md capitalize ${
                    selectedRole === role ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  {role}
                </button>
              </li>
            ))}
          </ul>
          
          <div className="mt-6 border-t pt-4">
            <input
              type="text"
              placeholder="Nama Role Baru"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md py-2 px-3 mb-2 focus:ring-[var(--color-primary)]"
            />
            <Button size="sm" variant="secondary" className="w-full" onClick={handleCreateRole}>
              Tambah Role
            </Button>
          </div>
        </div>

        <div className="md:col-span-3 bg-white p-6 rounded-[var(--radius-lg)] shadow-sm border border-[var(--color-border)]">
          {selectedRole ? (
            isLoading ? (
              <p>Memuat pengaturan...</p>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h2 className="text-xl font-medium capitalize">Akses untuk: {selectedRole}</h2>
                  <Button variant="primary" onClick={handleSave} isLoading={isSaving}>Simpan Perubahan</Button>
                </div>
                
                {selectedRole === 'admin' && (
                  <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm mb-4">
                    <strong>Catatan:</strong> Role Admin memiliki akses super secara otomatis. Meskipun Anda hapus centang, Admin tetap bisa mengakses halaman (melalui AdminGuard). Namun fitur ini berguna untuk role custom lainnya.
                  </div>
                )}

                <div className="space-y-4">
                  {AVAILABLE_PATHS.map((item) => (
                    <div key={item.path} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 transition-colors">
                      <label className="flex items-center space-x-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={!!rolePermissions[item.path]}
                          onChange={(e) => setRolePermissions(prev => ({ ...prev, [item.path]: e.target.checked }))}
                          className="w-5 h-5 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className="text-sm text-gray-500">{item.path}</div>
                        </div>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer text-sm text-gray-600">
                        <input
                          type="radio"
                          name="defaultRoute"
                          checked={defaultPath === item.path}
                          onChange={() => setDefaultPath(item.path)}
                          disabled={!rolePermissions[item.path]}
                          className="w-4 h-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] disabled:opacity-50"
                        />
                        <span className={!rolePermissions[item.path] ? 'opacity-50' : ''}>Jadikan Default</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Pilih role di sebelah kiri untuk mengatur akses.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
