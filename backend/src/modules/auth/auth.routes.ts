import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { rateLimiter } from 'hono-rate-limiter'
import { loginSchema, registerSchema } from './auth.schema'
import { loginUser, registerUser } from './auth.service'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'

import { ENV } from '../../config/env'
import { logger } from '../../config/logger'

const authRoutes = new Hono()

// Rate limiter khusus untuk login (max 5 di production, 100 di development)
const loginRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: ENV.IS_PRODUCTION ? 5 : 100,
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'local-dev',
  handler: (c) => {
    logger.warn(`[Auth] Rate limit login terpicu untuk IP/Key: ${c.req.header('x-forwarded-for') ?? 'local-dev'}`)
    return errorResponse(c, 'Terlalu banyak percobaan login, silakan coba lagi setelah 15 menit', 429)
  },
})

authRoutes.post('/login', loginRateLimiter, zValidator('json', loginSchema), async (c) => {
  try {
    const input = c.req.valid('json')
    const result = await loginUser(input)
    return successResponse(c, result)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 401)
  }
})

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const input = c.req.valid('json')
    const result = await registerUser(input)
    return successResponse(c, result, undefined, 201)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 400)
  }
})

authRoutes.get('/me', authMiddleware, (c) => {
  const user = c.get('user')
  return successResponse(c, user)
})

export { authRoutes }
