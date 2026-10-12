import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/database'
import { ENV } from '../../config/env'
import { logger } from '../../config/logger'
import type { LoginInput } from './auth.schema'

export async function loginUser(input: LoginInput) {
  const user = await prisma.tbUsers.findUnique({
    where: { username: input.username },
    include: {
      employee: {
        select: { fdEmpName: true }
      }
    }
  })

  if (!user) {
    throw new Error('Username atau password salah')
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash)
  if (!isPasswordValid) {
    throw new Error('Username atau password salah')
  }

  if (!user.isActive) {
    throw new Error('Akun Anda belum disetujui oleh admin')
  }

  // Update last login
  await prisma.tbUsers.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  })

  // Fetch permissions
  const { rolesService } = await import('../roles/roles.service')
  let permissionsList = await rolesService.getRolePermissions(user.role)
  if (user.role === 'superadmin' && permissionsList.length < 10) {
    const adminPerms = await rolesService.getRolePermissions('admin')
    if (adminPerms.length > 0) {
      permissionsList = adminPerms
    }
  }

  let permissions = permissionsList.filter(p => p.canView).map(p => p.path)
  if (user.role === 'admin' || user.role === 'superadmin') {
    if (!permissions.includes('/*')) {
      permissions.unshift('/*')
    }
  }

  const fdEmpCode = user.fdEmpCode ? user.fdEmpCode.trim() : null
  const fdEmpName = user.employee?.fdEmpName ? user.employee.fdEmpName.trim() : null

  const token = jwt.sign(
    { userId: user.id, username: user.username, fullName: user.fullName, role: user.role, fdEmpCode, fdEmpName, permissions },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as any }
  )

  logger.info('User login berhasil', { username: input.username, fdEmpCode })
  
  // Determine default route (hanya rute halaman valid yang dapat menjadi defaultRoute)
  const nonPagePaths = [
    '/mshipping/finance/billing/attachments',
    '/mshipping/finance/billing/attachments/delete',
    '/mshipping/finance/billing/validation/summary',
    '/mshipping/finance/billing/view-consignee',
    '/mshipping/finance/billing/view_consignee',
    '/mshipping/master/customers/tier',
  ]
  const defaultPermission = permissionsList.find(p => p.isDefault && !nonPagePaths.includes(p.path))
  const candidatePermissions = permissions.filter(p => p !== '/*' && !nonPagePaths.includes(p))
  const defaultRoute = defaultPermission 
    ? defaultPermission.path 
    : (user.role === 'admin' || user.role === 'superadmin'
        ? '/mshipping/overview/dashboard'
        : (candidatePermissions.length > 0 ? candidatePermissions[0] : (permissions.length > 0 ? permissions[0] : null)))

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      fdEmpCode,
      fdEmpName,
      avatarUrl: user.avatarUrl,
      permissions,
      defaultRoute,
    },
  }
}

export async function registerUser(input: import('./auth.schema').RegisterInput) {
  const existingUser = await prisma.tbUsers.findUnique({
    where: { username: input.username }
  })

  if (existingUser) {
    throw new Error('Username sudah digunakan')
  }

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(input.password, saltRounds)

  const newUser = await prisma.tbUsers.create({
    data: {
      username: input.username,
      passwordHash,
      fullName: input.fullName,
      role: 'viewer', // default role
      isActive: false, // require admin approval
    }
  })

  logger.info('User baru mendaftar', { username: newUser.username })

  return {
    message: 'Pendaftaran berhasil. Silakan tunggu persetujuan Admin.'
  }
}
