import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { rateLimiter } from 'hono-rate-limiter'
import { loginSchema, registerSchema } from './auth.schema'
import { loginUser, registerUser } from './auth.service'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'

const authRoutes = new Hono()

// Rate limiter khusus untuk login (misal max 5 kali salah per 15 menit)
const loginRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 5, // 5 request max
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'unknown',
  handler: (c) => errorResponse(c, 'Terlalu banyak percobaan login, silakan coba lagi setelah 15 menit', 429),
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
