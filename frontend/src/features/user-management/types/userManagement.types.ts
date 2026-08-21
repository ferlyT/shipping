import { ROUTES } from '@/lib/constants'

export interface User {
  id: string
  username: string
  fullName: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface RolePermission {
  path: string
  canView: boolean
  isDefault: boolean
}

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

export interface ModuleGroup {
  moduleKey: string
  moduleLabel: string
  accentColor: string
  items: AvailablePath[]
}

export interface DeleteModalState {
  isOpen: boolean
  userId: string
  username: string
  type: 'soft' | 'hard'
}

export interface RestoreModalState {
  isOpen: boolean
  userId: string
  username: string
}

export interface UpdateUserStatusInput {
  isActive: boolean
}

export interface UpdateUserRoleInput {
  role: string
}

export interface SaveRolePermissionsInput {
  permissions: RolePermission[]
}
