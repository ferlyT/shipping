export { default as ShipmentsDashboardPage } from './pages/DashboardPage'
export { default as ShipmentsListPage } from './pages/ListPage'
export { shipmentsApi } from './services/shipments.service'
export type * from './types/shipments.types'

// Utilities
export { getCommodityIcon, type CommodityIconInfo } from './utils/commodity'
export { STATUS_STYLES, STATUS_ORDER } from './utils/status'

// Hooks
export { useShipmentsList } from './hooks/useShipmentsList'
export { useShipmentDetail } from './hooks/useShipmentDetail'
export { useShipmentDimensions, useShipmentMultiDimensions } from './hooks/useShipmentDimensions'
export { useShipmentKpis } from './hooks/useShipmentKpis'

// Domain components
export { StatusBadge } from './components/StatusBadge'
export { Pill } from './components/Pill'
export { BranchPicker } from './components/BranchPicker'
export { ShipmentFilterBar } from './components/ShipmentFilterBar'
export { ShipmentToolbar } from './components/ShipmentToolbar'
export { ShipmentTableView } from './components/ShipmentTableView'
export { ShipmentCompactView } from './components/ShipmentCompactView'
export { ShipmentGridView } from './components/ShipmentGridView'
export { ShipmentDetailModal } from './components/ShipmentDetailModal'

// Detail Sub-components
export { ShipmentInfoTab } from './components/detail/ShipmentInfoTab'
export { ShipmentDimensionsTab } from './components/detail/ShipmentDimensionsTab'
export { ShipmentTimelineTab } from './components/detail/ShipmentTimelineTab'
export { DimItemCard, calcTotalVolume, type DimRow } from './components/detail/DimItemCard'
export { MetricCard } from './components/detail/MetricCard'
export { CopyField } from './components/detail/CopyField'
