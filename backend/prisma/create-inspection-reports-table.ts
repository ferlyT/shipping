import { prisma } from '../src/config/database'

async function main() {
  console.log('Menjalankan pembuatan tabel tbInspectionReport & tbBAPCounter...')

  try {
    const createInspectionReportSQL = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'tbInspectionReport')
      BEGIN
        CREATE TABLE [dbo].[tbInspectionReport] (
          [fdId] INT IDENTITY(1,1) NOT NULL,
          [fdReportNumber] NVARCHAR(30) NOT NULL,
          [fdReportDate] DATETIME2 NOT NULL,
          [fdListCode] CHAR(7) NULL,
          [fdMarkingCode] NVARCHAR(50) NULL,
          [fdMarkingNo] NVARCHAR(50) NULL,
          [fdNamaCustomer] NVARCHAR(150) NOT NULL,
          [fdTerima] NVARCHAR(50) NULL,
          [fdKeterangan] NVARCHAR(MAX) NULL,
          [fdStatus] NVARCHAR(1) NOT NULL DEFAULT '1',
          [fdCreatedBy] NVARCHAR(100) NOT NULL,
          [fdCreatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
          [fdUpdatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
          [fdDeletedAt] DATETIME2 NULL,
          CONSTRAINT [PK_tbInspectionReport] PRIMARY KEY CLUSTERED ([fdId] ASC),
          CONSTRAINT [UQ_tbInspectionReport_reportNumber] UNIQUE ([fdReportNumber])
        );
        CREATE INDEX [IX_tbInspectionReport_listCode] ON [dbo].[tbInspectionReport] ([fdListCode]);
        CREATE INDEX [IX_tbInspectionReport_markingCode] ON [dbo].[tbInspectionReport] ([fdMarkingCode]);
        CREATE INDEX [IX_tbInspectionReport_createdBy] ON [dbo].[tbInspectionReport] ([fdCreatedBy]);
        CREATE INDEX [IX_tbInspectionReport_createdAt] ON [dbo].[tbInspectionReport] ([fdCreatedAt] DESC);
        PRINT 'Tabel tbInspectionReport berhasil dibuat.';
      END
      ELSE
      BEGIN
        PRINT 'Tabel tbInspectionReport sudah ada, melewati.';
      END
    `

    const createBAPCounterSQL = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'tbBAPCounter')
      BEGIN
        CREATE TABLE [dbo].[tbBAPCounter] (
          [fdYear] INT NOT NULL,
          [fdMonth] INT NOT NULL,
          [fdCount] INT NOT NULL DEFAULT 0,
          CONSTRAINT [PK_tbBAPCounter] PRIMARY KEY CLUSTERED ([fdYear] ASC, [fdMonth] ASC)
        );
        PRINT 'Tabel tbBAPCounter berhasil dibuat.';
      END
      ELSE
      BEGIN
        PRINT 'Tabel tbBAPCounter sudah ada, melewati.';
      END
    `

    await prisma.$executeRawUnsafe(createInspectionReportSQL)
    console.log('✓ tbInspectionReport check/create selesai.')

    await prisma.$executeRawUnsafe(createBAPCounterSQL)
    console.log('✓ tbBAPCounter check/create selesai.')

    console.log('Migrasi selesai dengan sukses!')
  } catch (err) {
    console.error('Gagal migrasi:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
