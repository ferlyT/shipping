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

  const columns = [
    { key: 'fdID', header: 'ID' },
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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-fadeIn pb-24">
      {/* Header Panel */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(ROUTES.BILLING)} className="px-2 border border-[var(--color-border)] shadow-sm bg-[var(--color-surface)]">
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-sm flex flex-col border border-[var(--color-border)]">
        <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-tertiary)]/10 text-[var(--color-tertiary)] border border-[var(--color-border)]">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-[var(--font-display)] text-[var(--color-primary)] leading-none mt-1">Invoice: {data.fdInvNo}</h1>
              <p className="text-xs text-[var(--color-secondary)] mt-1.5 font-[var(--font-body)]">Informasi lengkap dan rincian item invoice.</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-[var(--color-neutral)] space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Customer</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--color-primary)]">{data.customer?.fdCustName || data.fdCustCode || '—'}</p>
              {data.customer?.fdAddr1 && <p className="mt-1 text-xs text-[var(--color-secondary)] leading-snug">{data.customer.fdAddr1}</p>}
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Tanggal Invoice</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--color-primary)]">{formatDate(data.fdInvDate)}</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Deskripsi</p>
              <p className="mt-1.5 text-sm font-medium text-[var(--color-primary)]">{data.fdDescr || '—'}</p>
            </div>
          </div>

          {/* Highlight Card */}
          <div className="rounded-[var(--radius-xl)] border-2 border-[var(--color-tertiary)]/20 bg-[var(--color-tertiary)]/5 p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-10 translate-x-10">
               <FileText className="w-32 h-32 text-[var(--color-tertiary)]" />
             </div>
             <p className="text-xs uppercase tracking-widest font-bold text-[var(--color-secondary)] mb-2 relative z-10">Total Tagihan</p>
             <h2 className="text-4xl font-bold font-[var(--font-display)] text-[var(--color-tertiary)] tabular-nums tracking-tight relative z-10">
               {formatCurrency(data.fdJumlah1)}
             </h2>
          </div>

          {/* Table */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <h3 className="text-sm font-bold font-[var(--font-label)] text-[var(--color-primary)] uppercase tracking-wider">Rincian Item</h3>
            </div>
            <Table
              columns={columns}
              data={data.details || []}
              keyExtractor={(row) => row.fdID}
              emptyMessage="Tidak ada detail item untuk invoice ini."
            />
          </div>
        </div>
      </div>
    </div>
  )
}