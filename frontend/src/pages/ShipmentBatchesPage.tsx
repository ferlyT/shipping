import { useState } from 'react'
import { SearchBar } from '@/components/ui/SearchBar'
import { Table } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useQuery } from '@tanstack/react-query'
import { markingApi } from '@/api/endpoints/marking'
import { X, Box, MapPin, Calendar, CheckCircle2, ShieldAlert, Activity, Truck, Ship, Warehouse, LogOut, Check, Clock, History, FileText, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Marking {
  fdMarkingCode: string
  fdListType: number
  fdContNo: string
  fdContSize: string
  fdBLNo: string
  fdAWB: string
  fdConsignee: string
  fdWilayah: string
  fdJmlPack: number
  fdSatuan: string
  fdJmlBerat: number
  fdM3: number
  fdLoadDate: string
  fdETA: string
  fdETD: string
  fdExitDate: string
  fdGudang: string
  fdStatus: number
}

// Konfigurasi warna status 
const statusConfig = {
  1: { label: 'ACTIVE', bgClass: 'bg-green-50', textClass: 'text-green-800', dotClass: 'bg-green-500' },
  0: { label: 'INACTIVE', bgClass: 'bg-gray-50', textClass: 'text-gray-500', dotClass: 'bg-gray-400' },
}

export default function ShipmentBatchesPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const { page, limit, setLimit, goToPage } = usePagination(10)
  
  const [sortField, setSortField] = useState('fdMarkingCode')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [listTypeFilter, setListTypeFilter] = useState<'1' | '2'>('2') // Default to SEA (2)
  
  const [selectedRow, setSelectedRow] = useState<Marking | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['markings', page, limit, debouncedSearch, sortField, sortDir, listTypeFilter],
    queryFn: async () => {
      const res = await markingApi.list({ 
        page, 
        limit, 
        search: debouncedSearch, 
        sortBy: sortField, 
        sortDir, 
        listType: listTypeFilter
      })
      return res.data as { data: Marking[]; meta: { total: number; totalPages: number } }
    }
  })

  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['markingDetail', selectedRow?.fdMarkingCode],
    queryFn: async () => {
      if (!selectedRow) return null
      const res = await markingApi.detail(selectedRow.fdMarkingCode)
      return res.data as { data: Marking }
    },
    enabled: !!selectedRow
  })

  const selectedMarking = detailData?.data || selectedRow

  const markingList = data?.data || []
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
      render: (_: any, index: number) => (page - 1) * limit + index + 1
    },
    { 
      key: 'fdMarkingCode', 
      header: 'Marking Code',
      sortable: true,
      className: 'min-w-[150px]',
      render: (row: Marking) => (
        <div>
          <div className="text-[13px] font-semibold">{row.fdMarkingCode}</div>
          {row.fdStatus === 1 ? (
             <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium border border-green-200">ACTIVE</span>
          ) : (
             <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-medium border border-gray-200">INACTIVE</span>
          )}
        </div>
      )
    },
    { 
      key: 'fdConsignee', 
      header: 'Consignee',
      sortable: true,
      className: 'min-w-[200px]',
      render: (row: Marking) => (
        <div>
          <div className="font-medium text-[13px]">{row.fdConsignee || '-'}</div>
          <div className="text-[11px] text-[var(--color-secondary)] truncate max-w-[200px]">{row.fdWilayah || '-'}</div>
        </div>
      )
    },
    { 
      key: 'docs', 
      header: 'Documents',
      className: 'min-w-[180px]',
      render: (row: Marking) => (
        <div className="flex flex-col gap-0.5 text-xs">
          {listTypeFilter === '2' ? (
             <div className="flex items-center gap-1.5"><span className="text-gray-400 font-medium">BL:</span> <span className="font-semibold text-gray-700">{row.fdBLNo || '-'}</span></div>
          ) : (
             <div className="flex items-center gap-1.5"><span className="text-gray-400 font-medium">AWB:</span> <span className="font-semibold text-gray-700">{row.fdAWB || '-'}</span></div>
          )}
          {listTypeFilter === '2' && (
             <div className="flex items-center gap-1.5"><span className="text-gray-400 font-medium">Cont:</span> <span className="text-gray-600">{row.fdContNo || '-'}</span></div>
          )}
        </div>
      )
    },
    { 
      key: 'volume', 
      header: 'Volume / Weight',
      className: 'min-w-[150px]',
      render: (row: Marking) => (
        <div className="flex flex-col gap-0.5 text-xs text-[var(--color-secondary)]">
          <div><span className="font-medium text-gray-700">{row.fdJmlPack || 0}</span> {row.fdSatuan || 'PCS'}</div>
          <div><span className="font-medium text-gray-700">{row.fdJmlBerat || 0}</span> KG</div>
          {listTypeFilter === '2' && <div><span className="font-medium text-gray-700">{row.fdM3 || 0}</span> M3</div>}
        </div>
      )
    },
    {
      key: 'dates',
      header: 'Timeline',
      className: 'min-w-[120px]',
      render: (row: Marking) => (
        <div className="flex flex-col gap-0.5 text-xs text-[var(--color-secondary)]">
          <div title="ETA" className="flex items-center gap-1"><Calendar size={12} className="text-blue-400" /> {row.fdETA ? new Date(row.fdETA).toLocaleDateString() : '-'}</div>
        </div>
      )
    }
  ]

  return (
    <div className="flex flex-col h-full bg-[var(--color-background)]">
      {/* Header Container */}
      <div className="flex-shrink-0 flex flex-col gap-4 p-6 pb-2">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">Shipment Batches</h1>
            <p className="text-sm text-[var(--color-secondary)] mt-1">
              Manage your marking and shipment batches
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center border-b border-[var(--color-border)]">
          {[
            { id: '2', label: 'SEA Freight' },
            { id: '1', label: 'AIR Freight' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setListTypeFilter(tab.id as '1' | '2'); goToPage(1) }}
              className={cn(
                "px-6 py-2.5 font-medium text-sm border-b-2 transition-colors",
                listTypeFilter === tab.id 
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]" 
                  : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-shrink-0 items-center justify-between gap-4 bg-[var(--color-surface)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm">
          <div className="w-full max-w-2xl">
            <SearchBar 
              value={search} 
              onChange={(val) => { setSearch(val); goToPage(1) }} 
              placeholder="Search marking code, BL/AWB, consignee, container..." 
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-secondary)] whitespace-nowrap">
            <span className="hidden sm:inline">Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                goToPage(1)
              }}
              className="px-2 py-1 bg-white border border-[var(--color-border)] rounded-md text-sm outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        <div className="h-full bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table
              columns={columns}
              data={markingList}
              isLoading={isLoading}
              keyExtractor={(row) => row.fdMarkingCode}
              onRowClick={(row) => setSelectedRow(row)}
              getRowClassName={() => 'bg-white hover:bg-gray-50'}
              onSort={handleSort}
              sortColumn={sortField}
              sortDirection={sortDir}
            />
          </div>
          <Pagination
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </div>
      </div>

      {/* Detail Panel Slider */}
      {selectedRow && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedRow(null)}
          />
          <div 
            className="fixed inset-y-0 right-0 z-50 w-full md:w-[600px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 sm:duration-500 ease-in-out border-l border-gray-200"
          >
            {/* Header Panel */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
                  <Box size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">{selectedRow.fdMarkingCode}</h2>
                  <p className="text-xs font-medium text-gray-500">{listTypeFilter === '1' ? 'AIR Freight' : 'SEA Freight'} Batch</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Panel */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
              {isLoadingDetail ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
                </div>
              ) : selectedMarking ? (
                <div className="p-6 space-y-6">
                  
                  {/* Card: General Information */}
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent rounded-bl-full" />
                    
                    <h3 className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-4 flex items-center gap-2">
                      <Box size={14} className="text-[var(--color-primary)]" />
                      General Information
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 relative z-10">
                      <div>
                        <div className="text-[10px] font-medium text-gray-500 uppercase mb-1">Consignee</div>
                        <div className="font-semibold text-gray-900 text-sm">{selectedMarking.fdConsignee || '-'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium text-gray-500 uppercase mb-1">Region (Wilayah)</div>
                        <div className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                          <MapPin size={14} className="text-gray-400" />
                          {selectedMarking.fdWilayah || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium text-gray-500 uppercase mb-1">{listTypeFilter === '1' ? 'AWB No.' : 'BL No.'}</div>
                        <div className="font-mono text-xs font-semibold bg-gray-50 px-2 py-1 rounded inline-block text-gray-700 border border-gray-100">
                          {listTypeFilter === '1' ? (selectedMarking.fdAWB || '-') : (selectedMarking.fdBLNo || '-')}
                        </div>
                      </div>
                      {listTypeFilter === '2' && (
                        <div>
                          <div className="text-[10px] font-medium text-gray-500 uppercase mb-1">Container</div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {selectedMarking.fdContNo || '-'}
                            {selectedMarking.fdContSize && <span className="ml-1 text-xs text-gray-500">({selectedMarking.fdContSize})</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card: Dimensions & Weight */}
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <h3 className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-4">Volume & Weight</h3>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                        <div className="text-[10px] font-medium text-blue-600/70 uppercase mb-1">Packages</div>
                        <div className="font-bold text-blue-900 text-lg">{selectedMarking.fdJmlPack || 0} <span className="text-xs font-semibold text-blue-700">{selectedMarking.fdSatuan || 'PCS'}</span></div>
                      </div>
                      <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100/50">
                        <div className="text-[10px] font-medium text-amber-600/70 uppercase mb-1">Weight</div>
                        <div className="font-bold text-amber-900 text-lg">{selectedMarking.fdJmlBerat || 0} <span className="text-xs font-semibold text-amber-700">KG</span></div>
                      </div>
                      {listTypeFilter === '2' && (
                        <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-100/50">
                          <div className="text-[10px] font-medium text-purple-600/70 uppercase mb-1">Volume</div>
                          <div className="font-bold text-purple-900 text-lg">{selectedMarking.fdM3 || 0} <span className="text-xs font-semibold text-purple-700">M³</span></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card: Timelines */}
                  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold tracking-wider text-slate-700 uppercase mb-8 flex items-center gap-2">
                      <Calendar size={18} className="text-blue-600" />
                      Timelines
                    </h3>
                    
                    <div className="relative flex justify-between items-start w-full">
                      {/* Connecting Line */}
                      <div className="absolute top-6 left-[10%] right-[10%] h-px bg-gray-200 -z-10"></div>
                      
                      {/* Step 1: Load Date */}
                      <div className="flex flex-col items-center flex-1 text-center group">
                        <div className="w-12 h-12 bg-white border-2 border-blue-200 text-blue-500 rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:border-blue-400 group-hover:text-blue-600 transition-colors">
                          <Truck size={20} />
                        </div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">Load Date</div>
                        <div className="text-sm font-bold text-gray-900 mb-2">
                          {selectedMarking.fdLoadDate ? new Date(selectedMarking.fdLoadDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                        {selectedMarking.fdLoadDate ? (
                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full">Completed</span>
                        ) : null}
                      </div>

                      {/* Step 2: ETD / ETA */}
                      <div className="flex flex-col items-center flex-1 text-center group">
                        <div className="w-12 h-12 bg-white border-2 border-blue-200 text-blue-500 rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:border-blue-400 group-hover:text-blue-600 transition-colors">
                          <Ship size={20} />
                        </div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">ETD / ETA</div>
                        <div className="text-sm font-bold text-gray-900 mb-2 whitespace-nowrap">
                          {selectedMarking.fdETD ? new Date(selectedMarking.fdETD).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          <span className="mx-1.5 text-gray-400">→</span>
                          <span className="text-blue-600">{selectedMarking.fdETA ? new Date(selectedMarking.fdETA).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                        </div>
                        {(selectedMarking.fdETD || selectedMarking.fdETA) ? (
                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full">Completed</span>
                        ) : null}
                      </div>

                      {/* Step 3: Enter Gudang */}
                      <div className="flex flex-col items-center flex-1 text-center group">
                        <div className="w-12 h-12 bg-white border-2 border-gray-200 text-gray-500 rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:border-gray-400 group-hover:text-gray-600 transition-colors">
                          <Warehouse size={20} />
                        </div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">Enter Gudang</div>
                        <div className="text-sm font-bold text-gray-900 mb-2">
                          {selectedMarking.fdEnterGudang ? new Date(selectedMarking.fdEnterGudang).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                        {selectedMarking.fdEnterGudang ? (
                          <span className="text-[10px] font-semibold bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full">Completed</span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full">Missing Data</span>
                        )}
                      </div>

                      {/* Step 4: Exit Date */}
                      <div className="flex flex-col items-center flex-1 text-center group">
                        <div className="w-12 h-12 bg-white border-2 border-green-200 text-green-500 rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:border-green-400 group-hover:text-green-600 transition-colors">
                          <LogOut size={20} />
                        </div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">Exit Date</div>
                        <div className="text-sm font-bold text-gray-900 mb-2">
                          {selectedMarking.fdExitDate ? new Date(selectedMarking.fdExitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                        {selectedMarking.fdExitDate ? (
                          <span className="text-[10px] font-semibold bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full">Completed</span>
                        ) : null}
                      </div>

                      {/* Step 5: Status */}
                      <div className="flex flex-col items-center flex-1 text-center group">
                        <div className="w-12 h-12 bg-white border-2 border-gray-200 text-gray-400 rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:border-gray-400 group-hover:text-gray-600 transition-colors">
                          <Check size={20} />
                        </div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">Status</div>
                        <div className="text-sm font-bold text-gray-900 mb-2 opacity-0">-</div>
                        {selectedMarking.fdStatus === 1 ? (
                          <span className="text-[10px] font-semibold bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full">Completed</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Card: Performance KPIs */}
                  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col gap-6">
                    <h3 className="text-sm font-bold tracking-wider text-slate-700 uppercase flex items-center gap-2 m-0">
                      <Activity size={18} className="text-blue-600" />
                      Performance KPIs
                    </h3>
                    
                    {(() => {
                      const loadDate = selectedMarking.fdLoadDate ? new Date(selectedMarking.fdLoadDate) : null
                      const etdDate = selectedMarking.fdETD ? new Date(selectedMarking.fdETD) : null
                      const etaDate = selectedMarking.fdETA ? new Date(selectedMarking.fdETA) : null
                      const exitDate = selectedMarking.fdExitDate ? new Date(selectedMarking.fdExitDate) : null
                      const enterGudang = selectedMarking.fdEnterGudang ? true : false

                      const diffDays = (d1: Date | null, d2: Date | null) => {
                        if (!d1 || !d2) return null
                        const diff = d1.getTime() - d2.getTime()
                        return Math.ceil(diff / (1000 * 60 * 60 * 24))
                      }

                      const leadTimeLoading = diffDays(etdDate, loadDate)
                      const transitTime = diffDays(etaDate, etdDate)
                      const warehouseDelay = diffDays(exitDate, etaDate)
                      const totalCycle = diffDays(exitDate, loadDate)

                      return (
                        <>
                          {/* 4 Cards Grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            
                            {/* Card 1 */}
                            <div className="bg-white rounded-xl border border-gray-100 p-4 pb-6 shadow-sm flex flex-col relative">
                              <div className="absolute bottom-3 left-4 right-4 h-[3px] bg-blue-600 rounded-full"></div>
                              <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Clock size={20} />
                                </div>
                                <div className="flex flex-col">
                                  <div className="text-xs font-bold text-gray-800 mb-0.5 leading-tight">Lead Time Loading</div>
                                  <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-bold text-blue-600 tracking-tighter leading-none">{leadTimeLoading !== null ? leadTimeLoading : '-'}</span>
                                    <span className="text-[11px] font-medium text-slate-500">Days</span>
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-medium mt-1">ETD - Load Date</div>
                                </div>
                              </div>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-white rounded-xl border border-gray-100 p-4 pb-6 shadow-sm flex flex-col relative">
                              <div className="absolute bottom-3 left-4 right-4 h-[3px] bg-teal-600 rounded-full"></div>
                              <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Ship size={20} />
                                </div>
                                <div className="flex flex-col">
                                  <div className="text-xs font-bold text-gray-800 mb-0.5 leading-tight">Transit Time</div>
                                  <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-bold text-teal-600 tracking-tighter leading-none">{transitTime !== null ? transitTime : '-'}</span>
                                    <span className="text-[11px] font-medium text-slate-500">Days</span>
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-medium mt-1">ETA - ETD</div>
                                </div>
                              </div>
                            </div>

                            {/* Card 3 */}
                            <div className="bg-white rounded-xl border border-gray-100 p-4 pb-6 shadow-sm flex flex-col relative">
                              <div className="absolute bottom-3 left-4 right-4 h-[3px] bg-orange-500 rounded-full"></div>
                              <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Warehouse size={20} />
                                </div>
                                <div className="flex flex-col">
                                  <div className="text-xs font-bold text-gray-800 mb-0.5 leading-tight">Warehouse Delay</div>
                                  <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-bold text-orange-500 tracking-tighter leading-none">{warehouseDelay !== null ? warehouseDelay : '-'}</span>
                                    <span className="text-[11px] font-medium text-slate-500">Days</span>
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-medium mt-1">Exit Date - ETA</div>
                                </div>
                              </div>
                            </div>

                            {/* Card 4 */}
                            <div className="bg-white rounded-xl border border-gray-100 p-4 pb-6 shadow-sm flex flex-col relative">
                              <div className="absolute bottom-3 left-4 right-4 h-[3px] bg-purple-600 rounded-full"></div>
                              <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <History size={20} />
                                </div>
                                <div className="flex flex-col">
                                  <div className="text-xs font-bold text-gray-800 mb-0.5 leading-tight">Total Shipment Cycle</div>
                                  <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-bold text-purple-600 tracking-tighter leading-none">{totalCycle !== null ? totalCycle : '-'}</span>
                                    <span className="text-[11px] font-medium text-slate-500">Days</span>
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-medium mt-1">Exit Date - Load Date</div>
                                </div>
                              </div>
                            </div>

                          </div>

                          {/* 2 Wide Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Warehouse Entry Compliance */}
                            <div className={cn("rounded-xl p-4 flex items-center justify-between border", enterGudang ? "bg-green-50/30 border-green-100" : "bg-red-50/50 border-red-100")}>
                              <div className="flex gap-4 items-center">
                                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", enterGudang ? "bg-green-100 text-green-600" : "bg-red-100/70 text-red-600")}>
                                  <FileText size={24} />
                                </div>
                                <div>
                                  <div className="text-[11px] font-bold text-slate-700 mb-0.5">Warehouse Entry Compliance</div>
                                  <div className={cn("text-sm font-bold mb-0.5", enterGudang ? "text-green-700" : "text-red-600")}>
                                    {enterGudang ? "Yes (Completed)" : "No (Missing Data)"}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    {enterGudang ? "Enter Gudang is recorded" : "Enter Gudang is not recorded"}
                                  </div>
                                </div>
                              </div>
                              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", enterGudang ? "bg-green-100/50 text-green-600" : "bg-red-100/50 text-red-500")}>
                                {enterGudang ? <Check size={20} /> : <X size={20} />}
                              </div>
                            </div>

                            {/* ETA Achievement */}
                            {(() => {
                              const isDelayed = warehouseDelay !== null && warehouseDelay > 0;
                              const isMissing = warehouseDelay === null;
                              return (
                                <div className={cn("rounded-xl p-4 flex items-center justify-between border", isMissing ? "bg-gray-50/50 border-gray-200" : (isDelayed ? "bg-amber-50/50 border-amber-100" : "bg-green-50/30 border-green-100"))}>
                                  <div className="flex gap-4 items-center">
                                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", isMissing ? "bg-gray-100 text-gray-500" : (isDelayed ? "bg-amber-100/70 text-amber-600" : "bg-green-100 text-green-600"))}>
                                      <Clock size={24} />
                                    </div>
                                    <div>
                                      <div className="text-[11px] font-bold text-slate-700 mb-0.5">ETA Achievement</div>
                                      <div className={cn("text-sm font-bold mb-0.5", isMissing ? "text-gray-600" : (isDelayed ? "text-amber-600" : "text-green-700"))}>
                                        {isMissing ? "Unknown" : (isDelayed ? `No (Delayed ${warehouseDelay} Days)` : "Yes (On Time)")}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-medium">
                                        {isMissing ? "Missing ETA or Exit Date" : (isDelayed ? `Exit Date is ${warehouseDelay} days after ETA` : "Exit Date is on or before ETA")}
                                      </div>
                                    </div>
                                  </div>
                                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0", isMissing ? "bg-gray-100/50 text-gray-400" : (isDelayed ? "bg-amber-100/50 text-amber-500" : "bg-green-100/50 text-green-600"))}>
                                    {isMissing ? <Clock size={20} /> : (isDelayed ? <AlertTriangle size={20} /> : <Check size={20} />)}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>

                          {/* Info Box */}
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3">
                            <div className="bg-blue-600 text-white rounded-full w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
                              <Info size={11} strokeWidth={3} />
                            </div>
                            <span className="text-[11px] text-slate-600 font-medium">All duration calculations are based on calendar days.</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                </div>
              ) : null}
            </div>
            
            {/* Footer Action */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
               <button 
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                onClick={() => setSelectedRow(null)}
              >
                Close
              </button>
              <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors shadow-sm shadow-[var(--color-primary)]/20">
                Edit Marking
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
