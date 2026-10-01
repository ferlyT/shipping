import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Warehouse,
  RefreshCw,
  Search,
  Ship,
  Plane,
  Plus,
  Clock,
  CheckCircle2,
  ExternalLink,
  ListOrdered
} from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { useTranslation } from '@/hooks/useTranslation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { ROUTES } from '@/lib/constants'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { formatNumber, formatWeight, formatDecimal, displayCustName, cn } from '@/lib/utils'
import { CreateDeliveryOrderModal } from '../components/CreateDeliveryOrderModal'
import type { GroupedDataRow, ListType } from '../types/delivery-orders.types'

export default function InventoryPage() {
  const { t } = useTranslation()

  // ── State Filter Inventori Stok Gudang ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ListType>('sea')
  const [gudangStatusFilter, setGudangStatusFilter] = useState<'all' | '1' | '0'>('all') // all / 1 (gudang konfirm) / 0 (pending)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 350)
  const inventoryPg = usePagination(15)

  // ── State Modal Buat Surat Jalan Baru ────────────────────────────────────────
  const [selectedCargoForSJ, setSelectedCargoForSJ] = useState<GroupedDataRow | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // ── Query Ringkasan Counter Kargo On-Hand di Gudang ──────────────────────────
  const { data: pendingSeaRes } = useQuery({
    queryKey: ['deliveryInventoryPendingSeaCount'],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getGrouped({ page: 1, limit: 1, sent: '0', listType: '2' })
      return res.data as { meta: { total: number } }
    },
    staleTime: 60000,
  })

  const { data: pendingAirRes } = useQuery({
    queryKey: ['deliveryInventoryPendingAirCount'],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getGrouped({ page: 1, limit: 1, sent: '0', listType: '1' })
      return res.data as { meta: { total: number } }
    },
    staleTime: 60000,
  })

  const totalPendingSea = pendingSeaRes?.meta?.total ?? 0
  const totalPendingAir = pendingAirRes?.meta?.total ?? 0

  // ── Query Tabel Data Inventori Stok Gudang (selalu sent='0' = belum kirim) ─
  const {
    data: inventoryResponseData,
    isLoading: isLoadingInventory,
    isFetching: isFetchingInventory,
    refetch: refetchInventory,
  } = useQuery({
    queryKey: [
      'deliveryWarehouseInventory',
      activeTab,
      gudangStatusFilter,
      inventoryPg.page,
      inventoryPg.limit,
      debouncedSearch,
    ],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getGrouped({
        page: inventoryPg.page,
        limit: inventoryPg.limit,
        sent: '0', // InventoryPage selalu menampilkan kargo belum terkirim (stok gudang)
        gudangStatus: gudangStatusFilter === 'all' ? undefined : gudangStatusFilter,
        listType: activeTab === 'air' ? '1' : '2',
        search: debouncedSearch || undefined,
      })
      return res.data as { data: GroupedDataRow[]; meta: { total: number } }
    },
    staleTime: 30000,
  })

  const inventoryItems: GroupedDataRow[] = inventoryResponseData?.data || []
  const inventoryTotal = inventoryResponseData?.meta?.total || 0
  const inventoryTotalPages = Math.ceil(inventoryTotal / inventoryPg.limit) || 1

  const handleTabChange = (type: ListType) => {
    setActiveTab(type)
    inventoryPg.reset()
  }

  const handleGudangStatusFilterChange = (status: 'all' | '1' | '0') => {
    setGudangStatusFilter(status)
    inventoryPg.reset()
  }

  const handleOpenCreateModal = (row: GroupedDataRow) => {
    setSelectedCargoForSJ(row)
    setIsCreateModalOpen(true)
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* ── Page Header ── */}
      <PageHeader
        title={t('nav.warehouseInventory') || 'Inventori Stok Kargo di Gudang'}
        subtitle="Titik awal operasional pembuatan dan pengelolaan Surat Jalan (Delivery Orders) berdasarkan data manifest kargo gudang (fdListCode)."
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.deliveryOrder'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.warehouseInventoryFull') || 'Inventori Kargo Gudang' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Link to={ROUTES.DELIVERY_ORDERS_LIST}>
              <Button variant="secondary" size="sm" className="gap-1.5 cursor-pointer">
                <ListOrdered size={14} />
                <span>{t('delivery.inventory.openHistorySJ')}</span>
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetchInventory()}
              disabled={isFetchingInventory}
              className="gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={isFetchingInventory ? 'animate-spin' : ''} />
              <span>{t('common.refresh')}</span>
            </Button>
          </div>
        }
      />

      {/* ── Panel Tabel Inventori Stok Gudang ── */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden transition-all">
        {/* Header Toolbar Panel Inventori */}
        <div className="p-3.5 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-tertiary)]/15 text-[var(--color-tertiary)] shrink-0">
                <Warehouse size={16} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-label)] uppercase tracking-wide flex items-center gap-2">
                  <span>{t('nav.warehouseInventoryFull') || 'Inventori Kargo Gudang'}</span>
                  <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] font-normal lowercase">
                    {formatNumber(inventoryTotal)} item
                  </span>
                </h3>
                <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                  Kargo barang fisik tersimpan di gudang transit. Klik <strong>"{t('delivery.inventory.createSJ')}"</strong> untuk menerbitkan surat jalan baru, atau <strong>"{t('delivery.inventory.openSJ')}"</strong> untuk melihat riwayat SJ terkait.
                </p>
              </div>
            </div>

            {/* Tab Moda: Laut vs Udara */}
            <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-0.5 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleTabChange('sea')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  activeTab === 'sea'
                    ? "bg-[var(--color-neutral)] text-[var(--color-primary)] shadow-2xs font-bold border border-[var(--color-border)]"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <Ship size={13} className="text-blue-500" />
                <span>Kapal / Laut ({formatNumber(totalPendingSea)})</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('air')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  activeTab === 'air'
                    ? "bg-[var(--color-neutral)] text-[var(--color-primary)] shadow-2xs font-bold border border-[var(--color-border)]"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <Plane size={13} className="text-amber-500" />
                <span>Udara ({formatNumber(totalPendingAir)})</span>
              </button>
            </div>
          </div>

          {/* Sub-toolbar: Filter Status Fisik Gudang + Search */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 pt-1">
            {/* Filter Fisik Gudang (Konfirmasi vs Belum) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-wrap">
              <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] gap-0.5">
                <button
                  type="button"
                  onClick={() => handleGudangStatusFilterChange('all')}
                  className={cn(
                    "px-2.5 py-1 text-[11.5px] font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap",
                    gudangStatusFilter === 'all'
                      ? "bg-[var(--color-surface)] border border-[var(--color-border-strong)] text-[var(--color-primary)] shadow-2xs"
                      : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  )}
                >
                  {t('delivery.inventory.allStock') || 'Semua Stok'}
                </button>
                <button
                  type="button"
                  onClick={() => handleGudangStatusFilterChange('1')}
                  className={cn(
                    "px-2.5 py-1 text-[11.5px] font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                    gudangStatusFilter === '1'
                      ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                      : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  )}
                >
                  <span>🏢</span>
                  <span>{t('delivery.inventory.filterGudangConfirmed') || 'Di Gudang'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGudangStatusFilterChange('0')}
                  className={cn(
                    "px-2.5 py-1 text-[11.5px] font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                    gudangStatusFilter === '0'
                      ? "bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-2xs font-bold"
                      : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  )}
                >
                  <span>⏳</span>
                  <span>{t('delivery.inventory.filterGudangPending') || 'Belum Konfirm'}</span>
                </button>
              </div>
            </div>

            {/* Search Input Box */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-secondary)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    inventoryPg.reset()
                  }}
                  placeholder="Cari Marking, Customer, Resi, List..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] placeholder:text-[var(--color-secondary)]/60 focus:outline-hidden focus:border-[var(--color-tertiary)] shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={() => refetchInventory()}
                disabled={isFetchingInventory}
                className="p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer shrink-0"
                title="Refresh Data Inventori"
              >
                <RefreshCw size={13} className={isFetchingInventory ? 'animate-spin' : ''} />
              </button>

            </div>
          </div>
        </div>

        {/* ── TABEL DATA INVENTORI GUDANG (DESKTOP) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] bg-[var(--color-neutral)]/60 border-b border-[var(--color-border)] font-[var(--font-label)]">
              <tr>
                <th className="px-4 py-3 border-b border-[var(--color-border)]">{t('delivery.inventory.markingBranch') || 'Marking & Cabang'}</th>
                <th className="px-4 py-3 border-b border-[var(--color-border)]">{t('delivery.inventory.customer') || 'Customer'}</th>
                <th className="px-4 py-3 border-b border-[var(--color-border)]">{t('delivery.inventory.commodity') || 'Komoditi'}</th>
                <th className="px-4 py-3 border-b border-[var(--color-border)]">{t('delivery.inventory.receiptListCode') || 'Resi / List'}</th>
                <th className="px-4 py-3 border-b border-[var(--color-border)]">{t('delivery.inventory.weightVolume') || 'Berat & M³'}</th>
                <th className="px-4 py-3 border-b border-[var(--color-border)] text-center">{t('delivery.inventory.warehouseStock') || 'Stok Gudang'}</th>
                <th className="px-4 py-3 border-b border-[var(--color-border)]">{t('delivery.inventory.status') || 'Status'}</th>
                <th className="px-3 py-3 border-b border-[var(--color-border)] text-center min-w-[200px]">Kelola Surat Jalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {isLoadingInventory ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-[var(--color-border)]">
                    <td className="px-4 py-3.5"><div className="h-4 w-24 rounded skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-36 rounded skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-28 rounded skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-20 rounded skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-24 rounded skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-5 w-28 rounded-full skeleton-shimmer mx-auto" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 w-20 rounded-full skeleton-shimmer" /></td>
                    <td className="px-3 py-3.5 text-center"><div className="h-6 w-28 rounded-md skeleton-shimmer mx-auto" /></td>
                  </tr>
                ))
              ) : inventoryItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[var(--color-secondary)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Warehouse size={32} className="text-[var(--color-secondary)]/40" />
                      <p className="font-semibold text-sm text-[var(--color-primary)]">
                        Tidak Ada Data Kargo di Gudang
                      </p>
                      <p className="text-[11px] max-w-sm">
                        {debouncedSearch
                          ? `Tidak ditemukan inventori dengan kata kunci "${debouncedSearch}". Coba ubah kata kunci pencarian.`
                          : 'Seluruh kargo untuk filter ini telah terkirim atau belum ada manifest kargo masuk.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                inventoryItems.map((row, idx) => {
                  const sisa = Number(row.sisa || 0)
                  const total = Number(row.totalQty || 0)
                  const terkirim = Number(row.totalTerkirim || 0)
                  const isFullInStock = sisa > 0 && terkirim === 0
                  const isPartial = sisa > 0 && terkirim > 0
                  const hasSJ = terkirim > 0 || row.isSent === 1

                  const isEven = idx % 2 === 0

                  return (
                    <tr
                      key={`${row.listCode}-${row.markingCode}-${idx}`}
                      className={cn(
                        "group transition-colors hover:bg-[var(--color-neutral)]/40",
                        isEven ? "bg-[var(--color-surface)]" : "bg-[var(--color-neutral)]/20"
                      )}
                    >
                      {/* Marking & Cabang */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[var(--color-primary)] font-mono text-xs">
                            {row.markingCode?.trim() || '—'}
                          </span>
                        </div>
                        {row.branchName && (
                          <div className="text-[10px] text-[var(--color-secondary)] mt-0.5 flex items-center gap-1">
                            <span className="px-1.5 py-0.2 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] font-semibold text-[9px] uppercase tracking-wider">
                              {row.branchCode || 'BR'}
                            </span>
                            <span className="truncate max-w-[120px]">{row.branchName.trim()}</span>
                          </div>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] max-w-[220px]">
                        <div className="font-semibold text-[var(--color-primary)] text-xs truncate leading-snug" title={row.customerName}>
                          {displayCustName(row.customerName)}
                        </div>
                      </td>

                      {/* Komoditi & Tipe Comodity */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] max-w-[200px]" title={row.comodity}>
                        <div className="text-xs text-[var(--color-primary)] truncate font-medium">
                          {row.comodity?.trim() || '—'}
                        </div>
                        {row.typeComodityName && row.typeComodityName.trim() && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)] uppercase tracking-wider">
                              {row.typeComodityName.trim()}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Resi / List Code */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap">
                        {row.resiNo && row.resiNo.trim() ? (
                          <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 truncate max-w-[150px]" title={row.resiNo.trim()}>
                            {row.resiNo.trim()}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-secondary)] font-mono">—</span>
                        )}
                        <div className="text-[10px] text-[var(--color-secondary)] font-mono mt-0.5">
                          List: {row.listCode}
                        </div>
                      </td>

                      {/* Berat & Volume (M3) */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap">
                        <div className="text-xs font-bold text-[var(--color-primary)] font-mono">
                          {formatWeight(row.totalWeight ?? 0)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono font-medium text-[var(--color-secondary)]">
                            {formatDecimal(row.m3 ?? 0, 4)} m³
                          </span>
                          {row.m3Source === 'Gudang' ? (
                            <span 
                              className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 tracking-wide uppercase"
                              title="Ukuran fisik dihitung dari tbEntryListDetail (Panjang x Lebar x Tinggi x Qty)"
                            >
                              Gudang
                            </span>
                          ) : (
                            <span 
                              className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-sky-500/10 border border-sky-500/40 text-sky-600 dark:text-sky-400 tracking-wide uppercase"
                              title="Ukuran diambil dari master fdM3 tbEntryList"
                            >
                              tbEntryList
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stok Gudang (On-Hand vs Masuk) */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <div className="flex items-center gap-1 text-xs font-bold font-mono">
                            <span className={cn(
                              sisa > 0 ? "text-amber-600 dark:text-amber-400 font-extrabold" : "text-[var(--color-secondary)]"
                            )}>
                              {sisa}
                            </span>
                            <span className="text-[var(--color-secondary)] font-normal text-[11px]">
                              / {total} {row.satuan?.trim() || 'Koli'}
                            </span>
                          </div>

                          {/* Progress Meter Bar */}
                          <div className="w-24 bg-[var(--color-neutral)] h-1.5 rounded-full overflow-hidden mt-1 border border-[var(--color-border)]/60">
                            <div
                              className={cn(
                                "h-full transition-all rounded-full",
                                isFullInStock
                                  ? "bg-amber-500"
                                  : isPartial
                                    ? "bg-purple-500"
                                    : "bg-emerald-500"
                              )}
                              style={{ width: `${Math.min(100, total > 0 ? (sisa / total) * 100 : 0)}%` }}
                            />
                          </div>

                          <span className="text-[9px] font-bold text-[var(--color-secondary)] mt-0.5">
                            {isFullInStock
                              ? '100% di Gudang'
                              : isPartial
                                ? `Sisa ${sisa} ${row.satuan?.trim() || 'Koli'} (${terkirim} Terkirim)`
                                : `0 ${row.satuan?.trim() || 'Koli'} (Lengkap Terkirim)`}
                          </span>
                        </div>
                      </td>

                      {/* Status Fisik Gudang & Distribusi */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {row.gudangStatus === 1 ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 w-fit"
                            >
                              <CheckCircle2 size={11} className="shrink-0 text-emerald-500" />
                              <span>{t('delivery.inventory.statusGudangIn') || 'Di Gudang'}</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-amber-500/10 border border-amber-500/40 text-amber-600 dark:text-amber-400 w-fit"
                            >
                              <Clock size={11} className="shrink-0 text-amber-500" />
                              <span>{t('delivery.inventory.statusGudangPending') || 'Belum Konfirm'}</span>
                            </span>
                          )}

                          <div>
                            {isFullInStock ? (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                {t('delivery.inventory.noSJYet')}
                              </span>
                            ) : isPartial ? (
                              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                {t('delivery.inventory.partialSent')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                {t('delivery.inventory.fullySent')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ── AKSI PENGELOLAAN SURAT JALAN ── */}
                      <td className="px-3 py-3 border-b border-[var(--color-border)] text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Tombol Buat Surat Jalan Baru (Hanya tampil jika masih ada sisa koli di gudang) */}
                          {sisa > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenCreateModal(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--color-primary)] text-[var(--color-surface)] dark:text-[var(--color-primary)] dark:bg-[var(--color-surface)] dark:border dark:border-[var(--color-border)] hover:bg-[var(--color-tertiary)] dark:hover:border-[var(--color-tertiary)] dark:hover:text-[var(--color-tertiary)] transition-all cursor-pointer shadow-2xs"
                              title="Terbitkan Surat Jalan baru untuk sisa kargo ini"
                            >
                              <Plus size={12} />
                              <span>{t('delivery.inventory.createSJ')}</span>
                            </button>
                          )}

                          {/* Link ke Riwayat SJ di ListPage (dengan filter listCode pre-filled) */}
                          {hasSJ && (
                            <Link
                              to={`${ROUTES.DELIVERY_ORDERS_LIST}?listCode=${encodeURIComponent(row.listCode)}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-tertiary)] hover:text-[var(--color-tertiary)] transition-all shadow-2xs"
                              title="Lihat riwayat Surat Jalan untuk kargo ini"
                            >
                              <ExternalLink size={12} className="text-[var(--color-tertiary)]" />
                              <span>{t('delivery.inventory.openSJ')}</span>
                            </Link>
                          )}

                          {/* Fallback jika tidak ada aksi sama sekali */}
                          {sisa <= 0 && !hasSJ && (
                            <span className="text-xs text-[var(--color-secondary)] font-mono">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── KARTU TOUCH RESPONSIF INVENTORI GUDANG (MOBILE) ── */}
        <div className="block md:hidden divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
          {isLoadingInventory ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-28 rounded-md skeleton-shimmer" />
                  <div className="h-5 w-20 rounded-full skeleton-shimmer" />
                </div>
                <div className="h-4 w-40 rounded skeleton-shimmer" />
                <div className="h-16 w-full rounded-lg skeleton-shimmer" />
                <div className="h-8 w-full rounded-lg skeleton-shimmer" />
              </div>
            ))
          ) : inventoryItems.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs text-[var(--color-secondary)]">
              <div className="flex flex-col items-center justify-center gap-2">
                <Warehouse size={32} className="text-[var(--color-secondary)]/40" />
                <p className="font-semibold text-sm text-[var(--color-primary)]">
                  Tidak Ada Data Kargo di Gudang
                </p>
                <p className="text-[11px] max-w-sm">
                  {debouncedSearch
                    ? `Tidak ditemukan inventori dengan kata kunci "${debouncedSearch}". Coba ubah kata kunci pencarian.`
                    : 'Seluruh kargo untuk filter ini telah terkirim atau belum ada manifest kargo masuk.'}
                </p>
              </div>
            </div>
          ) : (
            inventoryItems.map((row, idx) => {
              const sisa = Number(row.sisa || 0)
              const total = Number(row.totalQty || 0)
              const terkirim = Number(row.totalTerkirim || 0)
              const isFullInStock = sisa > 0 && terkirim === 0
              const isPartial = sisa > 0 && terkirim > 0
              const hasSJ = terkirim > 0 || row.isSent === 1

              return (
                <div key={`${row.listCode}-${row.markingCode}-${idx}`} className="p-4 space-y-3 bg-[var(--color-surface)]">
                  {/* Header: Marking & Status Gudang */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[var(--color-primary)] font-mono text-sm">
                          {row.markingCode?.trim() || '—'}
                        </span>
                        {row.branchCode && (
                          <span className="px-1.5 py-0.2 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] font-semibold text-[10px] uppercase tracking-wider text-[var(--color-secondary)]">
                            {row.branchCode}
                          </span>
                        )}
                      </div>
                      {row.branchName && (
                        <p className="text-[11px] text-[var(--color-secondary)] mt-0.5">{row.branchName.trim()}</p>
                      )}
                    </div>

                    {row.gudangStatus === 1 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 size={11} className="text-emerald-500" />
                        <span>{t('delivery.inventory.statusGudangIn') || 'Di Gudang'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-500/10 border border-amber-500/40 text-amber-600 dark:text-amber-400 shrink-0">
                        <Clock size={11} className="text-amber-500" />
                        <span>{t('delivery.inventory.statusGudangPending') || 'Belum Konfirm'}</span>
                      </span>
                    )}
                  </div>

                  {/* Customer & Komoditas */}
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-[var(--color-primary)]">
                      {displayCustName(row.customerName)}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--color-secondary)] flex-wrap">
                      {row.comodity && <span>{row.comodity.trim()}</span>}
                      {row.typeComodityName && (
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-[var(--color-neutral)] border border-[var(--color-border)] uppercase">
                          {row.typeComodityName.trim()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resi & List Info + Muatan */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[var(--color-neutral)]/40 border border-[var(--color-border)] text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--color-secondary)] block uppercase tracking-wider font-semibold">Resi / List</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-bold block truncate">
                        {row.resiNo?.trim() || '—'}
                      </span>
                      <span className="text-[10px] text-[var(--color-secondary)] font-mono">
                        List: {row.listCode}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[var(--color-secondary)] block uppercase tracking-wider font-semibold">Berat & Volume</span>
                      <span className="font-mono font-bold text-[var(--color-primary)] block">
                        {formatWeight(row.totalWeight ?? 0)}
                      </span>
                      <span className="text-[10px] text-[var(--color-secondary)] font-mono">
                        {formatDecimal(row.m3 ?? 0, 4)} m³
                      </span>
                    </div>
                  </div>

                  {/* Stok Gudang Progress Meter */}
                  <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] text-[var(--color-secondary)] font-semibold uppercase tracking-wider">Stok Gudang</span>
                      <div className="flex items-center gap-1 font-mono font-bold">
                        <span className={cn(sisa > 0 ? "text-amber-600 dark:text-amber-400 font-extrabold" : "text-[var(--color-secondary)]")}>
                          {sisa}
                        </span>
                        <span className="text-[var(--color-secondary)] font-normal text-[11px]">
                          / {total} {row.satuan?.trim() || 'Koli'}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-[var(--color-neutral)] h-2 rounded-full overflow-hidden border border-[var(--color-border)]/60">
                      <div
                        className={cn(
                          "h-full transition-all rounded-full",
                          isFullInStock ? "bg-amber-500" : isPartial ? "bg-purple-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(100, total > 0 ? (sisa / total) * 100 : 0)}%` }}
                      />
                    </div>

                    <div className="text-[10px] text-[var(--color-secondary)] flex justify-between">
                      <span>
                        {isFullInStock
                          ? '100% di Gudang'
                          : isPartial
                            ? `Sisa ${sisa} ${row.satuan?.trim() || 'Koli'} (${terkirim} Kirim)`
                            : `0 ${row.satuan?.trim() || 'Koli'} (Lengkap)`}
                      </span>
                      <span>
                        {isFullInStock ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Belum ada SJ</span>
                        ) : isPartial ? (
                          <span className="text-purple-600 dark:text-purple-400 font-medium">Kirim Sebagian</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Terkirim Semua</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {sisa > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenCreateModal(row)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--color-primary)] text-[var(--color-surface)] dark:text-[var(--color-primary)] dark:bg-[var(--color-surface)] dark:border dark:border-[var(--color-border)] hover:bg-[var(--color-tertiary)] dark:hover:border-[var(--color-tertiary)] transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus size={13} />
                        <span>{t('delivery.inventory.createSJ')}</span>
                      </button>
                    )}

                    {hasSJ && (
                      <Link
                        to={`${ROUTES.DELIVERY_ORDERS_LIST}?listCode=${encodeURIComponent(row.listCode)}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-tertiary)] hover:text-[var(--color-tertiary)] transition-all shadow-2xs"
                      >
                        <ExternalLink size={13} className="text-[var(--color-tertiary)]" />
                        <span>{t('delivery.inventory.openSJ')}</span>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Panel: Pagination */}
        <div className="p-3.5 sm:p-4 bg-[var(--color-neutral)]/40 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--color-secondary)]">
            <span>Menampilkan stok kargo moda <strong>{activeTab === 'sea' ? 'Laut' : 'Udara'}</strong> yang belum terkirim</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap ml-auto">
            <Pagination
              page={inventoryPg.page}
              totalPages={inventoryTotalPages}
              onPageChange={inventoryPg.goToPage}
              total={inventoryTotal}
              limit={inventoryPg.limit}
            />

            <Link to={ROUTES.DELIVERY_ORDERS_LIST}>
              <Button variant="secondary" size="sm" className="gap-1 text-xs cursor-pointer">
                <ListOrdered size={13} />
                <span>{t('delivery.inventory.openHistorySJ')}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>



      {/* Modal Buat Surat Jalan Baru */}
      <CreateDeliveryOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setSelectedCargoForSJ(null)
        }}
        cargo={selectedCargoForSJ}
        onSuccess={() => {
          refetchInventory()
        }}
      />
    </div>
  )
}
