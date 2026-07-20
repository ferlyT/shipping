import { Hono } from 'hono'
import { rolesService } from './roles.service'
import { authMiddleware, isAdmin } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'

const rolesRoutes = new Hono()

// Hanya admin yang bisa mengelola role permissions
rolesRoutes.use('/*', authMiddleware, isAdmin)

// Validasi ringan: role hanya boleh huruf/angka/underscore/dash, cegah nama role aneh-aneh
// (query sudah aman dari injection lewat $queryRaw, ini tambahan sanity-check di level input)
const ROLE_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,50}$/

function isValidRoleName(role: string) {
  return ROLE_NAME_PATTERN.test(role)
}

rolesRoutes.get('/', async (c) => {
  const data = await rolesService.getAllRoles()
  return successResponse(c, data)
})

rolesRoutes.get('/:role', async (c) => {
  const role = c.req.param('role')
  if (!isValidRoleName(role)) {
    return errorResponse(c, 'Invalid role name', 400)
  }
  const data = await rolesService.getRolePermissions(role)
  return successResponse(c, data)
})

rolesRoutes.put('/:role', async (c) => {
  const role = c.req.param('role')
  if (!isValidRoleName(role)) {
    return errorResponse(c, 'Invalid role name', 400)
  }

  const body = await c.req.json().catch(() => null) // Expects: { permissions: { path: string, canView: boolean }[] }
  if (!body || !Array.isArray(body.permissions)) {
    return errorResponse(c, 'Body must include a "permissions" array', 400)
  }

  const invalidEntry = body.permissions.find(
    (p: any) => typeof p?.path !== 'string' || typeof p?.canView !== 'boolean'
  )
  if (invalidEntry) {
    return errorResponse(c, 'Each permission must have { path: string, canView: boolean }', 400)
  }

  const data = await rolesService.updateRolePermissions(role, body.permissions)
  return successResponse(c, data, 'Permissions updated successfully')
})

rolesRoutes.post('/:role', async (c) => {
  // Add a new custom role, duplicating viewer access initially
  const role = c.req.param('role')
  if (!isValidRoleName(role)) {
    return errorResponse(c, 'Invalid role name', 400)
  }

  try {
    const data = await rolesService.createRole(role)
    return successResponse(c, data, 'Role created successfully')
  } catch (err: any) {
    if (err?.message === 'Role already exists') {
      return errorResponse(c, err.message, 409)
    }
    throw err
  }
})

export { rolesRoutes }
