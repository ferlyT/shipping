import { prisma } from './src/config/database'

async function check() {
  const billings = await prisma.tbBilling.findMany({
    take: 5,
    orderBy: { fdInvDate: 'desc' },
    select: {
      fdInvNo: true,
      fdEmpCode: true,
      employee: {
        select: {
          fdEmpName: true
        }
      }
    }
  });
  console.log(billings);

  // also let's manually check if the employee exists in tbEmployees
  for (const b of billings) {
    if (b.fdEmpCode) {
      const emp = await prisma.tbEmployees.findFirst({
        where: { fdEmpCode: b.fdEmpCode }
      });
      console.log(`Emp for ${b.fdEmpCode}:`, emp);
    }
  }
}

check().catch(console.error).finally(() => process.exit(0));
