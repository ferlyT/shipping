import { prisma } from '../src/config/database'

async function main() {
  console.log('Memeriksa kolom fdListType di tbInspectionReport...')
  
  await prisma.$executeRawUnsafe(`
    IF NOT EXISTS (
      SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'tbInspectionReport' AND COLUMN_NAME = 'fdListType'
    )
    BEGIN
      ALTER TABLE tbInspectionReport 
      ADD fdListType INT NOT NULL CONSTRAINT DF_tbInspectionReport_fdListType DEFAULT 2;
      PRINT 'Kolom fdListType berhasil ditambahkan.';
    END
    ELSE
    BEGIN
      PRINT 'Kolom fdListType sudah ada.';
    END
  `)

  console.log('Kolom fdListType di tbInspectionReport siap.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Gagal menambahkan fdListType:', err)
  process.exit(1)
})
