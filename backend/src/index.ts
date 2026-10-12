// Dukungan serialisasi BigInt ke JSON untuk seluruh modul (termasuk Prisma BigInt)
;(BigInt.prototype as any).toJSON = function () {
  return Number(this)
}

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import { logger as honoLogger } from 'hono/logger'
import { rateLimiter } from 'hono-rate-limiter'
import { ENV } from './config/env'
import { logger } from './config/logger'
import { createErrorHandler } from './middleware/errorHandler'
import { errorResponse } from './utils/response'

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
import { commodityMappingRoutes } from './modules/commodity-mapping/commodity-mapping.routes'
import { priceCheckRoutes } from './modules/price-check/price-check.routes'
import { m3CheckRoutes } from './modules/m3-check/m3-check.routes'
import { appVersionRoutes } from './modules/app-version/app-version.routes'
import cashierRoutes from './modules/cashier/cashier.routes'
import walletRoutes from './modules/wallet/wallet.routes'
import { inspectionReportsRoutes } from './modules/inspection-reports/inspectionReports.routes'
import { dataRevisionsRoutes } from './modules/data-revisions/dataRevisions.routes'


import path from 'path'
import fs from 'fs/promises'
import { swaggerUI } from '@hono/swagger-ui'
import { openApiSpec } from './docs/swagger'
import { profileRoutes } from './modules/profile/profile.routes'

const rootApp = new Hono()

// Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy)
rootApp.use('*', secureHeaders({
  xFrameOptions: 'SAMEORIGIN',
  xContentTypeOptions: 'nosniff',
  xXssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
}))

// CORS configuration dengan verifikasi origin yang ketat
const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/36\.93\.22\.142(?::\d+)?$/,
  /^https?:\/\/([a-zA-Z0-9-]+\.)*sampai\.co$/,
  /^https?:\/\/localhost(?::\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
  /^https?:\/\/192\.168\.1\.\d+(?::\d+)?$/,
]

rootApp.use('*', cors({
  origin: (origin) => {
    if (!origin) return ENV.IS_PRODUCTION ? 'https://app.sampai.co' : '*'
    if (!ENV.IS_PRODUCTION) return origin
    if (ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))) {
      return origin
    }
    return 'https://app.sampai.co'
  },
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['X-Refreshed-Token'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
}))

// Batas ukuran body request untuk mencegah DoS memory exhaustion
rootApp.use('/api/*', bodyLimit({
  maxSize: 50 * 1024 * 1024, // 50MB (mendukung upload foto BAP & file price list Excel)
  onError: (c) => errorResponse(c, 'Ukuran payload melebihi batas maksimal yang diizinkan (50MB)', 413),
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
    return new Response(file, {
      headers: {
        'Content-Type': file.type || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  }

  // Development mode: Fallback ke server production jika file belum ada di lokal
  if (!ENV.IS_PRODUCTION) {
    try {
      const prodUrl = `https://app.sampai.co/uploads/${relativePath}`
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

// Register static upload routes
const UPLOAD_ROUTE_PATTERNS = [
  '/uploads/*',
  '/avatars/*',
  `${ENV.APP_BASE_PATH}/uploads/*`,
  `${ENV.APP_BASE_PATH}/avatars/*`,
  '/mshipping/uploads/*',
  '/mshipping/avatars/*',
  '/api/uploads/*',
  '/mshipping/api/uploads/*',
]
UPLOAD_ROUTE_PATTERNS.forEach((pattern) => rootApp.get(pattern, serveUploadHandler))

const apiApp = new Hono()

// API rate limiter — diterapkan secara seragam ke seluruh endpoint apiApp
apiApp.use('*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: ENV.IS_PRODUCTION ? 1000 : 10000,
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'local-dev',
}))

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
apiApp.route('/commodity-mapping', commodityMappingRoutes)
apiApp.route('/price-check', priceCheckRoutes)
apiApp.route('/m3-check', m3CheckRoutes)
apiApp.route('/app-version', appVersionRoutes)
apiApp.route('/cashier', cashierRoutes)
apiApp.route('/wallet', walletRoutes)
apiApp.route('/inspection-reports', inspectionReportsRoutes)
apiApp.route('/data-revisions', dataRevisionsRoutes)

// OpenAPI JSON & Swagger UI
apiApp.get('/openapi.json', (c) => c.json(openApiSpec))
apiApp.get('/docs', swaggerUI({ url: 'openapi.json' }))

// Health check
apiApp.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Mount apiApp at both /api, ${ENV.APP_BASE_PATH}/api, and /mshipping/api
rootApp.route('/api', apiApp)
if (ENV.APP_BASE_PATH && ENV.APP_BASE_PATH !== '/') {
  rootApp.route(`${ENV.APP_BASE_PATH}/api`, apiApp)
}
rootApp.route('/mshipping/api', apiApp)
rootApp.route('/app-version', appVersionRoutes)
rootApp.route('/mshipping/app-version', appVersionRoutes)
// Endpoint download APK Android
const handleApkDownload = async (c: any) => {
  const apkPath = path.join(process.cwd(), 'public', 'uploads', 'mshipping.apk')
  const file = Bun.file(apkPath)
  if (await file.exists()) {
    return new Response(file, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="mshipping.apk"',
      },
    })
  }
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>M-Shipping Mobile APK</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; background: #0B0F17; color: #F1F5F9; text-align: center; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: #151D2A; border: 1px solid #1E293B; border-radius: 16px; padding: 30px;">
          <h2 style="color: #38BDF8; margin-top: 0;">M-Shipping Mobile App</h2>
          <p style="color: #94A3B8; font-size: 14px; line-height: 1.6;">
            File APK siap di-build via EAS Cloud atau ditempatkan di <code>backend/public/uploads/mshipping.apk</code>.
          </p>
          <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 12px; margin-top: 20px; font-size: 13px; color: #38BDF8;">
            Jalankan <b>bunx eas-cli build -p android --profile preview</b> untuk menghasilkan link download APK langsung dari cloud.
          </div>
        </div>
      </body>
    </html>
  `, 404)
}

rootApp.get('/download/apk', handleApkDownload)
rootApp.get('/mshipping/download/apk', handleApkDownload)
rootApp.get('/api/download/apk', handleApkDownload)

// Root & Sub-path Swagger UI redirects / routes
rootApp.get('/docs', swaggerUI({ url: '/api/openapi.json' }))
rootApp.get('/swagger', (c) => c.redirect('/docs'))
if (ENV.APP_BASE_PATH && ENV.APP_BASE_PATH !== '/') {
  rootApp.get(`${ENV.APP_BASE_PATH}/docs`, swaggerUI({ url: `${ENV.APP_BASE_PATH}/api/openapi.json` }))
  rootApp.get(`${ENV.APP_BASE_PATH}/swagger`, (c) => c.redirect(`${ENV.APP_BASE_PATH}/docs`))
}
rootApp.get('/mshipping/docs', swaggerUI({ url: '/mshipping/api/openapi.json' }))
rootApp.get('/mshipping/swagger', (c) => c.redirect('/mshipping/docs'))

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
