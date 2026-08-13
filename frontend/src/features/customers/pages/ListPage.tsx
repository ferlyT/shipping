import { useState, useEffect, useRef } from 'react'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useTranslation } from '@/hooks/useTranslation'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '../services/customers.service'
import {
  X, Building2, Search, Phone, User, Eye,
  Rows3, LayoutGrid, AlignJustify, SlidersHorizontal, ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import type { Customer } from '../types/customers.types'
import {
  statusConfig, BrokerBadge, DiscontinuedBadge,
  formatCustomerSince, formatCustomerTenure
} from '../components/CustomerBadges'

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

  const [showFilters, setShowFilters] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 640
    }
    return true
  })


  const [selectedRow, setSelectedRow] = useState<Customer | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'pengiriman' | 'penagihan' | 'alamat'>('info')

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

  const { data, isLoading } = useQuery({
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

  const { data: detailData } = useQuery({
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
      className: 'w-12 text-center text-[var(--color-secondary)]',
      render: (_: unknown, index: number) => (page - 1) * limit + index + 1
    },
    {
      key: 'fdCustName',
      header: 'Customer Name',
      sortable: true,
      className: 'w-[260px]',
      render: (row: Customer) => (
        <div className="min-w-0">
          <div className="text-[13px] font-semibold flex items-center gap-2 min-w-0">
            <span className="truncate">{row.fdCustName || '-'}</span>
            {row.fdBroker === 1 && <BrokerBadge size="sm" />}
            {row.fdDiscontinued === 1 && <DiscontinuedBadge size="sm" />}
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs text-[var(--color-secondary)] font-medium truncate">{row.fdCustCode}</span>
            {formatCustomerTenure(row.fdCreatedDate) && (
              <span
                className="shrink-0 text-[10px] text-[var(--color-muted)] bg-gray-100 px-1.5 py-0.5 rounded"
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
          <div className="font-medium truncate">{row.fdContact}</div>
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
              <Phone className="w-3 h-3 text-[var(--color-muted)] flex-shrink-0" />
              <span className="truncate">{row.fdHP}</span>
            </div>
          )}
          {row.fdTelp && (
            <div className="flex items-center gap-1.5 text-[var(--color-secondary)] min-w-0">
              <Phone className="w-3 h-3 text-[var(--color-muted)] flex-shrink-0 opacity-60" />
              <span className="truncate">{row.fdTelp}</span>
            </div>
          )}
          {!row.fdHP && !row.fdTelp && <span className="text-[var(--color-muted)]">-</span>}
        </div>
      )
    },
    {
      key: 'fdCityName',
      header: 'City',
      sortable: true,
      className: 'w-[120px]',
      render: (row: Customer) => <span className="truncate block">{row.fdCityName || '-'}</span>
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[130px]',
      render: (row: Customer) => {
        const config = statusConfig[(row.fdBlocked || 0) as keyof typeof statusConfig]
        return (
          <Badge variant={config?.badgeVariant || 'default'} className="whitespace-nowrap">
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
            className="p-1.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-black/5 rounded"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn pb-24">
      <PageHeader
        title={t('customers.title')}
        subtitle={t('customers.subtitle')}
        breadcrumbs={[
          { label: t('module.masterdata'), path: ROUTES.CUSTOMERS },
          { label: t('nav.customer') },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold shrink-0 shadow-xs transition-colors",
              showFilters
                ? "bg-white border-[var(--color-border)] text-[var(--color-primary)]"
                : "bg-red-50 border-red-200 text-red-700"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showFilters ? t('customers.hideFilters') : t('customers.showFilters')}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showFilters && "rotate-180")} />
          </button>
        }
      />

      {showFilters && (
        <Card variant="bordered" className="p-4 space-y-3">
          {/* Status Badges Filter */}
          <div className="flex flex-nowrap overflow-x-auto items-center gap-2 text-xs scrollbar-none">
            <span className="text-[var(--color-secondary)] font-semibold shrink-0">Filter Status:</span>
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
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all shrink-0 cursor-pointer",
                    isSelected
                      ? "bg-red-50 border-red-500 text-red-700 font-semibold"
                      : "bg-white border-[var(--color-border)] text-[var(--color-primary)] hover:bg-gray-50"
                  )}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${config.dotClass}`} />
                  <span>{config.label}</span>
                </button>
              )
            })}
          </div>

          {/* Broker Filter & Tab Status */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-border)]">
            {(['active', 'discontinued', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setStatusFilter(tab); goToPage(1) }}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize cursor-pointer transition-colors",
                  statusFilter === tab
                    ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                    : "bg-white border-[var(--color-border)] text-[var(--color-primary)] hover:bg-gray-50"
                )}
              >
                {tab}
              </button>
            ))}

            <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

            {([
              { key: 'broker', label: 'Broker', icon: Building2 },
              { key: 'direct', label: 'Direct Customer', icon: User },
            ] as const).map(({ key, label, icon: Icon }) => {
              const isSelected = brokerFilter === key
              return (
                <button
                  key={key}
                  onClick={() => { setBrokerFilter(isSelected ? 'all' : key); goToPage(1) }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-all",
                    isSelected
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold"
                      : "bg-white border-[var(--color-border)] text-[var(--color-primary)] hover:bg-gray-50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {/* Search & View Modes Toolbar */}
      <Card variant="bordered" className="p-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); goToPage(1); }}
              placeholder={t('customers.searchPlaceholder')}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-primary)] outline-none focus:border-[var(--color-primary)] transition-colors bg-white"
            />
            {search && (
              <button type="button" onClick={() => { setSearch(''); goToPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[var(--color-neutral)] p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={cn("p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors", viewMode === 'table' ? "bg-white shadow-xs text-[var(--color-primary)]" : "text-[var(--color-secondary)]")}
            >
              <Rows3 className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors", viewMode === 'grid' ? "bg-white shadow-xs text-[var(--color-primary)]" : "text-[var(--color-secondary)]")}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('shortlist')}
              className={cn("p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors", viewMode === 'shortlist' ? "bg-white shadow-xs text-[var(--color-primary)]" : "text-[var(--color-secondary)]")}
            >
              <AlignJustify className="w-4 h-4" />
              <span className="hidden sm:inline">Compact</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Main Content View */}
      {viewMode === 'table' && (
        <Card variant="bordered">
          <Table<Customer>
            columns={columns}
            data={customersList}
            isLoading={isLoading}
            onRowClick={(row) => setSelectedRow(row)}
            sortColumn={sortField}
            sortDirection={sortDir}
            onSort={handleSort}
            keyExtractor={(row) => row.fdCustCode}
          />
        </Card>
      )}

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customersList.map((cust) => (
            <Card
              key={cust.fdCustCode}
              variant="bordered"
              onClick={() => setSelectedRow(cust)}
              className={cn('cursor-pointer hover:shadow-md transition-all', selectedRow?.fdCustCode === cust.fdCustCode && 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]')}
            >
              <Card.Header
                title={
                  <div className="flex items-center gap-2">
                    <span className="truncate">{cust.fdCustName}</span>
                    {cust.fdBroker === 1 && <BrokerBadge size="xs" />}
                  </div>
                }
                subtitle={cust.fdCustCode}
                action={<Eye className="w-4 h-4 text-[var(--color-secondary)]" />}
              />
              <Card.Body className="p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-secondary)]">Contact Person:</span>
                  <span className="font-semibold text-[var(--color-primary)]">{cust.fdContact || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-secondary)]">Phone:</span>
                  <span className="font-mono text-[var(--color-primary)]">{cust.fdHP || cust.fdTelp || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-secondary)]">Kota:</span>
                  <span className="font-semibold text-[var(--color-primary)]">{cust.fdCityName || '-'}</span>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'shortlist' && (
        <Card variant="bordered" className="divide-y divide-[var(--color-border)]">
          {customersList.map((cust) => (
            <div
              key={cust.fdCustCode}
              onClick={() => setSelectedRow(cust)}
              className={cn('p-3.5 hover:bg-[var(--color-neutral)]/50 cursor-pointer flex items-center justify-between transition-colors', selectedRow?.fdCustCode === cust.fdCustCode && 'bg-blue-50/50')}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-semibold text-sm text-[var(--color-primary)]">
                  <span>{cust.fdCustName}</span>
                  {cust.fdBroker === 1 && <BrokerBadge size="xs" />}
                </div>
                <div className="text-xs text-[var(--color-secondary)] font-mono">
                  {cust.fdCustCode} • {cust.fdContact || 'No CP'} • {cust.fdCityName || 'No City'}
                </div>
              </div>
              <Eye className="w-4 h-4 text-[var(--color-secondary)]" />
            </div>
          ))}
        </Card>
      )}

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <Card variant="bordered" className="p-3">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}
            limit={limit}
            total={total}
          />
        </Card>
      )}

      {/* Detail Slide-over Panel */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end animate-fadeIn">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            <div>
              <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-neutral)]/40">
                <div>
                  <h3 className="font-semibold font-[var(--font-display)] text-lg text-[var(--color-primary)]">{selectedCustomer?.fdCustName}</h3>
                  <p className="text-xs text-[var(--color-secondary)] font-mono">{selectedCustomer?.fdCustCode}</p>
                </div>
                <button onClick={() => setSelectedRow(null)} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Detail Tabs */}
              <div className="flex border-b border-[var(--color-border)] px-5 bg-white text-xs font-semibold">
                {(['info', 'pengiriman', 'penagihan', 'alamat'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn('py-3 px-3 border-b-2 capitalize transition-colors', activeTab === tab ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-bold' : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[calc(100vh-180px)]">
                {activeTab === 'info' && (
                  <div className="space-y-3">
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Contact Person:</span>
                      <span className="font-semibold text-gray-900">{selectedCustomer?.fdContact || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Sales Person:</span>
                      <span className="font-semibold text-gray-900">{selectedCustomer?.fdSalesNM || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Handphone:</span>
                      <span className="font-mono text-gray-900">{selectedCustomer?.fdHP || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Telepon:</span>
                      <span className="font-mono text-gray-900">{selectedCustomer?.fdTelp || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Kota:</span>
                      <span className="font-semibold text-gray-900">{selectedCustomer?.fdCityName || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Alamat:</span>
                      <span className="font-medium text-gray-900 max-w-[220px] text-right">{selectedCustomer?.fdAddr1 || '-'}</span>
                    </div>
                  </div>
                )}

                {activeTab === 'pengiriman' && (
                  <div className="space-y-3">
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Nama Pengiriman:</span>
                      <span className="font-semibold text-gray-900">{selectedCustomer?.fdNamaPengiriman || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">HP Pengiriman:</span>
                      <span className="font-mono text-gray-900">{selectedCustomer?.fdHpPengiriman || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Kota Pengiriman:</span>
                      <span className="font-semibold text-gray-900">{selectedCustomer?.fdKotaPengiriman || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Alamat Pengiriman:</span>
                      <span className="font-medium text-gray-900 max-w-[220px] text-right">{selectedCustomer?.fdAlamatPengiriman || '-'}</span>
                    </div>
                  </div>
                )}

                {activeTab === 'penagihan' && (
                  <div className="space-y-3">
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">HP Penagihan:</span>
                      <span className="font-mono text-gray-900">{selectedCustomer?.fdHpPenagihan || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-500">Email Penagihan:</span>
                      <span className="font-mono text-gray-900">{selectedCustomer?.fdEmailPenagihan || '-'}</span>
                    </div>
                  </div>
                )}

                {activeTab === 'alamat' && (
                  <div className="space-y-3">
                    {selectedCustomer?.addresses && selectedCustomer.addresses.length > 0 ? (
                      selectedCustomer.addresses.map((addr) => (
                        <div key={addr.fdID} className="p-3 border border-gray-200 rounded-xl space-y-1">
                          <div className="font-semibold text-xs text-gray-900">{addr.fdJenis} • {addr.fdContact}</div>
                          <div className="text-gray-600">{addr.fdAddr}, {addr.fdCity}</div>
                          <div className="text-gray-400 font-mono">{addr.fdHP || addr.fdTelp}</div>
                        </div>
                      ))
                    ) : (
                      <EmptyState title="Tidak ada daftar alamat tambahan" />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/40 flex justify-end">
              <button onClick={() => setSelectedRow(null)} className="px-4 py-2 bg-white border border-gray-300 text-xs font-semibold rounded-xl hover:bg-gray-50">
                Tutup Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}