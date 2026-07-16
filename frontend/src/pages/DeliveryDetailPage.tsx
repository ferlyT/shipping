import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Truck, Package, Weight } from 'lucide-react'
import { deliveryOrdersApi } from '@/api/endpoints'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { ROUTES } from '@/lib/constants'

interface DeliveryOrder {
  fdSJNo: string
  fdSJDate: string
  fdCustCode: string | null
  fdCustNameSJ: string | null
  fdDescr: string
  fdSupir: string | null
  fdCarID: string | null
  fdJmlPackSJ: number | null
  fdJmlBeratSJ: number | null
  fdAddr: string | null
  fdCity: string | null
}

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToastStore()
  
  const [data, setData] = useState<DeliveryOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (id) fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const res = await deliveryOrdersApi.detail(id!)
      setData(res.data.data)
    } catch (err: any) {
      addToast({
        message: err.response?.data?.error || 'Gagal memuat detail surat jalan',
        type: 'error',
      })
      navigate(ROUTES.DELIVERY_ORDERS)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 h-full flex flex-col justify-center items-center gap-4">
        <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-secondary)] text-sm animate-pulse">Memuat detail surat jalan...</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-fadeIn pb-24">
      {/* Header Panel */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(ROUTES.DELIVERY_ORDERS)} className="px-2 border border-[var(--color-border)] shadow-sm bg-[var(--color-surface)]">
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-sm flex flex-col border border-[var(--color-border)]">
        <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-indigo-500/10 text-indigo-500 border border-[var(--color-border)]">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-[var(--font-display)] text-[var(--color-primary)] leading-none mt-1">Surat Jalan: {data.fdSJNo}</h1>
              <p className="text-xs text-[var(--color-secondary)] mt-1.5 font-[var(--font-body)]">Informasi lengkap surat jalan pengiriman.</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-[var(--color-neutral)] space-y-6">
          {/* Info Grid Umum */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Customer</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--color-primary)]">{data.fdCustNameSJ || data.fdCustCode || '—'}</p>
              {(data.fdAddr || data.fdCity) && (
                <p className="mt-1 text-xs text-[var(--color-secondary)] leading-snug">
                  {data.fdAddr || ''} {data.fdCity && `(${data.fdCity})`}
                </p>
              )}
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Tanggal SJ</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--color-primary)]">{formatDate(data.fdSJDate)}</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Deskripsi</p>
              <p className="mt-1.5 text-sm font-medium text-[var(--color-primary)]">{data.fdDescr || '—'}</p>
            </div>
          </div>

          {/* Info Grid Pengiriman */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm flex items-start gap-3">
              <div className="mt-1 opacity-50"><Truck className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Logistik</p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-primary)]">{data.fdSupir || 'Supir TBD'}</p>
                <p className="text-xs text-[var(--color-secondary)]">{data.fdCarID || 'No. Polisi TBD'}</p>
              </div>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm flex items-start gap-3">
              <div className="mt-1 opacity-50"><Package className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Total Packages</p>
                <p className="mt-1 text-lg font-bold text-[var(--color-primary)] tabular-nums">{Number(data.fdJmlPackSJ || 0).toLocaleString('id-ID')}</p>
              </div>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm flex items-start gap-3">
              <div className="mt-1 opacity-50"><Weight className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Total Weight</p>
                <p className="mt-1 text-lg font-bold text-[var(--color-primary)] tabular-nums">{Number(data.fdJmlBeratSJ || 0).toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}