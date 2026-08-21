import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const lunasCols = await prisma.$queryRawUnsafe(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tbLunas'`);
  console.log('tbLunas cols:', lunasCols);
}

main().catch(console.error);
