import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { ChevronRight, Plane, Ship, Package } from 'lucide-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { billingApi } from '../services/billing.service'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { Table } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { PageHeader } from '@/components/ui/PageHeader'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import { BillingStatusTag } from '../components/BillingStatusTag'
import { BillingFilterBar, type BillingModeFilter, type BillingStatusFilter } from '../components/BillingFilterBar'
import { BillingToolbar, type BillingSearchScope } from '../components/BillingToolbar'
import { formatDate, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { statusConfig } from '@/features/customers/components/CustomerBadges'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { useToastStore } from '@/stores/toastStore'
import type { Billing } from '../types/billing.types'

const LIST_TYPE_CONFIG: Record<number, { label: string; icon: typeof Plane; accent: string }> = {
  1: { label: 'UDARA', icon: Plane, accent: 'text-sky-600' },
  2: { label: 'LAUT', icon: Ship, accent: 'text-blue-700' },
}

export default function ListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useToastStore()

  // Search and filter state
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState<BillingSearchScope>('ALL')
  const [modeFilter, setModeFilter] = useState<BillingModeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<BillingStatusFilter>('all')
  const [customerFilter, setCustomerFilter] = useState('')
  const [markingFilter, setMarkingFilter] = useState('')
  const [jumpPage, setJumpPage] = useState('')

  const debouncedSearch = useDebounce(search, 350)
  const debouncedCustomer = useDebounce(customerFilter, 350)
  const debouncedMarking = useDebounce(markingFilter, 350)

  const { page, limit, setLimit, goToPage, reset } = usePagination(20)

  // Reset page whenever search or filter criteria change
  useEffect(() => {
    reset()
  }, [debouncedSearch, debouncedCustomer, debouncedMarking, searchField, modeFilter, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Construct combined search string
  const effectiveSearch = useMemo(() => {
    const parts: string[] = []
    if (debouncedSearch) parts.push(debouncedSearch)
    if (debouncedCustomer) parts.push(debouncedCustomer)
    if (debouncedMarking) parts.push(debouncedMarking)
    return parts.join(' ').trim()
  }, [debouncedSearch, debouncedCustomer, debouncedMarking])

  const { data: listRes, isLoading: isListLoading, isFetching, error } = useQuery({
    queryKey: ['billings', page, limit, effectiveSearch, modeFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        limit,
        ...(effectiveSearch && { search: effectiveSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      }
      const res = await billingApi.list(params)
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

  const rawData: Billing[] = listRes?.data || []
  const total = listRes?.meta?.total || 0
  const totalPages = Math.ceil(total / limit)
  const isInitialLoading = isListLoading && rawData.length === 0
  const isRefreshing = isFetching && !isListLoading

  // Client-side filtering for mode & specific status
  const filteredData = useMemo(() => {
    return rawData.filter((row: Billing) => {
      // Filter Moda
      if (modeFilter !== 'all' && row.fdListType !== modeFilter) return false

      // Filter Status
      if (statusFilter !== 'all') {
        const ps = (row.paymentStatus || '').toLowerCase()
        if (statusFilter === 'lunas' || statusFilter === 'collected') {
          if (ps !== 'lunas') return false
        } else if (statusFilter === 'partial') {
          if (ps !== 'partial') return false
        } else if (statusFilter === 'issued') {
          if (ps !== 'issued') return false
        } else if (statusFilter === 'unpaid') {
          if (ps !== 'unpaid') return false
        } else if (statusFilter === 'overdue') {
          if (ps !== 'overdue') return false
        } else if (statusFilter === 'draft') {
          if (ps !== 'draft') return false
        }
      }

      return true
    })
  }, [rawData, modeFilter, statusFilter])

  // Grouping by ListType (Udara / Laut)
  const groupedData = useMemo(() => {
    const groups = new Map<number, Billing[]>()
    filteredData.forEach((row: Billing) => {
      const type = row.fdListType ?? 0
      if (!groups.has(type)) groups.set(type, [])
      groups.get(type)!.push(row)
    })
    const order = [1, 2, ...Array.from(groups.keys()).filter((t) => t !== 1 && t !== 2)]
    return order
      .filter((type) => groups.has(type))
      .map((type) => {
        const config = LIST_TYPE_CONFIG[type]
        const rows = groups.get(type)!
        const totalAmount = rows.reduce((acc, r) => acc + (Number(r.fdJumlah1) || 0), 0)
        return {
          type,
          label: config?.label || 'Lainnya',
          icon: config?.icon || Package,
          accent: config?.accent || 'text-[var(--color-secondary)]',
          rows,
          totalAmount,
        }
      })
  }, [filteredData])

  const clearAllFilters = () => {
    setSearch('')
    setSearchField('ALL')
    setModeFilter('all')
    setStatusFilter('all')
    setCustomerFilter('')
    setMarkingFilter('')
    goToPage(1)
  }

  const columns = [
    {
      key: 'fdInvNo',
      header: t('billing.invNo') || 'No. Invoice',
      className: 'w-[13%]',
      render: (row: Billing) => (
        <span className="font-semibold text-[var(--color-primary)]">{row.fdInvNo}</span>
      ),
    },
    {
      key: 'fdInvDate',
      header: t('billing.detail.invoiceDate') || 'Tanggal Invoice',
      className: 'w-[10%]',
      render: (row: Billing) => formatDate(row.fdInvDate),
    },
    {
      key: 'fdCustCode',
      header: t('billing.customer') || 'Customer',
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
      header: t('billing.marking') || 'Marking Code',
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
      header: t('billing.amount') || 'Total Tagihan',
      className: 'w-[13%]',
      render: (row: Billing) => (
        <span className="inline-block font-semibold">
          <CurrencyValue value={row.fdJumlah1} currency={row.fdCurr1} />
        </span>
      )
    },
    {
      key: 'status',
      header: t('common.status') || 'Status',
      className: 'w-[10%]',
      render: (row: Billing) => <BillingStatusTag row={row} />,
    },
    {
      key: 'createdBy',
      header: t('billing.author') || 'Created By',
      className: 'w-[10%]',
      render: (row: Billing) => (
        <span className="text-xs text-[var(--color-secondary)] block truncate" title={row.employee?.fdEmpName || '—'}>
          {row.employee?.fdEmpName || '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col min-h-full bg-[var(--color-neutral)]">
      {/* Page Header */}
      <div className="px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6 pb-3 sm:pb-4">
        <PageHeader
          title={t('billing.listTitle')}
          subtitle={t('billing.listSubtitle')}
          breadcrumbs={[
            { label: t('module.finance'), path: ROUTES.BILLING },
            { label: t('nav.billing'), path: ROUTES.BILLING },
            { label: t('nav.billingList') },
          ]}
          className="!pb-0 !border-b-0 !mb-0"
        />
      </div>

      {/* Unified Container */}
      <div className="flex-1 flex flex-col px-3 sm:px-4 lg:px-6 pb-4 sm:pb-6 min-h-0">
        <div className="flex-1 flex flex-col bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden min-h-0">
          
          {/* Filter Bar */}
          <BillingFilterBar
            modeFilter={modeFilter}
            statusFilter={statusFilter}
            customerFilter={customerFilter}
            markingFilter={markingFilter}
            isFetching={isFetching}
            onModeChange={(v) => { setModeFilter(v); goToPage(1) }}
            onStatusChange={(v) => { setStatusFilter(v); goToPage(1) }}
            onCustomerChange={(v) => { setCustomerFilter(v); goToPage(1) }}
            onMarkingChange={(v) => { setMarkingFilter(v); goToPage(1) }}
            onClearAll={clearAllFilters}
          />

          {/* Toolbar */}
          <div className="border-t border-[var(--color-border)]">
            <BillingToolbar
              search={search}
              onSearchChange={setSearch}
              searchField={searchField}
              onSearchFieldChange={(f) => { setSearchField(f); goToPage(1) }}
              limit={limit}
              onLimitChange={setLimit}
              onPageReset={() => goToPage(1)}
              displayCount={filteredData.length}
              total={total}
            />
          </div>

          {/* Data Area - Desktop Table */}
          <div className="hidden sm:flex flex-1 min-h-0 flex-col overflow-auto bg-[var(--color-surface)]">
            {isInitialLoading || isRefreshing ? (
              <Table
                columns={columns}
                data={[]}
                keyExtractor={(row) => row.fdInvNo}
                isLoading={true}
              />
            ) : filteredData.length === 0 ? (
              <Table
                columns={columns}
                data={[]}
                keyExtractor={(row) => row.fdInvNo}
                isLoading={false}
                onRowClick={(row) => navigate(ROUTES.BILLING_DETAIL(row.fdInvNo))}
                emptyMessage={t('common.noData')}
                getRowClassName={() => 'bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/40 border-l-4 border-l-transparent hover:border-l-[var(--color-tertiary)]'}
              />
            ) : (
              <Table
                columns={columns}
                data={filteredData}
                keyExtractor={(row) => row.fdInvNo}
                isLoading={false}
                onRowClick={(row) => navigate(ROUTES.BILLING_DETAIL(row.fdInvNo))}
                emptyMessage={t('common.noData')}
                getRowClassName={() => 'bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/40 border-l-4 border-l-transparent hover:border-l-[var(--color-tertiary)]'}
              />
            )}
          </div>

          {/* Mobile Short List */}
          <div className="flex sm:hidden flex-1 min-h-0 flex-col overflow-auto bg-[var(--color-surface)]">
            {filteredData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 text-sm text-[var(--color-secondary)] text-center">
                {t('common.noData')}
              </div>
            ) : (
              groupedData.map(({ type, label, icon: Icon, accent, rows, totalAmount }) => (
                <div key={type} className="flex flex-col">
                  {/* Group Header Banner */}
                  <div className="sticky top-0 z-10 flex items-center justify-between px-3.5 py-2 bg-[var(--color-neutral)]/95 backdrop-blur-sm border-y border-[var(--color-border)] shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn("p-1 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] shrink-0", accent)}>
                        <Icon size={13} />
                      </div>
                      <span className="text-xs font-bold font-[var(--font-display)] text-[var(--color-primary)] tracking-wide uppercase truncate">
                        {label}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] shrink-0">
                        {rows.length}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[var(--color-primary)] tabular-nums shrink-0 ml-2">
                      <CurrencyValue value={totalAmount} currency={rows[0]?.fdCurr1 || 'Rp.'} />
                    </span>
                  </div>

                  {/* Group Items */}
                  <div className="divide-y divide-[var(--color-border)]/70">
                    {rows.map((row) => (
                      <button
                        key={row.fdInvNo}
                        onClick={() => navigate(ROUTES.BILLING_DETAIL(row.fdInvNo))}
                        className="w-full text-left px-3.5 py-3 flex flex-col gap-1.5 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/40 active:bg-[var(--color-neutral)]/60 transition-colors cursor-pointer"
                      >
                        {/* Line 1: Invoice No + Date + Status */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-[var(--color-primary)] text-sm font-mono tracking-tight truncate">
                              {row.fdInvNo}
                            </span>
                            <BillingStatusTag row={row} />
                          </div>
                          <span className="text-[11px] text-[var(--color-secondary)] flex-shrink-0 tabular-nums">
                            {formatDate(row.fdInvDate)}
                          </span>
                        </div>

                        {/* Line 2: Customer name + Badge */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-medium text-[var(--color-primary)] truncate">
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

                        {/* Line 3: Marking Chip + Total Amount + Arrow */}
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          {row.fdMarkingCode ? (
                            <span className="inline-flex items-center max-w-[55%] px-2 py-0.5 rounded-md bg-[var(--color-neutral)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-primary)] truncate">
                              {row.fdMarkingCode}{row.fdMarkingNo ? ` · #${row.fdMarkingNo}` : ''}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--color-secondary)]">Tanpa Marking</span>
                          )}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-sm font-bold text-[var(--color-primary)] tabular-nums">
                              <CurrencyValue value={row.fdJumlah1} currency={row.fdCurr1} />
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 0 && (
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
              <Pagination
                page={page}
                limit={limit}
                total={total}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
              {totalPages > 1 && (
                <div className="flex items-center gap-2 text-xs text-[var(--color-secondary)] font-medium shrink-0">
                  <span className="hidden sm:inline">Loncat ke</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpPage}
                    placeholder={String(page)}
                    onChange={(e) => setJumpPage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      goToPage(Math.min(Math.max(1, Number(jumpPage) || 1), totalPages))
                      setJumpPage('')
                    }}
                    className="w-14 text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-primary)] font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all"
                  />
                  <span className="tabular-nums">/ {totalPages.toLocaleString('en-US')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
