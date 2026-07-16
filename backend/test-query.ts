import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  const search = 'SG260610-007'
  const conditions = [
    Prisma.sql`(
      fdListCode IN (SELECT fdListCode FROM tbEntryList WHERE fdListCode LIKE ${search + '%'} OR fdMarkingCode LIKE ${search + '%'} OR fdTerima LIKE ${search + '%'} OR fdTrackingNo LIKE ${search + '%'} OR fdDesc LIKE ${'%' + search + '%'})
      OR fdCustName IN (SELECT fdCustName FROM tbCustomers WHERE fdCustName LIKE ${'%' + search + '%'})
    )`
  ]
  const skip = 0
  const take = 20
  
  console.time('QueryTime')
  try {
    const data = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM vwShipment
      WHERE ${Prisma.join(conditions, ' AND ')}
    `
    console.log("Count:", data)
    
    const data2 = await prisma.$queryRaw`
      SELECT * 
      FROM vwShipment
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY fdTglAgent DESC
      OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY
    `
    console.log("Data length:", data2.length)
  } catch (e) {
    console.error("Prisma Error:", e)
  } finally {
    console.timeEnd('QueryTime')
    await prisma.$disconnect()
  }
}

test()
