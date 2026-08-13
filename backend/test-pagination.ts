import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const search = '%dy/sk%';
  const rawData = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM vwShipment WHERE fdListCode LIKE '${search}' OR fdCustName LIKE '${search}' OR fdMarkingCode LIKE '${search}' OR fdDesc LIKE '${search}'
  `);
  console.log("Count:", rawData);

  const rawData2 = await prisma.$queryRawUnsafe(`
    SELECT fdListCode FROM vwShipment 
    WHERE fdListCode LIKE '${search}' OR fdCustName LIKE '${search}' OR fdMarkingCode LIKE '${search}' OR fdDesc LIKE '${search}'
    ORDER BY fdListCode DESC 
    OFFSET 9200 ROWS FETCH NEXT 100 ROWS ONLY
  `);
  console.log("Rows 9200-9300 count:", (rawData2 as any[]).length);
}

main().catch(console.error);
