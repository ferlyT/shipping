import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../../middleware/auth'
import { getDashboardStats } from './dashboard.service'
import { successResponse, errorResponse } from '../../utils/response'
import { logger } from '../../config/logger'

const dashboardRoutes = new Hono()

dashboardRoutes.use('/*', authMiddleware, requirePermission('/mshipping/dashboard'))

dashboardRoutes.get('/stats', async (c) => {
  try {
    const stats = await getDashboardStats()
    return successResponse(c, stats)
  } catch (error: any) {
    logger.error('Dashboard Stats Error:', error)
    return errorResponse(c, error.message || 'Gagal mengambil statistik dashboard', 500)
  }
})

export { dashboardRoutes }

