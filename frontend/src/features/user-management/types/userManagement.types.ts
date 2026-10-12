import { ROUTES } from '@/lib/constants'

export interface User {
  id: string
  username: string
  fullName: string
  role: string
  fdEmpCode?: string | null
  fdEmpName?: string | null
  avatarUrl?: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface EmployeeOption {
  fdEmpCode: string
  fdEmpName: string
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
  isPage?: boolean
}

export const AVAILABLE_PATHS: AvailablePath[] = [
  // Overview
  { path: ROUTES.DASHBOARD, label: 'Overview Dashboard', module: 'overview', moduleLabel: 'Overview', accentColor: '#3B82F6' },
  { path: ROUTES.VOICE_ASSISTANT, label: 'Asisten Suara ERP (Voice Assistant)', module: 'overview', moduleLabel: 'Overview', accentColor: '#0EA5E9' },

  // Logistik
  { path: ROUTES.SHIPMENTS, label: 'Shipment Dashboard', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },
  { path: ROUTES.SHIPMENTS_LIST, label: 'Daftar Shipment', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },
  { path: ROUTES.SHIPMENT_BATCHES, label: 'Batch Marking Dashboard', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },
  { path: ROUTES.SHIPMENT_BATCHES_LIST, label: 'Daftar Batch Marking', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },
  { path: ROUTES.DELIVERY_ORDERS, label: 'Delivery Orders Dashboard', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },
  { path: ROUTES.DELIVERY_ORDERS_LIST, label: 'Daftar Surat Jalan', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },
  { path: ROUTES.DELIVERY_ORDERS_MONITORING, label: 'Monitoring SJ Belum Terkirim', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },
  { path: ROUTES.INSPECTION_REPORTS, label: 'Berita Acara Pemeriksaan (BAP)', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },
  { path: ROUTES.DATA_REVISIONS, label: 'Revisi Data & Batalkan Bill', module: 'logistics', moduleLabel: 'Logistik', accentColor: '#F59E0B' },

  // Keuangan
  { path: ROUTES.BILLING_OPERATIONAL, label: 'Billing Dashboard (Operational)', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.BILLING_FINANCE, label: 'Billing Dashboard (Finance)', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.BILLING_TARGET, label: 'Target Bill Hari Ini', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.BILLING_LIST, label: 'Daftar Billing', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.BILLING_VALIDATION_SUMMARY, label: 'Summary Validasi (Modal)', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981', isPage: false },
  { path: ROUTES.BILLING_VALIDATION_DETAIL_PATH, label: 'Validasi Detail (Halaman)', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.BILLING_PAIRING_LOCAL_CHARGE, label: 'Pairing Local Charge', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: '/mshipping/finance/billing/attachments', label: 'Upload Lampiran Invoice', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981', isPage: false },
  { path: '/mshipping/finance/billing/attachments/delete', label: 'Hapus Lampiran Invoice', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981', isPage: false },
  { path: ROUTES.BILLING_VIEW_CONSIGNEE, label: 'Tampilkan Consignee di Invoice', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981', isPage: false },
  { path: ROUTES.PRICE_LIST, label: 'Price List Dashboard', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.PRICE_LIST_LOOKUP, label: 'Pencarian Master Price List', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.PRICE_LIST_UPLOAD, label: 'Upload Price List', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.PRICE_LIST_HISTORY, label: 'Riwayat Upload Price List', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.CUSTOMER_PRICE_LIST, label: 'Customer Price List', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.CUSTOMER_PRICE_LIST_LOOKUP, label: 'Pencarian Harga Customer', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.CUSTOMER_PRICE_LIST_UPLOAD, label: 'Upload Customer Price List', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.COMMODITY_MAPPING, label: 'Commodity Mapping', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.CASHIER, label: 'Kasir & Pelunasan Piutang', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.WALLET, label: 'Customer Wallet & Deposit Pelanggan', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.REPORT_OMSET_VOLUME, label: 'Report: Omset & Volume Customer', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },
  { path: ROUTES.REPORT_CARGO_VOLUME, label: 'Report: Rekap Volume & Berat', module: 'finance', moduleLabel: 'Keuangan', accentColor: '#10B981' },

  // Master Data
  { path: ROUTES.CUSTOMERS, label: 'Customer Master Data', module: 'masterdata', moduleLabel: 'Master Data', accentColor: '#8B5CF6' },
  { path: ROUTES.CUSTOMERS_TIER, label: 'Tampilkan Customer Tier & Omzet Tahunan', module: 'masterdata', moduleLabel: 'Master Data', accentColor: '#8B5CF6', isPage: false },

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
