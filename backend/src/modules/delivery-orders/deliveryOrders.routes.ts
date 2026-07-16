import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../../middleware/auth'
import { getDeliveryOrders, getDeliveryOrderById, getDeliveryOrdersKPIs, getDeliveryGroupedByListCode, getDeliveryMarkingCodeGroups, getDeliveryBranchGroups } from './deliveryOrders.service'
import { successResponse, errorResponse } from '../../utils/response'

const deliveryOrdersRoutes = new Hono()

// Semua route DO memerlukan auth dan permission
deliveryOrdersRoutes.use('/*', authMiddleware, requirePermission('/shipping/delivery-orders'))

deliveryOrdersRoutes.get('/', async (c) => {
  const query = c.req.query()
  const result = await getDeliveryOrders(query)
  return successResponse(c, result.data, result.meta)
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

deliveryOrdersRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const deliveryOrder = await getDeliveryOrderById(id)
  if (!deliveryOrder) return errorResponse(c, 'Surat Jalan tidak ditemukan', 404)
  return successResponse(c, deliveryOrder)
})

export { deliveryOrdersRoutes }