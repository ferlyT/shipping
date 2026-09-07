import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../../middleware/auth'
import {
  getBillings,
  getBillingById,
  getBillingKPIs,
  getBillingTrends,
  getBillingByEmployeeDaily,
  getSjVsBillComparison,
  getSjVsBillDetails,
  getBillingTargetDetails,
  getBillingTargetPriceCheck,
  getBillingM3Check,
  getM3CustPerMarkingDetails,
  getBillingPartialDetails,
  getTransportValidationCheck,
  getBillingEmployees,
  issueInvoice,
  checkBillResiMarking,
  updateBillingDetails,
} from './billing.service'
import { successResponse, errorResponse } from '../../utils/response'

const billingRoutes = new Hono()

// Semua route billing memerlukan auth dan permission
billingRoutes.use('/*', authMiddleware, requirePermission('/mshipping/billing'))

billingRoutes.get('/transport-check', async (c) => {
  const query = c.req.query()
  const result = await getTransportValidationCheck(query)
  return successResponse(c, result)
})

billingRoutes.get('/target-price-check', async (c) => {
  const query = c.req.query()
  const result = await getBillingTargetPriceCheck(query)
  return successResponse(c, result)
})

billingRoutes.get('/partial-details', async (c) => {
  const query = c.req.query()
  const result = await getBillingPartialDetails(query)
  return successResponse(c, result)
})

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

billingRoutes.get('/customer-tariff-audit/:custCode?', async (c) => {
  const custCode = c.req.param('custCode') || c.req.query('custCode') || ''
  if (!custCode) {
    return errorResponse(c, 'Parameter custCode wajib diisi', 400)
  }
  const { getCustomerTariffAuditList } = await import('./customer-tariff-audit.service')
  const result = await getCustomerTariffAuditList(custCode)
  return successResponse(c, result)
})

billingRoutes.get('/freight-charge', async (c) => {
  const custCode = c.req.query('custCode') || ''
  const markingCode = c.req.query('markingCode') || ''
  if (!custCode && !markingCode) {
    return errorResponse(c, 'Parameter custCode atau markingCode wajib diisi', 400)
  }
  const { getFreightChargeByMarking } = await import('./freight-charge.service')
  const result = await getFreightChargeByMarking(custCode, markingCode)
  return successResponse(c, result)
})

billingRoutes.get('/customer-history/:custCode?', async (c) => {
  const custCode = c.req.param('custCode') || c.req.query('custCode') || ''
  if (!custCode) {
    return errorResponse(c, 'Parameter custCode wajib diisi', 400)
  }
  const query = c.req.query()
  const { getCustomerBillingHistory } = await import('./customer-billing-history.service')
  const result = await getCustomerBillingHistory(custCode, {
    search: query.search,
    year: query.year,
    moda: query.moda as any,
    status: query.status as any,
    limit: query.limit ? parseInt(query.limit, 10) : undefined,
  })
  return successResponse(c, result)
})



billingRoutes.get('/invoice-details/:invNo?', async (c) => {
  const invNo = c.req.param('invNo') || c.req.query('invNo') || ''
  if (!invNo) return errorResponse(c, 'Parameter invNo wajib diisi', 400)
  const { getInvoiceDetails } = await import('./customer-billing-history.service')
  const result = await getInvoiceDetails(invNo)
  return successResponse(c, result)
})

billingRoutes.get('/employees', async (c) => {
  try {
    const employees = await getBillingEmployees()
    return successResponse(c, employees)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

billingRoutes.post('/:id/issue', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json().catch(() => ({}))
    const user = c.get('user')
    const result = await issueInvoice(id, body?.fdEmpId, user)
    return successResponse(c, result)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 400)
  }
})

billingRoutes.get('/:id/resi-marking-check', async (c) => {
  try {
    const id = c.req.param('id')
    const resi = c.req.query('resi')
    const result = await checkBillResiMarking(id, resi)
    return successResponse(c, result)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 400)
  }
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

billingRoutes.put('/:id/details', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json().catch(() => ({}))
    const user = c.get('user')
    const result = await updateBillingDetails(id, body?.items, user)
    return successResponse(c, result)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 400)
  }
})

export { billingRoutes }

