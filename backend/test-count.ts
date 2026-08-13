import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  const total = await prisma.vwShipment.count();
  const search = await prisma.vwShipment.count({
    where: {
      fdCustName: {
        contains: 'dy/sk'
      }
    }
  });
  console.log(`Total in DB: ${total}`);
  console.log(`Matched dy/sk in fdCustName: ${search}`);
}

test().catch(console.error);
