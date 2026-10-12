/**
 * Migration: backfill-billing-dashboard-permissions.ts
 *
 * Tujuan:
 *  - Memisahkan izin akses Billing Dashboard menjadi dua:
 *    1. '/mshipping/finance/billing/operational' (Billing Dashboard Operational)
 *    2. '/mshipping/finance/billing/finance' (Billing Dashboard Finance)
 *  - Idempotent: dapat dijalankan berkali-kali tanpa duplikasi.
 */
import { prisma } from './config/database'

export async function backfillBillingDashboardPermissions() {
  const roles = await prisma.$queryRaw<{ role: string }[]>`
    SELECT DISTINCT role FROM [dbo].[tbRolePermissions] ORDER BY role
  `

  for (const { role } of roles) {
    const existingOld = await prisma.$queryRaw<{ canView: boolean }[]>`
      SELECT canView FROM [dbo].[tbRolePermissions]
      WHERE role = ${role} AND path = '/mshipping/finance/billing'
    `
    const oldCanView = existingOld[0]?.canView ?? false

    // 1. Operational permission
    const existingOp = await prisma.$queryRaw<{ role: string }[]>`
      SELECT TOP 1 role FROM [dbo].[tbRolePermissions]
      WHERE role = ${role} AND path = '/mshipping/finance/billing/operational'
    `
    if (existingOp.length === 0) {
      const canViewOp = oldCanView || role === 'billing' ? 1 : 0
      await prisma.$executeRaw`
        INSERT INTO [dbo].[tbRolePermissions] (role, path, canView, isDefault)
        VALUES (${role}, '/mshipping/finance/billing/operational', ${canViewOp}, 0)
      `
    }

    // 2. Finance permission
    const existingFin = await prisma.$queryRaw<{ role: string }[]>`
      SELECT TOP 1 role FROM [dbo].[tbRolePermissions]
      WHERE role = ${role} AND path = '/mshipping/finance/billing/finance'
    `
    if (existingFin.length === 0) {
      const canViewFin = oldCanView || role === 'finance' ? 1 : 0
      await prisma.$executeRaw`
        INSERT INTO [dbo].[tbRolePermissions] (role, path, canView, isDefault)
        VALUES (${role}, '/mshipping/finance/billing/finance', ${canViewFin}, 0)
      `
    }
  }
}

if (import.meta.main) {
  backfillBillingDashboardPermissions().then(() => {
    console.log('Backfill billing dashboard permissions completed.')
    process.exit(0)
  })
}
