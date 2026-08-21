import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function testQuery(name: string, query: Prisma.Sql) {
  console.log(`\n--- Testing ${name} ---`)
  const start = Date.now()
  try {
    const res = await prisma.$queryRaw(query)
    const time = Date.now() - start
    console.log(`Success: Found ${(res as any[])[0]?.count} rows in ${time}ms`)
  } catch (err: any) {
    const time = Date.now() - start
    console.error(`Failed after ${time}ms: ${err.message}`)
  }
}

async function runTests() {
  const search = 'pricila'
  const searchStarts = `${search}%`
  const searchLike = `%${search}%`

  const queryCount = Prisma.sql`
      SELECT COUNT(*) as count FROM vwShipment 
      WHERE fdListCode LIKE ${searchStarts} OR 
            fdMarkingCode LIKE ${searchStarts} OR 
            fdTerima LIKE ${searchStarts} OR 
            fdLocalTrackingNo LIKE ${searchStarts} OR 
            fdCustName LIKE ${searchLike}
  `

  await testQuery("COUNT(*) with StartsWith + CustName Contains", queryCount)
}

runTests().finally(() => prisma.$disconnect())
