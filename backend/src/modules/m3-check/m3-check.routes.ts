import { Hono } from 'hono'
import { evaluateM3Check, getM3CustPerMarkingDetails } from './m3-check.service'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import { validateBody, validateQuery } from '../../middleware/requestValidator'
import { EvaluateM3CheckSchema, M3CustMarkingDetailsQuerySchema } from './m3-check.types'

export const m3CheckRoutes = new Hono()

m3CheckRoutes.use('*', authMiddleware)

/**
 * GET /api/m3-check/cust-marking-details
 * Mengambil rincian M3 Customer per Marking
 */
m3CheckRoutes.get('/cust-marking-details', validateQuery(M3CustMarkingDetailsQuerySchema), async (c) => {
  try {
    const { custCode, markingCode } = c.req.valid('query')
    const result = await getM3CustPerMarkingDetails(custCode, markingCode)
    return successResponse(c, result)
  } catch (err: any) {
    return errorResponse(c, err?.message || 'Gagal mengambil rincian M3 Customer per Marking', 500)
  }
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
m3CheckRoutes.post('/evaluate', validateBody(EvaluateM3CheckSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const identifier = body.listCode || body.identifier || body.markingCode!
    const result = await evaluateM3Check(identifier)
    return successResponse(c, result)
  } catch (err: any) {
    return errorResponse(c, err?.message || 'Gagal mengevaluasi kesesuaian M3', 500)
  }
})
