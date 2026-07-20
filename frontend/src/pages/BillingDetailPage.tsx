import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { billingApi } from '@/api/endpoints'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { ROUTES } from '@/lib/constants'

interface BillingDetail {
  fdInvNo: string
  fdID: string
  fdItemName: string
  fdQty: number
  fdItemPrice: number
  fdTotal: number
}

interface Billing {
  fdInvNo: string
  fdInvDate: string
  fdCustCode: string
  fdDescr: string
  fdJumlah1: number
  customer?: {
    fdCustName: string | null
    fdContact: string | null
    fdAddr1: string | null
  } | null
  details?: BillingDetail[]
}

export default function BillingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToastStore()

  const [data, setData] = useState<Billing | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (id) fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const res = await billingApi.detail(id!)
      setData(res.data.data)
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Gagal memuat detail invoice',
      })
      navigate(ROUTES.BILLING)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 h-full flex flex-col justify-center items-center gap-4">
        <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-secondary)] text-sm animate-pulse">Memuat detail billing...</p>
      </div>
    )
  }

  if (!data) return null

  const details = data.details || []

  const columns = [
    { key: 'fdItemName', header: 'Nama Item' },
    {
      key: 'fdQty',
      header: 'Qty',
      render: (row: BillingDetail) => row.fdQty
    },
    {
      key: 'fdItemPrice',
      header: 'Harga',
      render: (row: BillingDetail) => formatCurrency(row.fdItemPrice)
    },
    {
      key: 'fdTotal',
      header: 'Total',
      render: (row: BillingDetail) => formatCurrency(row.fdTotal)
    },
  ]

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fadeIn pb-24">
      {/* Header Panel */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(ROUTES.BILLING)} className="px-2 border border-[var(--color-border)] shadow-sm bg-[var(--color-surface)]">
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] sm:rounded-[var(--radius-xl)] shadow-sm flex flex-col border border-[var(--color-border)]">
        <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-tertiary)]/10 text-[var(--color-tertiary)] border border-[var(--color-border)]">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold font-[var(--font-display)] text-[var(--color-primary)] leading-tight mt-0.5 sm:mt-1 truncate">
                Invoice: {data.fdInvNo}
              </h1>
              <p className="text-[11px] sm:text-xs text-[var(--color-secondary)] mt-1 sm:mt-1.5 font-[var(--font-body)]">
                Informasi lengkap dan rincian item invoice.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-6 bg-[var(--color-neutral)] space-y-4 sm:space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Customer</p>
              <p className="mt-1 sm:mt-1.5 text-sm font-semibold text-[var(--color-primary)]">{data.customer?.fdCustName || data.fdCustCode || '—'}</p>
              {data.customer?.fdAddr1 && <p className="mt-1 text-xs text-[var(--color-secondary)] leading-snug">{data.customer.fdAddr1}</p>}
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Tanggal Invoice</p>
              <p className="mt-1 sm:mt-1.5 text-sm font-semibold text-[var(--color-primary)]">{formatDate(data.fdInvDate)}</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Deskripsi</p>
              <p className="mt-1 sm:mt-1.5 text-sm font-medium text-[var(--color-primary)]">{data.fdDescr || '—'}</p>
            </div>
          </div>

          {/* Highlight Card */}
          <div className="rounded-[var(--radius-lg)] sm:rounded-[var(--radius-xl)] border-2 border-[var(--color-tertiary)]/20 bg-[var(--color-tertiary)]/5 p-4 sm:p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-10 translate-x-10">
               <FileText className="w-32 h-32 text-[var(--color-tertiary)]" />
             </div>
             <p className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-[var(--color-secondary)] mb-1.5 sm:mb-2 relative z-10">Total Tagihan</p>
             <h2 className="text-2xl sm:text-4xl font-bold font-[var(--font-display)] text-[var(--color-tertiary)] tabular-nums tracking-tight relative z-10">
               {formatCurrency(data.fdJumlah1)}
             </h2>
          </div>

          {/* Rincian Item */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold font-[var(--font-label)] text-[var(--color-primary)] uppercase tracking-wider">Rincian Item</h3>
              <span className="text-[11px] sm:text-xs text-[var(--color-secondary)] font-[var(--font-body)]">{details.length} item</span>
            </div>

            {/* Desktop / tablet: table */}
            <div className="hidden sm:block">
              <Table
                columns={columns}
                data={details}
                keyExtractor={(row) => row.fdID}
                emptyMessage="Tidak ada detail item untuk invoice ini."
              />
            </div>

            {/* Mobile: stacked cards, one item per row, no horizontal scroll */}
            <div className="sm:hidden">
              {details.length > 0 ? (
                <ul className="divide-y divide-[var(--color-border)]">
                  {details.map((row) => (
                    <li key={row.fdID} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-sm font-semibold text-[var(--color-primary)] leading-snug break-words">
                          {row.fdItemName}
                        </p>
                        <p className="shrink-0 text-sm font-bold text-[var(--color-tertiary)] tabular-nums">
                          {formatCurrency(row.fdTotal)}
                        </p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-[var(--color-secondary)] tabular-nums">
                        <span>{row.fdQty} ×</span>
                        <span>{formatCurrency(row.fdItemPrice)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-[var(--color-secondary)]">
                  Tidak ada detail item untuk invoice ini.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
