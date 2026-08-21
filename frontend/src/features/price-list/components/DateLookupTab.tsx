import { useState } from 'react'
import {
  SlidersHorizontal,
  RotateCcw,
  Calendar,
  FileCheck,
  ChevronDown,
  Anchor,
  Plane,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import {
  SegmentedControl,
  PillSingleToggle,
  CategoryMultiCombobox,
} from './DashboardFilters'
import { CategoryGroupedPriceTable } from './CategoryGroupedPriceTable'
import type { useDateLookup } from '../hooks/useDateLookup'

type DateLookupTabProps = ReturnType<typeof useDateLookup>

export function DateLookupTab({
  t,
  filterOptions,
  targetDate,
  setTargetDate,
  sheetTypeFilter,
  setSheetTypeFilter,
  modeFilter,
  setModeFilter,
  branchFilter,
  setBranchFilter,
  categoryFilter,
  setCategoryFilter,
  tableSearch,
  setTableSearch,
  isLoadingDate,
  isRefreshingDate,
  dateResult,
  handleResetFilters,
  isFiltered,
  filteredDateItems,
}: DateLookupTabProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(true)


  return (
    <div className="space-y-5">
      {/* Filter Card */}
      <div className="card relative z-30 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur shadow-xs">
        {/* Collapsible Header */}
        <div className="flex items-center justify-between gap-2.5 px-4 sm:px-5 py-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFiltersExpanded((v) => !v)}
              className="flex items-center gap-2 shrink-0 pl-1.5 pr-2.5 py-1.5 -ml-1.5 rounded-lg hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
            >
              <div className="relative shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-[var(--color-tertiary)]/10">
                <SlidersHorizontal size={13} className="text-[var(--color-tertiary)]" />
                {isFiltered && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-tertiary)] ring-2 ring-[var(--color-surface)]" />
                )}
              </div>
              <span className="text-[0.82rem] font-semibold text-[var(--color-primary)]">Filter Data</span>
              <ChevronDown
                size={14}
                className={`text-[var(--color-secondary)] transition-transform duration-300 ${
                  filtersExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.75rem] font-medium text-[var(--color-tertiary)] hover:bg-[var(--color-tertiary)]/10 transition-colors cursor-pointer"
              >
                <RotateCcw size={11} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filters Controls — plain mount/unmount with a fade-in. No overflow-hidden here on
            purpose: CategoryMultiCombobox needs to be able to pop its results list outside the
            row's natural bounds, which a height-animated (grid-rows) wrapper would clip. */}
        {filtersExpanded && (
          <div className="border-t border-[var(--color-border)] px-4 sm:px-5 pt-4 pb-4 sm:pb-5 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
              {/* Tanggal Acuan */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase flex items-center gap-1.5 whitespace-nowrap">
                  <Calendar size={12} className="shrink-0" />
                  TANGGAL ACUAN
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium text-[var(--color-primary)] shadow-2xs transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>

              {/* Mode */}
              <div className="lg:col-span-2">
                <SegmentedControl
                  label="MODE"
                  value={modeFilter}
                  onChange={setModeFilter}
                  options={filterOptions?.modes || []}
                  getIcon={(o) => {
                    const v = o.toLowerCase()
                    if (v.includes('sea') || v.includes('laut')) return Anchor
                    if (v.includes('air') || v.includes('udara')) return Plane
                    return undefined
                  }}
                />
              </div>

              {/* Sheet Type */}
              <div className="lg:col-span-2">
                <PillSingleToggle
                  label="SHEET TYPE"
                  value={sheetTypeFilter}
                  onChange={setSheetTypeFilter}
                  options={filterOptions?.sheetTypes || []}
                  clearLabel="Semua"
                />
              </div>

              {/* Cabang */}
              <div className="lg:col-span-3">
                <PillSingleToggle
                  label="CABANG"
                  value={branchFilter}
                  onChange={setBranchFilter}
                  options={filterOptions?.branches || []}
                  clearLabel="Semua"
                />
              </div>

              {/* Kategori Barang */}
              <div className="lg:col-span-3">
                <CategoryMultiCombobox
                  label="KATEGORI BARANG"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={filterOptions?.categories || []}
                  searchPlaceholder="Cari kategori..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Loading Progress Indicator */}
        {isRefreshingDate && (
          <div className="h-0.5 w-full bg-[var(--color-primary)]/10 rounded-b-2xl overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-[var(--color-primary)] animate-pulse" />
          </div>
        )}
      </div>

      {/* Effective Upload Version Banner */}
      {dateResult?.found && dateResult.uploadInfo && (
        <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-emerald-500/[0.04]">
          <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" aria-hidden />
          <div className="flex flex-wrap items-center justify-between gap-4 pl-4 pr-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <FileCheck size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[var(--color-primary)]">
                    {dateResult.uploadInfo.fileName}
                  </span>
                  <Badge variant="success">
                    Aktif per {formatDate(dateResult.uploadInfo.effectiveDate)}
                  </Badge>
                </div>
                <p className="text-[0.75rem] text-[var(--color-secondary)] mt-0.5">
                  Tanggal Acuan: <span className="font-semibold text-[var(--color-primary)]">{formatDate(dateResult.targetDate)}</span>
                  {' · '}Upload pada {formatDate(dateResult.uploadInfo.uploadedAt)}
                </p>
              </div>
            </div>

            <div className="text-right text-xs shrink-0">
              <span className="text-[var(--color-secondary)]">Total Tarif Ditemukan </span>
              <span className="font-bold text-[var(--color-primary)] text-sm">{filteredDateItems.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grouped Data Table */}
      {!dateResult?.found && !isLoadingDate ? (
        <EmptyState
          title="Tidak Ada Master Price List"
          description={`Belum ada berkas master price list yang berlaku pada atau sebelum tanggal ${formatDate(targetDate)}.`}
        />
      ) : (
        <CategoryGroupedPriceTable
          items={filteredDateItems}
          totalOriginalCount={dateResult?.items.length || 0}
          searchQuery={tableSearch}
          onSearchChange={setTableSearch}
          emptyMessage={tableSearch ? t('priceList.lookup.noMatch') : t('common.noData')}
        />
      )}
    </div>
  )
}

