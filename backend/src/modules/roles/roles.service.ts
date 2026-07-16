import { prisma } from '../../config/database'

type RolePermissionRow = {
  path: string
  canView: boolean
  isDefault: boolean
}

export const rolesService = {
  async getAllRoles() {
    // Aman: tidak ada value user yang diinterpolasi di query ini
    const result = await prisma.$queryRaw<{ role: string }[]>`
      SELECT DISTINCT role FROM [dbo].[tbRolePermissions]
    `
    return result.map((r) => r.role)
  },

  async getRolePermissions(role: string) {
    // $queryRaw dengan tagged template -> Prisma otomatis parameterize ${role},
    // jadi tidak bisa dipakai untuk SQL injection walau isinya karakter aneh seperti kutip satu.
    const result = await prisma.$queryRaw<RolePermissionRow[]>`
      SELECT path, canView, isDefault
      FROM [dbo].[tbRolePermissions]
      WHERE role = ${role}
    `
    return result
  },

  async updateRolePermissions(
    role: string,
    permissions: { path: string; canView: boolean; isDefault?: boolean }[]
  ) {
    // Dibungkus transaction: kalau salah satu insert gagal di tengah loop,
    // semua di-rollback (tidak ninggalin role dengan permission setengah-setengah).
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        DELETE FROM [dbo].[tbRolePermissions] WHERE role = ${role}
      `

      for (const p of permissions) {
        await tx.$executeRaw`
          INSERT INTO [dbo].[tbRolePermissions] (role, path, canView, isDefault)
          VALUES (${role}, ${p.path}, ${p.canView ? 1 : 0}, ${p.isDefault ? 1 : 0})
        `
      }
    })

    return this.getRolePermissions(role)
  },

  async createRole(role: string) {
    const existing = await prisma.$queryRaw<{ role: string }[]>`
      SELECT TOP 1 role FROM [dbo].[tbRolePermissions] WHERE role = ${role}
    `
    if (existing.length > 0) {
      throw new Error('Role already exists')
    }

    // Copy viewer paths as default
    // Catatan: '/shipping/shipments' (Dashboard) dan '/shipping/shipments/list' (Daftar Resi)
    // sekarang dua permission terpisah (granular), lihat backfill-shipment-list-permission.ts
    // untuk migrasi role yang sudah ada sebelum perubahan ini.
    const viewerPaths = [
      '/shipping/dashboard',
      '/shipping/customers',
      '/shipping/shipments',
      '/shipping/shipments/list',
      '/shipping/shipment-batches',
      '/shipping/delivery-orders',
      '/shipping/billing',
    ]

    await prisma.$transaction(async (tx) => {
      for (const path of viewerPaths) {
        const isDefault = path === '/shipping/dashboard'
        await tx.$executeRaw`
          INSERT INTO [dbo].[tbRolePermissions] (role, path, canView, isDefault)
          VALUES (${role}, ${path}, 1, ${isDefault ? 1 : 0})
        `
      }
    })

    return this.getRolePermissions(role)
  },
}
