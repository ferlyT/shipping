import { prisma } from '../src/config/database'
import { logger } from '../src/config/logger'

async function main() {
  console.log('--- Seeding Data Revisions Role & Permissions ---')

  const revisionPath = '/mshipping/logistics/data-revisions'

  // 1. Pastikan role admin memiliki akses
  const adminPerm = await prisma.tbRolePermissions.findUnique({
    where: {
      role_path: {
        role: 'admin',
        path: revisionPath,
      },
    },
  })

  if (!adminPerm) {
    await prisma.tbRolePermissions.create({
      data: {
        role: 'admin',
        path: revisionPath,
        canView: true,
        isDefault: false,
      },
    })
    console.log(`[OK] Permission ${revisionPath} ditambahkan ke role 'admin'`)
  } else {
    console.log(`[SKIP] Permission ${revisionPath} sudah ada di role 'admin'`)
  }

  // 2. Tambahkan ke role 'ar' (Accounts Receivable / Finance yang sering menangani revisi bill)
  const arPerm = await prisma.tbRolePermissions.findUnique({
    where: {
      role_path: {
        role: 'ar',
        path: revisionPath,
      },
    },
  })

  if (!arPerm) {
    await prisma.tbRolePermissions.create({
      data: {
        role: 'ar',
        path: revisionPath,
        canView: true,
        isDefault: false,
      },
    })
    console.log(`[OK] Permission ${revisionPath} ditambahkan ke role 'ar'`)
  } else {
    console.log(`[SKIP] Permission ${revisionPath} sudah ada di role 'ar'`)
  }

  // 3. Buat role baru 'revisi' khusus untuk petugas revisi data
  const existingRevisiRole = await prisma.tbRolePermissions.findFirst({
    where: { role: 'revisi' },
  })

  if (!existingRevisiRole) {
    console.log(`Membuat dedicated role baru: 'revisi'...`)
    const revisiRolePaths = [
      { path: '/mshipping/overview/dashboard', canView: true, isDefault: true },
      { path: revisionPath, canView: true, isDefault: false },
      { path: '/mshipping/logistics/shipments', canView: true, isDefault: false },
      { path: '/mshipping/logistics/shipments/list', canView: true, isDefault: false },
      { path: '/mshipping/master/customers', canView: true, isDefault: false },
    ]

    for (const item of revisiRolePaths) {
      await prisma.tbRolePermissions.create({
        data: {
          role: 'revisi',
          path: item.path,
          canView: item.canView,
          isDefault: item.isDefault,
        },
      })
    }
    console.log(`[OK] Role 'revisi' berhasil dibuat dengan ${revisiRolePaths.length} permissions`)
  } else {
    // Pastikan permission revisionPath ada di role 'revisi'
    const permInRevisi = await prisma.tbRolePermissions.findUnique({
      where: {
        role_path: {
          role: 'revisi',
          path: revisionPath,
        },
      },
    })
    if (!permInRevisi) {
      await prisma.tbRolePermissions.create({
        data: {
          role: 'revisi',
          path: revisionPath,
          canView: true,
          isDefault: false,
        },
      })
      console.log(`[OK] Permission ${revisionPath} ditambahkan ke role 'revisi'`)
    } else {
      console.log(`[SKIP] Role 'revisi' sudah lengkap`)
    }
  }

  console.log('--- Selesai Seeding Data Revisions Role & Permissions ---')
}

main()
  .catch((err) => {
    console.error('Error seeding data revisions permission:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
