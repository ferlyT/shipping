import { Hono } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'
import { loginSchema, registerSchema } from './auth.schema'
import { loginUser, registerUser } from './auth.service'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import { validateBody } from '../../middleware/requestValidator'

import { ENV } from '../../config/env'
import { logger } from '../../config/logger'

import jwt from 'jsonwebtoken'

const authRoutes = new Hono()

// Rate limiter khusus untuk login & register (max 5 di production, 100 di development)
const authActionRateLimiter = rateLimiter({
  windowMs: 10 * 60 * 1000, // 10 menit
  limit: ENV.IS_PRODUCTION ? 10 : 100,
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'local-dev',
  handler: (c) => {
    logger.warn(`[Auth] Rate limit auth terpicu untuk IP/Key: ${c.req.header('x-forwarded-for') ?? 'local-dev'}`)
    return errorResponse(c, 'Terlalu banyak percobaan, silakan coba lagi setelah 10 menit', 429)
  },
})

authRoutes.post('/login', authActionRateLimiter, validateBody(loginSchema), async (c) => {
  try {
    const input = c.req.valid('json')
    const result = await loginUser(input)
    return successResponse(c, result)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 401)
  }
})

authRoutes.post('/register', authActionRateLimiter, validateBody(registerSchema), async (c) => {
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

authRoutes.post('/refresh', authMiddleware, async (c) => {
  const user = c.get('user')
  try {
    const token = jwt.sign(
      {
        userId: user.userId,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        fdEmpCode: user.fdEmpCode,
        fdEmpName: user.fdEmpName,
        permissions: user.permissions,
      },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    )
    return successResponse(c, { token, user })
  } catch (err) {
    return errorResponse(c, 'Gagal memperbarui token', 500)
  }
})

export { authRoutes }
