import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AdminGuard } from './AdminGuard'
import { PermissionGuard } from './PermissionGuard'
import { DefaultRouteRedirect } from './DefaultRouteRedirect'
import { AppLayout } from '@/components/layout/AppLayout'
import { ROUTES } from '@/lib/constants'

// Lazy load pages
import { lazy, Suspense } from 'react'
const LoginPage          = lazy(() => import('@/features/auth').then(m => ({ default: m.LoginPage })))
const RegisterPage       = lazy(() => import('@/features/auth').then(m => ({ default: m.RegisterPage })))
const DashboardPage      = lazy(() => import('@/pages/DashboardPage'))
const CustomersPage      = lazy(() => import('@/features/customers').then(m => ({ default: m.CustomersPage })))
const ShipmentsDashboardPage = lazy(() => import('@/features/shipments').then(m => ({ default: m.ShipmentsDashboardPage })))
const ShipmentsListPage  = lazy(() => import('@/features/shipments').then(m => ({ default: m.ShipmentsListPage })))
const ShipmentBatchesDashboardPage = lazy(() => import('@/features/shipment-batches').then(m => ({ default: m.ShipmentBatchesDashboardPage })))
const ShipmentBatchesListPage = lazy(() => import('@/features/shipment-batches').then(m => ({ default: m.ShipmentBatchesListPage })))
const DeliveryOrdersPage = lazy(() => import('@/features/delivery-orders').then(m => ({ default: m.DeliveryOrdersPage })))
const DeliveryDetailPage = lazy(() => import('@/features/delivery-orders').then(m => ({ default: m.DeliveryDetailPage })))
const BillingPage        = lazy(() => import('@/features/billing').then(m => ({ default: m.BillingPage })))
const BillingDetailPage  = lazy(() => import('@/features/billing').then(m => ({ default: m.BillingDetailPage })))
const UserManagementPage = lazy(() => import('@/features/user-management').then(m => ({ default: m.UserManagementPage })))
const RoleManagementPage = lazy(() => import('@/features/user-management').then(m => ({ default: m.RoleManagementPage })))

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
