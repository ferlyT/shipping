import { prisma } from '../../config/database'

export async function getAllUsers() {
  const users = await prisma.tbUsers.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      fdEmpCode: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      employee: {
        select: { fdEmpName: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  })
  return users.map((u) => ({
    ...u,
    fdEmpCode: u.fdEmpCode ? u.fdEmpCode.trim() : null,
    fdEmpName: u.employee?.fdEmpName ? u.employee.fdEmpName.trim() : null,
  }))
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

export async function updateUserEmployee(id: string, fdEmpCode: string | null) {
  const cleanCode = fdEmpCode ? fdEmpCode.trim() : null
  const user = await prisma.tbUsers.update({
    where: { id },
    data: { fdEmpCode: cleanCode },
    include: {
      employee: { select: { fdEmpName: true } }
    }
  })
  return {
    id: user.id,
    username: user.username,
    fdEmpCode: user.fdEmpCode ? user.fdEmpCode.trim() : null,
    fdEmpName: user.employee?.fdEmpName ? user.employee.fdEmpName.trim() : null,
  }
}

export async function getAllEmployees() {
  const employees = await prisma.tbEmployees.findMany({
    select: { fdEmpCode: true, fdEmpName: true },
    orderBy: { fdEmpName: 'asc' }
  })
  return employees.map((e) => ({
    fdEmpCode: e.fdEmpCode.trim(),
    fdEmpName: e.fdEmpName.trim()
  }))
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
      fdEmpCode: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      employee: {
        select: { fdEmpName: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  })
  return users.map((u) => ({
    ...u,
    fdEmpCode: u.fdEmpCode ? u.fdEmpCode.trim() : null,
    fdEmpName: u.employee?.fdEmpName ? u.employee.fdEmpName.trim() : null,
  }))
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
