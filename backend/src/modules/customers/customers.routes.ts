import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../../middleware/auth'
import { getCustomers, getCustomerById } from './customers.service'
import { successResponse, errorResponse } from '../../utils/response'

const customersRoutes = new Hono()

// Semua route customers memerlukan auth
customersRoutes.use('/*', authMiddleware, requirePermission('/mshipping/customers'))

customersRoutes.get('/', async (c) => {
  try {
    const query = c.req.query()
    const result = await getCustomers(query)
    return successResponse(c, result.data, result.meta)
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
