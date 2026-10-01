import { Hono } from 'hono'
import { rolesService } from './roles.service'
import { authMiddleware, isAdmin } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import { validateBody } from '../../middleware/requestValidator'
import { UpdateRolePermissionsSchema, isValidRoleName } from './roles.types'

const rolesRoutes = new Hono()

// Hanya admin yang bisa mengelola role permissions
rolesRoutes.use('/*', authMiddleware, isAdmin)

rolesRoutes.get('/', async (c) => {
  try {
    const data = await rolesService.getAllRoles()
    return successResponse(c, data)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil data peran', 500)
  }
})

rolesRoutes.get('/:role', async (c) => {
  const role = c.req.param('role')
  if (!isValidRoleName(role)) {
    return errorResponse(c, 'Nama peran tidak valid', 400)
  }
  try {
    const data = await rolesService.getRolePermissions(role)
    return successResponse(c, data)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil izin peran', 500)
  }
})

rolesRoutes.put('/:role', validateBody(UpdateRolePermissionsSchema), async (c) => {
  const role = c.req.param('role')
  if (!isValidRoleName(role)) {
    return errorResponse(c, 'Nama peran tidak valid', 400)
  }

  const { permissions } = c.req.valid('json')
  try {
    const data = await rolesService.updateRolePermissions(role, permissions)
    return successResponse(c, data)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal memperbarui izin peran', 500)
  }
})

rolesRoutes.post('/:role', async (c) => {
  const role = c.req.param('role')
  if (!isValidRoleName(role)) {
    return errorResponse(c, 'Nama peran tidak valid', 400)
  }

  try {
    const data = await rolesService.createRole(role)
    return successResponse(c, data, undefined, 201)
  } catch (err: any) {
    if (err?.message === 'Role already exists') {
      return errorResponse(c, err.message, 409)
    }
    return errorResponse(c, err.message || 'Gagal membuat peran', 500)
  }
})

export { rolesRoutes }
