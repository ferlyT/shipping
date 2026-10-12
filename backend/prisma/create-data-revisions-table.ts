import { prisma } from '../src/config/database'

async function main() {
  console.log('Menjalankan pembuatan tabel tbDataRevision dkk...')

  try {
    const createDataRevisionSQL = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'tbDataRevision')
      BEGIN
        CREATE TABLE [dbo].[tbDataRevision] (
          [fdId] INT IDENTITY(1,1) NOT NULL,
          [fdNomorForm] NVARCHAR(30) NOT NULL,
          [fdTipeData] NVARCHAR(30) NOT NULL,
          [fdAksi] NVARCHAR(30) NOT NULL,
          [fdStatus] NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
          [fdTanggal] DATETIME2 NOT NULL,
          
          -- Penanggung Jawab
          [fdDibuatOleh] NVARCHAR(100) NULL,
          [fdTglDibuat] DATETIME2 NULL,
          [fdStuffing] NVARCHAR(100) NULL,
          [fdTglStuffing] DATETIME2 NULL,
          [fdBilling] NVARCHAR(100) NULL,
          [fdTglBilling] DATETIME2 NULL,
          [fdAR] NVARCHAR(100) NULL,
          [fdTglAR] DATETIME2 NULL,
          [fdDiketahui] NVARCHAR(100) NULL,
          [fdTglDiketahui] DATETIME2 NULL,
          
          -- Eksekusi Aksi Cancel
          [fdExecutedBy] NVARCHAR(100) NULL,
          [fdExecutedAt] DATETIME2 NULL,
          
          -- Hasil Auto-Detect Billing
          [fdMatchedInvNo] NVARCHAR(50) NULL,
          [fdMatchedInvDate] DATETIME2 NULL,
          
          [fdCatatan] NVARCHAR(MAX) NULL,
          [fdCreatedBy] NVARCHAR(100) NOT NULL,
          [fdCreatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
          [fdUpdatedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
          [fdDeletedAt] DATETIME2 NULL,
          CONSTRAINT [PK_tbDataRevision] PRIMARY KEY CLUSTERED ([fdId] ASC),
          CONSTRAINT [UQ_tbDataRevision_nomorForm] UNIQUE ([fdNomorForm])
        );
        CREATE INDEX [IX_tbDataRevision_tanggal] ON [dbo].[tbDataRevision] ([fdTanggal] DESC);
        CREATE INDEX [IX_tbDataRevision_status] ON [dbo].[tbDataRevision] ([fdStatus]);
        CREATE INDEX [IX_tbDataRevision_aksi] ON [dbo].[tbDataRevision] ([fdAksi]);
        CREATE INDEX [IX_tbDataRevision_createdAt] ON [dbo].[tbDataRevision] ([fdCreatedAt] DESC);
        PRINT 'Tabel tbDataRevision berhasil dibuat.';
      END
      ELSE
      BEGIN
        PRINT 'Tabel tbDataRevision sudah ada.';
      END
    `

    const createDataRevisionDetailSQL = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'tbDataRevisionDetail')
      BEGIN
        CREATE TABLE [dbo].[tbDataRevisionDetail] (
          [fdId] INT IDENTITY(1,1) NOT NULL,
          [fdRevisionId] INT NOT NULL,
          [fdNo] INT NOT NULL,
          -- DATA AWAL
          [fdAwalCustCode] NVARCHAR(50) NULL,
          [fdAwalCustName] NVARCHAR(150) NULL,
          [fdAwalSpMark] NVARCHAR(100) NULL,
          [fdAwalNoBilling] NVARCHAR(100) NULL,
          [fdAwalQtyVolWgt] NVARCHAR(100) NULL,
          [fdAwalNoInputan] NVARCHAR(100) NULL,
          [fdAwalDetail] NVARCHAR(MAX) NULL,
          -- DATA BARU
          [fdBaruCustCode] NVARCHAR(50) NULL,
          [fdBaruCustName] NVARCHAR(150) NULL,
          [fdBaruSpMark] NVARCHAR(100) NULL,
          [fdBaruNoBilling] NVARCHAR(100) NULL,
          [fdBaruQtyVolWgt] NVARCHAR(100) NULL,
          [fdBaruNoInputan] NVARCHAR(100) NULL,
          [fdBaruDetail] NVARCHAR(MAX) NULL,
          CONSTRAINT [PK_tbDataRevisionDetail] PRIMARY KEY CLUSTERED ([fdId] ASC),
          CONSTRAINT [FK_tbDataRevisionDetail_tbDataRevision] FOREIGN KEY ([fdRevisionId]) 
            REFERENCES [dbo].[tbDataRevision] ([fdId]) ON DELETE CASCADE
        );
        CREATE INDEX [IX_tbDataRevisionDetail_revisionId] ON [dbo].[tbDataRevisionDetail] ([fdRevisionId]);
        CREATE INDEX [IX_tbDataRevisionDetail_awalInputan] ON [dbo].[tbDataRevisionDetail] ([fdAwalNoInputan]);
        CREATE INDEX [IX_tbDataRevisionDetail_baruInputan] ON [dbo].[tbDataRevisionDetail] ([fdBaruNoInputan]);
        PRINT 'Tabel tbDataRevisionDetail berhasil dibuat.';
      END
      ELSE
      BEGIN
        PRINT 'Tabel tbDataRevisionDetail sudah ada.';
      END
    `

    const createDataRevisionLampiranSQL = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'tbDataRevisionLampiran')
      BEGIN
        CREATE TABLE [dbo].[tbDataRevisionLampiran] (
          [fdId] INT IDENTITY(1,1) NOT NULL,
          [fdRevisionId] INT NOT NULL,
          [fdNamaFile] NVARCHAR(255) NOT NULL,
          [fdNamaFileSimpan] NVARCHAR(255) NOT NULL,
          [fdMimeType] NVARCHAR(100) NOT NULL,
          [fdUkuranBytes] BIGINT NOT NULL,
          [fdPath] NVARCHAR(500) NOT NULL,
          [fdUploadedBy] NVARCHAR(100) NOT NULL,
          [fdUploadedAt] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
          [fdKeterangan] NVARCHAR(255) NULL,
          CONSTRAINT [PK_tbDataRevisionLampiran] PRIMARY KEY CLUSTERED ([fdId] ASC),
          CONSTRAINT [FK_tbDataRevisionLampiran_tbDataRevision] FOREIGN KEY ([fdRevisionId]) 
            REFERENCES [dbo].[tbDataRevision] ([fdId]) ON DELETE CASCADE
        );
        CREATE INDEX [IX_tbDataRevisionLampiran_revisionId] ON [dbo].[tbDataRevisionLampiran] ([fdRevisionId]);
        PRINT 'Tabel tbDataRevisionLampiran berhasil dibuat.';
      END
      ELSE
      BEGIN
        PRINT 'Tabel tbDataRevisionLampiran sudah ada.';
      END
    `

    const createDataRevisionCounterSQL = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'tbDataRevisionCounter')
      BEGIN
        CREATE TABLE [dbo].[tbDataRevisionCounter] (
          [fdYear] INT NOT NULL,
          [fdMonth] INT NOT NULL,
          [fdCount] INT NOT NULL DEFAULT 0,
          CONSTRAINT [PK_tbDataRevisionCounter] PRIMARY KEY CLUSTERED ([fdYear] ASC, [fdMonth] ASC)
        );
        PRINT 'Tabel tbDataRevisionCounter berhasil dibuat.';
      END
      ELSE
      BEGIN
        PRINT 'Tabel tbDataRevisionCounter sudah ada.';
      END
    `

    await prisma.$executeRawUnsafe(createDataRevisionSQL)
    await prisma.$executeRawUnsafe(createDataRevisionDetailSQL)
    await prisma.$executeRawUnsafe(createDataRevisionLampiranSQL)
    await prisma.$executeRawUnsafe(createDataRevisionCounterSQL)

    console.log('✓ Seluruh tabel tbDataRevision dkk berhasil diverifikasi/dibuat di database!')
  } catch (err) {
    console.error('Gagal migrasi tabel data revision:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
