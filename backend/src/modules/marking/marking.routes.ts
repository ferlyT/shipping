import { Hono } from 'hono'
import { listMarkings, getMarkingDetailController } from './marking.controller'
import { authMiddleware } from '../../middleware/auth'

export const markingRoutes = new Hono()

markingRoutes.use('*', authMiddleware)

markingRoutes.get('/', listMarkings)
markingRoutes.get('/:id', getMarkingDetailController)
