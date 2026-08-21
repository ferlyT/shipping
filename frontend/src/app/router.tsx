import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/lib/constants'
import { AppLayout } from '@/components/layout/AppLayout'

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

  // Always allow admin to pass, or check strictly
  if (user?.role === 'admin') {
    return <Outlet />
  }

  // Check if current path is in the user's permissions
  const hasAccess = user?.permissions?.some(p => {
    if (p === '/*') return true
    return pathname === p || pathname.startsWith(p + '/')
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

  if (user.role === 'admin') {
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
const DeliveryOrdersPage = lazy(() => import('@/features/delivery-orders').then(m => ({ default: m.DeliveryOrdersPage })))
const DeliveryDetailPage = lazy(() => import('@/features/delivery-orders').then(m => ({ default: m.DeliveryDetailPage })))
const BillingDashboardPage = lazy(() => import('@/features/billing').then(m => ({ default: m.BillingDashboardPage })))
const BillingTargetPage    = lazy(() => import('@/features/billing').then(m => ({ default: m.BillingTargetPage })))
const BillingPage        = lazy(() => import('@/features/billing').then(m => ({ default: m.BillingPage })))
const BillingDetailPage  = lazy(() => import('@/features/billing').then(m => ({ default: m.BillingDetailPage })))
const BillingValidationListPage = lazy(() => import('@/features/billing').then(m => ({ default: m.ValidationListPage })))
const BillingValidationDetailPage = lazy(() => import('@/features/billing').then(m => ({ default: m.ValidationDetailPage })))
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
const UserManagementPage = lazy(() => import('@/features/user-management').then(m => ({ default: m.UserManagementPage })))
const RoleManagementPage = lazy(() => import('@/features/user-management').then(m => ({ default: m.RoleManagementPage })))
const AccountPage        = lazy(() => import('@/features/profile').then(m => ({ default: m.AccountPage })))

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading…</div>}>
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
                <Route path={ROUTES.DELIVERY_ORDERS}   element={<DeliveryOrdersPage />} />
                <Route path={ROUTES.DELIVERY_DETAIL(':id')} element={<DeliveryDetailPage />} />
                <Route path={ROUTES.BILLING}           element={<BillingDashboardPage />} />
                <Route path={ROUTES.BILLING_TARGET}    element={<BillingTargetPage />} />
                <Route path={ROUTES.BILLING_LIST}      element={<BillingPage />} />
                <Route path={ROUTES.BILLING_DETAIL(':id')}    element={<BillingDetailPage />} />
                <Route path={ROUTES.BILLING_VALIDATION_LIST}  element={<BillingValidationListPage />} />
                <Route path={ROUTES.BILLING_VALIDATION_DETAIL(':id')} element={<BillingValidationDetailPage />} />
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
              </Route>
              
              {/* Admin Only Routes */}
              <Route element={<AdminGuard />}>
                <Route path={ROUTES.USERS} element={<UserManagementPage />} />
                <Route path={ROUTES.ROLES} element={<RoleManagementPage />} />
              </Route>
            </Route>
          </Route>
          {/* Catch all */}
          <Route path="*" element={<DefaultRouteRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
