import { Rows3 } from 'lucide-react'
import { SearchBar } from '@/components/ui/SearchBar'
import { cn } from '@/lib/utils'

interface ShipmentFilterToolbarProps {
  search: string
  onSearchChange: (val: string) => void
  listTypeFilter: 'ALL' | '1' | '2'
  onListTypeFilterChange: (val: 'ALL' | '1' | '2') => void
  groupByStatus: boolean
  onToggleGroupByStatus: () => void
  limit: number
  onLimitChange: (limit: number) => void
}

export function ShipmentFilterToolbar({
  search,
  onSearchChange,
  listTypeFilter,
  onListTypeFilterChange,
  groupByStatus,
  onToggleGroupByStatus,
  limit,
  onLimitChange,
}: ShipmentFilterToolbarProps) {
  return (
    <div className="flex flex-shrink-0 flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--color-surface)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm">
      <div className="flex items-center gap-2 bg-gray-100/80 p-1 rounded-lg">
        <button
          onClick={() => onListTypeFilterChange('ALL')}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
            listTypeFilter === 'ALL'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          )}
        >
          All
        </button>
        <button
          onClick={() => onListTypeFilterChange('1')}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
            listTypeFilter === '1'
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          )}
        >
          AIR
        </button>
        <button
          onClick={() => onListTypeFilterChange('2')}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
            listTypeFilter === '2'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          )}
        >
          SEA
        </button>
      </div>

      <div className="flex items-center gap-4 w-full sm:w-auto">
        <div className="flex-1 sm:w-72">
          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder="Cari list code, customer, marking, deskripsi..."
          />
        </div>
        <button
          type="button"
          onClick={onToggleGroupByStatus}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors whitespace-nowrap',
            groupByStatus
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
              : 'bg-transparent text-gray-500 border-[var(--color-border)] hover:text-gray-900'
          )}
          title="Kelompokkan daftar berdasarkan status pengiriman"
        >
          <Rows3 className="w-4 h-4" />
          <span className="hidden lg:inline">Group by Status</span>
        </button>
        <div className="flex items-center gap-2 text-sm text-[var(--color-secondary)] whitespace-nowrap">
          <span className="hidden lg:inline">Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="bg-transparent border border-[var(--color-border)] rounded px-2 py-1.5 focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  )
}
