import { Hono } from 'hono'
import {
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getTrashedUsers,
  restoreUser,
  hardDeleteUser,
  getAllEmployees,
  updateUserEmployee,
} from './users.service'
import { authMiddleware, isAdmin } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import { validateBody } from '../../middleware/requestValidator'
import {
  UpdateUserStatusSchema,
  UpdateUserRoleSchema,
  UpdateUserEmployeeSchema,
} from './users.types'

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

usersRoutes.patch('/:id/status', validateBody(UpdateUserStatusSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const { isActive } = c.req.valid('json')
    const user = await updateUserStatus(id, isActive)
    return successResponse(c, user)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

usersRoutes.patch('/:id/role', validateBody(UpdateUserRoleSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const { role } = c.req.valid('json')
    const user = await updateUserRole(id, role)
    return successResponse(c, user)
  } catch (err: any) {
    return errorResponse(c, err.message, 500)
  }
})

usersRoutes.get('/employees', async (c) => {
  try {
    const employees = await getAllEmployees()
    return successResponse(c, employees)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

usersRoutes.patch('/:id/employee', validateBody(UpdateUserEmployeeSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const { fdEmpCode } = c.req.valid('json')
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
