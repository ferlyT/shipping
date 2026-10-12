import { prisma } from '../src/config/database'
import { logger } from '../src/config/logger'

async function main() {
  console.log('--- Migrasi Database: Membuat Tabel tbBillingAttachment ---')

  const createTableSQL = `
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'tbBillingAttachment')
    BEGIN
      CREATE TABLE [dbo].[tbBillingAttachment] (
        [fdId] INT IDENTITY(1,1) NOT NULL,
        [fdInvNo] CHAR(20) NOT NULL,
        [fdFileName] NVARCHAR(255) NOT NULL,
        [fdFileSavedName] NVARCHAR(255) NOT NULL,
        [fdFileType] NVARCHAR(100) NOT NULL,
        [fdFileSize] BIGINT NOT NULL,
        [fdFileUrl] NVARCHAR(500) NOT NULL,
        [fdCaption] NVARCHAR(255) NULL,
        [fdUploadedBy] NVARCHAR(100) NOT NULL,
        [fdCreatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [PK_tbBillingAttachment] PRIMARY KEY CLUSTERED ([fdId] ASC),
        CONSTRAINT [FK_tbBillingAttachment_tbBilling] FOREIGN KEY ([fdInvNo])
          REFERENCES [dbo].[tbBilling] ([fdInvNo]) ON DELETE CASCADE
      );
      CREATE INDEX [IX_tbBillingAttachment_invNo] ON [dbo].[tbBillingAttachment] ([fdInvNo]);
      CREATE INDEX [IX_tbBillingAttachment_createdAt] ON [dbo].[tbBillingAttachment] ([fdCreatedAt] DESC);
      PRINT 'Tabel tbBillingAttachment berhasil dibuat.';
    END
    ELSE
    BEGIN
      PRINT 'Tabel tbBillingAttachment sudah ada.';
    END
  `

  await prisma.$executeRawUnsafe(createTableSQL)
  console.log('[OK] Eksekusi DDL tbBillingAttachment selesai.')
}

main()
  .catch((err) => {
    logger.error('Gagal membuat tabel tbBillingAttachment:', err)
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
