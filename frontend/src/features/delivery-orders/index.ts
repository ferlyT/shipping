export { default as DashboardPage } from './pages/DashboardPage'
export { default as InventoryPage } from './pages/InventoryPage'
export { default as ListPage } from './pages/ListPage'
export { default as DetailPage } from './pages/DetailPage'
export { default as PrintPage } from './pages/PrintPage'
export { default as MonitoringPage } from './pages/MonitoringPage'
export { DeliveryConfirmModal } from './components/DeliveryConfirmModal'

// Backward-compatibility aliases
export { default as DeliveryOrdersPage } from './pages/DashboardPage'
export { default as DeliveryOrdersInventoryPage } from './pages/InventoryPage'
export { default as DeliveryOrdersListPage } from './pages/ListPage'
export { default as DeliveryDetailPage } from './pages/DetailPage'
export { default as DeliveryOrderPrintPage } from './pages/PrintPage'
export { default as DeliveryOrdersMonitoringPage } from './pages/MonitoringPage'

export { deliveryOrdersApi } from './services/delivery-orders.service'
export * from './types/delivery-orders.types'

