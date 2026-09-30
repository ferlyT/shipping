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
  SHIPMENT_BATCH_MARKING_SIZE: '/mshipping/logistics/shipment-batches/marking-size',
  DELIVERY_ORDERS: '/mshipping/logistics/delivery-orders',
  DELIVERY_ORDERS_INVENTORY: '/mshipping/logistics/delivery-orders/inventory',
  DELIVERY_ORDERS_LIST: '/mshipping/logistics/delivery-orders/list',
  DELIVERY_ORDERS_MONITORING: '/mshipping/logistics/delivery-orders/monitoring',
  DELIVERY_DETAIL: (id: string) => `/mshipping/logistics/delivery-orders/${id}`,
  DELIVERY_PRINT: (id: string, doc?: 'both' | 'sj' | 'ukuran') => {
    const cleanId = (id || '').trim()
    return doc ? `/mshipping/logistics/delivery-orders/${cleanId}/print?doc=${doc}` : `/mshipping/logistics/delivery-orders/${cleanId}/print`
  },
  INSPECTION_REPORTS: '/mshipping/logistics/inspection-reports',

  // Finance
  BILLING: '/mshipping/finance/billing',
  BILLING_TARGET: '/mshipping/finance/billing/target',
  BILLING_LIST: '/mshipping/finance/billing/list',
  BILLING_DETAIL: (id: string) => `/mshipping/finance/billing/${(id || '').trim()}`,
  BILLING_PRINT: (id: string, mode?: 'pdf' | 'matrix') => {
    const cleanId = (id || '').trim()
    return mode ? `/mshipping/finance/billing/${cleanId}/print?mode=${mode}` : `/mshipping/finance/billing/${cleanId}/print`
  },
  BILLING_REPORT_DESIGNER: '/mshipping/finance/billing/report-designer',
  BILLING_VALIDATION_SUMMARY: '/mshipping/finance/billing/validation/summary',
  BILLING_VALIDATION_DETAIL_PATH: '/mshipping/finance/billing/validation',
  BILLING_VALIDATION_LIST: '/mshipping/finance/billing/validation/list',
  BILLING_VALIDATION_DETAIL: (id: string) => `/mshipping/finance/billing/validation/${(id || '').trim()}`,
  BILLING_PAIRING_LOCAL_CHARGE: '/mshipping/finance/billing/pairing-local-charge',

  // Cashier & Pelunasan Piutang
  CASHIER: '/mshipping/finance/cashier',
  CASHIER_LIST: '/mshipping/finance/cashier',
  CASHIER_DETAIL: (id: string) => `/mshipping/finance/cashier/${(id || '').trim()}`,

  // Customer Wallet & Saldo Deposit
  WALLET: '/mshipping/finance/wallet',
  WALLET_LIST: '/mshipping/finance/wallet',

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

  // Commodity Mapping
  COMMODITY_MAPPING: '/mshipping/finance/commodity-mapping',



  // Master Data
  CUSTOMERS: '/mshipping/master/customers',
  CUSTOMERS_TIER: '/mshipping/master/customers/tier',

  // User & Profile
  PROFILE: '/mshipping/profile',

  // Administration
  USERS: '/mshipping/admin/users',
  ROLES: '/mshipping/admin/roles',

  // Tools & Voice Assistant
  VOICE_ASSISTANT: '/mshipping/voice-assistant',
} as const

export const PAGE_SIZES = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 20
export const DEBOUNCE_DELAY = 400 // ms, untuk search input
