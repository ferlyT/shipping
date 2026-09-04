import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Pagination } from '@/components/ui/Pagination'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useTranslation } from '@/hooks/useTranslation'
import { customersApi } from '../services/customers.service'
import { ROUTES } from '@/lib/constants'
import { useCustomerTierPermission } from '../hooks/useCustomerTierPermission'
import type { Customer, CustomerGroupKey, CustomerGroupCounts, CustomerSalesItem } from '../types/customers.types'
import {
  CustomerToolbar,
  CustomerTableView,
  CustomerTableSkeleton,
  CustomerGridView,
  CustomerMobileCard,
  CustomerDetailModal,
} from '../components'

export default function CustomersPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const statusParam = searchParams.get('status')
  const initialStatus = (statusParam === 'discontinued' ? 'discontinued' : statusParam === 'all' ? 'all' : 'active') as 'active' | 'discontinued' | 'all'
  const initialSales = searchParams.get('sales') || 'all'
  const initialGroup = (searchParams.get('group') as CustomerGroupKey) || 'all'

  const canViewTier = useCustomerTierPermission()
  const [statusFilter, setStatusFilter] = useState<'active' | 'discontinued' | 'all'>(initialStatus)
  const [activeSales, setActiveSales] = useState<string>(initialSales)
  const [activeGroup, setActiveGroup] = useState<CustomerGroupKey>(initialGroup)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)

  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'shortlist'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 'shortlist' : 'table'
    }
    return 'table'
  })
  const { page, limit, setLimit, goToPage } = usePagination(15)

  const [sortField, setSortField] = useState('fdCustName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedRow, setSelectedRow] = useState<Customer | null>(null)

  const handleStatusChange = (status: 'active' | 'discontinued' | 'all') => {
    setStatusFilter(status)
    goToPage(1)
    setSearchParams((prev) => {
      status === 'active' ? prev.delete('status') : prev.set('status', status)
      return prev
    })
  }

  const handleSalesChange = (sales: string) => {
    setActiveSales(sales)
    goToPage(1)
    setSearchParams((prev) => {
      sales === 'all' ? prev.delete('sales') : prev.set('sales', sales)
      return prev
    })
  }

  const handleGroupChange = (group: CustomerGroupKey) => {
    setActiveGroup(group)
    goToPage(1)
    setSearchParams((prev) => {
      group === 'all' ? prev.delete('group') : prev.set('group', group)
      return prev
    })
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    goToPage(1)
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['customers', page, limit, debouncedSearch, sortField, sortDir, statusFilter, activeSales, activeGroup],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await customersApi.list({
        page,
        limit,
        search: debouncedSearch,
        sortBy: sortField,
        sortDir,
        status: statusFilter,
        sales: activeSales === 'all' ? '' : activeSales,
        category: activeGroup === 'all' ? '' : activeGroup,
      })
      return res.data as {
        data: Customer[]
        meta: {
          total: number
          totalPages: number
          groupCounts?: CustomerGroupCounts
          salesList?: CustomerSalesItem[]
        }
      }
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
  const groupCounts: CustomerGroupCounts = data?.meta?.groupCounts || {
    all: total,
    broker: 0,
    direct: 0,
    cod: 0,
    warning: 0,
    blocked: 0,
    urgent: 0,
    ok: 0,
    no_status: 0,
  }
  const salesList: CustomerSalesItem[] = data?.meta?.salesList || []

  const isInitialLoading = isLoading && !data
  const isRefreshing = isFetching && !isInitialLoading

  const hasActiveFilters = Boolean(
    statusFilter !== 'active' ||
    activeSales !== 'all' ||
    activeGroup !== 'all' ||
    search.trim() !== ''
  )

  const handleResetFilters = () => {
    setStatusFilter('active')
    setActiveSales('all')
    setActiveGroup('all')
    setSearch('')
    goToPage(1)
    setSearchParams({})
  }

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="p-4 sm:p-6 w-full space-y-4 sm:space-y-5 animate-fadeIn pb-24 min-h-screen bg-[var(--color-neutral)] font-[var(--font-body)]">
      {/* 1. Page Header */}
      <PageHeader
        title={t('customers.title')}
        subtitle={t('customers.subtitle') || 'Kelola master data pelanggan, kontak operasional, sales, dan status pengiriman'}
        breadcrumbs={[
          { label: t('module.masterdata'), path: ROUTES.CUSTOMERS },
          { label: t('nav.customer') },
        ]}
      />

      {/* 2. Customer Filter & Group Toolbar Card */}
      <CustomerToolbar
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        activeSales={activeSales}
        onSalesChange={handleSalesChange}
        salesList={salesList}
        activeGroup={activeGroup}
        onGroupChange={handleGroupChange}
        groupCounts={groupCounts}
        search={search}
        onSearchChange={handleSearchChange}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={total}
        canViewTier={canViewTier}
      />

      {/* 3. Main Data Card Container */}
      <div className="flex-1 flex flex-col bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden min-h-0 relative z-10">

        {/* Data Content: Loading Skeleton vs Empty State vs Table vs Grid vs Shortlist */}
        <div className="flex-1 overflow-auto min-h-0 bg-[var(--color-surface)]">
          {isInitialLoading || isRefreshing ? (
            <CustomerTableSkeleton rows={limit} />
          ) : customersList.length === 0 ? (
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
            <CustomerTableView
              customers={customersList}
              page={page}
              limit={limit}
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              onSelectCustomer={setSelectedRow}
              canViewTier={canViewTier}
            />
          ) : viewMode === 'grid' ? (
            <CustomerGridView
              customers={customersList}
              onSelectCustomer={setSelectedRow}
              canViewTier={canViewTier}
            />
          ) : (
            /* Shortlist / Compact View */
            <div className="divide-y divide-[var(--color-border)]">
              {customersList.map((cust) => (
                <CustomerMobileCard
                  key={cust.fdCustCode}
                  cust={cust}
                  onClick={() => setSelectedRow(cust)}
                  canViewTier={canViewTier}
                />
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

      {/* 5. Customer Detail Modal Popup with Slide/Swipe Gesture */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isLoading={isLoadingDetail}
        onClose={() => setSelectedRow(null)}
        canViewTier={canViewTier}
      />
    </div>
  )
}