export { default as DashboardPage } from './pages/DashboardPage'
export { default as ListPage } from './pages/ListPage'
export { default as DetailPage } from './pages/DetailPage'

// Backward-compatibility aliases
export { default as DeliveryOrdersPage } from './pages/DashboardPage'
export { default as DeliveryOrdersListPage } from './pages/ListPage'
export { default as DeliveryDetailPage } from './pages/DetailPage'

export { deliveryOrdersApi } from './services/delivery-orders.service'
export * from './types/delivery-orders.types'
