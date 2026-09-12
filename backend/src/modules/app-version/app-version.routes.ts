import { Hono } from 'hono'
import { successResponse } from '../../utils/response'
import { AppVersionService } from './app-version.service'

export const appVersionRoutes = new Hono()

// GET /api/app-version/latest
appVersionRoutes.get('/latest', async (c) => {
  const versionInfo = await AppVersionService.getLatestVersion()
  return successResponse(c, versionInfo)
})

// GET /api/app-version (alias)
appVersionRoutes.get('/', async (c) => {
  const versionInfo = await AppVersionService.getLatestVersion()
  return successResponse(c, versionInfo)
})
