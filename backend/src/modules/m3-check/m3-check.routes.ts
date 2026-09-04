import { Hono } from 'hono'
import { evaluateM3Check, getM3CustPerMarkingDetails } from './m3-check.service'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'

export const m3CheckRoutes = new Hono()

m3CheckRoutes.use('*', authMiddleware)

/**
 * GET /api/m3-check/cust-marking-details
 * Mengambil rincian M3 Customer per Marking
 */
m3CheckRoutes.get('/cust-marking-details', async (c) => {
  const custCode = c.req.query('custCode') || ''
  const markingCode = c.req.query('markingCode') || ''
  if (!custCode || !markingCode) {
    return errorResponse(c, 'Parameter custCode dan markingCode wajib diisi', 400)
  }
  const result = await getM3CustPerMarkingDetails(custCode, markingCode)
  return successResponse(c, result)
})

/**
 * GET /api/m3-check/:identifier?
 * Evaluasi M3 Check terpadu berdasarkan listCode, no invoice, atau kode marking
 */
m3CheckRoutes.get('/:identifier?', async (c) => {
  try {
    const identifier = c.req.param('identifier') || c.req.query('listCode') || c.req.query('identifier')
    if (!identifier) {
      return errorResponse(c, 'Parameter listCode / identifier wajib diisi', 400)
    }
    const result = await evaluateM3Check(identifier)
    return successResponse(c, result)
  } catch (err: any) {
    return errorResponse(c, err?.message || 'Gagal mengevaluasi kesesuaian M3', 500)
  }
})

/**
 * POST /api/m3-check/evaluate
 * Evaluasi M3 Check melalui payload JSON
 */
m3CheckRoutes.post('/evaluate', async (c) => {
  try {
    const body = await c.req.json()
    const identifier = body?.listCode || body?.identifier || body?.markingCode
    if (!identifier) {
      return errorResponse(c, 'Field listCode atau identifier wajib diisi', 400)
    }
    const result = await evaluateM3Check(identifier)
    return successResponse(c, result)
  } catch (err: any) {
    return errorResponse(c, err?.message || 'Gagal mengevaluasi kesesuaian M3', 500)
  }
})
