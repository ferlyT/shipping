import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../../middleware/auth'
import {
  getDeliveryOrders,
  getDeliveryOrderById,
  getDeliveryOrdersKPIs,
  getDeliveryGroupedByListCode,
  getDeliveryMarkingCodeGroups,
  getDeliveryBranchGroups,
  getDeliveryOrderSuggestions,
  getDeliveryMasterData,
  updateDeliveryOrder,
  deleteDeliveryOrder,
  recordDeliveryPrint,
  createDeliveryOrder,
  getCustomerDestinations,
  createCustomerDestination,
  getOrderDeliveryByListCode,
} from './deliveryOrders.service'
import { successResponse, errorResponse } from '../../utils/response'

const deliveryOrdersRoutes = new Hono()

// Semua route DO memerlukan auth dan permission
deliveryOrdersRoutes.use('/*', authMiddleware, requirePermission('/mshipping/delivery-orders'))

deliveryOrdersRoutes.get('/', async (c) => {
  const query = c.req.query()
  const result = await getDeliveryOrders(query)
  return successResponse(c, result.data, result.meta)
})

deliveryOrdersRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return errorResponse(c, 'Data request tidak valid', 400)

  const user = c.get('user')
  try {
    const result = await createDeliveryOrder(body, user)
    return successResponse(c, result, undefined, 201)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal membuat Surat Jalan', 400)
  }
})

deliveryOrdersRoutes.get('/master-data', async (c) => {
  const result = await getDeliveryMasterData()
  return successResponse(c, result)
})

deliveryOrdersRoutes.get('/suggestions', async (c) => {
  const q = c.req.query('q') || ''
  const suggestions = await getDeliveryOrderSuggestions(q)
  return successResponse(c, suggestions)
})

deliveryOrdersRoutes.get('/kpi', async (c) => {
  const query = c.req.query()
  const result = await getDeliveryOrdersKPIs(query)
  return successResponse(c, result)
})

deliveryOrdersRoutes.get('/grouped', async (c) => {
  const query = c.req.query()
  const result = await getDeliveryGroupedByListCode(query)
  return successResponse(c, result.data, result.meta)
})

deliveryOrdersRoutes.get('/marking-groups', async (c) => {
  const query = c.req.query()
  const result = await getDeliveryMarkingCodeGroups(query)
  return successResponse(c, result.data)
})

deliveryOrdersRoutes.get('/branch-groups', async (c) => {
  const query = c.req.query()
  const result = await getDeliveryBranchGroups(query)
  return successResponse(c, result.data)
})

deliveryOrdersRoutes.get('/customer-destinations/:custCode', async (c) => {
  const custCode = c.req.param('custCode')
  const destinations = await getCustomerDestinations(custCode)
  return successResponse(c, destinations)
})

deliveryOrdersRoutes.post('/customer-destinations', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return errorResponse(c, 'Data request tidak valid', 400)

  const user = c.get('user')
  try {
    const created = await createCustomerDestination(body, user)
    return successResponse(c, created, undefined, 201)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal menambahkan alamat tujuan', 400)
  }
})

deliveryOrdersRoutes.get('/order-delivery/:listCode', async (c) => {
  const listCode = c.req.param('listCode')
  const orderDelivery = await getOrderDeliveryByListCode(listCode)
  return successResponse(c, orderDelivery)
})

deliveryOrdersRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const deliveryOrder = await getDeliveryOrderById(id)
  if (!deliveryOrder) return errorResponse(c, 'Surat Jalan tidak ditemukan', 404)
  return successResponse(c, deliveryOrder)
})

deliveryOrdersRoutes.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  if (!body) return errorResponse(c, 'Data request tidak valid', 400)

  const user = c.get('user')
  try {
    const updated = await updateDeliveryOrder(id, body, user)
    return successResponse(c, updated)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal memperbarui Surat Jalan', 400)
  }
})

deliveryOrdersRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  try {
    const result = await deleteDeliveryOrder(id, user)
    return successResponse(c, result)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal menghapus Surat Jalan', 400)
  }
})

deliveryOrdersRoutes.post('/:id/print', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const user = c.get('user')
  try {
    const result = await recordDeliveryPrint(id, body, user)
    return successResponse(c, result)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mencatat status cetak', 400)
  }
})

export { deliveryOrdersRoutes }