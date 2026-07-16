import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AdminGuard } from './AdminGuard'
import { PermissionGuard } from './PermissionGuard'
import { DefaultRouteRedirect } from './DefaultRouteRedirect'
import { AppLayout } from '@/components/layout/AppLayout'
import { ROUTES } from '@/lib/constants'

// Lazy load pages
import { lazy, Suspense } from 'react'
const LoginPage          = lazy(() => import('@/pages/LoginPage'))
const RegisterPage       = lazy(() => import('@/pages/RegisterPage'))
const DashboardPage      = lazy(() => import('@/pages/DashboardPage'))
const CustomersPage      = lazy(() => import('@/pages/CustomersPage'))
const ShipmentsDashboardPage = lazy(() => import('@/pages/ShipmentsDashboardPage'))
const ShipmentsListPage  = lazy(() => import('@/pages/ShipmentsListPage'))
const ShipmentBatchesDashboardPage = lazy(() => import('@/pages/ShipmentBatchesDashboardPage'))
const ShipmentBatchesListPage = lazy(() => import('@/pages/ShipmentBatchesListPage'))
const DeliveryOrdersPage = lazy(() => import('@/pages/DeliveryOrdersPage'))
const DeliveryDetailPage = lazy(() => import('@/pages/DeliveryDetailPage'))
const BillingPage        = lazy(() => import('@/pages/BillingPage'))
const BillingDetailPage  = lazy(() => import('@/pages/BillingDetailPage'))
const UserManagementPage = lazy(() => import('@/pages/UserManagementPage'))
const RoleManagementPage = lazy(() => import('@/pages/RoleManagementPage'))

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
              <Route element={<PermissionGuard />}>
                <Route path={ROUTES.DASHBOARD}         element={<DashboardPage />} />
                <Route path={ROUTES.CUSTOMERS}         element={<CustomersPage />} />
                <Route path={ROUTES.SHIPMENTS}         element={<ShipmentsDashboardPage />} />
                <Route path={ROUTES.SHIPMENTS_LIST}    element={<ShipmentsListPage />} />
                <Route path={ROUTES.SHIPMENT_BATCHES}  element={<ShipmentBatchesDashboardPage />} />
                <Route path={ROUTES.SHIPMENT_BATCHES_LIST}  element={<ShipmentBatchesListPage />} />
                <Route path={ROUTES.DELIVERY_ORDERS}   element={<DeliveryOrdersPage />} />
                <Route path={ROUTES.DELIVERY_DETAIL(':id')} element={<DeliveryDetailPage />} />
                <Route path={ROUTES.BILLING}           element={<BillingPage />} />
                <Route path={ROUTES.BILLING_DETAIL(':id')}    element={<BillingDetailPage />} />
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
