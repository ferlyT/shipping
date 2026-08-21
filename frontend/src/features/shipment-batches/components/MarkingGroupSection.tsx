// MarkingGroupSection: menggabungkan GroupSection + StatusBlock dari kedua halaman
// Mendukung 2 mode:
//   - groupOnly (defaultMode): hanya seksi grup dalam status yang sudah dibuka (dipakai di Dashboard)
//   - withStatusBlock: seksi dengan header open/closed dapat di-collapse (dipakai di ListPage)
// DILARANG: mendefinisikan ulang GroupSection atau StatusBlock di halaman manapun

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { markingApi } from '../services/marking.service'
import { formatYearMonthKey, cn } from '@/lib/utils'
import { BatchRow, BatchListRow } from './MarkingBatchRow'
import { MARKING_BLOCK_META } from './MarkingStatusBadge'
import type { Marking, MarkingGroupMeta, MarkingGroupMode } from '../types/marking.types'

// ─────────────────────────────────────────────────────────────────────────────
// GroupSection — isi satu grup (misal: bulan, branch)
// ─────────────────────────────────────────────────────────────────────────────

interface GroupSectionProps {
  viewMode?: 'table' | 'shortlist'
  groupMeta: MarkingGroupMeta
  isClosed: string
  search: string
  listTypeFilter: 'ALL' | '1' | '2'
  groupMode: MarkingGroupMode
  defaultExpanded?: boolean
  /** Jika true, tampilkan pagination penuh (mode ListPage). Default: false (mode Dashboard, limit 5) */
  withPagination?: boolean
  onView: (r: Marking) => void
  onViewManifest: (r: Marking) => void
}

