import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { ArrowLeft, ListFilter } from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CurrencyValue, formatWithCurrency } from '@/components/ui/CurrencyValue'
import { formatDate, formatDateTime, formatDecimal } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { Badge } from '@/components/ui/Badge'
import { statusConfig } from '@/features/customers/components/CustomerBadges'
import { BillingValidationCard } from '../components/BillingValidationCard'
import { ValidationListDrawer } from '../components/ValidationListDrawer'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'

interface BillingDetail {
  fdInvNo: string
  fdID: string
  fdItemName: string
  fdQty: number
  fdListCode: string | null
  fdItemPrice: number
  fdTotal: number
  fdCurr: string | null
  fdTypeComodity?: number | null
  fdComodity?: string | null
}

interface Billing {
  fdInvNo: string
  fdInvDate: string
  fdCustCode: string
  fdDescr: string
  fdJumlah1: number
  fdJumlah2?: number | null
  fdCurr1: string | null
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdGiveDate: string
  employee?: {
    fdEmpName: string | null
  } | null
  customer?: {
    fdCustName: string | null
    fdBlocked?: number | null
    fdContact: string | null
    fdBillTo: string | null
    fdBillAddr1: string | null
    fdSalesNM?: string | null
    fdBroker?: number | null
  } | null
  details?: BillingDetail[]
  fdListCode?: string | null
  fdTypeComodity?: number | null
}

function formatQtyDecimal(qty: number, unitStr?: string | null, itemName?: string | null): string {
  const num = Number(qty || 0)
  const unit = (unitStr || '').trim().toUpperCase()
  const name = (itemName || '').trim().toUpperCase()

  const isM2 = unit === 'M2' || name.includes('M2')
  const isM3 = unit === 'M3' || name.includes('M3')

  if (isM2 || isM3) {
    return formatDecimal(num, 4)
  }
  return formatDecimal(num, Number.isInteger(num) ? 0 : 2)
}

