import type { Context } from 'hono'

export interface PaginatedMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

function deepTrim(obj: any): any {
  if (typeof obj === 'string') return obj.trim()
  if (Array.isArray(obj)) return obj.map(deepTrim)
  if (obj !== null && typeof obj === 'object') {
    // Handle objects with toJSON (like Date or Prisma Decimal)
    let plainObj = obj
    if (typeof obj.toJSON === 'function') {
      plainObj = obj.toJSON()
    }
    
    // If it became a primitive after toJSON
    if (typeof plainObj !== 'object' || plainObj === null) {
      return deepTrim(plainObj)
    }

    const trimmed: any = {}
    for (const key in plainObj) {
      if (Object.prototype.hasOwnProperty.call(plainObj, key)) {
        trimmed[key] = deepTrim(plainObj[key])
      }
    }
    return trimmed
  }
  return obj
}

// Gunakan ini untuk semua response sukses
export function successResponse<T>(c: Context, data: T, meta?: PaginatedMeta, status = 200) {
  const cleanData = deepTrim(data)
  return c.json({ success: true, data: cleanData, ...(meta && { meta }) }, status as any)
}

// Gunakan ini untuk semua response error
export function errorResponse(c: Context, message: string, status = 400, details?: unknown) {
  return c.json({ success: false, error: message, ...(details !== undefined ? { details } : {}) }, status as any)
}
