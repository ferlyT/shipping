import { Hono } from 'hono'
import { evaluatePriceCheck, evaluateBatchPriceCheck } from './price-check.service'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import { validateBody } from '../../middleware/requestValidator'
import { EvaluatePriceCheckSchema, BatchEvaluatePriceCheckSchema } from './price-check.types'

export const priceCheckRoutes = new Hono()

priceCheckRoutes.use('*', authMiddleware)

/**
 * POST /api/price-check/evaluate
 * Evaluasi satu item transaksi dengan Unified Price Check Service
 */
priceCheckRoutes.post('/evaluate', validateBody(EvaluatePriceCheckSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const result = await evaluatePriceCheck(body)
    return successResponse(c, result)
  } catch (err: any) {
    return errorResponse(c, err?.message || 'Gagal mengevaluasi kesesuaian harga', 500)
  }
})

/**
 * POST /api/price-check/evaluate-batch
 * Evaluasi batch item transaksi dengan preloaded context
 */
priceCheckRoutes.post('/evaluate-batch', validateBody(BatchEvaluatePriceCheckSchema), async (c) => {
  try {
    const { items, mode } = c.req.valid('json')
    const resultMap = await evaluateBatchPriceCheck(items, mode)
    const results = Array.from(resultMap.entries()).map(([key, value]) => ({ key, ...value }))
    return successResponse(c, results)
  } catch (err: any) {
    return errorResponse(c, err?.message || 'Gagal mengevaluasi batch harga transaksi', 500)
  }
})

/**
 * GET /api/price-check/entry/:listCode
 * Evaluasi cepat berdasarkan listCode transaksi
 */
priceCheckRoutes.get('/entry/:listCode', async (c) => {
  try {
    const listCode = c.req.param('listCode')
    if (!listCode || !listCode.trim()) {
      return errorResponse(c, 'listCode wajib diisi', 400)
    }
    const result = await evaluatePriceCheck({ listCode: listCode.trim() })
    return successResponse(c, result)
  } catch (err: any) {
    return errorResponse(c, err?.message || 'Gagal mengevaluasi harga transaksi', 500)
  }
})
