import { prisma } from '../../config/database'

export const rolesService = {
  async getAllRoles() {
    // Get unique roles
    const result: any[] = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT role FROM [dbo].[tbRolePermissions]
    `)
    return result.map(r => r.role)
  },

  async getRolePermissions(role: string) {
    const result: any[] = await prisma.$queryRawUnsafe(`
      SELECT path, canView, isDefault FROM [dbo].[tbRolePermissions] WHERE role = '${role}'
    `)
    return result
  },

  async updateRolePermissions(role: string, permissions: { path: string, canView: boolean, isDefault?: boolean }[]) {
    // Delete existing
    await prisma.$executeRawUnsafe(`
      DELETE FROM [dbo].[tbRolePermissions] WHERE role = '${role}'
    `)

    // Insert new
    for (const p of permissions) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO [dbo].[tbRolePermissions] (role, path, canView, isDefault)
        VALUES ('${role}', '${p.path}', ${p.canView ? 1 : 0}, ${p.isDefault ? 1 : 0})
      `)
    }

    return this.getRolePermissions(role)
  },

  async createRole(role: string) {
    // Check if exists
    const existing: any[] = await prisma.$queryRawUnsafe(`
      SELECT TOP 1 role FROM [dbo].[tbRolePermissions] WHERE role = '${role}'
    `)
    if (existing.length > 0) {
      throw new Error('Role already exists')
    }

    // Copy viewer paths as default
    const viewerPaths = [
      '/shipping/dashboard',
      '/shipping/customers',
      '/shipping/shipments',
      '/shipping/shipment-batches',
      '/shipping/delivery-orders',
      '/shipping/billing'
    ]

    for (const path of viewerPaths) {
      const isDefault = path === '/shipping/dashboard'
      await prisma.$executeRawUnsafe(`
        INSERT INTO [dbo].[tbRolePermissions] (role, path, canView, isDefault)
        VALUES ('${role}', '${path}', 1, ${isDefault ? 1 : 0})
      `)
    }

    return this.getRolePermissions(role)
  }
}
