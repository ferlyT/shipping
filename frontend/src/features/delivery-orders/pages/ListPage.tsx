import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  RefreshCw, 
  Layers, 
  Table as TableIcon,
  Search,
  X,
  Clock,
  CheckCircle2,
  Building2,
  RotateCcw,
  LayoutDashboard
} from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'
import { useDebounce } from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import { cn, formatNumber } from '@/lib/utils'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { BatchTable, BatchTableSkeleton } from '../components/BatchTable'
import { TableFooter } from '../components/TableFooter'
import { DeliveryOrderToolbar, type DeliveryViewMode } from '../components/DeliveryOrderToolbar'
import { DeliveryOrderTable } from '../components/DeliveryOrderTable'
import type { 
  DeliveryOrder,
  ListType, 
  GroupedDataRow 
} from '../types/delivery-orders.types'

export type PageDisplayMode = 'grouped' | 'flat'
export type DeliveryStatusTab = 'pending' | 'delivered'

export default function ListPage() {
  const { t } = useTranslation()

  // ── Mode Tampilan: Manifest / Grouping Kargo vs Flat Tabel Surat Jalan ────
  const [displayMode, setDisplayMode] = useState<PageDisplayMode>('grouped')

  // ── Tab Status Utama: Pending (Belum Terkirim/Dalam Proses) vs Delivered (Selesai) ──
  const [statusTab, setStatusTab] = useState<DeliveryStatusTab>('pending')

  // ── Filter Moda: Sea vs Air ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ListType>('sea')
  const listTypeValue = activeTab === 'air' ? '1' : '2'

  // ── Filter Cabang Aktif (Pill Selector) ──────────────────────────────────
  const [selectedBranch, setSelectedBranch] = useState<string>('')

  // ── Pencarian Data Kargo (Debounced) ─────────────────────────────────────
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 350)

  // ── Ekspansi Rincian Baris Kargo ─────────────────────────────────────────
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // ── Pagination untuk Manifest Kargo ──────────────────────────────────────
  const pg = usePagination(20)

  // ── State untuk Flat List DO Fisik ────────────────────────────────────────
  const [flatSearch, setFlatSearch] = useState('')
  const debouncedFlatSearch = useDebounce(flatSearch, 350)
  const [viewMode, setViewMode] = useState<DeliveryViewMode>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'cards' : 'table'
  )
  const flatPg = usePagination(20)

  // Reset pagination saat filter utama berubah
  useEffect(() => {
    pg.reset()
    setExpandedRow(null)
  }, [statusTab, activeTab, selectedBranch, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    flatPg.reset()
  }, [debouncedFlatSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Query 1: Branch Groups untuk Tab Pending (sent = '0') ────────────────
  const { 
    data: pendingBranchRes, 
    isLoading: isPendingBranchLoading,
    refetch: refetchPendingBranch 
  } = useQuery({
    queryKey: ['delivery-branch-groups', 'pending', listTypeValue, debouncedSearch],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getBranchGroups({
        listType: listTypeValue,
        sent: '0',
        ...(debouncedSearch && { search: debouncedSearch }),
      })
      return res.data as { data: { branchCode: string; branchName: string | null; total: number }[] }
    },
    enabled: displayMode === 'grouped',
  })

  // ── Query 2: Branch Groups untuk Tab Delivered (sent = '1') ──────────────
  const { 
    data: deliveredBranchRes, 
    isLoading: isDeliveredBranchLoading,
    refetch: refetchDeliveredBranch 
  } = useQuery({
    queryKey: ['delivery-branch-groups', 'delivered', listTypeValue, debouncedSearch],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getBranchGroups({
        listType: listTypeValue,
        sent: '1',
        ...(debouncedSearch && { search: debouncedSearch }),
      })
      return res.data as { data: { branchCode: string; branchName: string | null; total: number }[] }
    },
    enabled: displayMode === 'grouped',
  })

  const pendingBranchGroups = useMemo(() => pendingBranchRes?.data || [], [pendingBranchRes])
  const deliveredBranchGroups = useMemo(() => deliveredBranchRes?.data || [], [deliveredBranchRes])

  // Total counter untuk masing-masing tab
  const pendingTotal = useMemo(
    () => pendingBranchGroups.reduce((sum, b) => sum + (Number(b.total) || 0), 0),
    [pendingBranchGroups]
  )
  const deliveredTotal = useMemo(
    () => deliveredBranchGroups.reduce((sum, b) => sum + (Number(b.total) || 0), 0),
    [deliveredBranchGroups]
  )

  // Daftar cabang aktif untuk baris pill sesuai tab yang dipilih
  const activeBranchGroups = statusTab === 'pending' ? pendingBranchGroups : deliveredBranchGroups
  const isBranchLoading = statusTab === 'pending' ? isPendingBranchLoading : isDeliveredBranchLoading

  // ── Query 3: Data Manifest Kargo Grouped (Tabel Utama) ───────────────────
  const {
    data: mainDataRes,
    isLoading: isMainLoading,
    isFetching: isMainFetching,
    refetch: refetchMain,
  } = useQuery({
    queryKey: [
      'delivery-grouped-cargo',
      statusTab,
      listTypeValue,
      selectedBranch,
      debouncedSearch,
      pg.page,
      pg.limit,
    ],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: pg.page,
        limit: pg.limit,
        listType: listTypeValue,
        sent: statusTab === 'pending' ? '0' : '1',
        ...(selectedBranch && { branch: selectedBranch }),
        ...(debouncedSearch && { search: debouncedSearch }),
      }
      const res = await deliveryOrdersApi.getGrouped(params)
      return res.data as { data: GroupedDataRow[]; meta: { total: number; page: number; limit: number } }
    },
    enabled: displayMode === 'grouped',
  })

  const rows: GroupedDataRow[] = mainDataRes?.data || []
  const total = mainDataRes?.meta?.total || 0

  // ── Query 4: Flat List DO Fisik (Opsional) ───────────────────────────────
  const {
    data: flatResponseData,
    isLoading: isFlatLoading,
    isFetching: isFlatFetching,
    refetch: refetchFlat,
  } = useQuery({
    queryKey: ['delivery-orders-flat-list', flatPg.page, flatPg.limit, debouncedFlatSearch],
    queryFn: async () => {
      const res = await deliveryOrdersApi.list({
        page: flatPg.page,
        limit: flatPg.limit,
        search: debouncedFlatSearch || undefined,
      })
      return res.data
    },
    enabled: displayMode === 'flat',
  })

  const flatItems: DeliveryOrder[] = flatResponseData?.data || []
  const flatTotal = flatResponseData?.meta?.total || 0

  // ── Handler Aksi ─────────────────────────────────────────────────────────
  const handleRefreshAll = () => {
    if (displayMode === 'flat') {
      refetchFlat()
    } else {
      refetchPendingBranch()
      refetchDeliveredBranch()
      refetchMain()
    }
  }

  const handleToggleRow = (listCode: string) => {
    setExpandedRow((prev) => (prev === listCode ? null : listCode))
  }

  const handleResetFilters = () => {
    setSelectedBranch('')
    setSearch('')
  }

  const activeBranchName = useMemo(() => {
    if (!selectedBranch) return null
    const found = activeBranchGroups.find((b) => b.branchCode === selectedBranch)
    return found?.branchName?.trim() || selectedBranch
  }, [selectedBranch, activeBranchGroups])

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-4 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* Page Header */}
      <PageHeader
        title={t('do.listTitle') || 'Daftar Surat Jalan'}
        subtitle={t('do.listSubtitle') || 'Monitoring kargo pengiriman, surat jalan per cabang, dan status pengantaran.'}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.deliveryOrder'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.deliveryOrderList') || 'Daftar Surat Jalan' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* View Switcher: Manifest Kargo vs Tabel Flat DO */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs gap-1">
              <button
                type="button"
                onClick={() => setDisplayMode('grouped')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border",
                  displayMode === 'grouped'
                    ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-2xs font-bold"
                    : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <Layers size={13} />
                <span>Manifest Kargo</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('flat')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border",
                  displayMode === 'flat'
                    ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-2xs font-bold"
                    : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <TableIcon size={13} />
                <span>Surat Jalan Fisik</span>
              </button>
            </div>

            <Link to={ROUTES.DELIVERY_ORDERS}>
              <Button variant="secondary" size="sm" className="gap-1.5 cursor-pointer">
                <LayoutDashboard size={14} className="text-[var(--color-tertiary)]" />
                <span>Dashboard</span>
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isMainFetching || isFlatFetching}
              className="gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={isMainFetching || isFlatFetching ? 'animate-spin' : ''} />
              <span>{t('common.refresh')}</span>
            </Button>
          </div>
        }
      />

      {/* ── TAMPILAN 1: MANIFEST KARGO (TABS PENDING/DELIVERED + PILLS CABANG) ── */}
      {displayMode === 'grouped' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* 1. Primary Tabs: Pending vs Delivered */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {/* Tab 1: Pending (Dalam Pengiriman) */}
            <button
              type="button"
              onClick={() => setStatusTab('pending')}
              className={cn(
                "flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left",
                statusTab === 'pending'
                  ? "bg-[var(--color-surface)] border-[var(--color-tertiary)] shadow-xs ring-1 ring-[var(--color-tertiary)]/20"
                  : "bg-[var(--color-surface)]/70 border-[var(--color-border)] hover:border-[var(--color-secondary)]/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-lg border",
                  statusTab === 'pending'
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                    : "bg-[var(--color-neutral)] border-[var(--color-border)] text-[var(--color-secondary)]"
                )}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--color-primary)]">
                      Pending
                    </span>
                    <span className="text-[11px] text-[var(--color-secondary)] font-normal hidden sm:inline">
                      (Dalam Pengiriman)
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                    Kargo belum lengkap atau dalam proses kirim
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tabular-nums border",
                  statusTab === 'pending'
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                    : "bg-[var(--color-neutral)] border-[var(--color-border)] text-[var(--color-secondary)]"
                )}>
                  {isPendingBranchLoading ? '...' : formatNumber(pendingTotal)} kargo
                </span>
              </div>
            </button>

            {/* Tab 2: Delivered (Lengkap Terkirim) */}
            <button
              type="button"
              onClick={() => setStatusTab('delivered')}
              className={cn(
                "flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left",
                statusTab === 'delivered'
                  ? "bg-[var(--color-surface)] border-[var(--color-tertiary)] shadow-xs ring-1 ring-[var(--color-tertiary)]/20"
                  : "bg-[var(--color-surface)]/70 border-[var(--color-border)] hover:border-[var(--color-secondary)]/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-lg border",
                  statusTab === 'delivered'
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                    : "bg-[var(--color-neutral)] border-[var(--color-border)] text-[var(--color-secondary)]"
                )}>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--color-primary)]">
                      Delivered
                    </span>
                    <span className="text-[11px] text-[var(--color-secondary)] font-normal hidden sm:inline">
                      (Lengkap Terkirim)
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                    Seluruh muatan telah selesai diantarkan
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tabular-nums border",
                  statusTab === 'delivered'
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                    : "bg-[var(--color-neutral)] border-[var(--color-border)] text-[var(--color-secondary)]"
                )}>
                  {isDeliveredBranchLoading ? '...' : formatNumber(deliveredTotal)} kargo
                </span>
              </div>
            </button>
          </div>

          {/* 2. Sub-Toolbar: Moda Switcher & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[var(--color-surface)] p-3 sm:p-4 rounded-xl border border-[var(--color-border)] shadow-xs">
            {/* Moda Switcher: BY SEA vs BY AIR */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] self-start sm:self-auto">
              {(['sea', 'air'] as ListType[]).map((tab) => {
                const active = activeTab === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer border text-center",
                      active
                        ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-2xs font-bold"
                        : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                    )}
                  >
                    {tab === 'sea' ? 'BY SEA (Laut)' : 'BY AIR (Udara)'}
                  </button>
                )
              })}
            </div>

            {/* Search Input Box */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-secondary)]">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari list code, marking, customer, resi, komoditas..."
                className="block w-full h-9 sm:h-10 pl-9 pr-9 py-2 border border-[var(--color-border)] rounded-xl leading-5 bg-[var(--color-surface)] placeholder-[var(--color-secondary)] text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] text-xs font-medium transition-all duration-200"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Group Pills dari Cabang (Branch Pills) */}
          <div className="bg-[var(--color-surface)] p-3 sm:p-4 rounded-xl border border-[var(--color-border)] shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                  Pilih Cabang Pengirim:
                </span>
              </div>
              {selectedBranch && (
                <button
                  type="button"
                  onClick={() => setSelectedBranch('')}
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--color-tertiary)] hover:underline font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Tampilkan Semua Cabang</span>
                </button>
              )}
            </div>

            {/* Scrollable Pills Container */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar flex-wrap sm:flex-nowrap">
              {/* Pill: Semua Cabang */}
              <button
                type="button"
                onClick={() => setSelectedBranch('')}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border flex-shrink-0",
                  !selectedBranch
                    ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold"
                    : "bg-transparent border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-secondary)]"
                )}
              >
                <span>Semua Cabang</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10.5px] tabular-nums border",
                  !selectedBranch
                    ? "border-[var(--color-tertiary)]/40 bg-[var(--color-tertiary)]/10 text-[var(--color-tertiary)]"
                    : "border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)]"
                )}>
                  {statusTab === 'pending' ? formatNumber(pendingTotal) : formatNumber(deliveredTotal)}
                </span>
              </button>

              {/* Pills: Per Cabang dari API */}
              {isBranchLoading && activeBranchGroups.length === 0 ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-7 w-20 rounded-lg skeleton-shimmer flex-shrink-0" />
                ))
              ) : (
                activeBranchGroups.map((b) => {
                  const isSelected = selectedBranch === b.branchCode
                  return (
                    <button
                      key={b.branchCode}
                      type="button"
                      onClick={() => setSelectedBranch(isSelected ? '' : b.branchCode)}
                      title={b.branchName ? `${b.branchCode} — ${b.branchName.trim()}` : b.branchCode}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border flex-shrink-0",
                        isSelected
                          ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold"
                          : "bg-transparent border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-secondary)]"
                      )}
                    >
                      <span className="font-mono">{b.branchCode}</span>
                      <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10.5px] tabular-nums border",
                        isSelected
                          ? "border-[var(--color-tertiary)]/40 bg-[var(--color-tertiary)]/10 text-[var(--color-tertiary)]"
                          : "border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)]"
                      )}>
                        {formatNumber(b.total)}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* 4. Active Filter Summary Bar */}
          <div className="flex items-center justify-between text-xs px-1 text-[var(--color-secondary)] flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[var(--color-primary)]">
                {statusTab === 'pending' ? '🕒 Kargo Pending' : '✅ Kargo Delivered'}
              </span>
              <span>•</span>
              <span>Moda: <strong>{activeTab === 'sea' ? 'Laut (Sea)' : 'Udara (Air)'}</strong></span>
              <span>•</span>
              <span>Cabang: <strong>{selectedBranch ? `${selectedBranch} (${activeBranchName})` : 'Semua Cabang'}</strong></span>
              {debouncedSearch && (
                <>
                  <span>•</span>
                  <span>Pencarian: &quot;<strong>{debouncedSearch}</strong>&quot;</span>
                </>
              )}
            </div>

            {(selectedBranch || debouncedSearch) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[var(--color-tertiary)] hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          {/* 5. Main Data Table with Shimmer & Pagination */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden">
            {isMainLoading ? (
              <BatchTableSkeleton />
            ) : (
              <div className={cn(isMainFetching && "opacity-60 pointer-events-none transition-opacity duration-200")}>
                <BatchTable
                  rows={rows}
                  startIndex={(pg.page - 1) * pg.limit}
                  expandedRow={expandedRow}
                  onToggleRow={handleToggleRow}
                  hasSearch={Boolean(debouncedSearch || selectedBranch)}
                  onResetFilter={handleResetFilters}
                />
              </div>
            )}

            {/* Pagination Footer */}
            <TableFooter
              page={pg.page}
              limit={pg.limit}
              total={total}
              onPageChange={pg.goToPage}
              onLimitChange={pg.setLimit}
            />
          </div>
        </div>
      )}

      {/* ── TAMPILAN 2: TABEL FLAT SURAT JALAN FISIK ────────────────────────── */}
      {displayMode === 'flat' && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden animate-fadeIn">
          {/* Toolbar */}
          <DeliveryOrderToolbar
            search={flatSearch}
            onSearchChange={setFlatSearch}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            displayCount={flatItems.length}
            total={flatTotal}
            limit={flatPg.limit}
            onLimitChange={flatPg.setLimit}
            onPageReset={() => flatPg.goToPage(1)}
            isFetching={isFlatFetching}
            isLoading={isFlatLoading}
          />

          {/* Data Table / Cards */}
          <DeliveryOrderTable
            data={flatItems}
            isLoading={isFlatLoading}
            viewMode={viewMode}
            onResetFilter={() => setFlatSearch('')}
            hasSearch={Boolean(flatSearch)}
          />

          {/* Pagination Footer */}
          <TableFooter
            page={flatPg.page}
            limit={flatPg.limit}
            total={flatTotal}
            onPageChange={flatPg.goToPage}
            onLimitChange={flatPg.setLimit}
          />
        </div>
      )}
    </div>
  )
}
