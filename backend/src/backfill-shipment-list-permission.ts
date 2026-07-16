/**
 * Migration: backfill-shipment-list-permission.ts
 *
 * Tujuan:
 *  - Menambahkan permission baru '/shipping/shipments/list' untuk setiap role
 *    yang sudah punya canView=1 di '/shipping/shipments'.
 *  - Tidak menghapus/mengubah row lama sama sekali (backward-compatible).
 *
 * Cara jalanin (sesuaikan dengan setup project, contoh pakai ts-node):
 *   npx ts-node scripts/backfill-shipment-list-permission.ts
 *
 * Aman dijalankan berkali-kali (idempotent) karena selalu dicek existing dulu
 * sebelum insert.
 */
import { prisma } from '../config/database'

const PARENT_PATH = '/shipping/shipments'
const NEW_CHILD_PATH = '/shipping/shipments/list'

async function main() {
  const rolesWithShipmentAccess = await prisma.$queryRaw<
    { role: string; isDefault: boolean }[]
  >`
    SELECT role, isDefault
    FROM [dbo].[tbRolePermissions]
    WHERE path = ${PARENT_PATH} AND canView = 1
  `

  if (rolesWithShipmentAccess.length === 0) {
    console.log('Tidak ada role dengan akses ke', PARENT_PATH, '- tidak ada yang perlu di-backfill.')
    return
  }

  let inserted = 0
  let skipped = 0

  for (const { role } of rolesWithShipmentAccess) {
    const existing = await prisma.$queryRaw<{ role: string }[]>`
      SELECT TOP 1 role
      FROM [dbo].[tbRolePermissions]
      WHERE role = ${role} AND path = ${NEW_CHILD_PATH}
    `

    if (existing.length > 0) {
      skipped++
      continue
    }

    await prisma.$executeRaw`
      INSERT INTO [dbo].[tbRolePermissions] (role, path, canView, isDefault)
      VALUES (${role}, ${NEW_CHILD_PATH}, 1, 0)
    `
    inserted++
    console.log(`  + ditambahkan '${NEW_CHILD_PATH}' untuk role '${role}'`)
  }

  console.log(`\nSelesai. Ditambahkan: ${inserted} role, dilewati (sudah ada): ${skipped} role.`)
}

main()
  .catch((err) => {
    console.error('Migration gagal:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