export function GroupSection({
  viewMode,
  groupMeta,
  isClosed,
  search,
  listTypeFilter,
  groupMode,
  defaultExpanded = false,
  withPagination = false,
  onView,
  onViewManifest,
}: GroupSectionProps) {
  const [open, setOpen] = useState(defaultExpanded || !!search)
  const prevSearch = useRef(search)
  const RECENT_LIMIT = 5

  // Auto-expand saat pencarian mulai aktif
  useEffect(() => {
    if (search && !prevSearch.current) setOpen(true)
    prevSearch.current = search
  }, [search])

  const { page, limit, setLimit, goToPage } = usePagination(withPagination ? 10 : RECENT_LIMIT)

  const { data, isLoading } = useQuery({
    queryKey: ['markings', groupMode, groupMeta.groupValue, isClosed, page, limit, search, listTypeFilter],
    queryFn: async () => {
      const res = await markingApi.list({
        page: withPagination ? page : 1,
        limit: withPagination ? limit : RECENT_LIMIT,
        search,
        listType: listTypeFilter,
        isClosed,
        groupMode,
        groupValue: groupMeta.groupValue,
      })
      return res.data as { data: Marking[]; meta: { total: number; totalPages: number } }
    },
    enabled: open,
  })

  const rows = data?.data || []
  const total = data?.meta?.total || 0
  const totalPages = data?.meta?.totalPages || 0

  const displayCount = groupMeta.count > 0
    ? groupMeta.count
    : open ? total : groupMeta.count

  const isDateMode = groupMode === 'load' || groupMode === 'etd' || groupMode === 'eta'
  const displayTitle =
    groupMeta.groupValue === 'Semua batch' || groupMeta.groupValue === 'Tidak diketahui'
      ? groupMeta.groupValue
      : isDateMode
        ? formatYearMonthKey(groupMeta.groupValue)
        : groupMeta.groupValue

  return (
    <div className="border-b border-[var(--color-border)] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-[var(--color-neutral)]/95 px-4 sm:px-6 py-3 text-left transition-colors hover:bg-[var(--color-neutral)] border-y border-[var(--color-border)]"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--color-secondary)]">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="font-[var(--font-label)] text-xs tracking-[0.08em] uppercase text-[var(--color-primary)] font-semibold truncate">
            {displayTitle}
          </span>
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] sm:text-[11px] font-bold text-[var(--color-secondary)] shrink-0">
            {displayCount}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-secondary)] shrink-0 tabular-nums">
          <span className="whitespace-nowrap">{groupMeta.totalPkgs.toLocaleString('en-US')} pkgs</span>
          <span className="text-[var(--color-border)]">·</span>
          <span className="whitespace-nowrap">{groupMeta.totalWeight.toLocaleString('en-US', { maximumFractionDigits: 0 })} kg</span>
        </span>
      </button>

      {open && (
        <div className="bg-[var(--color-surface)]">
          {isLoading ? (
            <div className="flex justify-center p-6">
              <div className="animate-spin w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className={cn('overflow-x-auto', viewMode === 'shortlist' ? 'hidden' : 'hidden sm:block')}>
                <table className="w-full min-w-[1000px] border-collapse bg-[var(--color-surface)]">
                  <thead>
                    <tr className="text-left font-[var(--font-label)] text-xs tracking-[0.08em] uppercase text-[var(--color-secondary)] border-b border-[var(--color-border)] bg-[var(--color-neutral)]/50">
                      <th className="py-3.5 pl-4 pr-3">Kode Marking</th>
                      <th className="py-3.5 px-3">Consignee</th>
                      <th className="py-3.5 px-3">Dokumen</th>
                      <th className="py-3.5 px-3">Volume / Berat</th>
                      <th className="py-3.5 px-3">LOAD / ETD / ETA / EXIT</th>
                      <th className="py-3.5 pr-4 pl-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-sm text-[var(--color-secondary)] font-medium">
                          Tidak ada data yang ditemukan.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <BatchRow key={row.fdMarkingCode} row={row} onView={onView} onViewManifest={onViewManifest} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile List */}
              <div className={cn('flex flex-col divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]', viewMode === 'shortlist' ? 'block' : 'sm:hidden')}>
                {rows.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--color-secondary)] font-medium bg-[var(--color-surface)]">
                    Tidak ada data yang ditemukan.
                  </div>
                ) : (
                  rows.map((row) => (
                    <BatchListRow key={row.fdMarkingCode} row={row} onView={onView} />
                  ))
                )}
              </div>

              {/* Pagination (ListPage) atau label "5 terbaru" (Dashboard) */}
              {withPagination && totalPages > 0 ? (
                <div className="border-t border-[var(--color-border)] px-3 sm:px-6 py-3 sm:py-4 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 bg-[var(--color-surface)]">
                  <Pagination page={page} limit={limit} total={total} totalPages={totalPages} onPageChange={goToPage} />
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--color-secondary)] shrink-0">
                    <span>Baris:</span>
                    <select
                      value={limit}
                      onChange={(e) => { setLimit(Number(e.target.value)); goToPage(1) }}
                      className="text-xs sm:text-sm text-[var(--color-primary)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1 outline-none bg-[var(--color-surface)] cursor-pointer font-[var(--font-body)]"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              ) : !withPagination && total > RECENT_LIMIT ? (
                <div className="border-t border-[var(--color-border)] px-3 sm:px-6 py-2.5 sm:py-3 text-center bg-[var(--color-surface)]">
                  <span className="text-xs font-medium text-[var(--color-secondary)]">
                    Menampilkan {rows.length} dari {total} batch terbaru
                  </span>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBlock — Header open/closed yang dapat di-collapse
// ─────────────────────────────────────────────────────────────────────────────

interface StatusBlockProps {
  viewMode?: 'table' | 'shortlist'
  status: 'open' | 'closed'
  isClosed: 'true' | 'false'
  search: string
  groupMode: MarkingGroupMode
  defaultOpen: boolean
  onView: (m: Marking) => void
  onViewManifest: (m: Marking) => void
  listTypeFilter: 'ALL' | '1' | '2'
  totalCountOverride?: number
  withPagination?: boolean
}

export function StatusBlock({
  viewMode,
  status,
  isClosed,
  search,
  groupMode,
  defaultOpen,
  onView,
  onViewManifest,
  listTypeFilter,
  totalCountOverride,
  withPagination = false,
}: StatusBlockProps) {
  const [expanded, setExpanded] = useState(defaultOpen || !!search)
  const prevSearch = useRef(search)

  useEffect(() => {
    if (search && !prevSearch.current) setExpanded(true)
    prevSearch.current = search
  }, [search])

  const meta = MARKING_BLOCK_META[status]
  const Icon = meta.icon

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['markingGroups', groupMode, isClosed, search, listTypeFilter],
    queryFn: async () => {
      const res = await markingApi.getGroups({ search, listType: listTypeFilter, isClosed, groupMode })
      return res.data as { data: MarkingGroupMeta[] }
    },
    enabled: expanded,
  })

  const groups = groupsData?.data || []
  const groupsSum = groups.reduce((acc, g) => acc + g.count, 0)
  const totalCount = groupsSum > 0
    ? groupsSum
    : totalCountOverride !== undefined ? totalCountOverride : groupsSum

  return (
    <div className={cn(
      'overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm border-l-[3px]',
      status === 'open' ? 'border-l-[var(--color-warning)]' : 'border-l-[var(--color-success)]'
    )}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 text-left bg-[var(--color-surface)] transition-colors hover:bg-[var(--color-neutral)]"
      >
        <span className="flex items-center gap-3 sm:gap-4 min-w-0">
          <span className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full border ${meta.badgeBg} ${meta.border}`}>
            <Icon className={`h-[18px] w-[18px] ${meta.accent}`} />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className={`text-sm sm:text-base font-bold leading-tight ${meta.accent}`}>{meta.label}</span>
              <span className={`inline-flex items-baseline gap-1 w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.badgeBg} ${meta.badgeText} whitespace-nowrap`}>
                <span className="font-[var(--font-display)] tabular-nums">{totalCount}</span> batch
              </span>
            </span>
            <span className="mt-1 block text-xs sm:text-sm font-medium text-[var(--color-secondary)] truncate">{meta.hint}</span>
          </span>
        </span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.badgeBg} ${meta.accent}`}>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>

      {expanded && (
        <div>
          {isLoading ? (
            <div className="flex flex-col justify-center items-center p-8 bg-[var(--color-surface)] gap-4">
              <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-[var(--color-secondary)] text-sm animate-pulse">Memuat data batch...</p>
            </div>
          ) : groups.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[var(--color-secondary)] font-medium text-center bg-[var(--color-surface)]">
              Tidak ada batch pada status ini.
            </p>
          ) : (
            groups.map((group, idx) => (
              <GroupSection
                viewMode={viewMode}
                key={`${groupMode}-${group.groupValue}`}
                groupMeta={group}
                isClosed={isClosed}
                search={search}
                listTypeFilter={listTypeFilter}
                groupMode={groupMode}
                defaultExpanded={groupMode === 'none' || idx === 0}
                withPagination={withPagination}
                onView={onView}
                onViewManifest={onViewManifest}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
