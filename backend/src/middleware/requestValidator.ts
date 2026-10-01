import { zValidator } from '@hono/zod-validator'
import type { ZodType } from 'zod'
import { errorResponse } from '../utils/response'

/**
 * Standard request body validator using Zod schema.
 * Formats validation failures with unified errorResponse (status 422).
 */
export function validateBody<T extends ZodType>(schema: T) {
  return zValidator('json', schema, (result, c) => {
    if (!result.success) {
      const firstIssue = result.error.issues[0]
      const message = firstIssue?.message || 'Data input tidak valid'
      return errorResponse(c, message, 422, result.error.issues)
    }
  })
}

/**
 * Standard URL query parameters validator using Zod schema.
 * Formats validation failures with unified errorResponse (status 400).
 */
export function validateQuery<T extends ZodType>(schema: T) {
  return zValidator('query', schema, (result, c) => {
    if (!result.success) {
      const firstIssue = result.error.issues[0]
      const message = firstIssue?.message || 'Parameter query tidak valid'
      return errorResponse(c, message, 400, result.error.issues)
    }
  })
}
