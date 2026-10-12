import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/lib/constants'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageSkeleton } from '@/components/ui/Skeleton'

export function AdminGuard() {
  const { user } = useAuthStore()

  if (user?.role !== 'admin') {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <Outlet />
}

export function PermissionGuard() {
  const { user } = useAuthStore()
  const { pathname } = useLocation()

  // Always allow admin and superadmin to pass, or check strictly
  if (user?.role === 'admin' || user?.role === 'superadmin') {
    return <Outlet />
  }

  // If user has wildcard permission
  if (user?.permissions?.includes('/*')) {
    return <Outlet />
  }

  // Special check: validation routes require explicit validation permissions
  if (pathname.startsWith('/mshipping/finance/billing/validation')) {
    const hasValAccess = user?.permissions?.some(
      (p) =>
        p === '/mshipping/finance/billing/validation' ||
        p === '/mshipping/finance/billing/validation/list' ||
        p === '/mshipping/finance/billing/validation/summary' ||
        pathname === p ||
        pathname.startsWith(p + '/')
    )
    if (!hasValAccess) {
      return <DefaultRouteRedirect />
    }
    return <Outlet />
  }

  // Check if current path is in the user's permissions
  const hasAccess = user?.permissions?.some((p) => {
    if (pathname === p || pathname.startsWith(p + '/')) return true
    if (p.startsWith('/mshipping/finance/billing') && pathname.startsWith('/mshipping/finance/billing')) return true
    if (p.startsWith('/mshipping/finance/cashier') && pathname.startsWith('/mshipping/finance/cashier')) return true
    if (p.startsWith('/mshipping/logistics/shipments') && pathname.startsWith('/mshipping/logistics/shipments')) return true
    if ((p.startsWith('/mshipping/logistics/shipment-batches') || p.startsWith('/mshipping/shipment-batches')) && pathname.startsWith('/mshipping/logistics/shipment-batches')) return true
    if ((p.startsWith('/mshipping/logistics/delivery-orders') || p.startsWith('/mshipping/delivery-orders')) && pathname.startsWith('/mshipping/logistics/delivery-orders')) return true
    if ((p.startsWith('/mshipping/logistics/inspection-reports') || p.startsWith('/mshipping/inspection-reports')) && pathname.startsWith('/mshipping/logistics/inspection-reports')) return true
    if ((p.startsWith('/mshipping/logistics/data-revisions') || p.startsWith('/mshipping/data-revisions')) && pathname.startsWith('/mshipping/logistics/data-revisions')) return true
    return false
  })

  if (!hasAccess) {
    return <DefaultRouteRedirect />
  }

  return <Outlet />
}

export function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <Outlet /> : <Navigate to={ROUTES.LOGIN} replace />
}

export function DefaultRouteRedirect() {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user.role === 'admin' || user.role === 'superadmin') {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  if (user.defaultRoute) {
    return <Navigate to={user.defaultRoute} replace />
  }

  // Fallback if no default route is set
  if (user.permissions && user.permissions.length > 0) {
    return <Navigate to={user.permissions[0]} replace />
  }

  // If no permissions at all, stay on a blank or unauthorized page
  return (
    <div className="flex h-screen items-center justify-center text-gray-500">
      Anda tidak memiliki izin untuk melihat halaman manapun. Silakan hubungi Administrator.
    </div>
  )
}

