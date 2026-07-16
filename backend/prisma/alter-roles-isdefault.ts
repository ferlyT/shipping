import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Adding isDefault column to tbRolePermissions...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE [dbo].[tbRolePermissions] ADD isDefault BIT NOT NULL DEFAULT 0;
    `)
    console.log('Success adding isDefault column.')
  } catch (error) {
    console.error('Error adding isDefault column:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
