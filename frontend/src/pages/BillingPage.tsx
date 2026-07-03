import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, CreditCard, CalendarClock, DollarSign } from 'lucide-react'
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

  const { data: kpiData, isLoading: isLoadingKpi } = useQuery({
    queryKey: ['billingKpi', debouncedSearch],
    queryFn: async () => {
      const res = await billingApi.getKPIs({ search: debouncedSearch })
      return res.data as { data: { totalInvoices: number, totalTagihan: number, invoicesBulanIni: number, tagihanBulanIni: number } }
    }
  })

  const kpis = kpiData?.data

  useEffect(() => {
    reset()
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
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height)-2rem)] bg-[var(--color-background)] p-4 sm:p-6 space-y-4 animate-fadeIn overflow-hidden">
      <div className="flex flex-shrink-0 flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold font-[var(--font-display)] text-[var(--color-primary)]">Billing / Invoices</h1>
          <p className="text-xs text-[var(--color-secondary)] font-[var(--font-label)]">
            Kelola daftar invoice dan tagihan pelanggan.
          </p>
        </div>

      </div>

      {/* Global KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {/* Total Invoices */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
          <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
            <FileText className="w-24 h-24 text-[var(--color-primary)]" />
          </div>
          <div className="flex items-center gap-2 text-[var(--color-secondary)]">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Invoices</span>
          </div>
          <div className="mt-3">
            {isLoadingKpi ? (
              <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
            ) : (
              <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                {Number(kpis?.totalInvoices || 0).toLocaleString('id-ID')}
              </h3>
            )}
          </div>
        </div>

        {/* Total Tagihan */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
          <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
            <DollarSign className="w-24 h-24 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2 text-[var(--color-secondary)]">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Tagihan</span>
          </div>
          <div className="mt-3">
            {isLoadingKpi ? (
              <div className="h-8 w-24 bg-[var(--color-border)] animate-pulse rounded"></div>
            ) : (
              <h3 className="text-xl font-bold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums truncate" title={formatCurrency(kpis?.totalTagihan || 0)}>
                {formatCurrency(kpis?.totalTagihan || 0)}
              </h3>
            )}
          </div>
        </div>

        {/* Invoices Bulan Ini */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
          <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
            <CalendarClock className="w-24 h-24 text-purple-500" />
          </div>
          <div className="flex items-center gap-2 text-[var(--color-secondary)]">
            <CalendarClock className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Inv Bulan Ini</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            {isLoadingKpi ? (
              <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
            ) : (
              <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                {Number(kpis?.invoicesBulanIni || 0).toLocaleString('id-ID')}
              </h3>
            )}
          </div>
        </div>

        {/* Tagihan Bulan Ini */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
          <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
            <CreditCard className="w-24 h-24 text-rose-500" />
          </div>
          <div className="flex items-center gap-2 text-[var(--color-secondary)]">
            <CreditCard className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Tagihan Bln Ini</span>
          </div>
          <div className="mt-3">
            {isLoadingKpi ? (
              <div className="h-8 w-24 bg-[var(--color-border)] animate-pulse rounded"></div>
            ) : (
              <h3 className="text-xl font-bold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums truncate" title={formatCurrency(kpis?.tagihanBulanIni || 0)}>
                {formatCurrency(kpis?.tagihanBulanIni || 0)}
              </h3>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-shrink-0 items-center justify-between gap-4 bg-[var(--color-surface)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm">
        <div className="w-full max-w-2xl">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); goToPage(1) }}
            placeholder="Cari no invoice, deskripsi, kode customer..."
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--color-secondary)] whitespace-nowrap">
          <span className="hidden sm:inline">Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value))
              goToPage(1)
            }}
            className="bg-transparent border border-[var(--color-border)] rounded px-2 py-1 focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 min-h-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <Table
            columns={columns}
            data={data}
            keyExtractor={(row) => row.fdInvNo}
            isLoading={isLoading}
            onRowClick={(row) => navigate(ROUTES.BILLING_DETAIL(row.fdInvNo))}
            emptyMessage="Tidak ada data invoice ditemukan."
            getRowClassName={() => 'bg-white hover:bg-gray-50 border-l-4 border-l-gray-200'}
          />
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border)]">
          <Pagination
            page={page}
            limit={limit}
            total={total}
            totalPages={Math.ceil(total / limit)}
            onPageChange={goToPage}
          />
          {Math.ceil(total / limit) > 1 && (
            <div className="flex flex-shrink-0 items-center gap-1.5 px-3 py-2 text-xs text-[var(--color-secondary)]">
              <span className="hidden sm:inline">Go to page</span>
              <input
                type="number"
                min={1}
                max={Math.ceil(total / limit)}
                value={jumpPage}
                placeholder={String(page)}
                onChange={(e) => setJumpPage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  const totalPages = Math.ceil(total / limit)
                  const target = Math.min(Math.max(1, Number(jumpPage) || 1), totalPages)
                  goToPage(target)
                  setJumpPage('')
                }}
                className="w-14 text-center bg-transparent border border-[var(--color-border)] rounded px-1 py-1 focus:outline-none focus:border-[var(--color-primary)]"
              />
              <span>of {Math.ceil(total / limit).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}