import { getDeliveryOrders } from './src/modules/delivery-orders/deliveryOrders.service'

async function main() {
  try {
    const list = await getDeliveryOrders({ listCode: '0933201', limit: '10' })
    console.log('List:', list.data.length, list.data.slice(0, 2))
  } catch (error) {
    console.error(error)
  }
}

main()
