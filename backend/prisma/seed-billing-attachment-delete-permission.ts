import { prisma } from '../src/config/database'
import { logger } from '../src/config/logger'

async function main() {
  console.log('--- Seeding Billing Attachment Delete Permission ---')

  const deletePermissionPath = '/mshipping/finance/billing/attachments/delete'
  const rolesToAssign = ['admin', 'superadmin']

  for (const role of rolesToAssign) {
    const existing = await prisma.tbRolePermissions.findUnique({
      where: {
        role_path: {
          role,
          path: deletePermissionPath,
        },
      },
    })

    if (!existing) {
      await prisma.tbRolePermissions.create({
        data: {
          role,
          path: deletePermissionPath,
          canView: true,
          isDefault: false,
        },
      })
      console.log(`[OK] Permission ${deletePermissionPath} ditambahkan ke role '${role}'`)
    } else {
      console.log(`[SKIP] Permission ${deletePermissionPath} sudah ada di role '${role}'`)
    }
  }

  console.log('--- Selesai Seeding Billing Attachment Delete Permission ---')
}

main()
  .catch((err) => {
    logger.error('Error seeding billing attachment delete permission:', err)
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
