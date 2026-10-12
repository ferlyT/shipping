import { prisma } from './src/config/database'

async function main() {
  console.log('--- Backfilling View Consignee Permission ---')
  const path = '/mshipping/finance/billing/view-consignee'

  const roles = await prisma.tbRolePermissions.findMany({
    select: { role: true },
    distinct: ['role'],
  })

  const allowedRoles = new Set(['admin', 'superadmin', 'billing', 'finance', 'ar'])

  for (const { role } of roles) {
    const existing = await prisma.$queryRaw<{ role: string }[]>`
      SELECT role FROM [dbo].[tbRolePermissions] WHERE role = ${role} AND path = ${path}
    `
    const canView = allowedRoles.has(role) ? 1 : 0
    if (existing.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO [dbo].[tbRolePermissions] (role, path, canView, isDefault)
        VALUES (${role}, ${path}, ${canView}, 0)
      `
      console.log(`[+] Added ${path} for role ${role} (canView: ${canView})`)
    } else {
      console.log(`[.] Already exists: ${path} for role ${role}`)
    }
  }

  console.log('Done backfilling consignee permission!')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
