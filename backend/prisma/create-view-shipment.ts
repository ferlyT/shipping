import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating or updating view vwShipment...')

  const dropViewSql = `
    IF OBJECT_ID('dbo.vwShipment', 'V') IS NOT NULL
      EXEC('DROP VIEW dbo.vwShipment');
  `

  const createViewSql = `EXEC('
    CREATE VIEW dbo.vwShipment AS
    SELECT
        c.fdCustName,
        e.fdListCode,
        e.fdTerima,
        e.fdTglAgent,
        e.fdMarkingCode,
        e.fdMarkingNo,
        e.fdBranchCode,
        e.fdJmlPack,
        e.fdSatuan,
        e.fdJmlBerat,
        e.fdListType,
        e.fdDesc,
        e.fdComodity,
        e.fdM3,
        e.fdCancel,
        e.fdMarkingCodeAsal
    FROM dbo.tbEntryList e
    LEFT JOIN dbo.tbCustomers c
        ON e.fdCustCode = c.fdCustCode
    WHERE e.fdListDate >= ''2018-01-01'';
  ')`

  try {
    await prisma.$executeRawUnsafe(dropViewSql)
    await prisma.$executeRawUnsafe(createViewSql)
    console.log('Successfully created/updated vwShipment')
  } catch (error) {
    console.error('Error creating vwShipment:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
