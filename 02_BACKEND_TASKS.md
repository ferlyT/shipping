# 02 — Backend Tasks

**Prasyarat:** Schema `01_DATABASE_SCHEMA.md` sudah dikonfirmasi owner.  
**Urutan task WAJIB diikuti** — setiap task bergantung pada task sebelumnya.

---

## TASK B-01: Setup Proyek & Konfigurasi Dasar

**Estimasi:** 30 menit  
**File yang dibuat/dimodifikasi:** `package.json`, `.env`, `src/config/env.ts`, `src/config/database.ts`, `src/config/logger.ts`

### Langkah

**1. Inisialisasi Prisma**
```bash
bun add prisma @prisma/client @prisma/adapter-mssql
bunx prisma init
```

**2. Buat `src/config/env.ts`** — Single source of truth untuk semua env var
```typescript
// src/config/env.ts
import { config } from 'dotenv'
config()

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Environment variable ${key} tidak ditemukan`)
  return value
}

export const ENV = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '8h',
  PORT: parseInt(process.env.PORT ?? '3000'),
  APP_BASE_PATH: process.env.APP_BASE_PATH ?? '/shipping',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
} as const
```

**3. Buat `src/config/database.ts`** — Prisma singleton
```typescript
// src/config/database.ts
import { PrismaClient } from '@prisma/client'

// ATURAN: Gunakan HANYA export ini di seluruh proyek
// DILARANG: new PrismaClient() di file lain
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**4. Buat `src/config/logger.ts`** — Winston singleton
```typescript
// src/config/logger.ts
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { ENV } from './env'

// ATURAN: Gunakan HANYA export ini di seluruh proyek
// DILARANG: console.log() di production code
export const logger = winston.createLogger({
  level: ENV.IS_PRODUCTION ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
  ],
})
```

### Checklist B-01
- [ ] `.env` sudah diisi dengan nilai real
- [ ] `prisma/schema.prisma` sudah diperbarui (dari Task 01_DATABASE)
- [ ] `bunx prisma generate` berhasil
- [ ] Ketiga config file tidak ada error TypeScript

---

## TASK B-02: Utilities (Response Builder & Pagination)

**Estimasi:** 20 menit  
**File yang dibuat:** `src/utils/response.ts`, `src/utils/pagination.ts`

**PENTING:** Semua route di seluruh proyek WAJIB menggunakan utility ini.

### `src/utils/response.ts`
```typescript
import type { Context } from 'hono'

export interface PaginatedMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Gunakan ini untuk semua response sukses
export function successResponse<T>(c: Context, data: T, meta?: PaginatedMeta, status = 200) {
  return c.json({ success: true, data, ...(meta && { meta }) }, status as any)
}

// Gunakan ini untuk semua response error
export function errorResponse(c: Context, message: string, status = 400, details?: unknown) {
  return c.json({ success: false, error: message, ...(details && { details }) }, status as any)
}
```

### `src/utils/pagination.ts`
```typescript
// Gunakan ini untuk semua query yang memerlukan pagination
// DILARANG: buat logika pagination manual di service/route manapun

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationResult {
  skip: number
  take: number
  meta: (total: number) => {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function parsePagination(query: Record<string, string | undefined>): PaginationParams {
  const page = Math.max(1, parseInt(query.page ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')))
  return { page, limit }
}

export function buildPagination({ page, limit }: PaginationParams): PaginationResult {
  return {
    skip: (page - 1) * limit,
    take: limit,
    meta: (total: number) => ({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }),
  }
}
```

### Checklist B-02
- [ ] Kedua utility file tidak ada error TypeScript
- [ ] Tidak ada logika response/pagination custom di file lain

---

## TASK B-03: Middleware Auth & Error Handler

**Estimasi:** 30 menit  
**File yang dibuat:** `src/middleware/auth.ts`, `src/middleware/errorHandler.ts`

