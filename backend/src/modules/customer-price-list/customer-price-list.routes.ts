import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import {
  ingestCustomerPriceListFile,
  listCustomersWithPriceList,
  listCustomerUploads,
  getActiveCustomerPriceList,
  getCustomerUploadDiff,
  getCustomerPriceListFilters,
  lookupCustomerPriceList,
  getCustomerItemMarkings,
  setCustomerItemMarkings,
  deleteCustomerItemMarking,
} from './customer-price-list.service'

const customerPriceListRoutes = new Hono()

customerPriceListRoutes.use(
  '/*',
  authMiddleware,
  requirePermission('/mshipping/finance/customer-price-list'),
)

// GET /api/customer-price-list/filters
// Filter options (modes, branches, categories) dari semua price list customer
customerPriceListRoutes.get('/filters', async (c) => {
  const options = await getCustomerPriceListFilters()
  return successResponse(c, options)
})

// GET /api/customer-price-list
// Daftar semua customer yang punya price list aktif
customerPriceListRoutes.get('/', async (c) => {
  const rows = await listCustomersWithPriceList()
  return successResponse(c, rows)
})

// GET /api/customer-price-list/lookup?custCode=...&date=YYYY-MM-DD&markingCode=...
// Cari harga khusus customer pada tanggal tertentu
customerPriceListRoutes.get('/lookup', async (c) => {
  const custCode = c.req.query('custCode')?.trim()
  const dateStr = c.req.query('date')?.trim()
  const mode = c.req.query('mode')?.trim()
  const branch = c.req.query('branch')?.trim()
  const category = c.req.query('category')?.trim()
  const markingCode = c.req.query('markingCode')?.trim()

  if (!custCode) {
    return errorResponse(c, 'Kode customer wajib diisi', 400)
  }

  const targetDate = dateStr ? new Date(dateStr) : new Date()
  if (isNaN(targetDate.getTime())) {
    return errorResponse(c, 'Format tanggal tidak valid', 400)
  }

  const result = await lookupCustomerPriceList(custCode, targetDate, { mode, branch, category, markingCode })
  return successResponse(c, result)
})

// GET /api/customer-price-list/items/:id/markings
customerPriceListRoutes.get('/items/:id/markings', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return errorResponse(c, 'ID item tidak valid', 400)
  const markings = await getCustomerItemMarkings(id)
  return successResponse(c, markings)
})

// PUT /api/customer-price-list/items/:id/markings
customerPriceListRoutes.put('/items/:id/markings', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return errorResponse(c, 'ID item tidak valid', 400)
  const body = await c.req.json<{ markings: { markingCode: string; agentName?: string }[] }>()
  if (!Array.isArray(body?.markings)) {
    return errorResponse(c, 'Field markings harus berupa array', 400)
  }
  const result = await setCustomerItemMarkings(id, body.markings)
  return successResponse(c, result)
})

// DELETE /api/customer-price-list/items/:id/markings/:markingCode
customerPriceListRoutes.delete('/items/:id/markings/:markingCode', async (c) => {
  const id = Number(c.req.param('id'))
  const markingCode = c.req.param('markingCode')
  if (isNaN(id) || !markingCode) return errorResponse(c, 'Parameter tidak valid', 400)
  await deleteCustomerItemMarking(id, markingCode)
  return successResponse(c, { message: 'Marking berhasil dihapus' })
})


// GET /api/customer-price-list/:custCode/active
// Price list aktif (terbaru) per customer
customerPriceListRoutes.get('/:custCode/active', async (c) => {
  const custCode = c.req.param('custCode').trim()
  const result = await getActiveCustomerPriceList(custCode)
  if (!result) return successResponse(c, null)
  return successResponse(c, result)
})

// GET /api/customer-price-list/:custCode/uploads?page=1&pageSize=20
// History upload per customer
customerPriceListRoutes.get('/:custCode/uploads', async (c) => {
  const custCode = c.req.param('custCode').trim()
  const page = Number(c.req.query('page') ?? 1)
  const pageSize = Number(c.req.query('pageSize') ?? 20)
  const result = await listCustomerUploads(custCode, page, pageSize)
  return successResponse(c, result.rows, {
    page: result.page,
    limit: result.pageSize,
    total: result.total,
    totalPages: Math.ceil(result.total / (result.pageSize || 1)),
  })
})

// GET /api/customer-price-list/:custCode/filters
// Filter options untuk customer tertentu
customerPriceListRoutes.get('/:custCode/filters', async (c) => {
  const custCode = c.req.param('custCode').trim()
  const options = await getCustomerPriceListFilters(custCode)
  return successResponse(c, options)
})

// GET /api/customer-price-list/uploads/:id/diff
// Diff antara upload :id dan pendahulunya
customerPriceListRoutes.get('/uploads/:id/diff', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return errorResponse(c, 'ID tidak valid', 400)
  const diff = await getCustomerUploadDiff(id)
  if (!diff) return errorResponse(c, 'Upload tidak ditemukan', 404)
  return successResponse(c, diff)
})

// POST /api/customer-price-list/:custCode/upload  (multipart/form-data)
customerPriceListRoutes.post('/:custCode/upload', async (c) => {
  const user = c.get('user')
  const custCode = c.req.param('custCode').trim()

  const hasUploadPermission =
    user.role === 'admin' ||
    user.permissions?.some(
      (p: string) =>
        p === '/*' ||
        p === '/mshipping/finance/price-list/upload' ||
        p.startsWith('/mshipping/finance/price-list'),
    )

  if (!hasUploadPermission) {
    return errorResponse(c, 'Anda tidak memiliki izin untuk mengupload price list customer', 403)
  }

  const body = await c.req.parseBody()
  const file = body['file']
  const effectiveDateStr = body['effectiveDate'] as string

  if (!file || !(file instanceof File)) {
    return errorResponse(c, 'File tidak ditemukan. Kirim sebagai multipart/form-data field "file"', 400)
  }
  if (!/\.xlsx?$/i.test(file.name)) {
    return errorResponse(c, 'Format file harus .xlsx atau .xls', 400)
  }
  if (!effectiveDateStr) {
    return errorResponse(c, 'Tanggal berlaku (effectiveDate) wajib diisi', 400)
  }

  const effectiveDate = new Date(effectiveDateStr)
  if (isNaN(effectiveDate.getTime())) {
    return errorResponse(c, 'Format tanggal effectiveDate tidak valid (gunakan YYYY-MM-DD)', 400)
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    const result = await ingestCustomerPriceListFile(
      buffer,
      custCode,
      file.name,
      effectiveDate,
      user.username,
    )
    return c.json({ success: true, data: result }, 201)
  } catch (err: any) {
    return errorResponse(c, `Gagal memproses file: ${err?.message ?? 'Unknown error'}`, 500)
  }
})

export { customerPriceListRoutes }
