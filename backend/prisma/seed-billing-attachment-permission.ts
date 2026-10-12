import { prisma } from '../src/config/database'
import { logger } from '../src/config/logger'

async function main() {
  console.log('--- Seeding Billing Attachment Role & Permissions ---')

  const attachmentPath = '/mshipping/finance/billing/attachments'
  const rolesToAssign = ['admin', 'superadmin', 'finance', 'kasir', 'ar']

  for (const role of rolesToAssign) {
    const existing = await prisma.tbRolePermissions.findUnique({
      where: {
        role_path: {
          role,
          path: attachmentPath,
        },
      },
    })

    if (!existing) {
      await prisma.tbRolePermissions.create({
        data: {
          role,
          path: attachmentPath,
          canView: true,
          isDefault: false,
        },
      })
      console.log(`[OK] Permission ${attachmentPath} ditambahkan ke role '${role}'`)
    } else {
      console.log(`[SKIP] Permission ${attachmentPath} sudah ada di role '${role}'`)
    }
  }

  console.log('--- Selesai Seeding Billing Attachment Role & Permissions ---')
}

main()
  .catch((err) => {
    logger.error('Error seeding billing attachment permission:', err)
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
