import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Layers } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { useTranslation } from '@/hooks/useTranslation'
import { useDebounce } from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { DeliveryOrderToolbar, type DeliveryViewMode } from '../components/DeliveryOrderToolbar'
import { DeliveryOrderTable } from '../components/DeliveryOrderTable'
import type { DeliveryOrder } from '../types/delivery-orders.types'

export default function DeliveryOrdersListPage() {
  const { t } = useTranslation()

  // ── State ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 350)
  const [viewMode, setViewMode] = useState<DeliveryViewMode>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'cards' : 'table'
  )

  const { page, limit, setLimit, goToPage, reset } = usePagination(20)

  // Reset to page 1 on search change
  useEffect(() => {
    reset()
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data Fetching ────────────────────────────────────────────────────────
  const {
    data: responseData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['delivery-orders-list', page, limit, debouncedSearch],
    queryFn: async () => {
      const res = await deliveryOrdersApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
      })
      return res.data
    },
  })

  // ── Derived Data ─────────────────────────────────────────────────────────
  const items: DeliveryOrder[] = responseData?.data || []
  const total = responseData?.meta?.total || 0
  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-4 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* Page Header */}
      <PageHeader
        title={t('do.listTitle') || 'Daftar Surat Jalan'}
        subtitle={t('do.listSubtitle') || 'Daftar seluruh riwayat surat jalan pengiriman barang.'}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.deliveryOrder'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.deliveryOrderList') || 'Daftar Surat Jalan' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Link to={ROUTES.DELIVERY_ORDERS}>
              <Button variant="secondary" size="sm" className="gap-1.5 cursor-pointer">
                <Layers size={14} className="text-[var(--color-tertiary)]" />
                <span>Tampilan Grouping DO</span>
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              <span>{t('common.refresh')}</span>
            </Button>
          </div>
        }
      />

      {/* Main Listing Card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden">
        {/* Toolbar */}
        <DeliveryOrderToolbar
          search={search}
          onSearchChange={setSearch}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          displayCount={items.length}
          total={total}
          limit={limit}
          onLimitChange={setLimit}
          onPageReset={() => goToPage(1)}
          isFetching={isFetching}
          isLoading={isLoading}
        />

        {/* Data Table / Cards */}
        <DeliveryOrderTable
          data={items}
          isLoading={isLoading}
          viewMode={viewMode}
          onResetFilter={() => setSearch('')}
          hasSearch={Boolean(search)}
        />

        {/* Pagination Footer */}
        {total > 0 && (
          <div className="border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface)]">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
              total={total}
              limit={limit}
            />
          </div>
        )}
      </div>
    </div>
  )
}
