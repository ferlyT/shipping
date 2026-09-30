import { prisma } from '../src/config/database'

async function run() {
  const markingColumns = await prisma.$queryRawUnsafe(`
    SELECT COLUMN_NAME, DATA_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'tbMarking'
  `)
  console.log('tbMarking columns:', markingColumns)

  const sampleMarking = await prisma.$queryRawUnsafe(`
    SELECT TOP 3 * FROM tbMarking
  `)
  console.log('Sample tbMarking:', sampleMarking)

  const vwColumns = await prisma.$queryRawUnsafe(`
    SELECT TOP 10 * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'vwShipment'
  `)
  console.log('vwShipment sample columns:', vwColumns)

  const sampleEntry = await prisma.$queryRawUnsafe(`
    SELECT TOP 3 fdMarkingCode, fdMarkingNo, fdTerima, fdListCode, fdCustName, fdListType
    FROM vwShipment
  `)
  console.log('Sample vwShipment:', sampleEntry)

  process.exit(0)
}

run().catch(console.error)
