import { Search, Plus, Plane, Ship, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'

interface Props {
  search: string
  onSearchChange: (val: string) => void
  listType: string
  onListTypeChange: (val: string) => void
  status: string
  onStatusChange: (val: string) => void
  onCreateClick: () => void
}

export function InspectionFilterBar({
  search,
  onSearchChange,
  listType,
  onListTypeChange,
  status,
  onStatusChange,
  onCreateClick,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-[var(--color-surface)] p-3 sm:p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-xs">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[240px]">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('common.search')}
          className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] placeholder-[var(--color-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)]"
        />
        {search ? (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] p-0.5"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Moda Selector */}
        <div className="flex items-center bg-[var(--color-neutral)] p-0.5 rounded-lg border border-[var(--color-border)] text-xs font-medium">
          <button
            type="button"
            onClick={() => onListTypeChange('all')}
            className={`px-2.5 py-1.5 rounded-md transition-all ${
              listType === 'all'
                ? 'bg-[var(--color-surface)] text-[var(--color-primary)] font-bold shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            {t('common.all')}
          </button>
          <button
            type="button"
            onClick={() => onListTypeChange('1')}
            className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
              listType === '1'
                ? 'bg-[var(--color-surface)] text-sky-500 font-bold shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            <Plane size={12} />
            {t('common.air')}
          </button>
          <button
            type="button"
            onClick={() => onListTypeChange('2')}
            className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
              listType === '2'
                ? 'bg-[var(--color-surface)] text-blue-500 font-bold shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            <Ship size={12} />
            {t('common.sea')}
          </button>
        </div>

        {/* Status Selector */}
        <div className="flex items-center bg-[var(--color-neutral)] p-0.5 rounded-lg border border-[var(--color-border)] text-xs font-medium">
          <button
            type="button"
            onClick={() => onStatusChange('all')}
            className={`px-2.5 py-1.5 rounded-md transition-all ${
              status === 'all'
                ? 'bg-[var(--color-surface)] text-[var(--color-primary)] font-bold shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            {t('common.status')}
          </button>
          <button
            type="button"
            onClick={() => onStatusChange('1')}
            className={`px-2.5 py-1.5 rounded-md transition-all ${
              status === '1'
                ? 'bg-[var(--color-surface)] text-amber-500 font-bold shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            {t('bap.statusDraft')}
          </button>
          <button
            type="button"
            onClick={() => onStatusChange('2')}
            className={`px-2.5 py-1.5 rounded-md transition-all ${
              status === '2'
                ? 'bg-[var(--color-surface)] text-emerald-500 font-bold shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            {t('bap.statusDone')}
          </button>
        </div>

        {/* Create Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onCreateClick}
          className="gap-1.5 shadow-xs"
        >
          <Plus size={15} />
          <span>{t('bap.create')}</span>
        </Button>
      </div>
    </div>
  )
}
