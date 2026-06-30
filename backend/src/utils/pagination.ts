// Gunakan ini untuk semua query yang memerlukan pagination
// DILARANG: buat logika pagination manual di service/route manapun

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationResult {
  skip: number
  take: number
  meta: (total: number) => {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function parsePagination(query: Record<string, string | undefined>): PaginationParams {
  const page = Math.max(1, parseInt(query.page ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')))
  return { page, limit }
}

export function buildPagination({ page, limit }: PaginationParams): PaginationResult {
  return {
    skip: (page - 1) * limit,
    take: limit,
    meta: (total: number) => ({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }),
  }
}
