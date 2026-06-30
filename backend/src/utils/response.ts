import type { Context } from 'hono'

export interface PaginatedMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Gunakan ini untuk semua response sukses
export function successResponse<T>(c: Context, data: T, meta?: PaginatedMeta, status = 200) {
  return c.json({ success: true, data, ...(meta && { meta }) }, status as any)
}

// Gunakan ini untuk semua response error
export function errorResponse(c: Context, message: string, status = 400, details?: unknown) {
  return c.json({ success: false, error: message, ...(details && { details }) }, status as any)
}
