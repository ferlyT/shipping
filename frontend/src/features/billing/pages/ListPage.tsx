import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { ChevronRight, SlidersHorizontal, Plane, Ship, Package, LayoutGrid } from 'lucide-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { billingApi } from '../services/billing.service'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { Table } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { SearchBar } from '@/components/ui/SearchBar'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import { BillingStatusTag } from '../components/BillingStatusTag'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { statusConfig } from '@/features/customers/components/CustomerBadges'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { useToastStore } from '@/stores/toastStore'

// Status invoice berdasarkan fdGive / fdGive2 / fdCekDate:
// 1. COLLECTED jika fdGive2 === 1 (uang sudah diterima)
// 2. ISSUED jika fdGive === 1 (invoice sudah diserahkan/terbit)
// 3. DRAFT jika fdCekDate === null (belum dicek/draf)
interface Billing {
  fdInvNo: string
  fdInvDate: string
  fdListType: number | null
  fdCustCode: string | null
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdDescr: string
  fdJumlah1: number | null
  fdCurr1: string | null
  fdTypeBilling: number | null
  fdGive: number | null
  fdGive2: number | null
  fdCekDate: string | null
  customer?: { fdCustName: string | null; fdBlocked?: number | null } | null
  employee?: { fdEmpName: string | null } | null
}

// Konfigurasi grouping fdListType: 1 = UDARA, 2 = LAUT
const LIST_TYPE_CONFIG: Record<number, { label: string; icon: typeof Plane; accent: string }> = {
  1: { label: 'UDARA', icon: Plane, accent: 'text-sky-600' },
  2: { label: 'LAUT', icon: Ship, accent: 'text-blue-700' },
}

// Tombol filter di atas tabel: Semua / Udara / Laut
const LIST_TYPE_FILTERS: { value: 'all' | 1 | 2; label: string; icon: typeof LayoutGrid; accent: string }[] = [
  { value: 'all', label: 'Semua', icon: LayoutGrid, accent: '' },
  { value: 1, label: 'Udara', icon: Plane, accent: 'text-amber-600' },
  { value: 2, label: 'Laut', icon: Ship, accent: 'text-blue-600' },
]

