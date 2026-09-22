import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatNumber } from '@/lib/utils'

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
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6 py-3">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-secondary)]">
          <span>Baris per halaman:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)] focus:outline-none cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <p className="text-xs text-[var(--color-secondary)] font-medium">
          Menampilkan <span className="font-bold text-[var(--color-primary)] tabular-nums">{formatNumber(start)}–{formatNumber(end)}</span> dari{' '}
          <span className="font-bold text-[var(--color-primary)] tabular-nums">{formatNumber(total)}</span> data
        </p>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-8 px-2.5 text-xs cursor-pointer border border-[var(--color-border)] disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Prev</span>
          </Button>

          <span className="text-xs text-[var(--color-primary)] font-semibold px-2 tabular-nums">
            {page} / {totalPages}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-8 px-2.5 text-xs cursor-pointer border border-[var(--color-border)] disabled:opacity-40"
          >
            <span className="hidden sm:inline mr-1">Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

