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


import path from 'path'
import fs from 'fs/promises'
import { profileRoutes } from './modules/profile/profile.routes'

const rootApp = new Hono()

// Global middleware
rootApp.use('*', cors({
  origin: ENV.IS_PRODUCTION ? 'http://36.93.22.142' : '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}))
rootApp.use('*', honoLogger())

// Static file serving handler for uploads with dev/prod distinction
const serveUploadHandler = async (c: any) => {
  const urlPath = c.req.path
  let relativePath = ''

  const uploadsMatch = urlPath.match(/\/(?:mshipping\/)?(?:api\/)?uploads\/(.+)$/)
  const avatarsMatch = urlPath.match(/\/(?:mshipping\/)?(?:api\/)?avatars\/(.+)$/)

  if (uploadsMatch) {
    relativePath = uploadsMatch[1]
  } else if (avatarsMatch) {
    relativePath = `avatars/${avatarsMatch[1]}`
  } else {
    return c.text('Not found', 404)
  }

  const fullPath = path.join(process.cwd(), 'public', 'uploads', relativePath)
  const file = Bun.file(fullPath)
  if (await file.exists()) {
    return new Response(file)
  }

  // Development mode: Fallback ke server production jika file belum ada di lokal
  if (!ENV.IS_PRODUCTION) {
    try {
      const prodUrl = `http://36.93.22.142:3010/uploads/${relativePath}`
      const remoteRes = await fetch(prodUrl, { signal: AbortSignal.timeout(3000) })
      if (remoteRes.ok) {
        const buffer = await remoteRes.arrayBuffer()
        // Simpan ke local cache agar request berikutnya langsung tersedia
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, Buffer.from(buffer))
        return new Response(Buffer.from(buffer), {
          headers: {
            'Content-Type': remoteRes.headers.get('Content-Type') || 'image/png',
          },
        })
      }
    } catch (e) {
      // Remote fetch gagal atau timeout, fallback 404
      logger.warn(`Gagal fetch fallback upload dari production untuk: ${relativePath}`)
    }
  }

  return c.text('Not found', 404)
}

// Support uploads at root, APP_BASE_PATH, /mshipping, /avatars, and /api/uploads
rootApp.get('/uploads/*', serveUploadHandler)
rootApp.get('/avatars/*', serveUploadHandler)
rootApp.get(`${ENV.APP_BASE_PATH}/uploads/*`, serveUploadHandler)
rootApp.get(`${ENV.APP_BASE_PATH}/avatars/*`, serveUploadHandler)
rootApp.get('/mshipping/uploads/*', serveUploadHandler)
rootApp.get('/mshipping/avatars/*', serveUploadHandler)
rootApp.get('/api/uploads/*', serveUploadHandler)
rootApp.get('/mshipping/api/uploads/*', serveUploadHandler)


// API rate limiter
rootApp.use('/api/*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: ENV.IS_PRODUCTION ? 1000 : 10000,
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'local-dev',
}))
rootApp.use(`${ENV.APP_BASE_PATH}/api/*`, rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: ENV.IS_PRODUCTION ? 1000 : 10000,
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'local-dev',
}))

const apiApp = new Hono()

// Mount routes
apiApp.route('/auth', authRoutes)
apiApp.route('/profile', profileRoutes)
apiApp.route('/users', usersRoutes)
apiApp.route('/roles', rolesRoutes)
apiApp.route('/customers', customersRoutes)
apiApp.route('/marking', markingRoutes)
apiApp.route('/billing', billingRoutes)
apiApp.route('/delivery-orders', deliveryOrdersRoutes)
apiApp.route('/shipments', shipmentsRoutes)
apiApp.route('/dashboard', dashboardRoutes)
apiApp.route('/price-list', priceListRoutes)
apiApp.route('/customer-price-list', customerPriceListRoutes)

// Health check
apiApp.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Mount apiApp at both /api, ${ENV.APP_BASE_PATH}/api, and /mshipping/api
rootApp.route('/api', apiApp)
if (ENV.APP_BASE_PATH && ENV.APP_BASE_PATH !== '/') {
  rootApp.route(`${ENV.APP_BASE_PATH}/api`, apiApp)
}
rootApp.route('/mshipping/api', apiApp)

// Error handler
rootApp.onError(createErrorHandler())

logger.info(`Server berjalan di port ${ENV.PORT}`)

const server = Bun.serve({
  port: ENV.PORT,
  hostname: "0.0.0.0",
  fetch: rootApp.fetch,
  idleTimeout: 120, // 120 detik timeout untuk mencegah premature socket drop
})

logger.info(`Server berjalan di port ${server.port}`)
