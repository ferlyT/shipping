import { prisma } from '../config/database'

async function main() {
  try {
    console.log('Creating tbPriceListItemMarking...')
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tbPriceListItemMarking')
      BEGIN
        CREATE TABLE tbPriceListItemMarking (
          id            INT              NOT NULL IDENTITY(1,1) PRIMARY KEY,
          itemId        INT              NOT NULL,
          markingCode   NVARCHAR(50)     NOT NULL,
          agentName     NVARCHAR(100)    NULL,
          CONSTRAINT FK_PriceListItemMarking_Item FOREIGN KEY (itemId) REFERENCES tbPriceListItem(id) ON DELETE CASCADE,
          CONSTRAINT UQ_PriceListItemMarking UNIQUE (itemId, markingCode)
        );
        CREATE INDEX IX_PriceListItemMarking_Code ON tbPriceListItemMarking(markingCode);
        CREATE INDEX IX_PriceListItemMarking_Item ON tbPriceListItemMarking(itemId);
      END
    `)
    console.log('tbPriceListItemMarking created or already exists.')

    console.log('Creating tbCustomerPriceListItemMarking...')
    await prisma.$executeRawUnsafe(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tbCustomerPriceListItemMarking')
      BEGIN
        CREATE TABLE tbCustomerPriceListItemMarking (
          id            INT              NOT NULL IDENTITY(1,1) PRIMARY KEY,
          itemId        INT              NOT NULL,
          markingCode   NVARCHAR(50)     NOT NULL,
          agentName     NVARCHAR(100)    NULL,
          CONSTRAINT FK_CustomerPriceListItemMarking_Item FOREIGN KEY (itemId) REFERENCES tbCustomerPriceListItem(id) ON DELETE CASCADE,
          CONSTRAINT UQ_CustomerPriceListItemMarking UNIQUE (itemId, markingCode)
        );
        CREATE INDEX IX_CustomerPriceListItemMarking_Code ON tbCustomerPriceListItemMarking(markingCode);
        CREATE INDEX IX_CustomerPriceListItemMarking_Item ON tbCustomerPriceListItemMarking(itemId);
      END
    `)
    console.log('tbCustomerPriceListItemMarking created or already exists.')

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Error creating marking tables:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
