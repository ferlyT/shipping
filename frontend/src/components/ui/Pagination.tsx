import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  total: number
  limit: number
}

export function Pagination({ page, totalPages, onPageChange, total, limit }: PaginationProps) {
  if (totalPages <= 1) return null
  
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)
  
  return (
    <div className="flex flex-wrap items-center justify-between w-full sm:w-auto gap-3">
      <p className="text-xs text-[var(--color-secondary)] font-[var(--font-label)] whitespace-nowrap">
        {start}–{end} of {total} entries
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost" size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs text-[var(--color-primary)] font-medium px-2">
          {page} / {totalPages}
        </span>
        <Button
          variant="ghost" size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
