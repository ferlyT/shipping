import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => React.ReactNode
  className?: string
  sortable?: boolean
  fixed?: boolean
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  keyExtractor: (row: T) => string | number
  isLoading?: boolean
  emptyMessage?: string
  getRowClassName?: (row: T) => string
  onSort?: (key: string) => void
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  tableClassName?: string
}

export function Table<T>({ 
  columns, data, onRowClick, keyExtractor, isLoading, emptyMessage, getRowClassName,
  onSort, sortColumn, sortDirection, tableClassName
}: TableProps<T>) {
  if (isLoading) return <TableSkeleton columns={columns.length} />
  if (!data.length) return <EmptyTableState message={emptyMessage} />

  return (
    <div className="w-full relative">
      <table className={cn("w-full text-xs sm:text-sm table-fixed", tableClassName)}>
        <thead className="sticky top-0 z-20 shadow-[0_1px_0_0_var(--color-border)]">
          <tr className="bg-[var(--color-neutral)] border-b border-[var(--color-border)]">
            {columns.map((col) => (
              <th 
                key={col.key} 
                className={cn(
                  'px-5 py-[14px] text-left font-medium text-[var(--color-secondary)] font-[var(--font-label)] text-[11px] tracking-[0.08em] uppercase whitespace-nowrap',
                  col.sortable && 'cursor-pointer hover:bg-[var(--color-surface)]/50 transition-colors',
                  col.fixed && 'sticky left-0 z-30 bg-[var(--color-neutral)] shadow-[1px_0_0_0_var(--color-border)]',
                  col.className
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && (
                    <span className="text-[var(--color-secondary)]">
                      {sortColumn === col.key ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-[var(--color-primary)]" /> : <ArrowDown className="w-3 h-3 text-[var(--color-primary)]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const customRowClass = getRowClassName ? getRowClassName(row) : ''
            return (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-[var(--color-border)] transition-colors duration-100 last:border-0 bg-[var(--color-surface)]',
                  onRowClick && 'cursor-pointer',
                  customRowClass || 'hover:bg-[var(--color-neutral)]'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn(
                    'px-5 py-[18px] align-top text-[var(--color-primary)] text-[14px] overflow-hidden',
                    col.fixed && 'sticky left-0 z-10 bg-inherit shadow-[1px_0_0_0_var(--color-border)]',
                    col.className
                  )}>
                    {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function TableSkeleton<T>({ columns }: { columns: Column<T>[] | number }) {
  const colList: Column<T>[] = Array.isArray(columns)
    ? columns
    : Array.from({ length: columns }).map((_, i) => ({
        key: `col_${i}`,
        header: '',
      }))

  return (
    <div className="w-full relative">
      <table className="w-full text-xs sm:text-sm table-fixed">
        <thead className="sticky top-0 z-20 shadow-[0_1px_0_0_var(--color-border)]">
          <tr className="bg-[var(--color-neutral)] border-b border-[var(--color-border)]">
            {colList.map((col, idx) => (
              <th
                key={col.key || idx}
                className={cn(
                  'px-5 py-[14px] text-left font-medium text-[var(--color-secondary)] font-[var(--font-label)] text-[11px] tracking-[0.08em] uppercase whitespace-nowrap',
                  col.className
                )}
              >
                {col.header || <div className="h-3 w-16 rounded-md skeleton-shimmer" />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="bg-[var(--color-surface)]">
              {colList.map((col, j) => (
                <td key={col.key || j} className={cn('px-5 py-4 align-middle', col.className)}>
                  <div
                    className={cn(
                      'h-3.5 rounded-md skeleton-shimmer',
                      j === 0 ? 'w-6' : j === 1 ? 'w-3/4' : j % 2 === 0 ? 'w-1/2' : 'w-2/3'
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyTableState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[var(--color-muted)]">
      <p className="text-sm">{message ?? 'No data available'}</p>
    </div>
  )
}
