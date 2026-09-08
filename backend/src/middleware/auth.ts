import { createMiddleware } from 'hono/factory'
import jwt from 'jsonwebtoken'
import { ENV } from '../config/env'
import { errorResponse } from '../utils/response'
import { prisma } from '../config/database'

export interface JwtPayload {
  userId: string
  username: string
  role: string
  fdEmpCode?: string | null
  fdEmpName?: string | null
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

  const normalize = (pathStr: string) =>
    pathStr
      .replace(/^\/mshipping\/(finance|master|logistics|admin|overview)\//, '/mshipping/')
      .replace(/\/+$/, '')

  const reqNorm = normalize(requiredPath)

  let activePerms = user.permissions || []
  if (user.role) {
    try {
      const dbPerms = await prisma.tbRolePermissions.findMany({
        where: { role: user.role, canView: true },
        select: { path: true },
      })
      if (dbPerms.length > 0) {
        activePerms = Array.from(new Set([...activePerms, ...dbPerms.map(p => p.path)]))
      }
    } catch {
      // fallback to token permissions
    }
  }

  // Check permissions
  const hasAccess = activePerms.some(p => {
    if (p === '/*') return true
    const pNorm = normalize(p)
    return (
      requiredPath === p ||
      requiredPath.startsWith(p + '/') ||
      p.startsWith(requiredPath + '/') ||
      reqNorm === pNorm ||
      reqNorm.startsWith(pNorm + '/') ||
      pNorm.startsWith(reqNorm + '/')
    )
  })

  if (!hasAccess) {
    return errorResponse(c, `Akses ditolak: Anda tidak memiliki izin untuk ${requiredPath}`, 403)
  }

  await next()
})
