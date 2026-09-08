import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import {
  getCommodityMappings,
  getCommodityMappingById,
  createCommodityMapping,
  updateCommodityMapping,
  deleteCommodityMapping,
  getCommoditySuggestions,
  applyMappingsToNewUpload,
  getPriceListOptions,
} from './commodity-mapping.service'

const commodityMappingRoutes = new Hono()

// Require auth
commodityMappingRoutes.use('/*', authMiddleware)

// GET /api/commodity-mapping
commodityMappingRoutes.get('/', async (c) => {
  try {
    const query = c.req.query()
    const result = await getCommodityMappings(query)
    return successResponse(c, result.data, result.meta)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengambil data pemetaan komoditas', 500)
  }
})

// GET /api/commodity-mapping/price-list-options
commodityMappingRoutes.get('/price-list-options', async (c) => {
  try {
    const scope = (c.req.query('scope') || 'global') as 'global' | 'customer'
    const custCode = c.req.query('custCode') || undefined
    const options = await getPriceListOptions(scope, custCode)
    return successResponse(c, options)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengambil daftar price list', 500)
  }
})

// GET /api/commodity-mapping/suggestions
commodityMappingRoutes.get('/suggestions', async (c) => {
  try {
    const q = c.req.query('q') || ''
    const limit = Number(c.req.query('limit') ?? 20)
    const suggestions = await getCommoditySuggestions(q, limit)
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    return successResponse(c, suggestions)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengambil saran komoditas', 500)
  }
})

// GET /api/commodity-mapping/:id
commodityMappingRoutes.get('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    if (isNaN(id)) return errorResponse(c, 'ID tidak valid', 400)
    const item = await getCommodityMappingById(id)
    if (!item) return errorResponse(c, 'Pemetaan komoditas tidak ditemukan', 404)
    return successResponse(c, item)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengambil detail pemetaan komoditas', 500)
  }
})

// POST /api/commodity-mapping
commodityMappingRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()
    if (!body.commodityName || !body.targetCommodity) {
      return errorResponse(c, 'Nama komoditas dan tipe komoditi tujuan wajib diisi', 400)
    }
    const created = await createCommodityMapping(body)
    return successResponse(c, created, undefined)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal menambahkan pemetaan komoditas', 500)
  }
})

// PUT /api/commodity-mapping/:id
commodityMappingRoutes.put('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    if (isNaN(id)) return errorResponse(c, 'ID tidak valid', 400)
    const body = await c.req.json()
    const updated = await updateCommodityMapping(id, body)
    return successResponse(c, updated, undefined)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal memperbarui pemetaan komoditas', 500)
  }
})

// DELETE /api/commodity-mapping/:id
commodityMappingRoutes.delete('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    if (isNaN(id)) return errorResponse(c, 'ID tidak valid', 400)
    await deleteCommodityMapping(id)
    return successResponse(c, { id, message: 'Pemetaan komoditas berhasil dihapus' })
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal menghapus pemetaan komoditas', 500)
  }
})

// POST /api/commodity-mapping/apply-to-upload
commodityMappingRoutes.post('/apply-to-upload', async (c) => {
  try {
    const body = await c.req.json()
    if (!body.uploadId || !body.effectiveDate) {
      return errorResponse(c, 'uploadId dan effectiveDate wajib diisi', 400)
    }
    const result = await applyMappingsToNewUpload(body)
    return successResponse(c, result)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal menerapkan pemetaan ke price list', 500)
  }
})

export { commodityMappingRoutes }
