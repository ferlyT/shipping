import { createMiddleware } from 'hono/factory'
import jwt from 'jsonwebtoken'
import { ENV } from '../config/env'
import { errorResponse } from '../utils/response'

export interface JwtPayload {
  userId: string
  username: string
  role: string
  permissions?: string[]
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

export const isAdmin = createMiddleware(async (c, next) => {
  const user = c.get('user')
  if (user?.role !== 'admin') {
    return errorResponse(c, 'Akses ditolak: Hanya admin yang dapat melakukan aksi ini', 403)
  }
  await next()
})

export const requirePermission = (requiredPath: string) => createMiddleware(async (c, next) => {
  const user = c.get('user')
  
  if (!user) {
    return errorResponse(c, 'Token tidak ditemukan', 401)
  }
  
  // Admin bypass
  if (user.role === 'admin') {
    await next()
    return
  }

  // Check permissions
  const hasAccess = user.permissions?.some(p => {
    if (p === '/*') return true
    return requiredPath === p || requiredPath.startsWith(p + '/')
  })

  if (!hasAccess) {
    return errorResponse(c, `Akses ditolak: Anda tidak memiliki izin untuk ${requiredPath}`, 403)
  }

  await next()
})
