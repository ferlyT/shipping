import { prisma } from '../config/database'

async function main() {
  try {
    console.log('Migrating marking tables to upload-level...')

    // Create tbPriceListUploadMarking
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tbPriceListUploadMarking')
      BEGIN
        CREATE TABLE tbPriceListUploadMarking (
          id            INT              NOT NULL IDENTITY(1,1) PRIMARY KEY,
          uploadId      INT              NOT NULL,
          markingCode   NVARCHAR(50)     NOT NULL,
          agentName     NVARCHAR(100)    NULL,
          CONSTRAINT FK_PriceListUploadMarking_Upload FOREIGN KEY (uploadId) REFERENCES tbPriceListUpload(id) ON DELETE CASCADE,
          CONSTRAINT UQ_PriceListUploadMarking UNIQUE (uploadId, markingCode)
        );
        CREATE INDEX IX_PriceListUploadMarking_Code ON tbPriceListUploadMarking(markingCode);
        CREATE INDEX IX_PriceListUploadMarking_Upload ON tbPriceListUploadMarking(uploadId);
      END
    `)
    console.log('tbPriceListUploadMarking ready.')

    // Create tbCustomerPriceListUploadMarking
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tbCustomerPriceListUploadMarking')
      BEGIN
        CREATE TABLE tbCustomerPriceListUploadMarking (
          id            INT              NOT NULL IDENTITY(1,1) PRIMARY KEY,
          uploadId      INT              NOT NULL,
          markingCode   NVARCHAR(50)     NOT NULL,
          agentName     NVARCHAR(100)    NULL,
          CONSTRAINT FK_CustomerPriceListUploadMarking_Upload FOREIGN KEY (uploadId) REFERENCES tbCustomerPriceListUpload(id) ON DELETE CASCADE,
          CONSTRAINT UQ_CustomerPriceListUploadMarking UNIQUE (uploadId, markingCode)
        );
        CREATE INDEX IX_CustomerPriceListUploadMarking_Code ON tbCustomerPriceListUploadMarking(markingCode);
        CREATE INDEX IX_CustomerPriceListUploadMarking_Upload ON tbCustomerPriceListUploadMarking(uploadId);
      END
    `)
    // Add mode column to tbPriceListUploadMarking if not exists
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('tbPriceListUploadMarking') AND name = 'mode'
      )
      BEGIN
        ALTER TABLE tbPriceListUploadMarking ADD mode NVARCHAR(50) NULL;
      END
    `)
    console.log('tbPriceListUploadMarking.mode ready.')

    // Add mode column to tbCustomerPriceListUploadMarking if not exists
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('tbCustomerPriceListUploadMarking') AND name = 'mode'
      )
      BEGIN
        ALTER TABLE tbCustomerPriceListUploadMarking ADD mode NVARCHAR(50) NULL;
      END
    `)
    console.log('tbCustomerPriceListUploadMarking.mode ready.')

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Error creating marking tables:', error)
  } finally {
    await prisma.$disconnect()
  }
}


main()

