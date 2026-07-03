import { useState, useEffect } from 'react'
import { shipmentsApi } from '@/api/endpoints'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useQuery } from '@tanstack/react-query'
import { Table } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { SearchBar } from '@/components/ui/SearchBar'
import { Package, Weight, Box, X, Info, Layers, Receipt } from 'lucide-react'
import { cn, formatDate, formatNumber } from '@/lib/utils'

interface ShipmentDimension {
  fdListCode: string
  fdListDCode: string
  fdDescr: string | null
  fdPjg: number | null
  fdLbr: number | null
  fdTng: number | null
  fdQty: number | null
}

interface Shipment {
  fdListCode: string
  fdCustName: string | null
  fdTerima: string | null
  fdTglAgent: string | null
  fdMarkingCode: string | null
  fdDesc: string | null
  fdComodity: string | null
  fdJmlPack: number | null
  fdJmlBerat: number | null
  fdM3: number | null
}

export default function ShipmentsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  
  const { page, limit, setLimit, goToPage, reset } = usePagination(20)
  const [jumpPage, setJumpPage] = useState('')

  const [selectedRow, setSelectedRow] = useState<Shipment | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'dimensi'>('info')
  const [listTypeFilter, setListTypeFilter] = useState<'ALL' | '1' | '2'>('ALL')

  const { data: shipmentsData, isLoading } = useQuery({
    queryKey: ['shipments', page, limit, debouncedSearch, listTypeFilter],
    queryFn: async () => {
      const res = await shipmentsApi.list({
        page,
        limit,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(listTypeFilter !== 'ALL' && { listType: listTypeFilter }),
      })
      return res.data
    }
  })

  const { data: kpiData, isLoading: isLoadingKpi } = useQuery({
    queryKey: ['shipmentsKpi', debouncedSearch, listTypeFilter],
    queryFn: async () => {
      const res = await shipmentsApi.getKPIs({ 
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(listTypeFilter !== 'ALL' && { listType: listTypeFilter })
      })
      return res.data as { data: { totalResi: number, totalPackages: number, totalBerat: number, totalVolume: number } }
    }
  })

  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['shipmentDetail', selectedRow?.fdListCode],
    queryFn: async () => {
      if (!selectedRow) return null
      const res = await shipmentsApi.detail(selectedRow.fdListCode)
      return res.data as { data: Shipment }
    },
    enabled: !!selectedRow
  })

  const { data: dimensionsData, isLoading: isLoadingDimensions } = useQuery({
    queryKey: ['shipmentDimensions', selectedRow?.fdListCode],
    queryFn: async () => {
      if (!selectedRow) return []
      const res = await shipmentsApi.dimensions(selectedRow.fdListCode)
      return (res.data.data || []) as ShipmentDimension[]
    },
    enabled: !!selectedRow
  })

  const dataList = shipmentsData?.data || []
  const total = shipmentsData?.meta?.total || 0
  const kpis = kpiData?.data
  const selectedShipment = detailData?.data || selectedRow
  const dimensions = dimensionsData || []

  useEffect(() => {
    reset()
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    { key: 'fdListCode', header: 'List Code' },
    { key: 'fdCustName', header: 'Customer' },
    { key: 'fdMarkingCode', header: 'Marking' },
    { key: 'fdDesc', header: 'Deskripsi' },
    { 
      key: 'fdJmlPack', 
      header: 'Pack',
      render: (row: Shipment) => Number(row.fdJmlPack || 0).toLocaleString('id-ID')
    },
    { 
      key: 'fdJmlBerat', 
      header: 'Berat (kg)',
      render: (row: Shipment) => Number(row.fdJmlBerat || 0).toLocaleString('id-ID')
    },
    { 
      key: 'fdM3', 
      header: 'Volume (m3)',
      render: (row: Shipment) => Number(row.fdM3 || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })
    },
  ]

  const dimColumns = [
    { key: 'fdListDCode', header: 'DCode' },
    { key: 'fdDescr', header: 'Deskripsi' },
    { key: 'fdPjg', header: 'P (cm)', render: (row: ShipmentDimension) => formatNumber(row.fdPjg) },
    { key: 'fdLbr', header: 'L (cm)', render: (row: ShipmentDimension) => formatNumber(row.fdLbr) },
    { key: 'fdTng', header: 'T (cm)', render: (row: ShipmentDimension) => formatNumber(row.fdTng) },
    { key: 'fdQty', header: 'Qty', render: (row: ShipmentDimension) => formatNumber(row.fdQty) },
  ]

  return (
    <div className="flex h-[calc(100vh-var(--topbar-height)-2rem)] gap-6 relative overflow-hidden bg-[var(--color-background)] p-4 sm:p-6">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 h-full">
        
        {/* Header Container */}
        <div className="flex flex-shrink-0 flex-col gap-0.5">
          <h1 className="text-xl font-bold tracking-tight font-[var(--font-display)] text-[var(--color-primary)]">Shipments</h1>
          <p className="text-xs text-[var(--color-secondary)] font-[var(--font-label)]">
            Kelola daftar resi pengiriman (Entry List).
          </p>
        </div>

        {/* Global KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          {/* Total Resi */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
            <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
              <Receipt className="w-24 h-24 text-[var(--color-primary)]" />
            </div>
            <div className="flex items-center gap-2 text-[var(--color-secondary)]">
              <Receipt className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Resi</span>
            </div>
            <div className="mt-3">
              {isLoadingKpi ? (
                <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
              ) : (
                <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                  {Number(kpis?.totalResi || 0).toLocaleString('id-ID')}
                </h3>
              )}
            </div>
          </div>
          
          {/* Total Packages */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
            <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
              <Package className="w-24 h-24 text-emerald-500" />
            </div>
            <div className="flex items-center gap-2 text-[var(--color-secondary)]">
              <Package className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Packages</span>
            </div>
            <div className="mt-3">
              {isLoadingKpi ? (
                <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
              ) : (
                <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                  {Number(kpis?.totalPackages || 0).toLocaleString('id-ID')}
                </h3>
              )}
            </div>
          </div>
          
          {/* Total Berat */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
            <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
              <Weight className="w-24 h-24 text-purple-500" />
            </div>
            <div className="flex items-center gap-2 text-[var(--color-secondary)]">
              <Weight className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Berat</span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              {isLoadingKpi ? (
                <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
              ) : (
                <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                  {Number(kpis?.totalBerat || 0).toLocaleString('id-ID')}
                </h3>
              )}
            </div>
          </div>
          
          {/* Total Volume */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
            <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
              <Box className="w-24 h-24 text-rose-500" />
            </div>
            <div className="flex items-center gap-2 text-[var(--color-secondary)]">
              <Box className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Volume</span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              {isLoadingKpi ? (
                <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
              ) : (
                <>
                  <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                    {Number(kpis?.totalVolume || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                  </h3>
                  <span className="text-sm font-bold text-[var(--color-secondary)] ml-1">m³</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-shrink-0 flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--color-surface)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center gap-2 bg-gray-100/80 p-1 rounded-lg">
            <button
              onClick={() => { setListTypeFilter('ALL'); goToPage(1) }}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                listTypeFilter === 'ALL' 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              All
            </button>
            <button
              onClick={() => { setListTypeFilter('1'); goToPage(1) }}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                listTypeFilter === '1' 
                  ? "bg-[var(--color-primary)] text-white shadow-sm" 
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              AIR
            </button>
            <button
              onClick={() => { setListTypeFilter('2'); goToPage(1) }}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                listTypeFilter === '2' 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              SEA
            </button>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex-1 sm:w-72">
              <SearchBar 
                value={search} 
                onChange={(val) => { setSearch(val); goToPage(1) }} 
                placeholder="Cari list code, customer, marking, deskripsi..." 
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-secondary)] whitespace-nowrap">
              <span className="hidden lg:inline">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  goToPage(1)
                }}
                className="bg-transparent border border-[var(--color-border)] rounded px-2 py-1.5 focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 min-h-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-sm flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table
              columns={columns}
              data={dataList}
              keyExtractor={(row) => row.fdListCode}
              isLoading={isLoading}
              onRowClick={(row) => setSelectedRow(row)}
              emptyMessage="Tidak ada data shipment ditemukan."
              getRowClassName={(row) => cn(
                'bg-white hover:bg-gray-50 border-l-4 border-l-gray-200 cursor-pointer',
                selectedRow?.fdListCode === row.fdListCode && 'bg-blue-50/50 border-l-blue-500'
              )}
            />
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border)]">
            <Pagination
              page={page}
              limit={limit}
              total={total}
              totalPages={Math.ceil(total / limit)}
              onPageChange={goToPage}
            />
            {Math.ceil(total / limit) > 1 && (
              <div className="flex flex-shrink-0 items-center gap-1.5 px-3 py-2 text-xs text-[var(--color-secondary)]">
                <span className="hidden sm:inline">Go to page</span>
                <input
                  type="number"
                  min={1}
                  max={Math.ceil(total / limit)}
                  value={jumpPage}
                  placeholder={String(page)}
                  onChange={(e) => setJumpPage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    const totalPages = Math.ceil(total / limit)
                    const target = Math.min(Math.max(1, Number(jumpPage) || 1), totalPages)
                    goToPage(target)
                    setJumpPage('')
                  }}
                  className="w-14 text-center bg-transparent border border-[var(--color-border)] rounded px-1 py-1 focus:outline-none focus:border-[var(--color-primary)]"
                />
                <span>of {Math.ceil(total / limit).toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Panel Slider & Backdrop */}
      {selectedRow && selectedShipment && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedRow(null)}
          />

          {/* Panel Detail */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[500px] bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl flex flex-col animate-slideInRight h-full overflow-hidden">
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between p-5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]">
              <div className="min-w-0">
                <h2 className="text-lg font-bold font-[var(--font-display)] truncate flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[var(--color-primary)]" />
                  {selectedShipment.fdListCode}
                </h2>
                <p className="text-xs text-[var(--color-secondary)] mt-1">Detail Resi Pengiriman</p>
              </div>
              <button 
                onClick={() => setSelectedRow(null)}
                className="p-2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] bg-[var(--color-surface)] rounded-full border border-[var(--color-border)] shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Tabs Header */}
              <div className="flex items-center border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 pt-2 gap-4">
                <button
                  onClick={() => setActiveTab('info')}
                  className={cn(
                    "pb-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
                    activeTab === 'info' 
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                      : 'border-transparent text-[var(--color-secondary)] hover:text-gray-700'
                  )}
                >
                  <Info className="w-4 h-4" />
                  Main Info
                </button>
                <button
                  onClick={() => setActiveTab('dimensi')}
                  className={cn(
                    "pb-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
                    activeTab === 'dimensi' 
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                      : 'border-transparent text-[var(--color-secondary)] hover:text-gray-700'
                  )}
                >
                  <Layers className="w-4 h-4" />
                  Dimensi (WH)
                  {dimensions.length > 0 && (
                    <span className="bg-[var(--color-primary)] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {dimensions.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-5 flex-1">
                {isLoadingDetail && <div className="text-center text-sm text-[var(--color-secondary)] mt-10">Memuat detail...</div>}
                
                {!isLoadingDetail && activeTab === 'info' && (
                  <div className="space-y-6">
                    {/* Customer Info Card */}
                    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                        <Box className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-semibold text-gray-900">Informasi Umum</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 p-5">
                        <div className="sm:col-span-2">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Customer</p>
                          <p className="text-sm text-gray-900 font-semibold">{selectedShipment.fdCustName || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Tgl Agent</p>
                          <p className="text-sm text-gray-900 font-medium">{formatDate(selectedShipment.fdTglAgent)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Penerima</p>
                          <p className="text-sm text-gray-900 font-medium">{selectedShipment.fdTerima || '—'}</p>
                        </div>
                        <div className="sm:col-span-2 pt-2 border-t border-gray-50">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Marking Code</p>
                          <p className="text-sm text-gray-900 font-medium">{selectedShipment.fdMarkingCode || '—'}</p>
                        </div>
                        <div className="sm:col-span-2 pt-2 border-t border-gray-50">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Komoditi / Deskripsi</p>
                          <p className="text-sm text-gray-900">{selectedShipment.fdComodity || '—'}</p>
                          {selectedShipment.fdDesc && (
                            <p className="text-xs text-gray-500 mt-1 italic">{selectedShipment.fdDesc}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fisik Info Card */}
                    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                        <Box className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-gray-900">Rekapitulasi Fisik</span>
                      </div>
                      <div className="grid grid-cols-3 divide-x divide-gray-100">
                        <div className="p-5 text-center">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Jml Pack</p>
                          <p className="text-lg font-bold text-gray-900 tabular-nums">{Number(selectedShipment.fdJmlPack || 0).toLocaleString('id-ID')}</p>
                        </div>
                        <div className="p-5 text-center">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Total Berat</p>
                          <div className="flex items-baseline justify-center gap-1">
                            <p className="text-lg font-bold text-gray-900 tabular-nums">{Number(selectedShipment.fdJmlBerat || 0).toLocaleString('id-ID')}</p>
                            <span className="text-xs text-gray-500 font-medium">kg</span>
                          </div>
                        </div>
                        <div className="p-5 text-center">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Volume</p>
                          <div className="flex items-baseline justify-center gap-1">
                            <p className="text-lg font-bold text-gray-900 tabular-nums">{Number(selectedShipment.fdM3 || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</p>
                            <span className="text-xs text-gray-500 font-medium">m³</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isLoadingDimensions && activeTab === 'dimensi' && (
                  <div className="h-full flex flex-col min-h-0 bg-white border border-gray-100 rounded-xl overflow-hidden">
                    <Table
                      columns={dimColumns}
                      data={dimensions}
                      keyExtractor={(row) => `${row.fdListCode}-${row.fdListDCode}`}
                      emptyMessage="Tidak ada data dimensi (WH) untuk resi ini."
                    />
                  </div>
                )}
                
                {isLoadingDimensions && activeTab === 'dimensi' && (
                  <div className="text-center text-sm text-[var(--color-secondary)] mt-10">Memuat dimensi...</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}