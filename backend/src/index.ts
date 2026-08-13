import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { rateLimiter } from 'hono-rate-limiter'
import { ENV } from './config/env'
import { logger } from './config/logger'
import { createErrorHandler } from './middleware/errorHandler'

// Import semua routes
import { authRoutes } from './modules/auth/auth.routes'
import { usersRoutes } from './modules/users/users.routes'
import { rolesRoutes } from './modules/roles/roles.routes'
import { customersRoutes } from './modules/customers/customers.routes'
import { markingRoutes } from './modules/marking/marking.routes'
import { billingRoutes } from './modules/billing/billing.routes'
import { deliveryOrdersRoutes } from './modules/delivery-orders/deliveryOrders.routes'
import { shipmentsRoutes } from './modules/shipments/shipments.routes'
import { dashboardRoutes } from './modules/dashboard/dashboard.routes'
import { priceListRoutes } from './modules/price-list/price-list.routes'
import { customerPriceListRoutes } from './modules/customer-price-list/customer-price-list.routes'


const app = new Hono().basePath(ENV.APP_BASE_PATH)

// Global middleware
app.use('*', cors({
  origin: ENV.IS_PRODUCTION ? 'http://36.93.22.142' : '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}))
app.use('*', honoLogger())
app.use('/api/*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: ENV.IS_PRODUCTION ? 1000 : 10000,
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'local-dev',
}))

// Mount routes
app.route('/api/auth', authRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/roles', rolesRoutes)
app.route('/api/customers', customersRoutes)
app.route('/api/marking', markingRoutes)
app.route('/api/billing', billingRoutes)
app.route('/api/delivery-orders', deliveryOrdersRoutes)
app.route('/api/shipments', shipmentsRoutes)
app.route('/api/dashboard', dashboardRoutes)
app.route('/api/price-list', priceListRoutes)
app.route('/api/customer-price-list', customerPriceListRoutes)


// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Error handler
app.onError(createErrorHandler())

logger.info(`Server berjalan di port ${ENV.PORT}`)

const server = Bun.serve({
  port: ENV.PORT,
  hostname: "0.0.0.0",
  fetch: app.fetch,
})

logger.info(`Server berjalan di port ${server.port}`)
