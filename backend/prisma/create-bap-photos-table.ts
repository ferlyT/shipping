import { prisma } from '../src/config/database'

async function main() {
  console.log('Menjalankan pembuatan tabel tbInspectionPhoto...')

  try {
    const createInspectionPhotoSQL = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'tbInspectionPhoto')
      BEGIN
        CREATE TABLE [dbo].[tbInspectionPhoto] (
          [fdId] INT IDENTITY(1,1) NOT NULL,
          [fdReportId] INT NOT NULL,
          [fdPhotoUrl] NVARCHAR(500) NOT NULL,
          [fdCaption] NVARCHAR(255) NULL,
          [fdUploadedBy] NVARCHAR(100) NOT NULL,
          [fdCreatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT [PK_tbInspectionPhoto] PRIMARY KEY CLUSTERED ([fdId] ASC),
          CONSTRAINT [FK_tbInspectionPhoto_report] FOREIGN KEY ([fdReportId]) REFERENCES [dbo].[tbInspectionReport]([fdId]) ON DELETE CASCADE
        );
        CREATE INDEX [IX_tbInspectionPhoto_reportId] ON [dbo].[tbInspectionPhoto] ([fdReportId]);
        PRINT 'Tabel tbInspectionPhoto berhasil dibuat.';
      END
      ELSE
      BEGIN
        PRINT 'Tabel tbInspectionPhoto sudah ada, melewati.';
      END
    `

    await prisma.$executeRawUnsafe(createInspectionPhotoSQL)
    console.log('✓ tbInspectionPhoto check/create selesai.')
  } catch (err) {
    console.error('Gagal migrasi:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
