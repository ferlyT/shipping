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
  getDeliveryMonitoring,
  confirmDelivery,
  getDeliveryVehicles,
  getDeliveryExpeditions,
  getDeliveryConfirmTrends,
  getDeliveryConfirmBatchDetail,
  getDeliveryEstimasiDetails,
} from './deliveryOrders.service'
import { validateBody } from '../../middleware/requestValidator'
import {
  CreateCustomerDestinationSchema,
  ConfirmDeliverySchema,
} from './deliveryOrders.types'
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

deliveryOrdersRoutes.post('/customer-destinations', validateBody(CreateCustomerDestinationSchema), async (c) => {
  const body = c.req.valid('json')
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

deliveryOrdersRoutes.get('/monitoring', async (c) => {
  const query = c.req.query()
  const result = await getDeliveryMonitoring(query)
  return c.json({
    success: true,
    data: result.data,
    meta: result.meta,
    kpis: result.kpis,
  })
})

deliveryOrdersRoutes.get('/confirm-trends', async (c) => {
  const days = Number(c.req.query('days') || 30)
  const result = await getDeliveryConfirmTrends(days)
  return c.json({
    success: true,
    data: result.batches,
    dailyComparison: result.dailyComparison,
    summary: result.summary,
    days: result.days,
  })
})

deliveryOrdersRoutes.get('/confirm-batch-detail', async (c) => {
  const date = c.req.query('date') || ''
  const session = c.req.query('session') || 'Pagi'
  if (!date) return errorResponse(c, 'Parameter date wajib diisi', 400)
  try {
    const result = await getDeliveryConfirmBatchDetail(date, session)
    return successResponse(c, result)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal memuat rincian batch', 400)
  }
})

deliveryOrdersRoutes.get('/estimasi-details', async (c) => {
  const date = c.req.query('date') || ''
  const type = (c.req.query('type') || 'all') as 'all' | 'overdue' | 'pending' | 'sent'
  if (!date) return errorResponse(c, 'Parameter date wajib diisi', 400)
  try {
    const result = await getDeliveryEstimasiDetails(date, type)
    return successResponse(c, result)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal memuat rincian target estimasi', 400)
  }
})

deliveryOrdersRoutes.post('/confirm-delivery', validateBody(ConfirmDeliverySchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  try {
    const result = await confirmDelivery(body, user)
    return successResponse(c, result)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengonfirmasi pengiriman', 400)
  }
})

deliveryOrdersRoutes.get('/vehicles', async (c) => {
  const vehicles = await getDeliveryVehicles()
  return successResponse(c, vehicles)
})

deliveryOrdersRoutes.get('/expeditions', async (c) => {
  const expeditions = await getDeliveryExpeditions()
  return successResponse(c, expeditions)
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