export default function BillingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useToastStore()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  const { page, limit: stateLimit, setLimit: setStateLimit, goToPage } = usePagination(20)
  const [jumpPage, setJumpPage] = useState('')
  const [showMobilePanel, setShowMobilePanel] = useState(false)
  const [listTypeFilter, setListTypeFilter] = useState<'all' | 1 | 2>('all')

  // Limit dipaksa 100 saat ada pencarian
  const limit = debouncedSearch ? 100 : stateLimit
  const setLimit = (newLimit: number) => {
    setStateLimit(newLimit)
    goToPage(1)
  }

  const { data: listRes, isLoading: isListLoading, isFetching, error } = useQuery({
    queryKey: ['billings', page, limit, debouncedSearch],
    queryFn: async () => {
      const res = await billingApi.list({
        page,
        limit,
        ...(debouncedSearch && { search: debouncedSearch }),
      })
      return res.data
    },
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    if (error) {
      const message = error instanceof AxiosError ? error.response?.data?.error : undefined
      addToast({
        type: 'error',
        message: message || 'Gagal memuat data billing',
      })
    }
  }, [error, addToast])

  const data = listRes?.data || []
  const total = listRes?.meta?.total || 0

  const totalPages = Math.ceil(total / limit)
  const isInitialLoading = isListLoading
  const isRefreshing = isFetching && !isListLoading

  const filteredData = useMemo(() => {
    if (listTypeFilter === 'all') return data
    return data.filter((row: Billing) => row.fdListType === listTypeFilter)
  }, [data, listTypeFilter])

  const groupedData = useMemo(() => {
    const groups = new Map<number, Billing[]>()
    filteredData.forEach((row: Billing) => {
      const type = row.fdListType ?? 0
      if (!groups.has(type)) groups.set(type, [])
      groups.get(type)!.push(row)
    })
    // Urutan tetap: UDARA (1), LAUT (2), lalu tipe lain (jika ada) di akhir
    const order = [1, 2, ...Array.from(groups.keys()).filter((t) => t !== 1 && t !== 2)]
    return order
      .filter((type) => groups.has(type))
      .map((type) => {
        const config = LIST_TYPE_CONFIG[type]
        return {
          type,
          label: config?.label || 'Lainnya',
          icon: config?.icon || Package,
          accent: config?.accent || 'text-[var(--color-secondary)]',
          rows: groups.get(type)!,
        }
      })
  }, [filteredData])

  const columns = [
    {
      key: 'fdInvNo',
      header: 'No. Invoice',
      className: 'w-[13%]',
      render: (row: Billing) => (
        <span className="font-semibold text-[var(--color-primary)]">{row.fdInvNo}</span>
      ),
    },
    {
      key: 'fdInvDate',
      header: 'Tanggal Invoice',
      className: 'w-[10%]',
      render: (row: Billing) => formatDate(row.fdInvDate),
    },
    {
      key: 'fdCustCode',
      header: 'Customer',
      className: 'w-[24%]',
      render: (row: Billing) => {
        const statusVal = row.customer?.fdBlocked ?? 0
        const config = statusConfig[statusVal as keyof typeof statusConfig] || statusConfig[0]
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-[var(--color-primary)] truncate" title={row.customer?.fdCustName || row.fdCustCode || '—'}>
              {row.customer?.fdCustName || row.fdCustCode || '—'}
            </span>
            {row.customer && (
              <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0 shrink-0">
                {config.label}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      key: 'fdMarkingCode',
      header: 'Marking Code',
      className: 'w-[10%]',
      render: (row: Billing) => row.fdMarkingCode || '—'
    },
    {
      key: 'fdMarkingNo',
      header: 'No. Marking',
      className: 'w-[10%]',
      render: (row: Billing) => row.fdMarkingNo || '—'
    },
    {
      key: 'fdJumlah1',
      header: 'Total Tagihan',
      className: 'w-[13%]',
      render: (row: Billing) => (
        <span className="inline-block">
          <CurrencyValue value={row.fdJumlah1} currency={row.fdCurr1} />
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[10%]',
      render: (row: Billing) => <BillingStatusTag row={row} />,
    },
    {
      key: 'createdBy',
      header: 'Created By',
      className: 'w-[10%]',
      render: (row: Billing) => (
        <span className="text-xs text-[var(--color-secondary)] block truncate" title={row.employee?.fdEmpName || '—'}>
          {row.employee?.fdEmpName || '—'}
        </span>
      ),
    },
  ]

  if (isInitialLoading) return <LoadingSpinner message="Memuat data billing..." />

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height)-2rem)] bg-[var(--color-background)] p-3 sm:p-6 space-y-3 sm:space-y-4 animate-fadeIn overflow-hidden">
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
      <PageHeader
        title="Daftar Billing Invoices"
        subtitle="Kelola daftar invoice dan tagihan pelanggan"
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.billing') },
          { label: t('nav.billingList') },
        ]}
      />

      {/* Mobile: floating search + panel toggle */}
      <div className="sm:hidden flex-shrink-0 sticky top-0 z-10 -mx-3 px-3 pt-1 pb-2 bg-[var(--color-background)]/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <SearchBar
              value={search}
              onChange={(val) => { setSearch(val); goToPage(1) }}
              placeholder={t('billing.searchPlaceholderMobile')}
            />
          </div>
          <button
            onClick={() => setShowMobilePanel((v) => !v)}
            className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-[var(--radius-lg)] border transition-colors ${showMobilePanel
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
              : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)]'
              }`}
            aria-label="Tampilkan ringkasan & pengaturan"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile: Filter tipe pengiriman */}
      <div className="sm:hidden flex-shrink-0 flex items-center gap-2 overflow-x-auto -mx-3 px-3 pb-0.5">
        {LIST_TYPE_FILTERS.map(({ value, label, icon: Icon, accent }) => {
          const active = listTypeFilter === value
          return (
            <button
              key={String(value)}
              onClick={() => setListTypeFilter(value)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] border text-xs font-semibold transition-colors ${active
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-sm'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] active:bg-gray-50'
                }`}
            >
              <Icon className={`w-3.5 h-3.5 ${active ? '' : accent}`} />
              {label}
            </button>
          )
        })}
      </div>
      {showMobilePanel && (
        <div className="sm:hidden flex-shrink-0">
          <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-2.5">
            <span>{debouncedSearch ? 'Rows per page (100 saat pencarian)' : 'Rows per page'}</span>
            <select
              value={limit}
              disabled={!!debouncedSearch}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                goToPage(1)
              }}
              className="bg-transparent border border-[var(--color-border)] rounded px-2 py-1 focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {/* Desktop: Toolbar */}
      <div className="hidden sm:flex flex-shrink-0 items-center gap-4 bg-[var(--color-surface)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm">
        <div className="w-full max-w-2xl relative">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); goToPage(1) }}
            placeholder={t('billing.searchPlaceholder')}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--color-secondary)] whitespace-nowrap">
          <span>{debouncedSearch ? 'Rows per page (100 saat pencarian):' : 'Rows per page:'}</span>
          <select
            value={limit}
            disabled={!!debouncedSearch}
            onChange={(e) => {
              setLimit(Number(e.target.value))
              goToPage(1)
            }}
            className="bg-transparent border border-[var(--color-border)] rounded px-2 py-1 focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Desktop: Filter tipe pengiriman */}
      <div className="hidden sm:flex flex-shrink-0 items-center gap-2">
        {LIST_TYPE_FILTERS.map(({ value, label, icon: Icon, accent }) => {
          const active = listTypeFilter === value
          return (
            <button
              key={String(value)}
              onClick={() => setListTypeFilter(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] border text-sm font-semibold transition-colors ${active
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-sm'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-background)]'
                }`}
            >
              <Icon className={`w-4 h-4 ${active ? '' : accent}`} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Content Container */}
      <div className="flex-1 min-h-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-sm flex flex-col overflow-hidden relative">
        {/* Seamless refresh indicator */}
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--color-border)] overflow-hidden z-20">
            <div className="h-full w-1/3 bg-[var(--color-primary)] animate-[loading-bar_1s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Desktop: satu table saja — data tetap diurutkan UDARA -> LAUT -> Lainnya lewat
            groupedData, tapi dirender sebagai satu Table supaya headernya tidak muncul
            berulang di tengah daftar (dulu tiap grup dapat <Table> + header sendiri). */}
        <div className="hidden sm:flex flex-1 min-h-0 flex-col">
          <div className={`flex-1 overflow-auto transition-opacity duration-200 ${isRefreshing ? 'opacity-60' : ''}`}>
            {groupedData.length === 0 ? (
              <Table
                columns={columns}
                data={[]}
                keyExtractor={(row) => row.fdInvNo}
                isLoading={isInitialLoading}
                onRowClick={(row) => navigate(ROUTES.BILLING_DETAIL(row.fdInvNo))}
                emptyMessage="Tidak ada data invoice ditemukan."
                getRowClassName={() => 'bg-white hover:bg-gray-50 border-l-4 border-l-gray-200'}
              />
            ) : (
              <Table
                columns={columns}
                data={groupedData.flatMap(({ rows }) => rows)}
                keyExtractor={(row) => row.fdInvNo}
                isLoading={false}
                onRowClick={(row) => navigate(ROUTES.BILLING_DETAIL(row.fdInvNo))}
                emptyMessage="Tidak ada data invoice ditemukan."
                getRowClassName={() => 'bg-white hover:bg-gray-50 border-l-4 border-l-gray-200'}
              />
            )}
          </div>
        </div>

        {/* Mobile: short list, dikelompokkan per fdListType (UDARA/LAUT) */}
        <div className={`flex sm:hidden flex-1 min-h-0 flex-col overflow-auto transition-opacity duration-200 ${isRefreshing ? 'opacity-60' : ''}`}>
          {isInitialLoading ? (
            <div className="flex flex-col divide-y divide-[var(--color-border)]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-4 py-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-3.5 w-28 bg-[var(--color-border)] animate-pulse rounded" />
                    <div className="h-3 w-14 bg-[var(--color-border)] animate-pulse rounded" />
                  </div>
                  <div className="h-3 w-2/5 bg-[var(--color-border)] animate-pulse rounded" />
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="h-4 w-24 bg-[var(--color-border)] animate-pulse rounded-full" />
                    <div className="h-4 w-20 bg-[var(--color-border)] animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-[var(--color-secondary)] text-center">
              Tidak ada data invoice ditemukan.
            </div>
          ) : (
            groupedData.map(({ type, rows }) => (
              <div key={type} className="flex flex-col divide-y divide-[var(--color-border)]">
                {rows.map((row) => (
                  <button
                    key={row.fdInvNo}
                    onClick={() => navigate(ROUTES.BILLING_DETAIL(row.fdInvNo))}
                    className="w-full text-left px-4 py-3.5 flex flex-col gap-1.5 bg-white active:bg-gray-50 transition-colors"
                  >
                    {/* Baris 1: No. Invoice + Status Tag + Tanggal */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1 items-start min-w-0">
                        <span className="font-[var(--font-display)] font-semibold text-[var(--color-primary)] text-[15px] truncate">
                          {row.fdInvNo}
                        </span>
                        <BillingStatusTag row={row} />
                      </div>
                      <span className="text-[11px] text-[var(--color-secondary)] flex-shrink-0 tabular-nums">
                        {formatDate(row.fdInvDate)}
                      </span>
                    </div>

                    {/* Baris 2: Nama customer + Status Tag */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[13px] text-[var(--color-secondary)] truncate">
                        {row.customer?.fdCustName || row.fdCustCode || '—'}
                      </span>
                      {row.customer && (
                        <Badge
                          variant={(statusConfig[(row.customer.fdBlocked ?? 0) as keyof typeof statusConfig] || statusConfig[0]).badgeVariant}
                          className="text-[9px] px-1.5 py-0 shrink-0"
                        >
                          {(statusConfig[(row.customer.fdBlocked ?? 0) as keyof typeof statusConfig] || statusConfig[0]).label}
                        </Badge>
                      )}
                    </div>

                    {/* Baris 3: Chip marking code + Total tagihan */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {row.fdMarkingCode ? (
                        <span className="inline-flex items-center max-w-[58%] px-2 py-0.5 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] text-[11px] font-medium text-[var(--color-primary)] truncate">
                          {row.fdMarkingCode}{row.fdMarkingNo ? ` · #${row.fdMarkingNo}` : ''}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[15px] font-semibold text-[var(--color-primary)] tabular-nums">
                          <CurrencyValue value={row.fdJumlah1} currency={row.fdCurr1} />
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-[var(--color-border)]">
          {/* Data summary */}
          <div className="px-3 sm:px-4 pt-2 pb-1.5 text-[11px] sm:text-xs text-[var(--color-secondary)]">
            {total > 0 ? (
              <span>
                Menampilkan <span className="font-medium text-[var(--color-primary)] tabular-nums">{(page - 1) * limit + 1}–{Math.min(page * limit, total)}</span> dari{' '}
                <span className="font-medium text-[var(--color-primary)] tabular-nums">{total.toLocaleString('id-ID')}</span> data
              </span>
            ) : (
              <span>Tidak ada data</span>
            )}
          </div>

          {/* Desktop: full pagination + jump-to-page */}
          <div className="hidden sm:flex items-center justify-between gap-4 px-2 pb-2">
            <Pagination
              page={page}
              limit={limit}
              total={total}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
            {totalPages > 1 && (
              <div className="flex flex-shrink-0 items-center gap-1.5 px-1 py-1 text-xs text-[var(--color-secondary)]">
                <span>Go to page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPage}
                  placeholder={String(page)}
                  onChange={(e) => setJumpPage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    const target = Math.min(Math.max(1, Number(jumpPage) || 1), totalPages)
                    goToPage(target)
                    setJumpPage('')
                  }}
                  className="w-14 text-center bg-transparent border border-[var(--color-border)] rounded px-1 py-1 focus:outline-none focus:border-[var(--color-primary)]"
                />
                <span>of {totalPages.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Mobile: compact prev/next */}
          {totalPages > 1 && (
            <div className="flex sm:hidden items-center justify-between gap-2 px-3 pb-2.5">
              <button
                onClick={() => goToPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="flex-1 text-center py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-primary)] disabled:opacity-40 active:bg-gray-50 transition-colors"
              >
                Sebelumnya
              </button>
              <span className="flex-shrink-0 px-2 text-xs text-[var(--color-secondary)] tabular-nums whitespace-nowrap">
                Hal {page} / {totalPages}
              </span>
              <button
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="flex-1 text-center py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-primary)] disabled:opacity-40 active:bg-gray-50 transition-colors"
              >
                Berikutnya
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
