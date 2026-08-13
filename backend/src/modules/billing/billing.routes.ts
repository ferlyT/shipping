import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../../middleware/auth'
import { getBillings, getBillingById, getBillingKPIs, getBillingTrends, getBillingByEmployeeDaily, getSjVsBillComparison, getSjVsBillDetails, getBillingTargetDetails, getBillingM3Check, getM3CustPerMarkingDetails } from './billing.service'
import { successResponse, errorResponse } from '../../utils/response'

const billingRoutes = new Hono()

// Semua route billing memerlukan auth dan permission
billingRoutes.use('/*', authMiddleware, requirePermission('/mshipping/billing'))

billingRoutes.get('/m3-check/:listCode?', async (c) => {
  const listCode = c.req.param('listCode') || c.req.query('listCode')
  if (!listCode) return errorResponse(c, 'Parameter listCode wajib diisi', 400)
  const result = await getBillingM3Check(listCode)
  return successResponse(c, result)
})

billingRoutes.get('/m3-cust-marking-details', async (c) => {
  const custCode = c.req.query('custCode') || ''
  const markingCode = c.req.query('markingCode') || ''
  if (!custCode || !markingCode) return errorResponse(c, 'Parameter custCode dan markingCode wajib diisi', 400)
  const result = await getM3CustPerMarkingDetails(custCode, markingCode)
  return successResponse(c, result)
})

billingRoutes.get('/', async (c) => {
  const query = c.req.query()
  const result = await getBillings(query)
  return successResponse(c, result.data, result.meta)
})

billingRoutes.get('/kpi', async (c) => {
  const query = c.req.query()
  const result = await getBillingKPIs(query)
  return successResponse(c, result)
})

billingRoutes.get('/target-details', async (c) => {
  const query = c.req.query()
  const result = await getBillingTargetDetails(query)
  return successResponse(c, result)
})

billingRoutes.get('/chart/by-employee-daily', async (c) => {
  const query = c.req.query()
  const result = await getBillingByEmployeeDaily(query)
  return successResponse(c, result)
})

billingRoutes.get('/chart/trends', async (c) => {
  const query = c.req.query()
  const result = await getBillingTrends(query)
  return successResponse(c, result)
})

billingRoutes.get('/chart/sj-vs-bill', async (c) => {
  const query = c.req.query()
  const result = await getSjVsBillComparison(query)
  return successResponse(c, result)
})

billingRoutes.get('/chart/sj-vs-bill/details', async (c) => {
  const query = c.req.query()
  const result = await getSjVsBillDetails(query)
  return successResponse(c, result)
})



billingRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const billing = await getBillingById(id)
  if (!billing) return errorResponse(c, 'Billing tidak ditemukan', 404)
  return successResponse(c, billing)
})

billingRoutes.get('/:id/details', async (c) => {
  const id = c.req.param('id')
  const billing = await getBillingById(id)
  if (!billing) return errorResponse(c, 'Billing tidak ditemukan', 404)
  return successResponse(c, billing.details)
})

export { billingRoutes }
