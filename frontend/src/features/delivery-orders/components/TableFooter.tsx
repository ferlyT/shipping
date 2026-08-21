import { Pagination } from '@/components/ui/Pagination'

export function TableFooter({
  limit,
  page,
  total,
  onPageChange,
  onLimitChange,
}: {
  limit: number
  page: number
  total: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
      <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-secondary)]">
        Rows per page:
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-primary)] focus:outline-none cursor-pointer"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={onPageChange}
      />
    </div>
  )
}
