import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import {
  ingestPriceListFile,
  listUploads,
  getUploadDiff,
  getLatestUploadDiff,
  getPriceTrend,
  getFilterOptions,
  lookupPriceList,
  searchEntryList,
  lookupPriceByEntry,
} from './price-list.service'

const priceListRoutes = new Hono()

// Semua route memerlukan auth
priceListRoutes.use('/*', authMiddleware, requirePermission('/mshipping/finance/price-list'))

// GET /api/price-list/uploads?page=1&pageSize=20
priceListRoutes.get('/uploads', async (c) => {
  const page = Number(c.req.query('page') ?? 1)
  const pageSize = Number(c.req.query('pageSize') ?? 20)
  const result = await listUploads(page, pageSize)
  return successResponse(c, result.rows, {
    page: result.page,
    limit: result.pageSize,
    total: result.total,
    totalPages: Math.ceil(result.total / result.pageSize),
  })
})

// GET /api/price-list/uploads/latest/diff
priceListRoutes.get('/uploads/latest/diff', async (c) => {
  const diff = await getLatestUploadDiff()
  if (!diff) return successResponse(c, null)
  return successResponse(c, diff)
})


// GET /api/price-list/uploads/:id/diff
priceListRoutes.get('/uploads/:id/diff', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return errorResponse(c, 'ID tidak valid', 400)
  const diff = await getUploadDiff(id)
  if (!diff) return errorResponse(c, 'Upload tidak ditemukan', 404)
  return successResponse(c, diff)
})

// GET /api/price-list/filters?sheetType=CS&mode=BY SEA
priceListRoutes.get('/filters', async (c) => {
  const sheetType = c.req.queries('sheetType')
  const mode = c.req.query('mode')
  const options = await getFilterOptions({ sheetType, mode })
  return successResponse(c, options)
})

// GET /api/price-list/trend?sheetType=CS&mode=BY SEA&branch=SG&category=General Goods
priceListRoutes.get('/trend', async (c) => {
  const { sheetType, mode, branch, category, from, to } = c.req.query()
  const trend = await getPriceTrend({
    sheetType: sheetType || undefined,
    mode: mode || undefined,
    branch: branch || undefined,
    category: category || undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  })
  return successResponse(c, trend)
})

// GET /api/price-list/lookup?date=YYYY-MM-DD&sheetType=CS&mode=BY SEA&branch=SG&category=General Goods
priceListRoutes.get('/lookup', async (c) => {
  const { date, sheetType, mode, branch, category } = c.req.query()
  const targetDate = date ? new Date(date) : new Date()

  const result = await lookupPriceList(targetDate, {
    sheetType: sheetType || undefined,
    mode: mode || undefined,
    branch: branch || undefined,
    category: category || undefined,
  })

  return successResponse(c, result)
})

// GET /api/price-list/entry-search?q=XXX&limit=20
priceListRoutes.get('/entry-search', async (c) => {
  const q = c.req.query('q') ?? ''
  const limit = Number(c.req.query('limit') ?? 20)
  const results = await searchEntryList(q, limit)
  return successResponse(c, results)
})

// GET /api/price-list/lookup-by-entry?listCode=XXXXXXX
priceListRoutes.get('/lookup-by-entry', async (c) => {
  const listCode = c.req.query('listCode') ?? ''
  if (!listCode) return errorResponse(c, 'Parameter listCode wajib diisi', 400)
  const result = await lookupPriceByEntry(listCode)
  return successResponse(c, result)
})



// POST /api/price-list/upload  (multipart/form-data)
// Akses: admin by default, atau role yang punya permission path ini
priceListRoutes.post('/upload', async (c) => {
  const user = c.get('user')

  // Only allow admin or users with explicit upload permission
  const hasUploadPermission =
    user.role === 'admin' ||
    user.permissions?.some((p) =>
      p === '/*' ||
      p === '/mshipping/finance/price-list/upload' ||
      p.startsWith('/mshipping/finance/price-list')
    )

  if (!hasUploadPermission) {
    return errorResponse(c, 'Anda tidak memiliki izin untuk mengupload price list', 403)
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
    const result = await ingestPriceListFile(buffer, file.name, effectiveDate, user.username)
    return c.json({ success: true, data: result }, 201)
  } catch (err: any) {
    return errorResponse(c, `Gagal memproses file: ${err?.message ?? 'Unknown error'}`, 500)
  }
})

export { priceListRoutes }
