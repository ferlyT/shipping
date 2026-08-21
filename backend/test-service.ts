import { getShipments } from './src/modules/shipments/shipments.service'

async function main() {
  const result = await getShipments({
    page: '93',
    limit: '100',
    search: 'dy/sk'
  })
  
  console.log("Total:", result.meta.total)
  console.log("Data count:", result.data.length)
  if (result.data.length > 0) {
    console.log("First item:", result.data[0].fdListCode)
  }
}

main().catch(console.error)
