// ATURAN: Semua konstanta aplikasi didefinisikan di sini
// DILARANG: string literal route/path di komponen manapun

export const ROUTES = {
  LOGIN: '/shipping/login',
  DASHBOARD: '/shipping/dashboard',
  CUSTOMERS: '/shipping/customers',
  SHIPMENTS: '/shipping/shipments',
  SHIPMENT_DETAIL: (id: string) => `/shipping/shipments/${id}`,
  SHIPMENT_BATCHES: '/shipping/shipment-batches',
  DELIVERY_ORDERS: '/shipping/delivery-orders',
  DELIVERY_DETAIL: (id: string) => `/shipping/delivery-orders/${id}`,
  BILLING: '/shipping/billing',
  BILLING_DETAIL: (id: string) => `/shipping/billing/${id}`,
} as const

export const PAGE_SIZES = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 20

export const DEBOUNCE_DELAY = 400 // ms, untuk search input
