import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUp } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useTranslation } from '@/hooks/useTranslation'
import { customersApi } from '../services/customers.service'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
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

const BATCH_SIZE = 30

export default function CustomersPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const statusParam = searchParams.get('status')
  const initialStatus = (statusParam === 'discontinued' ? 'discontinued' : statusParam === 'all' ? 'all' : 'active') as 'active' | 'discontinued' | 'all'
  const initialSales = searchParams.get('sales') || 'all'
  const initialGroup = (searchParams.get('group') as CustomerGroupKey) || 'all'
  const initialSearch = searchParams.get('search') || searchParams.get('q') || ''

  const canViewTier = useCustomerTierPermission()
  const [statusFilter, setStatusFilter] = useState<'active' | 'discontinued' | 'all'>(initialStatus)
  const [activeSales, setActiveSales] = useState<string>(initialSales)
  const [activeGroup, setActiveGroup] = useState<CustomerGroupKey>(initialGroup)
  const [search, setSearch] = useState(initialSearch)
  const [immediateSearch, setImmediateSearch] = useState<string | null>(initialSearch ? initialSearch : null)
  const debouncedSearch = useDebounce(search, 250)

  // Use immediateSearch if triggered by Enter/suggestion, else debouncedSearch
  const activeSearch = immediateSearch !== null ? immediateSearch : debouncedSearch

  // Standard ERP Pagination
  const { page, limit, goToPage, reset: resetPagination } = usePagination(BATCH_SIZE)
  const [jumpPage, setJumpPage] = useState('')

  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'shortlist'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 'shortlist' : 'table'
    }
    return 'table'
  })

  const [sortField, setSortField] = useState('fdCustName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedRow, setSelectedRow] = useState<Customer | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  const tableContainerRef = useRef<HTMLDivElement>(null)

  const handleStatusChange = (status: 'active' | 'discontinued' | 'all') => {
    setStatusFilter(status)
    resetPagination()
    setSearchParams((prev) => {
      status === 'active' ? prev.delete('status') : prev.set('status', status)
      return prev
    })
  }

  const handleSalesChange = (sales: string) => {
    setActiveSales(sales)
    resetPagination()
    setSearchParams((prev) => {
      sales === 'all' ? prev.delete('sales') : prev.set('sales', sales)
      return prev
    })
  }

  const handleGroupChange = (group: CustomerGroupKey) => {
    setActiveGroup(group)
    resetPagination()
    setSearchParams((prev) => {
      group === 'all' ? prev.delete('group') : prev.set('group', group)
      return prev
    })
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setImmediateSearch(null)
    resetPagination()
  }

  const handleSearchSubmit = (value: string) => {
    setSearch(value)
    setImmediateSearch(value)
    resetPagination()
  }

  // Sync search state to URL search parameters with change guard
  useEffect(() => {
    const currentParam = searchParams.get('search') || searchParams.get('q') || ''
    const target = activeSearch.trim()
    if (currentParam !== target) {
      setSearchParams((prev) => {
        if (target) {
          prev.set('search', target)
        } else {
          prev.delete('search')
          prev.delete('q')
        }
        return prev
      }, { replace: true })
    }
  }, [activeSearch])

  // Track scroll position across main container and window for scroll-to-top button
  useEffect(() => {
    const mainEl = document.querySelector('main')
    const handleScroll = () => {
      const top = mainEl?.scrollTop || window.scrollY || 0
      setShowScrollTop(top > 400)
    }
    mainEl?.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      mainEl?.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const scrollToTop = () => {
    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' })
    }
    tableContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Standard Paginated Query for Customers List
  const {
    data: resData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['customers', page, limit, activeSearch, sortField, sortDir, statusFilter, activeSales, activeGroup],
    queryFn: async () => {
      const res = await customersApi.list({
        page,
        limit,
        search: activeSearch,
        sortBy: sortField,
        sortDir,
        status: statusFilter,
        sales: activeSales === 'all' ? '' : activeSales,
        category: activeGroup === 'all' ? '' : activeGroup,
      })
      return res.data as {
        data: Customer[]
        meta: {
          page: number
          limit: number
          total: number
          totalPages: number
          groupCounts?: CustomerGroupCounts
          salesList?: CustomerSalesItem[]
        }
      }
    },
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
  const customersList = resData?.data || []
  const meta = resData?.meta
  const total = meta?.total || 0
  const totalPages = meta?.totalPages || 0
  const groupCounts: CustomerGroupCounts = meta?.groupCounts || {
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
  const salesList: CustomerSalesItem[] = meta?.salesList || []

  const isInitialLoading = isLoading && !resData
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
    setImmediateSearch('')
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
        onSearchSubmit={handleSearchSubmit}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={total}
        canViewTier={canViewTier}
      />

      {/* 3. Main Data Card Container */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden relative z-10">

        {/* Data Content: Loading Skeleton vs Empty State vs Table vs Grid vs Shortlist */}
        <div
          ref={tableContainerRef}
          className={cn("bg-[var(--color-surface)] transition-opacity", isRefreshing && "opacity-60")}
        >
          {isInitialLoading ? (
            <CustomerTableSkeleton rows={15} />
          ) : customersList.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                title="Tidak Ada Data Customer"
                description={
                  hasActiveFilters
                    ? (search.trim()
                        ? `Tidak ditemukan customer dengan kata kunci "${search.trim()}". Coba periksa ejaan atau gunakan kata kunci lain.`
                        : "Tidak ditemukan customer yang sesuai kriteria pencarian dan filter aktif.")
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
          ) : (
            <>
              {viewMode === 'table' ? (
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
            </>
          )}
        </div>

        {/* 4. Bottom Pagination & ERP Jump Bar */}
        {!isLoading && totalPages > 0 && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
            <Pagination
              page={page}
              limit={limit}
              total={total}
              totalPages={totalPages}
              onPageChange={(p) => {
                goToPage(p)
                scrollToTop()
              }}
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
                    const target = Math.min(Math.max(1, Number(jumpPage) || 1), totalPages)
                    goToPage(target)
                    setJumpPage('')
                    scrollToTop()
                  }}
                  className="w-14 text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-primary)] font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all"
                />
                <span className="tabular-nums">/ {totalPages.toLocaleString('id-ID')}</span>
              </div>
            )}
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

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full shadow-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-all cursor-pointer flex items-center justify-center animate-fadeIn"
          title="Kembali ke atas"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}