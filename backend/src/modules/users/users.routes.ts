import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getAllUsers, updateUserStatus, updateUserRole, deleteUser, getTrashedUsers, restoreUser, hardDeleteUser } from './users.service'
import { authMiddleware, isAdmin } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'

const usersRoutes = new Hono()

// Semua route di bawah ini wajib auth dan role = admin
usersRoutes.use('*', authMiddleware, isAdmin)

usersRoutes.get('/', async (c) => {
  try {
    const users = await getAllUsers()
    return successResponse(c, users)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

usersRoutes.get('/trash', async (c) => {
  try {
    const users = await getTrashedUsers()
    return successResponse(c, users)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

const statusSchema = z.object({
  isActive: z.boolean()
})

usersRoutes.patch('/:id/status', zValidator('json', statusSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const { isActive } = c.req.valid('json')
    const user = await updateUserStatus(id, isActive)
    return successResponse(c, user)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

const roleSchema = z.object({
  role: z.string().min(1, 'Role wajib diisi'),
})

usersRoutes.patch('/:id/role', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const parsed = roleSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(c, parsed.error.issues[0]?.message || 'Peran tidak valid', 400)
    }
    const user = await updateUserRole(id, parsed.data.role)
    return successResponse(c, user)
  } catch (err: any) {
    return errorResponse(c, err.message, 500)
  }
})

usersRoutes.get('/employees', async (c) => {
  try {
    const { getAllEmployees } = await import('./users.service')
    const employees = await getAllEmployees()
    return successResponse(c, employees)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

const employeeSchema = z.object({
  fdEmpCode: z.string().nullable().optional()
})

usersRoutes.patch('/:id/employee', zValidator('json', employeeSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const { fdEmpCode } = c.req.valid('json')
    const { updateUserEmployee } = await import('./users.service')
    const user = await updateUserEmployee(id, fdEmpCode || null)
    return successResponse(c, user)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

usersRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const user = await deleteUser(id)
    return successResponse(c, user)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

usersRoutes.patch('/:id/restore', async (c) => {
  try {
    const id = c.req.param('id')
    const user = await restoreUser(id)
    return successResponse(c, user)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

usersRoutes.delete('/:id/permanent', async (c) => {
  try {
    const id = c.req.param('id')
    const user = await hardDeleteUser(id)
    return successResponse(c, user)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

export { usersRoutes }
