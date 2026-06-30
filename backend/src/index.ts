import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { rateLimiter } from 'hono-rate-limiter'
import { ENV } from './config/env'
import { logger } from './config/logger'
import { createErrorHandler } from './middleware/errorHandler'

// Import semua routes
import { authRoutes } from './modules/auth/auth.routes'
import { customersRoutes } from './modules/customers/customers.routes'
import { markingRoutes } from './modules/marking/marking.routes'
// import { shipmentsRoutes } from './modules/shipments/shipments.routes'
// import { billingRoutes } from './modules/billing/billing.routes'

const app = new Hono().basePath(ENV.APP_BASE_PATH)

// Global middleware
app.use('*', cors({
  origin: ENV.IS_PRODUCTION ? 'http://36.93.22.142' : '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
}))
app.use('*', honoLogger())
app.use('/api/*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 200,
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'unknown',
}))

// Mount routes
app.route('/api/auth', authRoutes)
app.route('/api/customers', customersRoutes)
app.route('/api/marking', markingRoutes)
// app.route('/api/shipments', shipmentsRoutes)
// app.route('/api/shipment-batches', shipmentBatchesRoutes)
// app.route('/api/billing', billingRoutes)

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Error handler
app.onError(createErrorHandler())

logger.info(`Server berjalan di port ${ENV.PORT}`)

export default {
  port: ENV.PORT,
  fetch: app.fetch,
}
