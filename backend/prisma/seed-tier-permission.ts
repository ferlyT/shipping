import { prisma } from '../src/config/database'

async function main() {
  try {
    const existing = await prisma.$queryRawUnsafe(`
      SELECT * FROM tbRolePermissions WHERE path = '/mshipping/master/customers/tier'
    `)
    console.log('Existing tier permissions:', existing)

    if ((existing as any[]).length === 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO tbRolePermissions (id, role, path, canView, isDefault, createdAt)
        VALUES (NEWID(), 'admin', '/mshipping/master/customers/tier', 1, 0, GETDATE())
      `)
      console.log('Inserted tier permission for admin')
    }
  } catch (err) {
    console.error('Error seeding tier permission:', err)
  }
}

main().catch(console.error).finally(() => process.exit(0))
