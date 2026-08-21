import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Truck, Package, Weight } from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import type { DeliveryOrder } from '../types/delivery-orders.types'

export default function DeliveryDetailPage() {
  const { t } = useTranslation()
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
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : 'Gagal memuat detail surat jalan',
        type: 'error',
      })
      navigate(ROUTES.DELIVERY_ORDERS)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <LoadingSpinner message="Memuat detail surat jalan..." />

  if (!data) return null

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 bg-[var(--color-surface)] font-[var(--font-body)] animate-fadeIn pb-24">
      <PageHeader
        title={`Surat Jalan: ${data.fdSJNo}`}
        subtitle={`Detail informasi surat jalan untuk ${data.fdCustNameSJ || data.fdCustCode || 'Customer'}`}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.deliveryOrder'), path: ROUTES.DELIVERY_ORDERS },
          { label: data.fdSJNo },
        ]}
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.DELIVERY_ORDERS)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar
          </Button>
        }
      />

      <div className="bg-[var(--color-surface)] rounded-xl shadow-xs flex flex-col border border-[var(--color-border)]">
        <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-transparent border border-[var(--color-tertiary)]/40 text-[var(--color-tertiary)]">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-mono text-[var(--color-primary)] leading-tight mt-0.5">
                Surat Jalan: {data.fdSJNo}
              </h1>
              <p className="text-xs text-[var(--color-secondary)] mt-1">
                Informasi lengkap pengiriman surat jalan.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-[var(--color-neutral)]/40 space-y-6">
          {/* Info Grid Umum */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">Customer</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--color-primary)]">{data.fdCustNameSJ || data.fdCustCode || '—'}</p>
              {(data.fdAddr || data.fdCity) && (
                <p className="mt-1 text-xs text-[var(--color-secondary)] leading-snug">
                  {data.fdAddr || ''} {data.fdCity && `(${data.fdCity})`}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">Tanggal SJ</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--color-primary)]">{formatDate(data.fdSJDate)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">Deskripsi</p>
              <p className="mt-1.5 text-sm font-medium text-[var(--color-primary)]">{data.fdDescr || '—'}</p>
            </div>
          </div>

          {/* Info Grid Pengiriman */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[var(--color-neutral)] text-[var(--color-secondary)]">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">Logistik</p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-primary)]">{data.fdSupir || 'Supir TBD'}</p>
                <p className="text-xs text-[var(--color-secondary)]">{data.fdCarID || 'No. Polisi TBD'}</p>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[var(--color-neutral)] text-[var(--color-secondary)]">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">Total Packages</p>
                <p className="mt-1 text-lg font-bold font-mono text-[var(--color-primary)] tabular-nums">{Number(data.fdJmlPackSJ || 0).toLocaleString('id-ID')}</p>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[var(--color-neutral)] text-[var(--color-secondary)]">
                <Weight className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">Total Weight</p>
                <p className="mt-1 text-lg font-bold font-mono text-[var(--color-primary)] tabular-nums">{Number(data.fdJmlBeratSJ || 0).toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}