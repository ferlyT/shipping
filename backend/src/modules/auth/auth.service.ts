import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/database'
import { ENV } from '../../config/env'
import { logger } from '../../config/logger'
import type { LoginInput } from './auth.schema'

export async function loginUser(input: LoginInput) {
  const user = await prisma.tbUsers.findUnique({
    where: { username: input.username }
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
  const permissionsList = await rolesService.getRolePermissions(user.role)
  const permissions = permissionsList.filter(p => p.canView).map(p => p.path)

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role, permissions },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as any }
  )

  logger.info('User login berhasil', { username: input.username })
  
  // Determine default route
  const defaultPermission = permissionsList.find(p => p.isDefault)
  const defaultRoute = defaultPermission 
    ? defaultPermission.path 
    : (permissions.length > 0 ? permissions[0] : null)

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
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