// Lazy load pages
const LoginPage          = lazy(() => import('@/features/auth').then(m => ({ default: m.LoginPage })))
const RegisterPage       = lazy(() => import('@/features/auth').then(m => ({ default: m.RegisterPage })))
const DashboardPage      = lazy(() => import('@/features/dashboard').then(m => ({ default: m.DashboardPage })))
const CustomersPage      = lazy(() => import('@/features/customers').then(m => ({ default: m.CustomersPage })))
const ShipmentsDashboardPage = lazy(() => import('@/features/shipments').then(m => ({ default: m.ShipmentsDashboardPage })))
const ShipmentsListPage  = lazy(() => import('@/features/shipments').then(m => ({ default: m.ShipmentsListPage })))
const ShipmentBatchesDashboardPage = lazy(() => import('@/features/shipment-batches').then(m => ({ default: m.ShipmentBatchesDashboardPage })))
const ShipmentBatchesListPage = lazy(() => import('@/features/shipment-batches').then(m => ({ default: m.ShipmentBatchesListPage })))
const ShipmentBatchesMarkingSizePage = lazy(() => import('@/features/shipment-batches').then(m => ({ default: m.MarkingSizePage })))
const DeliveryOrdersDashboardPage = lazy(() => import('@/features/delivery-orders').then(m => ({ default: m.DashboardPage })))
const DeliveryOrdersInventoryPage = lazy(() => import('@/features/delivery-orders').then(m => ({ default: m.InventoryPage })))
const DeliveryOrdersListPage = lazy(() => import('@/features/delivery-orders').then(m => ({ default: m.ListPage })))
const DeliveryOrdersMonitoringPage = lazy(() => import('@/features/delivery-orders').then(m => ({ default: m.MonitoringPage })))
const DeliveryOrdersDetailPage = lazy(() => import('@/features/delivery-orders').then(m => ({ default: m.DetailPage })))
const DeliveryOrderPrintPage = lazy(() => import('@/features/delivery-orders').then(m => ({ default: m.DeliveryOrderPrintPage })))
const BillingDashboardPage = lazy(() => import('@/features/billing').then(m => ({ default: m.BillingDashboardPage })))
const BillingTargetPage    = lazy(() => import('@/features/billing').then(m => ({ default: m.BillingTargetPage })))
const BillingPage        = lazy(() => import('@/features/billing').then(m => ({ default: m.BillingPage })))
const BillingDetailPage  = lazy(() => import('@/features/billing').then(m => ({ default: m.BillingDetailPage })))
const BillingValidationListPage = lazy(() => import('@/features/billing').then(m => ({ default: m.ValidationListPage })))
const BillingValidationDetailPage = lazy(() => import('@/features/billing').then(m => ({ default: m.ValidationDetailPage })))
const BillingPrintPage = lazy(() => import('@/features/billing').then(m => ({ default: m.BillingPrintPage })))
const BillingReportDesignerPage = lazy(() => import('@/features/billing').then(m => ({ default: m.BillingReportDesignerPage })))
const BillingPairingLocalChargePage = lazy(() => import('@/features/billing').then(m => ({ default: m.BillingPairingLocalChargePage })))
const OmsetVolumeReportPage = lazy(() => import('@/features/billing').then(m => ({ default: m.OmsetVolumeReportPage })))
const CargoVolumeReportPage = lazy(() => import('@/features/billing').then(m => ({ default: m.CargoVolumeReportPage })))
const PriceListDashboardPage = lazy(() => import('@/features/price-list').then(m => ({ default: m.PriceListDashboardPage })))
const PriceListLookupPage    = lazy(() => import('@/features/price-list').then(m => ({ default: m.PriceListLookupPage })))
const PriceListUploadPage    = lazy(() => import('@/features/price-list').then(m => ({ default: m.PriceListUploadPage })))
const PriceListHistoryPage   = lazy(() => import('@/features/price-list').then(m => ({ default: m.PriceListHistoryPage })))
const PriceListDetailPage    = lazy(() => import('@/features/price-list').then(m => ({ default: m.PriceListDetailPage })))
const CustomerPriceListListPage = lazy(() => import('@/features/customer-price-list').then(m => ({ default: m.ListPage })))
const CustomerPriceListUploadPage = lazy(() => import('@/features/customer-price-list').then(m => ({ default: m.UploadPage })))
const CustomerPriceListHistoryPage = lazy(() => import('@/features/customer-price-list').then(m => ({ default: m.HistoryPage })))
const CustomerPriceListDiffPage = lazy(() => import('@/features/customer-price-list').then(m => ({ default: m.DiffPage })))
const CustomerPriceListLookupPage = lazy(() => import('@/features/customer-price-list').then(m => ({ default: m.PriceLookupPage })))
const CommodityMappingPage = lazy(() => import('@/features/commodity-mapping').then(m => ({ default: m.CommodityMappingPage })))
const CashierListPage = lazy(() => import('@/features/cashier').then(m => ({ default: m.ListPage })))
const CashierDetailPage = lazy(() => import('@/features/cashier').then(m => ({ default: m.DetailPage })))
const WalletListPage = lazy(() => import('@/features/wallet').then(m => ({ default: m.ListPage })))
const UserManagementPage = lazy(() => import('@/features/user-management').then(m => ({ default: m.UserManagementPage })))
const RoleManagementPage = lazy(() => import('@/features/user-management').then(m => ({ default: m.RoleManagementPage })))
const AccountPage        = lazy(() => import('@/features/profile').then(m => ({ default: m.AccountPage })))
const InspectionReportsPage = lazy(() => import('@/features/inspection').then(m => ({ default: m.InspectionReportsPage })))
const DataRevisionsListPage = lazy(() => import('@/features/data-revisions').then(m => ({ default: m.DataRevisionsListPage })))
const DataRevisionFormPage = lazy(() => import('@/features/data-revisions').then(m => ({ default: m.DataRevisionFormPage })))
const DataRevisionPrintPage = lazy(() => import('@/features/data-revisions').then(m => ({ default: m.DataRevisionPrintPage })))

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/mshipping" element={<DefaultRouteRedirect />} />
              <Route path={ROUTES.PROFILE} element={<AccountPage />} />
              <Route element={<PermissionGuard />}>
                <Route path={ROUTES.DASHBOARD}         element={<DashboardPage />} />
                <Route path={ROUTES.CUSTOMERS}         element={<CustomersPage />} />
                <Route path={ROUTES.SHIPMENTS}         element={<ShipmentsDashboardPage />} />
                <Route path={ROUTES.SHIPMENTS_LIST}    element={<ShipmentsListPage />} />
                <Route path={ROUTES.SHIPMENT_BATCHES}  element={<ShipmentBatchesDashboardPage />} />
                <Route path={ROUTES.SHIPMENT_BATCHES_LIST}  element={<ShipmentBatchesListPage />} />
                <Route path={ROUTES.SHIPMENT_BATCH_MARKING_SIZE} element={<ShipmentBatchesMarkingSizePage />} />
                <Route path={ROUTES.DELIVERY_ORDERS}   element={<DeliveryOrdersDashboardPage />} />
                <Route path={ROUTES.DELIVERY_ORDERS_INVENTORY} element={<DeliveryOrdersInventoryPage />} />
                <Route path={ROUTES.DELIVERY_ORDERS_LIST} element={<DeliveryOrdersListPage />} />
                <Route path={ROUTES.DELIVERY_ORDERS_MONITORING} element={<DeliveryOrdersMonitoringPage />} />
                <Route path={ROUTES.DELIVERY_DETAIL(':id')} element={<DeliveryOrdersDetailPage />} />
                <Route path={ROUTES.INSPECTION_REPORTS} element={<InspectionReportsPage />} />
                <Route path={ROUTES.DATA_REVISIONS} element={<DataRevisionsListPage />} />
                <Route path={ROUTES.DATA_REVISION_NEW} element={<DataRevisionFormPage />} />
                <Route path={ROUTES.DATA_REVISION_EDIT(':id')} element={<DataRevisionFormPage />} />
                <Route path={ROUTES.BILLING}           element={<BillingDashboardPage />} />
                <Route path={ROUTES.BILLING_TARGET}    element={<BillingTargetPage />} />
                <Route path={ROUTES.BILLING_LIST}      element={<BillingPage />} />
                <Route path={ROUTES.BILLING_DETAIL(':id')}    element={<BillingDetailPage />} />
                <Route path={ROUTES.BILLING_VALIDATION_LIST}  element={<BillingValidationListPage />} />
                <Route path={ROUTES.BILLING_VALIDATION_DETAIL(':id')} element={<BillingValidationDetailPage />} />
                <Route path={ROUTES.BILLING_PAIRING_LOCAL_CHARGE} element={<BillingPairingLocalChargePage />} />
                <Route path={ROUTES.PRICE_LIST}               element={<PriceListDashboardPage />} />
                <Route path={ROUTES.PRICE_LIST_LOOKUP}        element={<PriceListLookupPage />} />
                <Route path={ROUTES.PRICE_LIST_UPLOAD}        element={<PriceListUploadPage />} />
                <Route path={ROUTES.PRICE_LIST_HISTORY}       element={<PriceListHistoryPage />} />
                <Route path={ROUTES.PRICE_LIST_DETAIL(':id')} element={<PriceListDetailPage />} />
                
                {/* Customer Price List */}
                <Route path={ROUTES.CUSTOMER_PRICE_LIST} element={<CustomerPriceListListPage />} />
                <Route path={ROUTES.CUSTOMER_PRICE_LIST_LOOKUP} element={<CustomerPriceListLookupPage />} />
                <Route path={ROUTES.CUSTOMER_PRICE_LIST_UPLOAD} element={<CustomerPriceListUploadPage />} />
                <Route path={ROUTES.CUSTOMER_PRICE_LIST_DETAIL(':custCode')} element={<CustomerPriceListHistoryPage />} />
                <Route path="/mshipping/finance/customer-price-list/uploads/:id" element={<CustomerPriceListDiffPage />} />

                {/* Commodity Mapping */}
                <Route path={ROUTES.COMMODITY_MAPPING} element={<CommodityMappingPage />} />

                {/* Cashier & Pelunasan Piutang */}
                <Route path={ROUTES.CASHIER_LIST} element={<CashierListPage />} />
                <Route path={ROUTES.CASHIER_DETAIL(':id')} element={<CashierDetailPage />} />

                {/* Customer Wallet & Saldo Deposit */}
                <Route path={ROUTES.WALLET} element={<WalletListPage />} />

                {/* Finance Reports */}
                <Route path={ROUTES.REPORT_OMSET_VOLUME} element={<OmsetVolumeReportPage />} />
                <Route path={ROUTES.REPORT_CARGO_VOLUME} element={<CargoVolumeReportPage />} />
              </Route>
              
              {/* Admin Only Routes */}
              <Route element={<AdminGuard />}>
                <Route path={ROUTES.USERS} element={<UserManagementPage />} />
                <Route path={ROUTES.ROLES} element={<RoleManagementPage />} />
                <Route path={ROUTES.BILLING_REPORT_DESIGNER} element={<BillingReportDesignerPage />} />
              </Route>
            </Route>
            {/* Print routes — di luar AppLayout agar tidak ada sidebar/navbar */}
            <Route path={ROUTES.BILLING_PRINT(':id')} element={<BillingPrintPage />} />
            <Route path={ROUTES.DELIVERY_PRINT(':id')} element={<DeliveryOrderPrintPage />} />
            <Route path={ROUTES.DATA_REVISION_PRINT(':id')} element={<DataRevisionPrintPage />} />
          </Route>
          {/* Catch all */}
          <Route path="*" element={<DefaultRouteRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
