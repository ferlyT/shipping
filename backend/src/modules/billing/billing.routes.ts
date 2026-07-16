import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../../middleware/auth'
import { getBillings, getBillingById, getBillingKPIs } from './billing.service'
import { successResponse, errorResponse } from '../../utils/response'
import { ROUTES } from '../../../../frontend/src/lib/constants'

const billingRoutes = new Hono()

// Semua route billing memerlukan auth dan permission
billingRoutes.use('/*', authMiddleware, requirePermission('/shipping/billing'))

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
