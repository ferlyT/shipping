import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

interface Column<T> {
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
          <tr className="bg-[var(--color-neutral)] border-b border-[#E4E1DA]">
            {columns.map((col) => (
              <th 
                key={col.key} 
                className={cn(
                  'px-5 py-[14px] text-left font-medium text-[var(--color-secondary)] font-[var(--font-label)] text-[11px] tracking-[0.08em] uppercase whitespace-nowrap',
                  col.sortable && 'cursor-pointer hover:bg-black/5 transition-colors',
                  col.fixed && 'sticky left-0 z-30 bg-[var(--color-neutral)] shadow-[1px_0_0_0_var(--color-border)]',
                  col.className
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && (
                    <span className="text-gray-400">
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
                  'border-b border-[#EFEDE7] transition-colors duration-100 last:border-0 bg-white',
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

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="skeleton h-8" />
          ))}
        </div>
      ))}
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