### `src/middleware/auth.ts`
```typescript
import { createMiddleware } from 'hono/factory'
import jwt from 'jsonwebtoken'
import { ENV } from '../config/env'
import { errorResponse } from '../utils/response'

export interface JwtPayload {
  userId: string
  username: string
  role: string
}

// Tambahkan tipe ke Hono context
declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse(c, 'Token tidak ditemukan', 401)
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload
    c.set('user', payload)
    await next()
  } catch {
    return errorResponse(c, 'Token tidak valid atau kadaluarsa', 401)
  }
})
```

### `src/middleware/errorHandler.ts`
```typescript
import type { Context } from 'hono'
import { logger } from '../config/logger'
import { errorResponse } from '../utils/response'

export function createErrorHandler() {
  return async (err: Error, c: Context) => {
    logger.error('Unhandled error', { 
      message: err.message, 
      stack: err.stack,
      path: c.req.path 
    })
    return errorResponse(c, 'Terjadi kesalahan server', 500)
  }
}
```

### Checklist B-03
- [ ] `authMiddleware` berhasil verify JWT
- [ ] `authMiddleware` mengembalikan 401 jika token tidak ada/invalid
- [ ] `errorHandler` di-register di `index.ts`

---

## TASK B-04: Modul Auth (Login & Me)

**Estimasi:** 45 menit  
**File yang dibuat:** `src/modules/auth/auth.schema.ts`, `src/modules/auth/auth.service.ts`, `src/modules/auth/auth.routes.ts`

### `src/modules/auth/auth.schema.ts`
```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export type LoginInput = z.infer<typeof loginSchema>
```

### `src/modules/auth/auth.service.ts`
```typescript
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/database'
import { ENV } from '../../config/env'
import { logger } from '../../config/logger'
import type { LoginInput } from './auth.schema'

export async function loginUser(input: LoginInput) {
  const user = await prisma.tbUsers.findUnique({
    where: { username: input.username },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      fullName: true,
      role: true,
      isActive: true,
    },
  })

  if (!user || !user.isActive) {
    throw new Error('Username atau password salah')
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash)
  if (!isPasswordValid) {
    throw new Error('Username atau password salah')
  }

  // Update lastLoginAt
  await prisma.tbUsers.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN }
  )

  logger.info('User login berhasil', { username: user.username })

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  }
}
```

### `src/modules/auth/auth.routes.ts`
```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { loginSchema } from './auth.schema'
import { loginUser } from './auth.service'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'

const authRoutes = new Hono()

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const input = c.req.valid('json')
    const result = await loginUser(input)
    return successResponse(c, result)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 401)
  }
})

authRoutes.get('/me', authMiddleware, (c) => {
  const user = c.get('user')
  return successResponse(c, user)
})

export { authRoutes }
```

### Checklist B-04
- [ ] POST `/shipping/api/auth/login` mengembalikan token + user data
- [ ] Login dengan credential salah mengembalikan 401
- [ ] GET `/shipping/api/auth/me` dengan token valid mengembalikan user
- [ ] GET `/shipping/api/auth/me` tanpa token mengembalikan 401

---

## TASK B-05: Modul Customers

**⚠️ TUNGGU konfirmasi kolom dari owner sebelum mengerjakan task ini.**

**Estimasi:** 30 menit  
**File yang dibuat:** `src/modules/customers/customers.service.ts`, `src/modules/customers/customers.routes.ts`

### `src/modules/customers/customers.service.ts`
```typescript
import { prisma } from '../../config/database'
import { buildPagination, parsePagination } from '../../utils/pagination'

export async function getCustomers(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })
  
  // ⚠️ Sesuaikan field 'search' dengan kolom asli setelah konfirmasi owner
  const search = query.search?.trim()
  const where = search
    ? {
        OR: [
          // TODO: Sesuaikan field name dengan kolom asli
          // { namaCustomer: { contains: search } },
          // { kodeCustomer: { contains: search } },
        ],
      }
    : {}

  const [data, total] = await Promise.all([
    prisma.tbCustomers.findMany({ where, skip, take, orderBy: { /* TODO */ } }),
    prisma.tbCustomers.count({ where }),
  ])

  return { data, meta: meta(total) }
}

export async function getCustomerById(id: string | number) {
  return prisma.tbCustomers.findUnique({
    where: { /* TODO: sesuaikan dengan PK asli */ },
  })
}
```

