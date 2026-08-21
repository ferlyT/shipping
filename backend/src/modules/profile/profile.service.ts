import bcrypt from 'bcrypt'
import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import type { UpdateProfileInput, ChangePasswordInput } from './profile.schema'

export async function getProfile(userId: string) {
  const user = await prisma.tbUsers.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
      lastLoginAt: true,
    }
  })

  if (!user) {
    throw new Error('Pengguna tidak ditemukan')
  }

  return user
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.tbUsers.update({
    where: { id: userId },
    data: {
      fullName: input.fullName.trim(),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
      lastLoginAt: true,
    }
  })

  logger.info('Profile user berhasil diperbarui', { userId, username: user.username })
  return user
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.tbUsers.findUnique({
    where: { id: userId }
  })

  if (!user) {
    throw new Error('Pengguna tidak ditemukan')
  }

  const isPasswordValid = await bcrypt.compare(input.currentPassword, user.passwordHash)
  if (!isPasswordValid) {
    throw new Error('Password saat ini salah')
  }

  if (input.currentPassword === input.newPassword) {
    throw new Error('Password baru tidak boleh sama dengan password saat ini')
  }

  const saltRounds = 10
  const passwordHash = await bcrypt.hash(input.newPassword, saltRounds)

  await prisma.tbUsers.update({
    where: { id: userId },
    data: { passwordHash }
  })

  logger.info('Password user berhasil diubah', { userId, username: user.username })

  return {
    message: 'Password berhasil diubah'
  }
}

export async function uploadAvatar(userId: string, file: File) {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error('Format gambar tidak didukung. Harap gunakan JPEG, PNG, WEBP, atau GIF')
  }

  const maxSizeBytes = 3 * 1024 * 1024 // 3MB
  if (file.size > maxSizeBytes) {
    throw new Error('Ukuran gambar maksimal adalah 3MB')
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
  await fs.mkdir(uploadsDir, { recursive: true })

  const ext = path.extname(file.name) || (file.type === 'image/png' ? '.png' : file.type === 'image/webp' ? '.webp' : '.jpg')
  const fileName = `avatar-${userId}-${Date.now()}${ext}`
  const filePath = path.join(uploadsDir, fileName)

  const arrayBuffer = await file.arrayBuffer()
  await fs.writeFile(filePath, Buffer.from(arrayBuffer))

  const avatarUrl = `/uploads/avatars/${fileName}`

  // Update user in DB
  const updatedUser = await prisma.tbUsers.update({
    where: { id: userId },
    data: { avatarUrl },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
      lastLoginAt: true,
    }
  })

  logger.info('Foto profil user berhasil diunggah', { userId, avatarUrl })

  return {
    avatarUrl,
    user: updatedUser
  }
}
