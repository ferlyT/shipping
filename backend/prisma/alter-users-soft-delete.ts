import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Menambahkan kolom isDeleted pada tbUsers...')
  
  try {
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID(N'[dbo].[tbUsers]') 
          AND name = 'isDeleted'
      )
      BEGIN
        ALTER TABLE [dbo].[tbUsers] ADD [isDeleted] BIT NOT NULL DEFAULT 0;
        PRINT '✅ Kolom isDeleted berhasil ditambahkan.';
      END
      ELSE
      BEGIN
        PRINT 'ℹ️ Kolom isDeleted sudah ada, melewatinya.';
      END
    `)
  } catch (error) {
    console.error('❌ Gagal mengubah tabel tbUsers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