### `src/modules/customers/customers.routes.ts`
```typescript
import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth'
import { getCustomers, getCustomerById } from './customers.service'
import { successResponse, errorResponse } from '../../utils/response'

const customersRoutes = new Hono()

// Semua route customers memerlukan auth
customersRoutes.use('/*', authMiddleware)

customersRoutes.get('/', async (c) => {
  const query = c.req.query()
  const result = await getCustomers(query)
  return successResponse(c, result.data, result.meta)
})

customersRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const customer = await getCustomerById(id)
  if (!customer) return errorResponse(c, 'Customer tidak ditemukan', 404)
  return successResponse(c, customer)
})

export { customersRoutes }
```

### Checklist B-05
- [ ] GET `/shipping/api/customers` mengembalikan list dengan pagination
- [ ] GET `/shipping/api/customers?search=xxx` memfilter hasil
- [ ] GET `/shipping/api/customers/:id` mengembalikan detail atau 404
- [ ] Semua route mengembalikan 401 tanpa token

---

## TASK B-06 sampai B-10: Modul-Modul Lain

**Pola yang sama dengan B-05** — ulangi untuk setiap modul:

| Task | Modul | Tabel Utama | Tabel Detail |
|------|-------|-------------|--------------|
| B-06 | Shipments | `tbEntryList` | `tbEntryListDetail` |
| B-07 | ShipmentBatches | `tbMarking` | — |
| B-08 | DeliveryOrders | `tbDelivery` | `tbDeliveryDetail` |
| B-09 | Billing | `tbBilling` | `tbBillingDetail` |

Untuk modul yang punya tabel detail, tambahkan endpoint:
```
GET /[modul]/:id/details
```

**⚠️ Setiap modul WAJIB konfirmasi kolom dengan owner sebelum dikerjakan.**

---

## TASK B-11: Entry Point `index.ts`

**Estimasi:** 20 menit  
**File yang dibuat/dimodifikasi:** `src/index.ts`

```typescript
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
import { shipmentsRoutes } from './modules/shipments/shipments.routes'
import { shipmentBatchesRoutes } from './modules/shipment-batches/shipmentBatches.routes'
import { deliveryOrdersRoutes } from './modules/delivery-orders/deliveryOrders.routes'
import { billingRoutes } from './modules/billing/billing.routes'

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
app.route('/api/shipments', shipmentsRoutes)
app.route('/api/shipment-batches', shipmentBatchesRoutes)
app.route('/api/delivery-orders', deliveryOrdersRoutes)
app.route('/api/billing', billingRoutes)

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Error handler
app.onError(createErrorHandler())

logger.info(`Server berjalan di port ${ENV.PORT}`)

export default {
  port: ENV.PORT,
  fetch: app.fetch,
}
```

### Checklist B-11
- [ ] Server start tanpa error
- [ ] GET `/shipping/api/health` mengembalikan `{ status: "ok" }`
- [ ] Semua route terdaftar dan bisa diakses
- [ ] CORS mengizinkan request dari frontend

---

## 🔴 Aturan Wajib untuk Agen Backend

1. **JANGAN** jalankan `prisma db push` atau `prisma migrate` pada tabel existing tanpa konfirmasi owner
2. **SELALU** tanya owner jika nama kolom tidak jelas
3. **JANGAN** hardcode nilai apapun — gunakan `ENV` dari `config/env.ts`
4. **SELALU** gunakan `successResponse`/`errorResponse` dari `utils/response.ts`
5. **SELALU** gunakan `buildPagination`/`parsePagination` dari `utils/pagination.ts`
6. **JANGAN** buat instance baru `PrismaClient` — gunakan singleton dari `config/database.ts`
