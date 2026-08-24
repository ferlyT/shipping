import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { ArrowLeft } from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CurrencyValue, formatWithCurrency } from '@/components/ui/CurrencyValue'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { Badge } from '@/components/ui/Badge'
import { statusConfig } from '@/features/customers/components/CustomerBadges'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import type { Billing } from '../types/billing.types'
import { formatQtyDecimal } from '../utils/billing.utils'

export default function DetailPage() {
  const { t } = useTranslation()
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
    } catch (err) {
      const message = err instanceof AxiosError ? err.response?.data?.error : undefined
      addToast({
        type: 'error',
        message: message || t('billing.detail.errorLoad'),
      })
      navigate(ROUTES.BILLING_LIST)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <LoadingSpinner message={t('common.loadingBilling')} />

  if (!data) return null

  const details = [...(data.details || [])].sort((a, b) => a.fdID.localeCompare(b.fdID))

  const isVfcItem = (name?: string | null) => {
    const n = (name || '').toUpperCase()
    return (
      n.includes('VOLUME FREIGHT') ||
      n.includes('FREIGHT CHARGE') ||
      n.includes('VFC')
    )
  }

  const unitTotals = details.reduce<Record<string, number>>((acc, row) => {
    const nameUpper = (row.fdItemName || '').toUpperCase()

    // Pisahkan Volume Freight Charges menjadi total tersendiri
    if (isVfcItem(row.fdItemName)) {
      acc['VOLUME FREIGHT CHARGES'] = (acc['VOLUME FREIGHT CHARGES'] || 0) + Number(row.fdQty || 0)
      return acc
    }

    const unit = row.fdListCode?.trim()
    if (!unit) return acc
    // Aturan khusus M3: hanya item PARCELS yang dihitung ke total M3
    if (unit.toUpperCase() === 'M3' && !nameUpper.includes('PARCEL')) return acc
    acc[unit] = (acc[unit] || 0) + Number(row.fdQty || 0)
    return acc
  }, {})

  return (
    <div className="p-3 sm:p-6 lg:p-8 w-full space-y-6 animate-fadeIn pb-24 font-[var(--font-body)]">
      <PageHeader
        title={`Invoice: ${data.fdInvNo}`}
        subtitle={`${t('billing.detail.subtitle')} (${data.customer?.fdCustName || data.fdCustCode})`}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.billing'), path: ROUTES.BILLING_LIST },
          { label: `Invoice ${data.fdInvNo}` },
        ]}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.BILLING_LIST)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('billing.detail.backToList')}
          </Button>
        }
      />

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] sm:rounded-[var(--radius-xl)] shadow-sm flex flex-col border border-[var(--color-border)]">

        <div className="p-3 sm:p-6 bg-[var(--color-neutral)] space-y-4 sm:space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">{t('billing.detail.customer')}</p>
              <div className="mt-1 sm:mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-[var(--color-primary)]">{data.customer?.fdCustName || data.fdCustCode || '—'}</span>
                {data.customer && (
                  <Badge
                    variant={(statusConfig[(data.customer.fdBlocked ?? 0) as keyof typeof statusConfig] || statusConfig[0]).badgeVariant}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {(statusConfig[(data.customer.fdBlocked ?? 0) as keyof typeof statusConfig] || statusConfig[0]).label}
                  </Badge>
                )}
              </div>
              {data.customer?.fdBillAddr1 && <p className="mt-1 text-xs text-[var(--color-secondary)] leading-snug">{data.customer.fdBillAddr1}</p>}
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">{t('billing.detail.invoiceDate')}</p>
              <p className="mt-1 sm:mt-1.5 text-sm font-semibold text-[var(--color-primary)]">{formatDate(data.fdInvDate)}</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">{t('billing.detail.issuedDate')}</p>
              <p className="mt-1 sm:mt-1.5 text-sm font-semibold text-[var(--color-primary)]">{formatDateTime(data.fdGiveDate)}</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">{t('billing.detail.author')}</p>
              <p className="mt-1 sm:mt-1.5 text-sm font-semibold text-[var(--color-primary)]">{data.employee?.fdEmpName || '—'}</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">{t('billing.detail.marking')}</p>
              <p className="mt-1 sm:mt-1.5 text-sm font-medium text-[var(--color-primary)]">{data.fdMarkingCode || '—'}</p>
              <p className="mt-1 sm:mt-1.5 text-sm font-medium text-[var(--color-primary)]">{data.fdMarkingNo || '—'}</p>
            </div>
          </div>

          {/* Rincian Item */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold font-[var(--font-label)] text-[var(--color-primary)] uppercase tracking-wider">{t('billing.detail.itemDetails')}</h3>
              <span className="text-[11px] sm:text-xs text-[var(--color-secondary)] font-[var(--font-body)]">{details.length} {t('billing.detail.items')}</span>
            </div>

            {/* Desktop / tablet: hand-rolled table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col style={{ width: '55%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-[var(--color-neutral)] border-b border-[var(--color-border)]">
                    <th className="px-4 py-2.5 sm:px-5 sm:py-3 text-left text-[10px] sm:text-[11px] font-bold font-[var(--font-label)] uppercase tracking-wider text-[var(--color-secondary)]">{t('billing.detail.colDescription')}</th>
                    <th className="px-4 py-2.5 sm:px-5 sm:py-3 text-right text-[10px] sm:text-[11px] font-bold font-[var(--font-label)] uppercase tracking-wider text-[var(--color-secondary)]">{t('billing.detail.colQty')}</th>
                    <th className="px-4 py-2.5 sm:px-5 sm:py-3 text-right text-[10px] sm:text-[11px] font-bold font-[var(--font-label)] uppercase tracking-wider text-[var(--color-secondary)]">{t('billing.detail.colPrice')}</th>
                    <th className="px-4 py-2.5 sm:px-5 sm:py-3 text-right text-[10px] sm:text-[11px] font-bold font-[var(--font-label)] uppercase tracking-wider text-[var(--color-secondary)]">{t('billing.detail.colTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {details.length > 0 ? (
                    details.map((row) => (
                      <tr key={row.fdID} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="px-4 py-3 sm:px-5 sm:py-3.5 text-[var(--color-primary)] font-medium leading-snug break-words">{row.fdItemName}</td>
                        <td className="px-4 py-3 sm:px-5 sm:py-3.5 text-right text-[var(--color-primary)] tabular-nums">
                          {(Number(row.fdQty || 0) !== 0 || row.fdListCode) && (
                            <>{formatQtyDecimal(row.fdQty, row.fdListCode, row.fdItemName)} {row.fdListCode || ''}</>
                          )}
                        </td>
                        <td className="px-4 py-3 sm:px-5 sm:py-3.5 text-[var(--color-primary)]">
                          <CurrencyValue value={row.fdItemPrice} currency={row.fdCurr} />
                        </td>
                        <td className="px-4 py-3 sm:px-5 sm:py-3.5 text-[var(--color-primary)] font-semibold">
                          <CurrencyValue value={row.fdTotal} currency={row.fdCurr} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--color-secondary)]">
                        {t('billing.detail.noItems')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards */}
            <div className="sm:hidden">
              {details.length > 0 ? (
                <ul className="divide-y divide-[var(--color-border)]">
                  {details.map((row) => (
                    <li key={row.fdID} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-sm font-semibold text-[var(--color-primary)] leading-snug break-words">
                          {row.fdItemName}
                        </p>
                        <p className="shrink-0 min-w-[9rem] text-sm font-bold text-[var(--color-tertiary)]">
                          <CurrencyValue value={row.fdTotal} currency={row.fdCurr} />
                        </p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-[var(--color-secondary)] tabular-nums">
                        {(Number(row.fdQty || 0) !== 0 || row.fdListCode) && (
                          <>
                            <span>{formatQtyDecimal(row.fdQty, row.fdListCode, row.fdItemName)} ×</span>
                          </>
                        )}
                        <span>{formatWithCurrency(row.fdItemPrice, row.fdCurr)}</span>
                        {row.fdListCode && (
                          <>
                            <span className="text-[var(--color-border)]">•</span>
                            <span>{row.fdListCode}</span>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-[var(--color-secondary)]">
                  {t('billing.detail.noItems')}
                </div>
              )}
            </div>

            {/* Footer ringkasan */}
            <div className="border-t border-[var(--color-border)] bg-[var(--color-neutral)] px-4 py-4 sm:px-6 sm:py-5">
              <div className="ml-auto flex w-full flex-col gap-2.5 sm:w-[28rem]">
                {Object.entries(unitTotals).map(([unit, qty]) => {
                  const isVfc = unit === 'VOLUME FREIGHT CHARGES'
                  return (
                    <div key={unit} className="flex items-center justify-between gap-3">
                      <span className="text-[11px] sm:text-xs font-[var(--font-label)] uppercase tracking-wider text-[var(--color-secondary)]">
                        {isVfc ? 'TOTAL VOLUME FREIGHT CHARGES' : `${t('billing.detail.total')} ${unit}`}
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-[var(--color-primary)] tabular-nums">
                        {formatQtyDecimal(qty, isVfc ? 'KG' : unit)} {isVfc ? 'KG (VFC)' : unit}
                      </span>
                    </div>
                  )
                })}
                <div
                  className={`flex items-baseline justify-between gap-4 ${Object.keys(unitTotals).length > 0 ? 'mt-1 pt-3 border-t border-[var(--color-border)]' : ''
                    }`}
                >
                  <span className="shrink-0 text-xs sm:text-sm font-bold font-[var(--font-label)] uppercase tracking-widest text-[var(--color-secondary)]">
                    {t('billing.detail.totalAmount')}
                  </span>
                  <span className="text-right text-lg sm:text-xl md:text-2xl font-bold font-[var(--font-display)] text-[var(--color-tertiary)] tracking-tight whitespace-nowrap">
                    {Number(data.fdJumlah2 || 0) > 0 ? (
                      formatWithCurrency(data.fdJumlah2, data.fdCurr1)
                    ) : (
                      formatWithCurrency(data.fdJumlah1, 'Rp.')
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
