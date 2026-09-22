import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'

interface CashierToolbarProps {
  mode: 'OFFICIAL' | 'TEMPORARY'
  onModeChange: (mode: 'OFFICIAL' | 'TEMPORARY') => void
  search: string
  onSearchChange: (val: string) => void
  startDate: string
  onStartDateChange: (val: string) => void
  endDate: string
  onEndDateChange: (val: string) => void
  statusFilter: string
  onStatusFilterChange: (val: string) => void
  onNewOfficial: () => void
  onNewTemp: () => void
  isRefreshing?: boolean
}

export function CashierToolbar({
  mode,
  onModeChange,
  search,
  onSearchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  statusFilter,
  onStatusFilterChange,
  onNewOfficial,
  onNewTemp,
  isRefreshing,
}: CashierToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      {/* Top Segmented Controls & Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Mode Tabs: Kasir Resmi vs Kasir Sementara */}
        <div className="inline-flex p-1 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] self-start">
          <button
            type="button"
            onClick={() => onModeChange('OFFICIAL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'OFFICIAL'
                ? 'bg-[var(--color-surface)] text-[var(--color-tertiary)] border border-[var(--color-tertiary)]/40 shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            {t('cashier.tabOfficial')}
          </button>
          <button
            type="button"
            onClick={() => onModeChange('TEMPORARY')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'TEMPORARY'
                ? 'bg-[var(--color-surface)] text-[var(--color-tertiary)] border border-[var(--color-tertiary)]/40 shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            {t('cashier.tabTemporary')}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {mode === 'OFFICIAL' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={onNewOfficial}
              className="whitespace-nowrap"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('cashier.btnNewOfficial')}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={onNewTemp}
              className="whitespace-nowrap"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('cashier.btnNewTemp')}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar: Search, Dates, Status */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
        <div className="flex-1 min-w-[220px]">
          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder={
              mode === 'OFFICIAL'
                ? 'Cari no. kasir RR-, pelanggan, ref kasir sem...'
                : 'Cari no. TR-, pelanggan, keterangan...'
            }
          />
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-secondary)]">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
          />
          <span>s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
          />
        </div>

        {/* Status Filter */}
        <div className="min-w-[130px]">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
          >
            {mode === 'OFFICIAL' ? (
              <>
                <option value="all">Semua Status</option>
                <option value="open">Open (Terbuka)</option>
                <option value="posted">Posted (Terkunci)</option>
              </>
            ) : (
              <>
                <option value="all">Semua Kasir Sem.</option>
                <option value="unattached">Pending Unattached</option>
                <option value="attached">Sudah Di-Attach</option>
              </>
            )}
          </select>
        </div>

        {isRefreshing && (
          <span className="text-[11px] text-[var(--color-secondary)] animate-pulse ml-auto">
            {t('common.loading')}
          </span>
        )}
      </div>
    </div>
  )
}
