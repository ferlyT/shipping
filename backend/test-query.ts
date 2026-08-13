import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  const search = 'pricila'
  try {
    const query = Prisma.sql`
      SELECT TOP 1 * FROM vwShipment 
      WHERE (
        fdListCode IN (SELECT fdListCode FROM tbEntryList WHERE fdListCode LIKE ${search + '%'} OR fdMarkingCode LIKE ${search + '%'} OR fdTerima LIKE ${search + '%'} OR fdTrackingNo LIKE ${search + '%'} OR fdDesc LIKE ${'%' + search + '%'})
        OR fdListCode IN (SELECT e.fdListCode FROM tbEntryList e JOIN tbCustomers c ON e.fdCustCode = c.fdCustCode WHERE c.fdCustName LIKE ${'%' + search + '%'})
      )
    `
    const res = await prisma.$queryRaw(query)
    console.log("Success Query 1:", res)
  } catch (err: any) {
    console.error("Query 1 failed:", err.message)
  }

  try {
    const query = Prisma.sql`
      SELECT TOP 1 * FROM vwShipment 
      WHERE (
        fdListCode IN (SELECT fdListCode FROM tbEntryList WHERE fdListCode LIKE ${search + '%'} OR fdMarkingCode LIKE ${search + '%'} OR fdTerima LIKE ${search + '%'} OR fdTrackingNo LIKE ${search + '%'})
        OR fdListCode IN (SELECT e.fdListCode FROM tbEntryList e JOIN tbCustomers c ON e.fdCustCode = c.fdCustCode WHERE c.fdCustName LIKE ${'%' + search + '%'})
      )
    `
    const res = await prisma.$queryRaw(query)
    console.log("Success Query 2 (without fdDesc):", res)
  } catch (err: any) {
    console.error("Query 2 failed:", err.message)
  }
}

test().finally(() => prisma.$disconnect())
