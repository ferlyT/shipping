import { prisma } from '../../config/database'

export async function getAllUsers() {
  const users = await prisma.tbUsers.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return users
}

export async function updateUserStatus(id: string, isActive: boolean) {
  const user = await prisma.tbUsers.update({
    where: { id },
    data: { isActive },
    select: { id: true, username: true, isActive: true },
  })
  return user
}

export async function updateUserRole(id: string, role: string) {
  const user = await prisma.tbUsers.update({
    where: { id },
    data: { role },
    select: { id: true, username: true, role: true },
  })
  return user
}

export async function deleteUser(id: string) {
  const user = await prisma.tbUsers.update({
    where: { id },
    data: { isDeleted: true },
    select: { id: true, username: true },
  })
  return user
}

export async function getTrashedUsers() {
  const users = await prisma.tbUsers.findMany({
    where: { isDeleted: true },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return users
}

export async function restoreUser(id: string) {
  const user = await prisma.tbUsers.update({
    where: { id },
    data: { isDeleted: false },
    select: { id: true, username: true },
  })
  return user
}

export async function hardDeleteUser(id: string) {
  const user = await prisma.tbUsers.delete({
    where: { id },
    select: { id: true, username: true },
  })
  return user
}
