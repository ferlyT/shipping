import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../../middleware/auth'
import { validateQuery } from '../../middleware/requestValidator'
import { CustomerQuerySchema, CustomerSuggestionsQuerySchema } from './customers.types'
import { getCustomers, getCustomerById, getCustomerSuggestions } from './customers.service'
import { successResponse, errorResponse } from '../../utils/response'

const customersRoutes = new Hono()

// Semua route customers memerlukan autentikasi login (bisa diakses oleh semua role yang login)
customersRoutes.use('/*', authMiddleware)

customersRoutes.get('/', validateQuery(CustomerQuerySchema), async (c) => {
  try {
    const query = c.req.valid('query' as any) || c.req.query()
    const result = await getCustomers(query)
    return successResponse(c, result.data, result.meta)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

customersRoutes.get('/suggestions', validateQuery(CustomerSuggestionsQuerySchema), async (c) => {
  try {
    const query = c.req.valid('query' as any) || c.req.query()
    const q = query.q || ''
    const suggestions = await getCustomerSuggestions(q)
    return successResponse(c, suggestions)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

customersRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const customer = await getCustomerById(id)
    if (!customer) return errorResponse(c, 'Customer tidak ditemukan', 404)
    return successResponse(c, customer)
  } catch (err) {
    return errorResponse(c, (err as Error).message, 500)
  }
})

export { customersRoutes }
