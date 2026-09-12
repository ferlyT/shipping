import { Hono } from 'hono'
import { authMiddleware, requirePermission, isAdmin } from '../../middleware/auth'
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
  getBatchEntryListDetails,
  getBillingPartialDetails,
  getTransportValidationCheck,
  getType2ComparisonCheck,
  getBillingEmployees,
  issueInvoice,
  checkBillResiMarking,
  updateBillingDetails,
} from './billing.service'
import { getReportTemplate, saveReportTemplate } from './report-template.service'
import {
  processPairingLocalCharge,
  processPairingByReceiptNos,
  generatePairingLocalChargeExcel,
} from './pairing-local-charge.service'
import { successResponse, errorResponse } from '../../utils/response'

const billingRoutes = new Hono()

// Semua route billing memerlukan auth dan permission
billingRoutes.use('/*', authMiddleware, requirePermission('/mshipping/billing'))

// ── Pairing Local Charge Routes ──
billingRoutes.post('/pairing-local-charge', async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file']
    if (!file || !(file instanceof File)) {
      return errorResponse(c, 'File Excel tidak ditemukan. Kirim file dengan field "file"', 400)
    }

    if (!/\.xlsx?$/i.test(file.name)) {
      return errorResponse(c, 'Format file harus .xlsx atau .xls', 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await processPairingLocalCharge(buffer, file.name)
    return successResponse(c, result, 'Pairing Local Charge berhasil diproses')
  } catch (err: any) {
    return errorResponse(c, err?.message || 'Gagal memproses Pairing Local Charge', 500)
  }
})

billingRoutes.post('/pairing-local-charge/by-receipts', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const receiptNos = typeof body?.receiptNos === 'string' ? body.receiptNos : ''
    if (!receiptNos.trim()) {
      return errorResponse(c, 'Daftar nomor resi tidak boleh kosong', 400)
    }

    const result = await processPairingByReceiptNos(receiptNos)
    return successResponse(c, result, 'Pairing Resi berhasil diproses')
  } catch (err: any) {
    return errorResponse(c, err?.message || 'Gagal memproses Pairing Resi', 500)
  }
})

billingRoutes.post('/pairing-local-charge/export-excel', async (c) => {
  try {
    const body = await c.req.json()
    const rows = body?.rows
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return errorResponse(c, 'Data baris tidak ditemukan untuk diekspor', 400)
    }

    const buffer = await generatePairingLocalChargeExcel(rows)
    const fileName = `Pairing-Local-Charge-${new Date().toISOString().slice(0, 10)}.xlsx`

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (err: any) {
    return errorResponse(c, err?.message || 'Gagal membuat file Excel Pairing Local Charge', 500)
  }
})

// ── Report Designer Template Routes ──
billingRoutes.get('/report-template', async (c) => {
  const result = await getReportTemplate('BILL_INVOICE')
  return successResponse(c, result)
})

billingRoutes.put('/report-template', isAdmin, async (c) => {
  try {
    const body = await c.req.json()
    const user = c.get('user')
    const username = user?.username || 'admin'
    const result = await saveReportTemplate(body.config || body, username, 'BILL_INVOICE')
    return successResponse(c, result, 'Template report berhasil disimpan dan berlaku serentak')
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal menyimpan template report', 400)
  }
})

billingRoutes.get('/transport-check', async (c) => {
  const query = c.req.query()
  const result = await getTransportValidationCheck(query)
  return successResponse(c, result)
})

billingRoutes.get('/type2-compare-check', async (c) => {
  const query = c.req.query()
  const invNo = query.invNo || query.inv_no || ''
  const listCode = query.listCode || query.list_code || ''
  const markingCode = query.markingCode || query.marking_code || ''
  if (!invNo && !listCode) {
    return errorResponse(c, 'Parameter invNo atau listCode wajib diisi', 400)
  }
  const result = await getType2ComparisonCheck({ invNo, listCode, markingCode })
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

billingRoutes.post('/entry-list-details', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const listCodes = Array.isArray(body.listCodes)
    ? body.listCodes
    : typeof body.listCode === 'string'
      ? [body.listCode]
      : []
  const result = await getBatchEntryListDetails(listCodes)
  return successResponse(c, result)
})

billingRoutes.get('/entry-list-details', async (c) => {
  const rawListCodes = c.req.query('listCodes') || c.req.query('listCode') || ''
  const listCodes = rawListCodes.split(',').map((s) => s.trim()).filter(Boolean)
  const result = await getBatchEntryListDetails(listCodes)
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
    branch: query.branch,
    typeComodity: query.typeComodity,
    diffStatus: query.diffStatus as any,
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
    const saveToPrev = body?.saveToPrev !== undefined ? Boolean(body.saveToPrev) : true
    const result = await updateBillingDetails(id, body?.items, user, saveToPrev)
    return successResponse(c, result)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 400)
  }
})

export { billingRoutes }

