import { Hono } from 'hono'
import { evaluatePriceCheck, evaluateBatchPriceCheck } from './price-check.service'
import { authMiddleware } from '../../middleware/auth'

export const priceCheckRoutes = new Hono()

priceCheckRoutes.use('*', authMiddleware)

/**
 * POST /api/v1/price-check/evaluate
 * Evaluasi satu item transaksi dengan Unified Price Check Service
 */
priceCheckRoutes.post('/evaluate', async (c) => {
  try {
    const body = await c.req.json()
    const result = await evaluatePriceCheck(body)
    return c.json({
      success: true,
      data: result,
    })
  } catch (err: any) {
    return c.json(
      {
        success: false,
        message: err?.message || 'Gagal mengevaluasi kesesuaian harga',
      },
      500
    )
  }
})

/**
 * GET /api/v1/price-check/entry/:listCode
 * Evaluasi cepat berdasarkan listCode transaksi
 */
priceCheckRoutes.get('/entry/:listCode', async (c) => {
  try {
    const listCode = c.req.param('listCode')
    const result = await evaluatePriceCheck({ listCode })
    return c.json({
      success: true,
      data: result,
    })
  } catch (err: any) {
    return c.json(
      {
        success: false,
        message: err?.message || 'Gagal mengevaluasi harga transaksi',
      },
      500
    )
  }
})
