import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, CreditCard, CalendarClock, DollarSign, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { billingApi } from '@/api/endpoints'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { Table } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { SearchBar } from '@/components/ui/SearchBar'

import { formatDate, formatCurrency } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import { useToastStore } from '@/stores/toastStore'

interface Billing {
  fdInvNo: string
  fdInvDate: string
  fdCustCode: string | null
  fdDescr: string
  fdJumlah1: number | null
  fdTypeBilling: number | null
  customer?: {
    fdCustName: string | null
  } | null
  employee?: {
    fdEmpName: string | null
  } | null
}

export default function BillingPage() {
  const navigate = useNavigate()
  const { addToast } = useToastStore()

  const [data, setData] = useState<Billing[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  const { page, limit, setLimit, goToPage, reset } = usePagination(20)
  const [jumpPage, setJumpPage] = useState('')
  const [showMobilePanel, setShowMobilePanel] = useState(false)

  const { data: kpiData, isLoading: isLoadingKpi } = useQuery({
    queryKey: ['billingKpi', debouncedSearch],
    queryFn: async () => {
      const res = await billingApi.getKPIs({ search: debouncedSearch })
      return res.data as { data: { totalInvoices: number, totalTagihan: number, invoicesBulanIni: number, tagihanBulanIni: number } }
    }
  })

  const kpis = kpiData?.data
  const totalPages = Math.ceil(total / limit)
  const isInitialLoading = isLoading && data.length === 0
  const isRefreshing = isLoading && data.length > 0

  const DEFAULT_LIMIT = 20

  useEffect(() => {
    reset()
    setLimit(debouncedSearch ? 100 : DEFAULT_LIMIT)
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()
  }, [page, limit, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const res = await billingApi.list({
        page,
        limit,
        ...(debouncedSearch && { search: debouncedSearch }),
      })
      setData(res.data.data)
      setTotal(res.data.meta?.total || 0)
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Gagal memuat data billing',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const columns = [
    { key: 'fdInvNo', header: 'No. Invoice' },
    {
      key: 'fdInvDate',
      header: 'Tanggal Invoice',
      render: (row: Billing) => formatDate(row.fdInvDate)
    },
    {
      key: 'fdCustCode',
      header: 'Customer',
      render: (row: Billing) => row.customer?.fdCustName || row.fdCustCode || '—'
    },
    { key: 'fdDescr', header: 'Deskripsi' },
    {
      key: 'fdJumlah1',
      header: 'Total Tagihan',
      render: (row: Billing) => formatCurrency(row.fdJumlah1)
    },
    {
      key: 'createdBy',
      header: 'Created By',
      render: (row: Billing) => row.employee?.fdEmpName || '—'
    },
  ]

  const kpiCards = [
    {
      key: 'totalInvoices',
      label: 'Total Invoices',
      value: Number(kpis?.totalInvoices || 0).toLocaleString('id-ID'),
      icon: FileText,
      accent: 'text-blue-500',
      size: 'text-2xl sm:text-3xl',
    },
    {
      key: 'totalTagihan',
      label: 'Total Tagihan',
      value: formatCurrency(kpis?.totalTagihan || 0),
      icon: DollarSign,
      accent: 'text-emerald-500',
      size: 'text-base sm:text-xl',
    },
    {
      key: 'invoicesBulanIni',
      label: 'Inv Bulan Ini',
      value: Number(kpis?.invoicesBulanIni || 0).toLocaleString('id-ID'),
      icon: CalendarClock,
      accent: 'text-purple-500',
      size: 'text-2xl sm:text-3xl',
    },
    {
      key: 'tagihanBulanIni',
      label: 'Tagihan Bln Ini',
      value: formatCurrency(kpis?.tagihanBulanIni || 0),
      icon: CreditCard,
      accent: 'text-rose-500',
      size: 'text-base sm:text-xl',
    },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height)-2rem)] bg-[var(--color-background)] p-3 sm:p-6 space-y-3 sm:space-y-4 animate-fadeIn overflow-hidden">
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
      {/* Header */}
      <div className="hidden sm:flex flex-shrink-0 flex-col gap-0.5">
        <h1 className="font-[var(--font-display)] font-medium text-[40px] m-0 mb-1 tracking-[-0.02em] text-[var(--color-primary)]">
          Billing / Invoices
        </h1>
        <p className="text-xs text-[var(--color-secondary)] font-[var(--font-label)]">
          Kelola daftar invoice dan tagihan pelanggan.
        </p>
      </div>

      {/* Mobile: floating search + panel toggle */}
      <div className="sm:hidden flex-shrink-0 sticky top-0 z-10 -mx-3 px-3 pt-1 pb-2 bg-[var(--color-background)]/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <SearchBar
              value={search}
              onChange={(val) => { setSearch(val); goToPage(1) }}
              placeholder="Cari invoice, customer..."
            />
            {isLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin pointer-events-none" />
            )}
          </div>
          <button
            onClick={() => setShowMobilePanel((v) => !v)}
            className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-[var(--radius-lg)] border transition-colors ${
              showMobilePanel
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)]'
            }`}
            aria-label="Tampilkan ringkasan & pengaturan"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible KPI + rows-per-page panel (mobile) */}
      {showMobilePanel && (
        <div className="sm:hidden flex-shrink-0 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {kpiCards.map(({ key, label, value, icon: Icon, accent }) => (
              <div
                key={key}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-2.5 shadow-sm"
              >
                <div className="flex items-center gap-1.5 text-[var(--color-secondary)]">
                  <Icon className={`w-3.5 h-3.5 ${accent} flex-shrink-0`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider truncate">{label}</span>
                </div>
                <div className="mt-2">
                  {isLoadingKpi ? (
                    <div className="h-5 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
                  ) : (
                    <h3
                      className="text-base font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums truncate"
                      title={value}
                    >
                      {value}
                    </h3>
                  )}
                </div>
              </div>
            ))}
          </div>
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

      {/* Desktop: KPI Summary */}
      <div className="hidden sm:grid flex-shrink-0 grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ key, label, value, icon: Icon, accent, size }) => (
          <div
            key={key}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow"
          >
            <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
              <Icon className={`w-24 h-24 ${accent}`} />
            </div>
            <div className="flex items-center gap-2 text-[var(--color-secondary)]">
              <Icon className={`w-4 h-4 ${accent} flex-shrink-0`} />
              <span className="text-xs font-bold uppercase tracking-wider truncate">{label}</span>
            </div>
            <div className="mt-3">
              {isLoadingKpi ? (
                <div className="h-8 w-24 bg-[var(--color-border)] animate-pulse rounded"></div>
              ) : (
                <h3
                  className={`${size} font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums truncate`}
                  title={value}
                >
                  {value}
                </h3>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Toolbar */}
      <div className="hidden sm:flex flex-shrink-0 items-center gap-4 bg-[var(--color-surface)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm">
        <div className="w-full max-w-2xl relative">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); goToPage(1) }}
            placeholder="Cari no invoice, deskripsi, kode customer..."
          />
          {isLoading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin pointer-events-none" />
          )}
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

      {/* Content Container */}
      <div className="flex-1 min-h-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-sm flex flex-col overflow-hidden relative">
        {/* Seamless refresh indicator */}
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--color-border)] overflow-hidden z-20">
            <div className="h-full w-1/3 bg-[var(--color-primary)] animate-[loading-bar_1s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Desktop: table */}
        <div className="hidden sm:flex flex-1 min-h-0 flex-col">
          <div className={`flex-1 overflow-auto transition-opacity duration-200 ${isRefreshing ? 'opacity-60' : ''}`}>
            <Table
              columns={columns}
              data={data}
              keyExtractor={(row) => row.fdInvNo}
              isLoading={isInitialLoading}
              onRowClick={(row) => navigate(ROUTES.BILLING_DETAIL(row.fdInvNo))}
              emptyMessage="Tidak ada data invoice ditemukan."
              getRowClassName={() => 'bg-white hover:bg-gray-50 border-l-4 border-l-gray-200'}
            />
          </div>
        </div>

        {/* Mobile: short list (default view) */}
        <div className={`flex sm:hidden flex-1 min-h-0 flex-col overflow-auto divide-y divide-[var(--color-border)] transition-opacity duration-200 ${isRefreshing ? 'opacity-60' : ''}`}>
          {isInitialLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-3 py-2.5 flex items-center gap-2">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-2/5 bg-[var(--color-border)] animate-pulse rounded" />
                  <div className="h-3 w-1/3 bg-[var(--color-border)] animate-pulse rounded" />
                </div>
                <div className="h-3.5 w-16 bg-[var(--color-border)] animate-pulse rounded" />
              </div>
            ))
          ) : data.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-[var(--color-secondary)] text-center">
              Tidak ada data invoice ditemukan.
            </div>
          ) : (
            data.map((row) => (
              <button
                key={row.fdInvNo}
                onClick={() => navigate(ROUTES.BILLING_DETAIL(row.fdInvNo))}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2 bg-white active:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-[var(--font-display)] font-medium text-[var(--color-primary)] text-sm truncate">
                      {row.fdInvNo}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-primary)] tabular-nums flex-shrink-0">
                      {formatCurrency(row.fdJumlah1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-[var(--color-secondary)] truncate">
                      {row.customer?.fdCustName || row.fdCustCode || '—'}
                    </span>
                    <span className="text-[11px] text-[var(--color-secondary)] flex-shrink-0 tabular-nums">
                      {formatDate(row.fdInvDate)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-secondary)] flex-shrink-0" />
              </button>
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
