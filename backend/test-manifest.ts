import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const res = await prisma.vwShipment.findMany({
      where: { fdMarkingCode: "26GZC69             " }
    })
    console.log("Success:", res)
  } catch (e) {
    console.error("Error:", e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