export function ValidationDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToastStore()

  const [data, setData] = useState<Billing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isListDrawerOpen, setIsListDrawerOpen] = useState(false)

  useEffect(() => {
    if (id) fetchData()
  }, [id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsListDrawerOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
      navigate(ROUTES.BILLING_VALIDATION_LIST)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <LoadingSpinner message={t('common.loadingBilling')} />

  if (!data) return null

  const details = [...(data.details || [])].sort((a, b) => a.fdID.localeCompare(b.fdID))

  const isAuxiliaryItem = (name?: string | null) => {
    const n = (name || '').toUpperCase()
    return (
      n.includes('TAX RETURN') ||
      n.includes('ADMIN') ||
      n.includes('SURCHARGE') ||
      n.includes('DISCOUNT') ||
      n.includes('BIAYA') ||
      n.includes('PENYESUAIAN')
    )
  }

  const unitTotals = details.reduce<Record<string, number>>((acc, row) => {
    let unit = row.fdListCode?.trim()?.toUpperCase()
    const nameUpper = (row.fdItemName || '').toUpperCase()

    // If unit is blank, infer from (M3) or (KG) in item name
    if (!unit) {
      if (nameUpper.includes('(M3)')) unit = 'M3'
      else if (nameUpper.includes('(KG)')) unit = 'KG'
      else if (nameUpper.includes('(PCS)')) unit = 'PCS'
    }

    if (isAuxiliaryItem(row.fdItemName)) return acc
    if (!unit) return acc

    acc[unit] = (acc[unit] || 0) + Number(row.fdQty || 0)
    return acc
  }, {})

  // Rule M3 Tagihan Minimal: Jika total M3 > 0 dan < 0.1, diset ke 0.1 m³
  if (unitTotals['M3'] !== undefined && unitTotals['M3'] > 0 && unitTotals['M3'] < 0.1) {
    unitTotals['M3'] = 0.1
  }

  const isUnitCode = (code?: string | null) => {
    if (!code?.trim()) return true
    const u = code.trim().toUpperCase()
    return ['M3', 'M2', 'KG', 'PCS', 'COLY', 'CTN', 'BOX', 'PKGS'].includes(u)
  }

  const primaryListCode =
    (!isUnitCode(data.fdListCode) ? data.fdListCode?.trim() : null) ||
    details.find((d) => !isUnitCode(d.fdListCode))?.fdListCode?.trim() ||
    data.fdMarkingCode?.trim() ||
    data.fdInvNo?.trim() ||
    ''

  const rawM3FromItems = details.reduce((sum, d) => {
    if (isAuxiliaryItem(d.fdItemName)) return sum
    let unit = d.fdListCode?.trim()?.toUpperCase()
    const nameUpper = (d.fdItemName || '').toUpperCase()
    if (!unit && nameUpper.includes('(M3)')) unit = 'M3'

    const isM3Item = unit === 'M3' || (nameUpper.includes('PARCEL') && !nameUpper.includes('(KG)') && !nameUpper.includes('KG'))
    return isM3Item ? sum + Number(d.fdQty || 0) : sum
  }, 0)

  const calcM3 = unitTotals['M3'] ?? rawM3FromItems
  const billedM3 = calcM3 > 0 && calcM3 < 0.1 ? 0.1 : calcM3

  return (
    <div className="p-3 sm:p-6 lg:p-8 w-full space-y-6 animate-fadeIn pb-24 font-[var(--font-body)]">
      <PageHeader
        title={`${t('billing.validation.detailTitle')}: ${data.fdInvNo}`}
        subtitle={`${t('billing.detail.subtitle')} (${data.customer?.fdCustName || data.fdCustCode})`}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.validationList'), path: ROUTES.BILLING_VALIDATION_LIST },
          { label: `${t('billing.validation.detailTitle')} ${data.fdInvNo}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsListDrawerOpen(true)}
              className="bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs hover:bg-[var(--color-neutral)] transition-all"
            >
              <ListFilter className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
              <span>{t('billing.validation.invoiceList')}</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.BILLING_VALIDATION_LIST)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> {t('billing.validation.backToList')}
            </Button>
          </div>
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
                {data.customer?.fdBroker === 1 && (
                  <Badge variant="warning" className="text-[10px] px-1.5 py-0 font-bold bg-amber-500/15 text-amber-700 border-amber-500/30">
                    BROKER
                  </Badge>
                )}
              </div>
              {data.customer?.fdSalesNM && (
                <p className="mt-1 text-xs text-[var(--color-secondary)] leading-snug font-medium">
                  {t('billing.validation.salesLabel')} <span className="font-semibold text-[var(--color-primary)]">{data.customer.fdSalesNM.trim()}</span>
                </p>
              )}
              {data.customer?.fdBillAddr1 && data.customer.fdBillAddr1.trim() !== '0' && (
                <p className="mt-1 text-xs text-[var(--color-secondary)] leading-snug">{data.customer.fdBillAddr1}</p>
              )}
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

          {/* Kartu Validasi Billing M3 */}
          {primaryListCode && (
            <BillingValidationCard
              listCode={primaryListCode}
              billedM3={billedM3}
              invoiceDetails={details}
              billFdTypeComodity={data.fdTypeComodity}
            />
          )}

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
                            <span>
                              {formatQtyDecimal(row.fdQty, row.fdListCode, row.fdItemName)}
                              {row.fdListCode ? ` ${row.fdListCode.trim()}` : ''}
                            </span>
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
                {Object.entries(unitTotals).map(([unit, qty]) => (
                  <div key={unit} className="flex items-center justify-between gap-3">
                    <span className="text-[11px] sm:text-xs font-[var(--font-label)] uppercase tracking-wider text-[var(--color-secondary)]">
                      {t('billing.detail.total')} {unit}
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-[var(--color-primary)] tabular-nums">
                      {formatQtyDecimal(qty, unit)} {unit}
                    </span>
                  </div>
                ))}
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

      {/* Floating Action Button (hanya icon, sticky di tengah kanan layar) */}
      {createPortal(
        <button
          onClick={() => setIsListDrawerOpen(true)}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-3.5 rounded-full bg-[var(--color-primary)] text-white shadow-2xl hover:opacity-90 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center border-2 border-white dark:border-slate-800"
          title={`${t('billing.validation.selectInvoiceTitle')} (Ctrl + F)`}
        >
          <ListFilter className="w-5 h-5 text-white transition-transform" />
        </button>,
        document.body
      )}

      <ValidationListDrawer
        isOpen={isListDrawerOpen}
        onClose={() => setIsListDrawerOpen(false)}
        currentInvNo={data.fdInvNo}
        onSelectInvoice={(invNo) => navigate(ROUTES.BILLING_VALIDATION_DETAIL(invNo))}
      />
    </div>
  )
}
