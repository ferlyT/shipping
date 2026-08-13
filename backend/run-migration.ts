import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Creating tbPriceListUpload...')
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tbPriceListUpload')
      BEGIN
        CREATE TABLE tbPriceListUpload (
          id            INT              NOT NULL IDENTITY(1,1) PRIMARY KEY,
          fileName      NVARCHAR(500)    NOT NULL,
          uploadedBy    NVARCHAR(100)    NULL,
          uploadedAt    DATETIME2        NOT NULL DEFAULT GETDATE(),
          priceDate     DATETIME2        NULL,
          effectiveDate DATETIME2        NOT NULL,
          status        NVARCHAR(20)     NOT NULL,
          warnings      NVARCHAR(MAX)    NULL,
          rawSnapshot   NVARCHAR(MAX)    NULL,
          isSuperseded  BIT              NOT NULL DEFAULT 0
        );
      END
    `)
    console.log('tbPriceListUpload created (or already exists).')

    console.log('Creating tbPriceListItem...')
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tbPriceListItem')
      BEGIN
        CREATE TABLE tbPriceListItem (
          id            INT              NOT NULL IDENTITY(1,1) PRIMARY KEY,
          uploadId      INT              NOT NULL,
          sheetType     NVARCHAR(20)     NOT NULL,
          mode          NVARCHAR(50)     NOT NULL,
          branch        NVARCHAR(50)     NOT NULL,
          transitTime   NVARCHAR(50)     NULL,
          category      NVARCHAR(200)    NOT NULL,
          price         DECIMAL(18,2)    NOT NULL,
          CONSTRAINT FK_PriceListItem_Upload FOREIGN KEY (uploadId) REFERENCES tbPriceListUpload(id)
        );
        CREATE INDEX IX_PriceListItem_UploadId  ON tbPriceListItem(uploadId);
        CREATE INDEX IX_PriceListItem_SheetMode ON tbPriceListItem(sheetType, mode, branch, category);
      END
    `)
    console.log('tbPriceListItem created (or already exists).')
    
    console.log('Migration successfully executed!')
  } catch (error) {
    console.error('Error executing migration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
