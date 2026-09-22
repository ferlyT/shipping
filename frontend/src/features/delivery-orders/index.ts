export { default as DashboardPage } from './pages/DashboardPage'
export { default as InventoryPage } from './pages/InventoryPage'
export { default as ListPage } from './pages/ListPage'
export { default as DetailPage } from './pages/DetailPage'
export { default as PrintPage } from './pages/PrintPage'

// Backward-compatibility aliases
export { default as DeliveryOrdersPage } from './pages/DashboardPage'
export { default as DeliveryOrdersInventoryPage } from './pages/InventoryPage'
export { default as DeliveryOrdersListPage } from './pages/ListPage'
export { default as DeliveryDetailPage } from './pages/DetailPage'
export { default as DeliveryOrderPrintPage } from './pages/PrintPage'

export { deliveryOrdersApi } from './services/delivery-orders.service'
export * from './types/delivery-orders.types'

