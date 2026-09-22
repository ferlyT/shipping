import { prisma } from './src/config/database'

async function main() {
  console.log('--- Backfilling Cashier & Commodity Mapping Permissions ---')
  const newPaths = [
    '/mshipping/finance/cashier',
    '/mshipping/finance/commodity-mapping',
  ]

  const roles = ['admin', 'finance', 'kasir', 'viewer']

  for (const role of roles) {
    for (const path of newPaths) {
      const existing = await prisma.$queryRaw<{ role: string }[]>`
        SELECT role FROM [dbo].[tbRolePermissions] WHERE role = ${role} AND path = ${path}
      `
      if (existing.length === 0) {
        await prisma.$executeRaw`
          INSERT INTO [dbo].[tbRolePermissions] (role, path, canView, isDefault)
          VALUES (${role}, ${path}, 1, 0)
        `
        console.log(`[+] Added ${path} for role ${role}`)
      } else {
        console.log(`[.] Already exists: ${path} for role ${role}`)
      }
    }
  }

  // Khusus role 'kasir', pastikan default path adalah /mshipping/finance/cashier jika diinginkan
  // atau biarkan user memilih.

  console.log('--- Checking all permissions for role kasir ---')
  const kasirPerms = await prisma.$queryRaw<{ path: string; canView: boolean }[]>`
    SELECT path, canView FROM [dbo].[tbRolePermissions] WHERE role = 'kasir'
  `
  console.log('Kasir permissions:', kasirPerms)

  console.log('--- Checking all permissions for role finance ---')
  const financePerms = await prisma.$queryRaw<{ path: string; canView: boolean }[]>`
    SELECT path, canView FROM [dbo].[tbRolePermissions] WHERE role = 'finance'
  `
  console.log('Finance permissions:', financePerms)

  console.log('Done!')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
