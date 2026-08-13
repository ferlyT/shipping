import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { ChevronRight, SlidersHorizontal, Plane, Ship, ShieldCheck, LayoutGrid, User } from 'lucide-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { billingApi } from '../services/billing.service'
import { useDebounce } from '@/hooks/useDebounce'
import { Table } from '@/components/ui/Table'
import { SearchBar } from '@/components/ui/SearchBar'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatWithCurrency } from '@/components/ui/CurrencyValue'
import { BillingStatusTag } from '../components/BillingStatusTag'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { statusConfig } from '@/features/customers/components/CustomerBadges'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { useToastStore } from '@/stores/toastStore'

interface Billing {
  fdInvNo: string
  fdInvDate: string
  fdListType: number | null
  fdCustCode: string | null
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdDescr: string
  fdJumlah1: number | null
  fdJumlah2?: number | null
  fdCurr1: string | null
  fdTypeBilling: number | null
  fdGive: number | null
  fdGive2: number | null
  fdCekDate: string | null
  customer?: { fdCustName: string | null; fdBlocked?: number | null } | null
  employee?: { fdEmpName: string | null } | null
}

const LIST_TYPE_FILTERS: { value: 'all' | 1 | 2; label: string; icon: typeof LayoutGrid; accent: string }[] = [
  { value: 'all', label: 'Semua', icon: LayoutGrid, accent: '' },
  { value: 1, label: 'Udara', icon: Plane, accent: 'text-amber-600' },
  { value: 2, label: 'Laut', icon: Ship, accent: 'text-blue-600' },
]

