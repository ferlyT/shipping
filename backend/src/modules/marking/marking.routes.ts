import { Hono } from 'hono'
import {
  listMarkings,
  getMarkingDetailController,
  getMarkingGroupsController,
  getManifestController,
  getManifestSuggestionsController,
  getMarkingKPIsController,
  getMarkingExitHistoryController,
  getMarkingSuggestionsController,
  getMarkingSizeAuditController,
  getMarkingBoxDimensionsController,
  getMarkingBatchAllDimensionsController,
} from './marking.controller'
import { authMiddleware, requirePermission } from '../../middleware/auth'

export const markingRoutes = new Hono()

markingRoutes.use('*', authMiddleware, requirePermission('/mshipping/shipment-batches'))

markingRoutes.get('/', listMarkings)
markingRoutes.get('/suggestions', getMarkingSuggestionsController)
markingRoutes.get('/kpi', getMarkingKPIsController)
markingRoutes.get('/exit-history', getMarkingExitHistoryController)
markingRoutes.get('/groups', getMarkingGroupsController)
markingRoutes.get('/size-audit/:code/all-dimensions', getMarkingBatchAllDimensionsController)
markingRoutes.get('/size-audit/:code', getMarkingSizeAuditController)
markingRoutes.get('/box-dimensions/:listCode', getMarkingBoxDimensionsController)
markingRoutes.get('/:id', getMarkingDetailController)
markingRoutes.get('/:id/manifest', getManifestController)
markingRoutes.get('/:id/manifest/search', getManifestSuggestionsController)
