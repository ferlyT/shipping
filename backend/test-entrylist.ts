import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const res = await prisma.$queryRaw`SELECT TOP 1 * FROM tbEntryList`
  console.log(res)
}

main().catch(console.error).finally(() => prisma.$disconnect())