function getAgingDays(invDateStr?: string | null): number {
  if (!invDateStr) return 0
  const invDate = new Date(invDateStr)
  if (isNaN(invDate.getTime())) return 0
  const today = new Date()
  invDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diffTime = today.getTime() - invDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

function renderAgingBadge(days: number) {
  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium'
  if (days > 60) {
    badgeClass = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800 font-bold'
  } else if (days > 30) {
    badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 font-semibold'
  } else if (days > 14) {
    badgeClass = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-medium'
  } else {
    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
  }

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border whitespace-nowrap ${badgeClass}`}>
      {days} hr
    </span>
  )
}

export function ValidationListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useToastStore()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  const [showMobilePanel, setShowMobilePanel] = useState(false)
  const [listTypeFilter, setListTypeFilter] = useState<'all' | 1 | 2>('all')
  const [authorFilter, setAuthorFilter] = useState<string>('all')

  const { data: listRes, isLoading: isListLoading, isFetching, error } = useQuery({
    queryKey: ['billingValidationList', debouncedSearch],
    queryFn: async () => {
      const res = await billingApi.list({
        hasAmount: 'true',
        draftOnly: 'true',
        noPagination: 'true',
        minYear: '2023',
        ...(debouncedSearch && { search: debouncedSearch }),
      })
      return res.data
    },
    placeholderData: keepPreviousData,
    staleTime: 60000,
  })

  useEffect(() => {
    if (error) {
      const message = error instanceof AxiosError ? error.response?.data?.error : undefined
      addToast({
        type: 'error',
        message: message || 'Gagal memuat data validasi billing',
      })
    }
  }, [error])

  const billingsData = listRes?.data || []

  // 1. Strict Filter: Ignore 0 amount, non-draft bills, AND bills with fdInvDate <= 2022 (> 2022 only)
  const activeDraftBillings = useMemo(() => {
    return billingsData.filter((b: Billing) => {
      if (b.fdInvDate) {
        const year = new Date(b.fdInvDate).getFullYear()
        if (!isNaN(year) && year <= 2022) return false
      }

      const amt1 = Number(b.fdJumlah1 || 0)
      const amt2 = Number(b.fdJumlah2 || 0)
      if (amt1 <= 0 && amt2 <= 0) return false

      const isDraft = (b.fdGive2 ?? 0) !== 1 && (b.fdGive ?? 0) !== 1 && !b.fdCekDate
      return isDraft
    })
  }, [billingsData])

  // 2. Extract available Author / Created By pills
  const availableAuthors = useMemo(() => {
    const map = new Map<string, number>()
    activeDraftBillings.forEach((b: Billing) => {
      const author = b.employee?.fdEmpName?.trim() || 'UNASSIGNED'
      map.set(author, (map.get(author) || 0) + 1)
    })
    return Array.from(map.entries()).map(([author, count]) => ({ author, count }))
  }, [activeDraftBillings])

  // 3. Final Filtered Billings (applied listType + author filter, sorted by oldest invoice date first)
  const filteredBillings = useMemo(() => {
    const list = activeDraftBillings.filter((b: Billing) => {
      if (listTypeFilter !== 'all' && Number(b.fdListType) !== Number(listTypeFilter)) {
        return false
      }
      if (authorFilter !== 'all') {
        const author = b.employee?.fdEmpName?.trim() || 'UNASSIGNED'
        if (author !== authorFilter) return false
      }
      return true
    })

    return list.sort((a: Billing, b: Billing) => {
      const timeA = a.fdInvDate ? new Date(a.fdInvDate).getTime() : 0
      const timeB = b.fdInvDate ? new Date(b.fdInvDate).getTime() : 0
      return timeA - timeB
    })
  }, [activeDraftBillings, listTypeFilter, authorFilter])

  const isInitialLoading = isListLoading && billingsData.length === 0
  const isRefreshing = (isListLoading || isFetching) && billingsData.length > 0

  if (isInitialLoading) return <LoadingSpinner message={t('common.loadingBilling')} />

  const columns = [
    {
      key: 'fdInvNo',
      header: t('billing.invNo'),
      className: 'w-[14%]',
      render: (row: Billing) => (
        <div className="py-0.5">
          <div className="font-semibold text-[var(--color-primary)] font-[var(--font-body)] leading-snug">
            {row.fdInvNo}
          </div>
          <div className="text-[11px] text-[var(--color-secondary)] font-normal">
            {formatDate(row.fdInvDate)}
          </div>
        </div>
      ),
    },
    {
      key: 'aging',
      header: 'Aging',
      className: 'w-[9%]',
      render: (row: Billing) => {
        const days = getAgingDays(row.fdInvDate)
        return (
          <div className="py-0.5">
            {renderAgingBadge(days)}
          </div>
        )
      },
    },
    {
      key: 'customer',
      header: t('billing.customer'),
      className: 'w-[25%]',
      render: (row: Billing) => {
        const custName = row.customer?.fdCustName || row.fdCustCode || '—'
        const custStatus = row.customer?.fdBlocked ?? 0
        const badgeCfg = statusConfig[custStatus as keyof typeof statusConfig] || statusConfig[0]

        return (
          <div className="py-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[var(--color-primary)] leading-snug">{custName}</span>
              {row.customer && (
                <Badge variant={badgeCfg.badgeVariant} className="text-[10px] px-1.5 py-0">
                  {badgeCfg.label}
                </Badge>
              )}
            </div>
            {row.fdCustCode && (
              <div className="text-[11px] text-[var(--color-secondary)] font-normal">{row.fdCustCode}</div>
            )}
          </div>
        )
      },
    },
    {
      key: 'fdMarkingCode',
      header: t('billing.marking'),
      className: 'w-[15%]',
      render: (row: Billing) => (
        <div className="py-0.5 text-xs text-[var(--color-primary)] font-medium">
          {row.fdMarkingCode || '—'}
          {row.fdMarkingNo && <span className="text-[var(--color-secondary)] font-normal"> ({row.fdMarkingNo})</span>}
        </div>
      ),
    },
    {
      key: 'fdJumlah1',
      header: t('billing.amount'),
      className: 'w-[15%]',
      render: (row: Billing) => (
        <div className="py-0.5 font-bold text-[var(--color-tertiary)] tabular-nums">
          {Number(row.fdJumlah2 || 0) > 0 ? (
            formatWithCurrency(row.fdJumlah2, row.fdCurr1)
          ) : (
            formatWithCurrency(row.fdJumlah1, 'Rp.')
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status Invoice',
      className: 'w-[12%]',
      render: (row: Billing) => (
        <BillingStatusTag row={row} />
      ),
    },
    {
      key: 'createdBy',
      header: t('billing.author'),
      className: 'w-[10%]',
      render: (row: Billing) => (
        <div className="py-0.5 text-xs text-[var(--color-secondary)] font-medium uppercase">
          {row.employee?.fdEmpName || '—'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'w-[8%]',
      render: (row: Billing) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(ROUTES.BILLING_VALIDATION_DETAIL(row.fdInvNo))
          }}
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Validasi</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ]

  return (
    <div className="p-3 sm:p-6 lg:p-8 w-full space-y-4 sm:space-y-6 animate-fadeIn pb-24 font-[var(--font-body)]">
      <PageHeader
        title={t('nav.validationList')}
        subtitle={t('billing.validationList.subtitle')}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.billing'), path: ROUTES.BILLING_LIST },
          { label: t('nav.validationList') },
        ]}
      />

      <div className="flex flex-col gap-3">
        {/* Desktop / tablet toolbar */}
        <div className="hidden sm:flex sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-80">
              <SearchBar
                value={search}
                onChange={(val) => {
                  setSearch(val)
                }}
                placeholder={t('billing.searchPlaceholder')}
              />
            </div>
            {debouncedSearch && (
              <span className="text-xs text-[var(--color-secondary)] whitespace-nowrap">
                {filteredBillings.length} {t('billing.found')}
              </span>
            )}
          </div>

          {/* Mode Tipe Filter (Udara / Laut) */}
          <div className="flex items-center gap-1.5 bg-[var(--color-surface)] p-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm">
            {LIST_TYPE_FILTERS.map((tf) => {
              const Icon = tf.icon
              const isActive = listTypeFilter === tf.value
              return (
                <button
                  key={String(tf.value)}
                  onClick={() => {
                    setListTypeFilter(tf.value)
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold font-[var(--font-label)] transition-all ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tf.accent}`} />
                  <span>{tf.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Group Pills by Created By (Author Filter) */}
        {availableAuthors.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
            <span className="text-xs font-bold font-[var(--font-label)] uppercase tracking-wider text-[var(--color-secondary)] shrink-0 mr-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Created By:
            </span>

            <button
              onClick={() => {
                setAuthorFilter('all')
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold font-[var(--font-label)] transition-all whitespace-nowrap ${
                authorFilter === 'all'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
              }`}
            >
              Semua ({activeDraftBillings.length})
            </button>

            {availableAuthors.map(({ author, count }) => {
              const isActive = authorFilter === author
              return (
                <button
                  key={author}
                  onClick={() => {
                    setAuthorFilter(author)
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold font-[var(--font-label)] transition-all whitespace-nowrap flex items-center gap-1 ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
                  }`}
                >
                  <span>{author}</span>
                  <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-[var(--color-secondary)]'}`}>
                    ({count})
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Mobile Filter Button */}
        <div className="sm:hidden flex items-center justify-between gap-2">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val)
              }}
              placeholder={t('billing.searchPlaceholderMobile')}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowMobilePanel(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold font-[var(--font-label)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm active:scale-95 transition-all shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
            <span>{t('common.filter')}</span>
          </button>
        </div>
      </div>

      {/* Progress bar during refresh */}
      {isRefreshing && (
        <div className="w-full bg-blue-100 h-1 overflow-hidden rounded-full animate-pulse">
          <div className="bg-[var(--color-primary)] h-full w-1/3 animate-bounce" />
        </div>
      )}

      {/* Mobile Drawer */}
      {showMobilePanel && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 sm:hidden">
          <div className="bg-[var(--color-surface)] rounded-t-2xl p-4 space-y-4 animate-slideUp">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-sm font-bold font-[var(--font-label)] uppercase text-[var(--color-primary)]">
                {t('common.filter')}
              </h3>
              <button
                onClick={() => setShowMobilePanel(false)}
                className="text-xs font-semibold text-[var(--color-secondary)]"
              >
                {t('common.close')}
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--color-secondary)] uppercase">
                {t('billing.filterMode')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LIST_TYPE_FILTERS.map((tf) => (
                  <button
                    key={String(tf.value)}
                    onClick={() => {
                      setListTypeFilter(tf.value)
                      setShowMobilePanel(false)
                    }}
                    className={`py-2 px-3 rounded-[var(--radius-md)] text-xs font-semibold border ${
                      listTypeFilter === tf.value
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--color-surface)] text-[var(--color-secondary)] border-[var(--color-border)]'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Desktop (Single Table) */}
      <div className="hidden sm:block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-sm overflow-hidden">
        <Table<Billing>
          columns={columns}
          data={filteredBillings}
          keyExtractor={(row) => row.fdInvNo}
          onRowClick={(row) => navigate(ROUTES.BILLING_VALIDATION_DETAIL(row.fdInvNo))}
          emptyMessage={t('billing.noBillingData')}
        />
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden space-y-2.5">
        {filteredBillings.length > 0 ? (
          filteredBillings.map((b: Billing) => {
            const custName = b.customer?.fdCustName || b.fdCustCode || '—'
            const custStatus = b.customer?.fdBlocked ?? 0
            const badgeCfg = statusConfig[custStatus as keyof typeof statusConfig] || statusConfig[0]

            return (
              <div
                key={b.fdInvNo}
                onClick={() => navigate(ROUTES.BILLING_VALIDATION_DETAIL(b.fdInvNo))}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-3.5 shadow-sm active:bg-[var(--color-neutral)] transition-colors cursor-pointer space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold font-[var(--font-label)] text-[var(--color-primary)]">
                      {b.fdInvNo}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-[var(--color-secondary)]">{formatDate(b.fdInvDate)}</span>
                      {renderAgingBadge(getAgingDays(b.fdInvDate))}
                    </div>
                  </div>
                  <BillingStatusTag row={b} />
                </div>

                <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0 pr-2">
                    <span className="font-semibold text-[var(--color-primary)] truncate">{custName}</span>
                    {b.customer && (
                      <Badge variant={badgeCfg.badgeVariant} className="text-[10px] px-1.5 py-0 shrink-0">
                        {badgeCfg.label}
                      </Badge>
                    )}
                  </div>
                  <span className="font-bold text-[var(--color-tertiary)] tabular-nums shrink-0">
                    {Number(b.fdJumlah2 || 0) > 0 ? (
                      formatWithCurrency(b.fdJumlah2, b.fdCurr1)
                    ) : (
                      formatWithCurrency(b.fdJumlah1, 'Rp.')
                    )}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-8 text-center text-xs text-[var(--color-secondary)]">
            {t('billing.noBillingData')}
          </div>
        )}
      </div>

    </div>
  )
}
