import { prisma } from './config/database'

async function main() {
  const lautRows = await prisma.$queryRaw<any[]>`
    EXEC get_data_billing_and_data_m3 2
  `
  if (lautRows.length > 0) {
    console.log('Sample row keys from get_data_billing_and_data_m3:', Object.keys(lautRows[0]))
    const sample26 = lautRows.filter(r => (r.Marking_code || '').includes('26YWA03'))
    console.log('26YWA03 rows from SP:', JSON.stringify(sample26, null, 2))
  }
}

main().then(() => process.exit(0))
