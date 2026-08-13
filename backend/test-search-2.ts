import { getShipments } from './src/modules/shipments/shipments.service';

async function test() {
  const result = await getShipments({ page: '1', limit: '20', search: 'dy/sk' });
  console.log('Total entries with search dy/sk:', result.meta.total);
  if (result.data.length > 0) {
    console.log('First entry fdCustName:', result.data[0].fdCustName);
  }
}

test().catch(console.error);
