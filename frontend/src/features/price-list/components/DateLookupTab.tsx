import { useState } from 'react'
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Calendar,
  FileCheck,
  ChevronDown,
  Anchor,
  Plane,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import {
  SegmentedControl,
  PillSingleToggle,
  CategoryCombobox,
} from './DashboardFilters'
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
  dateColumns,
}: DateLookupTabProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(true)

  return (
    <div className="space-y-5">
      {/* Filter Card - Styled exactly as DashboardFilters */}
      <div className="card relative z-30 p-4 sm:p-5 rounded-2xl shadow-xs border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        {/* Collapsible Header */}
        <div
          className={`flex items-center justify-between gap-2.5 transition-all duration-300 ${
            filtersExpanded ? 'mb-4 pb-3 border-b border-[var(--color-border)]' : ''
          }`}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFiltersExpanded((v) => !v)}
              className="flex items-center gap-2 shrink-0 pl-1.5 pr-2.5 py-1.5 -ml-1.5 -my-1 rounded-lg hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
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
                className={`text-[var(--color-secondary)] transition-transform duration-150 ${
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

        {/* Filters Controls Grid */}
        {filtersExpanded && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
            {/* Tanggal Acuan */}
            <div className="lg:col-span-2 flex flex-col gap-1.5">
              <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase flex items-center gap-1.5">
                <Calendar size={12} />
                TANGGAL ACUAN
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-medium text-[var(--color-primary)] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
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
              <CategoryCombobox
                label="KATEGORI BARANG"
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={filterOptions?.categories || []}
                allowClear
                clearLabel="Semua Kategori"
                searchPlaceholder="Cari kategori..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Loading Progress Indicator */}
      {isRefreshingDate && (
        <div className="w-full bg-[var(--color-primary)]/10 h-1 rounded-full overflow-hidden">
          <div className="bg-[var(--color-primary)] h-full animate-pulse w-2/3 rounded-full" />
        </div>
      )}

      {/* Effective Upload Version Card */}
      {dateResult?.found && dateResult.uploadInfo && (
        <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <FileCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--color-primary)]">
                  {dateResult.uploadInfo.fileName}
                </span>
                <Badge variant="success">
                  Aktif per {formatDate(dateResult.uploadInfo.effectiveDate)}
                </Badge>
              </div>
              <p className="text-[0.75rem] text-[var(--color-secondary)] mt-0.5">
                Tanggal Acuan: <span className="font-semibold text-[var(--color-primary)]">{formatDate(dateResult.targetDate)}</span> | Upload pada {formatDate(dateResult.uploadInfo.uploadedAt)}
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="text-[var(--color-secondary)]">Total Tarif Ditemukan:</span>{' '}
            <span className="font-bold text-[var(--color-primary)] text-sm">{filteredDateItems.length} items</span>
          </div>
        </div>
      )}

      {/* Main Data Table */}
      {!dateResult?.found && !isLoadingDate ? (
        <EmptyState
          title="Tidak Ada Master Price List"
          description={`Belum ada berkas master price list yang berlaku pada atau sebelum tanggal ${formatDate(targetDate)}.`}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative max-w-xs w-full">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]"
              />
              <input
                type="text"
                placeholder="Cari sheet, cabang, kategori..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-9 pr-3 h-8 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>

            <div className="text-xs text-[var(--color-secondary)]">
              Menampilkan <span className="font-semibold text-[var(--color-primary)]">{filteredDateItems.length}</span> dari {dateResult?.items.length || 0} tarif
            </div>
          </div>

          <Table
            columns={dateColumns}
            data={filteredDateItems}
            keyExtractor={(item) => item.id}
            emptyMessage={tableSearch ? 'Tidak ada tarif yang cocok dengan kata kunci pencarian.' : t('common.noData')}
          />
        </div>
      )}
    </div>
  )
}
