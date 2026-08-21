import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Menjalankan pembuatan tabel tbRolePermissions...')

  try {
    // 1. Cek apakah tabel sudah ada
    const checkTableQuery = `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_NAME = 'tbRolePermissions'
    `
    const result: any[] = await prisma.$queryRawUnsafe(checkTableQuery)
    const tableExists = result[0]?.count > 0

    if (!tableExists) {
      console.log('Tabel tbRolePermissions belum ada. Membuat tabel...')
      
      const createTableQuery = `
        CREATE TABLE [dbo].[tbRolePermissions] (
            [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
            [role] NVARCHAR(50) NOT NULL,
            [path] NVARCHAR(100) NOT NULL,
            [canView] BIT NOT NULL DEFAULT 1,
            [createdAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [PK_tbRolePermissions] PRIMARY KEY CLUSTERED ([id] ASC),
            CONSTRAINT [UK_tbRolePermissions_role_path] UNIQUE ([role], [path])
        );
      `
      
      await prisma.$executeRawUnsafe(createTableQuery)
      console.log('Tabel tbRolePermissions berhasil dibuat.')
      
      // 2. Seed initial permissions
      const paths = [
        '/mshipping/dashboard',
        '/mshipping/customers',
        '/mshipping/shipments',
        '/mshipping/shipment-batches',
        '/mshipping/delivery-orders',
        '/mshipping/billing',
        '/mshipping/users',
        '/mshipping/roles'
      ]

      console.log('Seeding initial role permissions...')

      // Admin gets all paths
      for (const path of paths) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO [dbo].[tbRolePermissions] (role, path, canView)
          VALUES ('admin', '${path}', 1)
        `)
      }

      // Viewer gets limited paths
      const viewerPaths = [
        '/mshipping/dashboard',
        '/mshipping/customers',
        '/mshipping/shipments',
        '/mshipping/shipment-batches',
        '/mshipping/delivery-orders',
        '/mshipping/billing'
      ]
      
      for (const path of viewerPaths) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO [dbo].[tbRolePermissions] (role, path, canView)
          VALUES ('viewer', '${path}', 1)
        `)
      }

      console.log('Seeding role permissions selesai.')

    } else {
      console.log('Tabel tbRolePermissions sudah ada, melewati pembuatan.')
    }
  } catch (error) {
    console.error('Terjadi kesalahan:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
