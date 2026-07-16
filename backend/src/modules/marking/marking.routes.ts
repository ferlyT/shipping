import { Hono } from 'hono'
import { listMarkings, getMarkingDetailController, getMarkingGroupsController, getManifestController, getMarkingKPIsController, getMarkingExitHistoryController } from './marking.controller'
import { authMiddleware, requirePermission } from '../../middleware/auth'

export const markingRoutes = new Hono()

markingRoutes.use('*', authMiddleware, requirePermission('/shipping/shipment-batches'))

markingRoutes.get('/', listMarkings)
markingRoutes.get('/kpi', getMarkingKPIsController)
markingRoutes.get('/exit-history', getMarkingExitHistoryController)
markingRoutes.get('/groups', getMarkingGroupsController)
markingRoutes.get('/:id', getMarkingDetailController)
markingRoutes.get('/:id/manifest', getManifestController)
