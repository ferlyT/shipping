import type { Context } from 'hono'
import { logger } from '../config/logger'
import { errorResponse } from '../utils/response'

export function createErrorHandler() {
  return async (err: Error, c: Context) => {
    logger.error('Unhandled error', { 
      message: err.message, 
      stack: err.stack,
      path: c.req.path 
    })
    return errorResponse(c, 'Terjadi kesalahan server', 500)
  }
}
