import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../../config/database'
import { ENV } from '../../config/env'
import { logger } from '../../config/logger'
import type { LoginInput } from './auth.schema'

export async function loginUser(input: LoginInput) {
  // MOCK LOGIN UNTUK TESTING FRONTEND (Karena DB belum connect)
  logger.info('Mencoba login (MOCK)', { username: input.username })

  // Simulasi delay jaringan
  await new Promise(resolve => setTimeout(resolve, 800))

  if (input.username !== 'admin' || input.password !== 'admin123') {
    throw new Error('Username atau password salah (Gunakan admin / admin123)')
  }

  const token = jwt.sign(
    { userId: 'test-id-1', username: input.username, role: 'admin' },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN }
  )

  logger.info('User login berhasil (MOCK)', { username: input.username })

  return {
    token,
    user: {
      id: 'test-id-1',
      username: input.username,
      fullName: 'Demo Administrator',
      role: 'admin',
    },
  }
}
