// ATURAN: Semua konstanta aplikasi didefinisikan di sini
// DILARANG: string literal route/path di komponen manapun

export const ROUTES = {
  LOGIN: '/mshipping/login',
  REGISTER: '/mshipping/register',
  
  // Overview
  DASHBOARD: '/mshipping/overview/dashboard',
  
  // Logistics
  SHIPMENTS: '/mshipping/logistics/shipments',
  SHIPMENTS_LIST: '/mshipping/logistics/shipments/list',
  SHIPMENT_DETAIL: (id: string) => `/mshipping/logistics/shipments/${id}`,
  SHIPMENT_BATCHES: '/mshipping/logistics/shipment-batches',
  SHIPMENT_BATCHES_LIST: '/mshipping/logistics/shipment-batches/list',
  DELIVERY_ORDERS: '/mshipping/logistics/delivery-orders',
  DELIVERY_DETAIL: (id: string) => `/mshipping/logistics/delivery-orders/${id}`,

  // Finance
  BILLING: '/mshipping/finance/billing',
  BILLING_TARGET: '/mshipping/finance/billing/target',
  BILLING_LIST: '/mshipping/finance/billing/list',
  BILLING_DETAIL: (id: string) => `/mshipping/finance/billing/${id}`,
  BILLING_VALIDATION_LIST: '/mshipping/finance/billing/validation/list',
  BILLING_VALIDATION_DETAIL: (id: string) => `/mshipping/finance/billing/validation/${id}`,

  // Price List
  PRICE_LIST: '/mshipping/finance/price-list',
  PRICE_LIST_LOOKUP: '/mshipping/finance/price-list/lookup',
  PRICE_LIST_UPLOAD: '/mshipping/finance/price-list/upload',
  PRICE_LIST_HISTORY: '/mshipping/finance/price-list/history',
  PRICE_LIST_DETAIL: (id: string | number) => `/mshipping/finance/price-list/uploads/${id}`,

  // Customer Price List
  CUSTOMER_PRICE_LIST: '/mshipping/finance/customer-price-list',
  CUSTOMER_PRICE_LIST_DETAIL: (custCode: string) => `/mshipping/finance/customer-price-list/${custCode}`,
  CUSTOMER_PRICE_LIST_UPLOAD: '/mshipping/finance/customer-price-list/upload',
  CUSTOMER_PRICE_LIST_LOOKUP: '/mshipping/finance/customer-price-list/lookup',



  // Master Data
  CUSTOMERS: '/mshipping/master/customers',

  // User & Profile
  PROFILE: '/mshipping/profile',

  // Administration
  USERS: '/mshipping/admin/users',
  ROLES: '/mshipping/admin/roles',
} as const

export const PAGE_SIZES = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 20
export const DEBOUNCE_DELAY = 400 // ms, untuk search input
