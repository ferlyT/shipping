import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../../middleware/auth'
import {
  getShipments, getShipmentById, getShipmentDimensions, getShipmentsKPIs, getShipmentBranches,
  getDimensionsGudang, getDimensionsPackingList, getDimensionsKomplain,
} from './shipments.service'
import { successResponse, errorResponse } from '../../utils/response'

const shipmentsRoutes = new Hono()

// Semua route shipments memerlukan auth dan permission
shipmentsRoutes.use('/*', authMiddleware, requirePermission('/mshipping/shipments'))

shipmentsRoutes.get('/', async (c) => {
  const query = c.req.query()
  const result = await getShipments(query)
  return successResponse(c, result.data, result.meta)
})

shipmentsRoutes.get('/kpi', async (c) => {
  const query = c.req.query()
  const result = await getShipmentsKPIs(query)
  return successResponse(c, result)
})

shipmentsRoutes.get('/branches', async (c) => {
  const branches = await getShipmentBranches()
  return successResponse(c, branches)
})

shipmentsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const shipment = await getShipmentById(id)
  if (!shipment) return errorResponse(c, 'Shipment tidak ditemukan', 404)
  return successResponse(c, shipment)
})

shipmentsRoutes.get('/:id/dimensions', async (c) => {
  const id = c.req.param('id')
  const dimensions = await getShipmentDimensions(id)
  return successResponse(c, dimensions)
})

shipmentsRoutes.get('/:id/dimensions/gudang', async (c) => {
  const id = c.req.param('id')
  const data = await getDimensionsGudang(id)
  return successResponse(c, data)
})

shipmentsRoutes.get('/:id/dimensions/packinglist', async (c) => {
  const id = c.req.param('id')
  const data = await getDimensionsPackingList(id)
  return successResponse(c, data)
})

shipmentsRoutes.get('/:id/dimensions/komplain', async (c) => {
  const id = c.req.param('id')
  const data = await getDimensionsKomplain(id)
  return successResponse(c, data)
})

export { shipmentsRoutes }
