import type { Context } from 'hono'
import { logger } from '../config/logger'
import { errorResponse } from '../utils/response'

import { ENV } from '../config/env'

export function createErrorHandler() {
  return async (err: Error, c: Context) => {
    logger.error('Unhandled server error', { 
      message: err.message, 
      stack: err.stack,
      path: c.req.path,
      method: c.req.method,
    })

    const message = ENV.IS_PRODUCTION
      ? 'Terjadi kesalahan pada server. Silakan hubungi administrator jika kendala berlanjut.'
      : (err.message || 'Terjadi kesalahan server')

    return errorResponse(
      c,
      message,
      500,
      ENV.IS_PRODUCTION ? undefined : { stack: err.stack }
    )
  }
}
