import apiClient from '@/api/client'
import type { User, RolePermission } from '../types'

export const userManagementApi = {
  // Users APIs
  getUsers: () => apiClient.get<{ data: User[] }>('/users'),
  getTrashUsers: () => apiClient.get<{ data: User[] }>('/users/trash'),
  updateUserStatus: (userId: string, isActive: boolean) =>
    apiClient.patch<{ data: User }>(`/users/${userId}/status`, { isActive }),
  updateUserRole: (userId: string, role: string) =>
    apiClient.patch<{ data: User }>(`/users/${userId}/role`, { role }),
  softDeleteUser: (userId: string) => apiClient.delete(`/users/${userId}`),
  permanentDeleteUser: (userId: string) => apiClient.delete(`/users/${userId}/permanent`),
  restoreUser: (userId: string) => apiClient.patch(`/users/${userId}/restore`),

  // Roles & Permissions APIs
  getRoles: () => apiClient.get<{ data: string[] }>('/roles'),
  createRole: (roleName: string) => apiClient.post(`/roles/${roleName}`),
  getRolePermissions: (role: string) =>
    apiClient.get<{ data: { path: string; canView: boolean; isDefault?: boolean }[] }>(`/roles/${role}`),
  saveRolePermissions: (role: string, permissions: RolePermission[]) =>
    apiClient.put(`/roles/${role}`, { permissions }),
}
