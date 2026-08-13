import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const res = await prisma.$queryRawUnsafe(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%pay%' OR TABLE_NAME LIKE '%bill%' OR TABLE_NAME LIKE '%kas%' OR TABLE_NAME LIKE '%lunas%'`);
  console.log(res);
}

main().catch(console.error);
