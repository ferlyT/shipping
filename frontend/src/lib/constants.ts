// ATURAN: Semua konstanta aplikasi didefinisikan di sini
// DILARANG: string literal route/path di komponen manapun

export const ROUTES = {
  LOGIN: '/mshipping/login',
  REGISTER: '/mshipping/register',
  DASHBOARD: '/mshipping/dashboard',
  CUSTOMERS: '/mshipping/customers',
  USERS: '/mshipping/users',
  ROLES: '/mshipping/roles',
  SHIPMENTS: '/mshipping/shipments',
  SHIPMENT_DETAIL: (id: string) => `/mshipping/shipments/${id}`,
  SHIPMENT_BATCHES: '/mshipping/shipment-batches',
  SHIPMENTS_LIST: '/mshipping/shipments/list',
  DELIVERY_ORDERS: '/mshipping/delivery-orders',
  DELIVERY_DETAIL: (id: string) => `/mshipping/delivery-orders/${id}`,
  BILLING: '/mshipping/billing',
  BILLING_DETAIL: (id: string) => `/mshipping/billing/${id}`,
} as const

export const PAGE_SIZES = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 20

export const DEBOUNCE_DELAY = 400 // ms, untuk search input
