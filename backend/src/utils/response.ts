import type { Context } from 'hono'

export interface PaginatedMeta {
  page?: number
  limit?: number
  total: number
  totalPages: number
  [key: string]: any
}

/**
 * Mengubah karakter '^' warisan database menjadi tanda petik tunggal "'"
 */
export function replaceDbCaret(str: string): string {
  if (typeof str !== 'string') return str
  return str.replace(/\^/g, "'")
}

/**
 * Membersihkan data secara rekursif:
 * - String: trim spasi dan ubah '^' menjadi "'"
 * - BigInt: konversi ke Number
 * - Array & Object: proses secara rekursif
 */
export function cleanDbData<T = any>(obj: T): T {
  if (typeof obj === 'string') return replaceDbCaret(obj.trim()) as unknown as T
  if (typeof obj === 'bigint') return Number(obj) as unknown as T
  if (Array.isArray(obj)) return obj.map((item) => cleanDbData(item)) as unknown as T
  if (obj !== null && typeof obj === 'object') {
    // Handle objects with toJSON (like Date or Prisma Decimal)
    let plainObj: any = obj
    if (typeof plainObj.toJSON === 'function') {
      plainObj = plainObj.toJSON()
    }
    
    // If it became a primitive after toJSON
    if (typeof plainObj !== 'object' || plainObj === null) {
      return cleanDbData(plainObj)
    }

    const trimmed: any = {}
    for (const key in plainObj) {
      if (Object.prototype.hasOwnProperty.call(plainObj, key)) {
        trimmed[key] = cleanDbData(plainObj[key])
      }
    }
    return trimmed as T
  }
  return obj
}

// Alias untuk backward compatibility
export const deepTrim = cleanDbData


// Gunakan ini untuk semua response sukses
export function successResponse<T>(
  c: Context,
  data: T,
  metaOrMessage?: PaginatedMeta | string,
  status = 200
) {
  const cleanData = deepTrim(data)
  if (typeof metaOrMessage === 'string') {
    return c.json({ success: true, message: metaOrMessage, data: cleanData }, status as any)
  }
  return c.json({ success: true, data: cleanData, ...(metaOrMessage && { meta: metaOrMessage }) }, status as any)
}

// Gunakan ini untuk semua response error
export function errorResponse(c: Context, message: string, status = 400, details?: unknown) {
  return c.json(
    {
      success: false,
      error: message,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    status as any
  )
}
