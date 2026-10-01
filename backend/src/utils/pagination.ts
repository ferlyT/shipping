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
  const rawPage = parseInt(query.page ?? '1', 10)
  const page = isNaN(rawPage) ? 1 : Math.max(1, rawPage)

  const rawLimit = parseInt(query.limit ?? '20', 10)
  const limit = isNaN(rawLimit) ? 20 : Math.min(100, Math.max(1, rawLimit))

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
