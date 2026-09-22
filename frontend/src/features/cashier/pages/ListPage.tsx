import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { useDebounce } from '@/hooks/useDebounce'
import { cashierApi } from '../services/cashier.service'
import { CashierKpiCards } from '../components/CashierKpiCards'
import { CashierToolbar } from '../components/CashierToolbar'
import { CashierTable } from '../components/CashierTable'
import { CashierListSkeleton } from '../components/CashierSkeleton'
import { CashierHeaderModal } from '../components/CashierHeaderModal'
import { TempCashierModal } from '../components/TempCashierModal'
import { AttachTempReceiptModal } from '../components/AttachTempReceiptModal'
import type { CashierItem, CashierStatsResponse } from '../types/cashier.types'

export function ListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // State mode (Resmi vs Sementara)
  const [mode, setMode] = useState<'OFFICIAL' | 'TEMPORARY'>('OFFICIAL')

  // Filter states
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Pagination states
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Data states
  const [items, setItems] = useState<CashierItem[]>([])
  const [stats, setStats] = useState<CashierStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Modal states
  const [isNewOfficialOpen, setIsNewOfficialOpen] = useState(false)
  const [isNewTempOpen, setIsNewTempOpen] = useState(false)
  const [attachTarget, setAttachTarget] = useState<CashierItem | null>(null)

  // Fetch KPI Stats
  const fetchStats = useCallback(() => {
    cashierApi
      .getStats(startDate || undefined, endDate || undefined)
      .then((res: any) => {
        const d = res.data?.data ?? res.data
        setStats(d || null)
      })
      .catch(() => {})
  }, [startDate, endDate])

  // Fetch List Data
  const fetchData = useCallback(
    async (isInitial = false) => {
      if (isInitial) setIsLoading(true)
      else setIsRefreshing(true)

      try {
        const params: Record<string, any> = {
          page,
          limit,
          search: debouncedSearch || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }

        if (mode === 'OFFICIAL') {
          if (statusFilter !== 'all') params.postStatus = statusFilter
          const res: any = await cashierApi.getOfficialCashiers(params)
          const raw = res.data
          const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []
          const meta = raw?.meta || {}
          setItems(list)
          setTotal(meta.total || list.length)
          setTotalPages(meta.totalPages || 1)
        } else {
          if (statusFilter !== 'all') params.isAttached = statusFilter
          const res: any = await cashierApi.getTempCashiers(params)
          const raw = res.data
          const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []
          const meta = raw?.meta || {}
          setItems(list)
          setTotal(meta.total || list.length)
          setTotalPages(meta.totalPages || 1)
        }
      } catch (err) {
        console.error(err)
        setItems([])
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [mode, page, limit, debouncedSearch, startDate, endDate, statusFilter]
  )

  // Initial load & mode change
  useEffect(() => {
    setPage(1)
    fetchData(true)
  }, [mode, debouncedSearch, startDate, endDate, statusFilter])

  // Subsequent page changes
  useEffect(() => {
    fetchData(false)
  }, [page])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleCreated = (id: string) => {
    fetchData(false)
    fetchStats()
    navigate(ROUTES.CASHIER_DETAIL(id))
  }

  if (isLoading && items.length === 0) {
    return <CashierListSkeleton />
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-4 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* 3-Level Breadcrumbs Standard ERP */}
      <PageHeader
        title={t('cashier.title')}
        subtitle={t('cashier.subtitle')}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.cashier') },
          { label: t('nav.cashierList') },
        ]}
      />

      {/* KPI Cards */}
      <CashierKpiCards stats={stats} isLoading={isLoading} />

      {/* Toolbar & Filter Bar */}
      <CashierToolbar
        mode={mode}
        onModeChange={(newMode) => {
          setMode(newMode)
          setStatusFilter('all')
        }}
        search={search}
        onSearchChange={setSearch}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onNewOfficial={() => setIsNewOfficialOpen(true)}
        onNewTemp={() => setIsNewTempOpen(true)}
        isRefreshing={isRefreshing}
      />

      {/* Table Data */}
      <CashierTable
        mode={mode}
        items={items}
        isLoading={isRefreshing}
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={limit}
        onPageChange={setPage}
        onAttachClick={(item) => setAttachTarget(item)}
      />

      {/* Modal Dialogs */}
      <CashierHeaderModal
        isOpen={isNewOfficialOpen}
        onClose={() => setIsNewOfficialOpen(false)}
        onSuccess={handleCreated}
      />

      <TempCashierModal
        isOpen={isNewTempOpen}
        onClose={() => setIsNewTempOpen(false)}
        onSuccess={handleCreated}
      />

      <AttachTempReceiptModal
        isOpen={!!attachTarget}
        tempReceipt={attachTarget}
        onClose={() => setAttachTarget(null)}
        onSuccess={handleCreated}
      />
    </div>
  )
}
