import { useState, useEffect, useRef } from 'react'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useTranslation } from '@/hooks/useTranslation'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '../services/customers.service'
import {
  X, Building2, Search, Phone, User, Eye,
  Rows3, LayoutGrid, AlignJustify, SlidersHorizontal, ChevronDown,
  RotateCcw, Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import type { Customer } from '../types/customers.types'
import {
  statusConfig, BrokerBadge, DiscontinuedBadge,
  formatCustomerSince, formatCustomerTenure,
  CustomerDetailModal
} from '../components'

export default function CustomersPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'shortlist'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 'shortlist' : 'table'
    }
    return 'table'
  })
  const { page, limit, setLimit, goToPage } = usePagination(10)

  const [sortField, setSortField] = useState('fdCustName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<'active' | 'discontinued' | 'all'>('active')
  const [blockStatusFilter, setBlockStatusFilter] = useState<string | null>(null)
  const [brokerFilter, setBrokerFilter] = useState<'all' | 'broker' | 'direct'>('all')

  const [showFilters, setShowFilters] = useState(true)
  const [selectedRow, setSelectedRow] = useState<Customer | null>(null)

  const prevLimitBeforeSearch = useRef<number | null>(null)
  useEffect(() => {
    if (debouncedSearch) {
      if (prevLimitBeforeSearch.current === null) {
        prevLimitBeforeSearch.current = limit
      }
      if (limit !== 100) {
        setLimit(100)
        goToPage(1)
      }
    } else if (prevLimitBeforeSearch.current !== null) {
      setLimit(prevLimitBeforeSearch.current)
      prevLimitBeforeSearch.current = null
    }
  }, [debouncedSearch, limit, setLimit, goToPage])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['customers', page, limit, debouncedSearch, sortField, sortDir, statusFilter, blockStatusFilter, brokerFilter],
    queryFn: async () => {
      const res = await customersApi.list({
        page,
        limit,
        search: debouncedSearch,
        sortBy: sortField,
        sortDir,
        status: statusFilter,
        blockStatus: blockStatusFilter || '',
        broker: brokerFilter === 'broker' ? '1' : brokerFilter === 'direct' ? '0' : ''
      })
      return res.data as { data: Customer[]; meta: { total: number; totalPages: number } }
    }
  })

  // Customer Detail Query for full data (including addresses)
  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['customerDetail', selectedRow?.fdCustCode],
    queryFn: async () => {
      if (!selectedRow) return null
      const res = await customersApi.detail(selectedRow.fdCustCode)
      return res.data as { data: Customer }
    },
    enabled: !!selectedRow
  })

  const selectedCustomer = detailData?.data || selectedRow
  const customersList = data?.data || []
  const total = data?.meta?.total || 0
  const totalPages = data?.meta?.totalPages || 0

  const isInitialLoading = isLoading && customersList.length === 0
  const isRefreshing = isFetching && !isInitialLoading

  const hasActiveFilters = Boolean(
    blockStatusFilter !== null ||
    statusFilter !== 'active' ||
    brokerFilter !== 'all' ||
    search.trim() !== ''
  )

  const handleResetFilters = () => {
    setBlockStatusFilter(null)
    setStatusFilter('active')
    setBrokerFilter('all')
    setSearch('')
    goToPage(1)
  }

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(key)
      setSortDir('asc')
    }
  }

  const columns = [
    {
      key: 'no',
      header: 'No.',
      className: 'w-12 text-center text-[var(--color-secondary)] text-xs',
      render: (_: unknown, index: number) => (page - 1) * limit + index + 1
    },
    {
      key: 'fdCustName',
      header: 'Customer Name',
      sortable: true,
      className: 'w-[260px]',
      render: (row: Customer) => (
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-semibold flex items-center gap-2 min-w-0 text-[var(--color-primary)]">
            <span className="truncate">{row.fdCustName || '-'}</span>
            {row.fdBroker === 1 && <BrokerBadge size="sm" />}
            {row.fdDiscontinued === 1 && <DiscontinuedBadge size="sm" />}
          </div>
          <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
            <span className="text-xs text-[var(--color-secondary)] font-mono font-medium truncate">{row.fdCustCode}</span>
            {formatCustomerTenure(row.fdCreatedDate) && (
              <span
                className="shrink-0 text-[10px] text-[var(--color-secondary)] bg-[var(--color-neutral)] border border-[var(--color-border)] px-1.5 py-0.2 rounded"
                title={`Customer since ${formatCustomerSince(row.fdCreatedDate)}`}
              >
                {formatCustomerTenure(row.fdCreatedDate)}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'fdContact',
      header: 'Contact Person',
      sortable: true,
      className: 'w-[170px]',
      render: (row: Customer) => (
        <div className="min-w-0">
          <div className="font-medium text-xs sm:text-sm text-[var(--color-primary)] truncate">{row.fdContact || '-'}</div>
          <div className="text-[11px] text-[var(--color-secondary)] truncate">Sales: {row.fdSalesNM || '-'}</div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Phone',
      className: 'w-[150px]',
      render: (row: Customer) => (
        <div className="text-xs space-y-0.5 min-w-0">
          {row.fdHP && (
            <div className="flex items-center gap-1.5 text-[var(--color-primary)] font-medium min-w-0">
              <Phone className="w-3 h-3 text-[var(--color-secondary)] flex-shrink-0" />
              <span className="truncate font-mono">{row.fdHP}</span>
            </div>
          )}
          {row.fdTelp && (
            <div className="flex items-center gap-1.5 text-[var(--color-secondary)] min-w-0">
              <Phone className="w-3 h-3 text-[var(--color-secondary)] flex-shrink-0 opacity-60" />
              <span className="truncate font-mono">{row.fdTelp}</span>
            </div>
          )}
          {!row.fdHP && !row.fdTelp && <span className="text-[var(--color-secondary)]">-</span>}
        </div>
      )
    },
    {
      key: 'fdCityName',
      header: 'City',
      sortable: true,
      className: 'w-[120px]',
      render: (row: Customer) => <span className="truncate block text-xs sm:text-sm text-[var(--color-primary)]">{row.fdCityName || '-'}</span>
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[130px]',
      render: (row: Customer) => {
        const config = statusConfig[(row.fdBlocked || 0) as keyof typeof statusConfig]
        return (
          <Badge variant={config?.badgeVariant || 'default'} className="whitespace-nowrap text-[10px]">
            {config?.label || 'UNKNOWN'}
          </Badge>
        )
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[60px] text-center',
      render: (row: Customer) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedRow(row)}
            className="p-1.5 text-[var(--color-secondary)] hover:text-[var(--color-tertiary)] hover:bg-[var(--color-neutral)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
            title="Lihat Detail Customer"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  if (isInitialLoading) {
    return <LoadingSpinner message={t('common.loading') || 'Memuat data customer...'} />
  }

  return (
    <div className="flex flex-col min-h-full bg-[var(--color-neutral)]">
      {/* 1. Page Header */}
      <div className="px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6 pb-3 sm:pb-4">
        <PageHeader
          title={t('customers.title')}
          subtitle={t('customers.subtitle')}
          breadcrumbs={[
            { label: t('module.masterdata'), path: ROUTES.CUSTOMERS },
            { label: t('nav.customer') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold shrink-0 shadow-xs transition-colors cursor-pointer",
                  showFilters
                    ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)]"
                    : "bg-transparent border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{showFilters ? t('customers.hideFilters') : t('customers.showFilters')}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showFilters && "rotate-180")} />
              </button>
            </div>
          }
        />
      </div>

      {/* 2. Main Content Card Container */}
      <div className="flex-1 px-4 sm:px-5 lg:px-6 pb-4 sm:pb-6 min-h-0 flex flex-col">
        <div className="flex-1 flex flex-col bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden min-h-0">
          
          {/* Top Filter Bar */}
          {showFilters && (
            <div className="p-3.5 sm:p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shrink-0">
              {/* Row 1: Status Filter Badges */}
              <div className="flex flex-nowrap overflow-x-auto items-center gap-1.5 text-xs scrollbar-none pb-0.5">
                <span className="text-[var(--color-secondary)] font-semibold shrink-0 mr-1 flex items-center gap-1">
                  <Filter size={12} /> Status:
                </span>
                {Object.entries(statusConfig).map(([key, config]) => {
                  const isSelected = blockStatusFilter === key
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setBlockStatusFilter(isSelected ? null : key)
                        goToPage(1)
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all shrink-0 cursor-pointer",
                        isSelected
                          ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-semibold"
                          : "bg-transparent border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-border-strong)]"
                      )}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />
                      <span>{config.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Row 2: Customer Status & Broker Type */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Active / Discontinued / All */}
                  <div className="flex items-center p-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] shrink-0">
                    {(['active', 'discontinued', 'all'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => { setStatusFilter(tab); goToPage(1) }}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-semibold capitalize cursor-pointer transition-colors",
                          statusFilter === tab
                            ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs"
                            : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="w-px h-4 bg-[var(--color-border)] mx-1" />

                  {/* Broker vs Direct */}
                  {([
                    { key: 'broker', label: 'Broker', icon: Building2 },
                    { key: 'direct', label: 'Direct', icon: User },
                  ] as const).map(({ key, label, icon: Icon }) => {
                    const isSelected = brokerFilter === key
                    return (
                      <button
                        key={key}
                        onClick={() => { setBrokerFilter(isSelected ? 'all' : key); goToPage(1) }}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition-all shrink-0",
                          isSelected
                            ? "bg-transparent border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs"
                            : "bg-transparent border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Reset Filters */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] cursor-pointer transition-colors border border-dashed border-[var(--color-border)]"
                  >
                    <RotateCcw size={11} />
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Search & View Modes Toolbar */}
          <div className="px-3.5 sm:px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); goToPage(1); }}
                placeholder={t('customers.searchPlaceholder') || 'Cari customer, kode, kontak, telp, kota...'}
                className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-primary)] outline-none focus:border-[var(--color-tertiary)] transition-colors bg-[var(--color-neutral)]/60 placeholder-[var(--color-secondary)]/60"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); goToPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* View Mode Switcher & Counter */}
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              <span className="text-xs text-[var(--color-secondary)] font-medium">
                {total.toLocaleString('id-ID')} Customer
              </span>

              <div className="flex items-center gap-0.5 bg-[var(--color-neutral)] p-0.5 rounded-xl border border-[var(--color-border)]">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer",
                    viewMode === 'table'
                      ? "bg-[var(--color-surface)] shadow-xs text-[var(--color-primary)]"
                      : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  )}
                  title="Table View"
                >
                  <Rows3 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Tabel</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer",
                    viewMode === 'grid'
                      ? "bg-[var(--color-surface)] shadow-xs text-[var(--color-primary)]"
                      : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  )}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('shortlist')}
                  className={cn(
                    "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer",
                    viewMode === 'shortlist'
                      ? "bg-[var(--color-surface)] shadow-xs text-[var(--color-primary)]"
                      : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  )}
                  title="Compact View"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Kompak</span>
                </button>
              </div>
            </div>
          </div>

          {/* Progress Bar Loader for background refresh */}
          {isRefreshing && (
            <div className="relative h-0.5 w-full overflow-hidden bg-[var(--color-border)]/40 shrink-0">
              <div
                className="absolute inset-y-0 bg-[var(--color-tertiary)]"
                style={{
                  width: '35%',
                  animation: 'loaderSlide 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                }}
              />
            </div>
          )}

          {/* 3. Main Data Content Area */}
          <div className="flex-1 overflow-auto min-h-0 bg-[var(--color-surface)]">
            {customersList.length === 0 ? (
              <div className="p-12 text-center">
                <EmptyState
                  title="Tidak Ada Data Customer"
                  description={
                    hasActiveFilters
                      ? "Tidak ditemukan customer yang sesuai kriteria pencarian dan filter aktif."
                      : "Belum ada data customer terdaftar pada sistem."
                  }
                  action={
                    hasActiveFilters ? (
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
                      >
                        Reset Filter
                      </button>
                    ) : undefined
                  }
                />
              </div>
            ) : viewMode === 'table' ? (
              <Table<Customer>
                columns={columns}
                data={customersList}
                isLoading={false}
                onRowClick={(row) => setSelectedRow(row)}
                sortColumn={sortField}
                sortDirection={sortDir}
                onSort={handleSort}
                keyExtractor={(row) => row.fdCustCode}
              />
            ) : viewMode === 'grid' ? (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {customersList.map((cust) => (
                  <div
                    key={cust.fdCustCode}
                    onClick={() => setSelectedRow(cust)}
                    className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-tertiary)]/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[var(--color-primary)] truncate group-hover:text-[var(--color-tertiary)] transition-colors">
                            {cust.fdCustName || '—'}
                          </h4>
                          <span className="font-mono text-xs text-[var(--color-secondary)]">
                            {cust.fdCustCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {cust.fdBroker === 1 && <BrokerBadge size="xs" />}
                          {cust.fdDiscontinued === 1 && <DiscontinuedBadge size="xs" />}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[var(--color-border)] space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[var(--color-secondary)]">
                          <span>Kontak:</span>
                          <span className="font-semibold text-[var(--color-primary)] truncate max-w-[140px]">
                            {cust.fdContact || '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[var(--color-secondary)]">
                          <span>Telepon:</span>
                          <span className="font-mono text-[var(--color-primary)]">
                            {cust.fdHP || cust.fdTelp || '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[var(--color-secondary)]">
                          <span>Kota:</span>
                          <span className="font-semibold text-[var(--color-primary)]">
                            {cust.fdCityName || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
                      <Badge variant={statusConfig[(cust.fdBlocked || 0) as keyof typeof statusConfig]?.badgeVariant || 'default'} className="text-[9px]">
                        {statusConfig[(cust.fdBlocked || 0) as keyof typeof statusConfig]?.label || 'NO STATUS'}
                      </Badge>

                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-tertiary)]">
                        <span>Lihat Detail</span>
                        <Eye size={12} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Compact / Shortlist View */
              <div className="divide-y divide-[var(--color-border)]">
                {customersList.map((cust) => (
                  <div
                    key={cust.fdCustCode}
                    onClick={() => setSelectedRow(cust)}
                    className="p-3 sm:px-4 hover:bg-[var(--color-neutral)]/60 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-[var(--color-primary)] truncate">
                        <span className="truncate">{cust.fdCustName}</span>
                        {cust.fdBroker === 1 && <BrokerBadge size="xs" />}
                        {cust.fdDiscontinued === 1 && <DiscontinuedBadge size="xs" />}
                      </div>
                      <div className="text-xs text-[var(--color-secondary)] font-mono flex items-center gap-2 truncate">
                        <span>{cust.fdCustCode}</span>
                        <span>•</span>
                        <span className="truncate">{cust.fdContact || 'No CP'}</span>
                        <span>•</span>
                        <span>{cust.fdCityName || 'No City'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusConfig[(cust.fdBlocked || 0) as keyof typeof statusConfig]?.badgeVariant || 'default'} className="text-[9px] hidden sm:inline-flex">
                        {statusConfig[(cust.fdBlocked || 0) as keyof typeof statusConfig]?.label || 'NO STATUS'}
                      </Badge>
                      <button
                        type="button"
                        className="p-1.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Bottom Pagination Footer */}
          {totalPages > 0 && (
            <div className="border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface)] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={goToPage}
                limit={limit}
                total={total}
              />

              <div className="flex items-center gap-3 text-xs text-[var(--color-secondary)] shrink-0">
                <div className="flex items-center gap-1.5">
                  <span>Baris per hal:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value))
                      goToPage(1)
                    }}
                    className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-primary)] font-semibold outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span>Loncat:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    placeholder={String(page)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt((e.target as HTMLInputElement).value, 10)
                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                          goToPage(val)
                          ;(e.target as HTMLInputElement).value = ''
                        }
                      }
                    }}
                    className="w-12 px-1.5 py-1 text-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-primary)] outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Customer Detail Modal Popup */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isLoading={isLoadingDetail}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  )
}