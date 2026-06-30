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
