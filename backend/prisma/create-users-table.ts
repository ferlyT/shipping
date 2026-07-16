import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const checkTableSql = `
    SELECT count(*) as count
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' 
    AND TABLE_NAME = 'tbUsers'
  `
  
  const result: any[] = await prisma.$queryRawUnsafe(checkTableSql)
  
  if (result[0].count === 0) {
    console.log('Creating tbUsers table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE [dbo].[tbUsers] (
          [id] UNIQUEIDENTIFIER NOT NULL,
          [username] NVARCHAR(100) NOT NULL,
          [passwordHash] NVARCHAR(255) NOT NULL,
          [fullName] NVARCHAR(200) NOT NULL,
          [role] NVARCHAR(50) NOT NULL CONSTRAINT [tbUsers_role_df] DEFAULT 'viewer',
          [isActive] BIT NOT NULL CONSTRAINT [tbUsers_isActive_df] DEFAULT 1,
          [lastLoginAt] DATETIME2,
          [createdAt] DATETIME2 NOT NULL CONSTRAINT [tbUsers_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
          [updatedAt] DATETIME2 NOT NULL,
          CONSTRAINT [tbUsers_pkey] PRIMARY KEY CLUSTERED ([id]),
          CONSTRAINT [tbUsers_username_key] UNIQUE NONCLUSTERED ([username])
      );
    `)
    console.log('✅ tbUsers table created.')
  } else {
    console.log('✅ tbUsers table already exists.')
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
