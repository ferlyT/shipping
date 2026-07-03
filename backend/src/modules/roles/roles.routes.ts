import { Hono } from 'hono'
import { rolesService } from './roles.service'
import { authMiddleware, isAdmin } from '../../middleware/auth'

const rolesRoutes = new Hono()

// Hanya admin yang bisa mengelola role permissions
rolesRoutes.use('/*', authMiddleware, isAdmin)

rolesRoutes.get('/', async (c) => {
  const data = await rolesService.getAllRoles()
  return c.json({ data })
})

rolesRoutes.get('/:role', async (c) => {
  const role = c.req.param('role')
  const data = await rolesService.getRolePermissions(role)
  return c.json({ data })
})

rolesRoutes.put('/:role', async (c) => {
  const role = c.req.param('role')
  const body = await c.req.json() // Expects: { permissions: { path: string, canView: boolean }[] }
  const data = await rolesService.updateRolePermissions(role, body.permissions)
  return c.json({ message: 'Permissions updated successfully', data })
})

rolesRoutes.post('/:role', async (c) => {
  // Add a new custom role, duplicating viewer access initially
  const role = c.req.param('role')
  const data = await rolesService.createRole(role)
  return c.json({ message: 'Role created successfully', data })
})

export { rolesRoutes }
