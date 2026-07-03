import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const adminUsername = 'admin'
  
  const existingAdmin = await prisma.tbUsers.findUnique({
    where: { username: adminUsername }
  })

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10)
    await prisma.tbUsers.create({
      data: {
        username: adminUsername,
        passwordHash,
        fullName: 'System Administrator',
        role: 'admin',
        isActive: true,
      }
    })
    console.log('✅ Admin user created (admin / admin123)')
  } else {
    // Ensure role and active status just in case
    await prisma.tbUsers.update({
      where: { username: adminUsername },
      data: { role: 'admin', isActive: true }
    })
    console.log('✅ Admin user already exists (admin / admin123)')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
