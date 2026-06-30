import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { ROUTES } from '@/lib/constants'

// Lazy load pages
import { lazy, Suspense } from 'react'
const LoginPage          = lazy(() => import('@/pages/LoginPage'))
const DashboardPage      = lazy(() => import('@/pages/DashboardPage'))
const CustomersPage      = lazy(() => import('@/pages/CustomersPage'))
const ShipmentsPage      = lazy(() => import('@/pages/ShipmentsPage'))
const ShipmentDetailPage = lazy(() => import('@/pages/ShipmentDetailPage'))
const ShipmentBatchesPage = lazy(() => import('@/pages/ShipmentBatchesPage'))
const DeliveryOrdersPage = lazy(() => import('@/pages/DeliveryOrdersPage'))
const DeliveryDetailPage = lazy(() => import('@/pages/DeliveryDetailPage'))
const BillingPage        = lazy(() => import('@/pages/BillingPage'))
const BillingDetailPage  = lazy(() => import('@/pages/BillingDetailPage'))

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading…</div>}>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/shipping" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
              <Route path={ROUTES.DASHBOARD}         element={<DashboardPage />} />
              <Route path={ROUTES.CUSTOMERS}         element={<CustomersPage />} />
              <Route path={ROUTES.SHIPMENTS}         element={<ShipmentsPage />} />
              <Route path={ROUTES.SHIPMENT_DETAIL(':id')}  element={<ShipmentDetailPage />} />
              <Route path={ROUTES.SHIPMENT_BATCHES}  element={<ShipmentBatchesPage />} />
              <Route path={ROUTES.DELIVERY_ORDERS}   element={<DeliveryOrdersPage />} />
              <Route path={ROUTES.DELIVERY_DETAIL(':id')} element={<DeliveryDetailPage />} />
              <Route path={ROUTES.BILLING}           element={<BillingPage />} />
              <Route path={ROUTES.BILLING_DETAIL(':id')}    element={<BillingDetailPage />} />
            </Route>
          </Route>
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/shipping" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
