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
