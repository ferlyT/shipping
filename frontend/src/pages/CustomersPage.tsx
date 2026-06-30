import { useState } from 'react'
import { SearchBar } from '@/components/ui/SearchBar'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@/api/endpoints'
import { X, Building2, MapPin, Phone, Mail, User, Eye, DollarSign, Edit3, ShieldAlert, Truck, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CustomerAddress {
  fdID: string
  fdJenis: string
  fdContact: string
  fdHP: string
  fdTelp: string
  fdEmail: string
  fdAddr: string
  fdCity: string
  fdAktif: number
}

interface Customer {
  fdCustCode: string
  fdCustName: string
  fdContact: string
  fdAddr1: string
  fdCityName: string
  fdTelp: string
  fdHP: string
  fdFax: string
  fdEmail: string
  fdSalesNM: string
  fdBroker: number
  fdBlocked: number
  fdDiscontinued: number
  fdKeterangan: string
  fdNamaPengiriman: string
  fdHpPengiriman: string
  fdAlamatPengiriman: string
  fdKetPengiriman: string
  fdKotaPengiriman: string
  fdHpPenagihan: string
  fdEmailPenagihan: string
  fdNotifPenagihan: number
  fdKeteranganPenagihan: string
  addresses?: CustomerAddress[]
}

// Konfigurasi warna status berdasarkan legenda gambar
const statusConfig = {
  0: { label: 'NO STATUS', bgClass: 'bg-white hover:bg-gray-50', textClass: 'text-gray-500', dotClass: 'bg-gray-300' },
  1: { label: 'OK', bgClass: 'bg-slate-800/5 hover:bg-slate-800/10', textClass: 'text-[var(--color-primary)]', dotClass: 'bg-slate-600' },
  2: { label: 'COD', bgClass: 'bg-green-50 hover:bg-green-100/80', textClass: 'text-green-800', dotClass: 'bg-green-500' },
  3: { label: 'WARNING', bgClass: 'bg-amber-50 hover:bg-amber-100/80', textClass: 'text-amber-800', dotClass: 'bg-amber-500' },
  4: { label: 'BLOCKED', bgClass: 'bg-red-50 hover:bg-red-100/80', textClass: 'text-red-800', dotClass: 'bg-red-500' },
  5: { label: 'URGENT', bgClass: 'bg-cyan-50 hover:bg-cyan-100/80', textClass: 'text-cyan-800', dotClass: 'bg-cyan-500' },
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const { page, limit, setLimit, goToPage } = usePagination(10)
  
  const [sortField, setSortField] = useState('fdCustName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<'active' | 'discontinued' | 'all'>('active')
  const [blockStatusFilter, setBlockStatusFilter] = useState<string | null>(null)
  
  const [selectedRow, setSelectedRow] = useState<Customer | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'alamat'>('info')
  const [addressSearch, setAddressSearch] = useState('')

  // Fetch data dari API Hono menggunakan React Query
  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, limit, debouncedSearch, sortField, sortDir, statusFilter, blockStatusFilter],
    queryFn: async () => {
      const res = await customersApi.list({ 
        page, 
        limit, 
        search: debouncedSearch, 
        sortBy: sortField, 
        sortDir, 
        status: statusFilter,
        blockStatus: blockStatusFilter || undefined
      })
      return res.data as { data: Customer[]; meta: { total: number; totalPages: number } }
    }
  })

  // Fetch detail customer terpilih untuk mendapatkan daftar alamat
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

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(key)
      setSortDir('asc')
    }
  }

  // Kolom Tabel sesuai gambar desktop retro
  const columns = [
    {
      key: 'no',
      header: 'No.',
      className: 'w-12 text-center text-[var(--color-secondary)]',
      render: (_: any, index: number) => (page - 1) * limit + index + 1
    },
    { 
      key: 'fdCustName', 
      header: 'Customer Name',
      sortable: true,
      className: 'min-w-[180px]',
      render: (row: Customer) => (
        <div>
          <div className="text-[13px] font-semibold flex items-center gap-2">
            {row.fdCustName || '-'}
            {row.fdBroker === 1 && (
              <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider border border-blue-200">BROKER</span>
            )}
            {row.fdDiscontinued === 1 && (
              <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider border border-gray-200">DISCONTINUED</span>
            )}
          </div>
          <div className="text-xs text-[var(--color-secondary)] font-medium">{row.fdCustCode}</div>
        </div>
      )
    },
    { 
      key: 'fdContact', 
      header: 'Contact Person',
      sortable: true,
      className: 'min-w-[150px]',
      render: (row: Customer) => (
        <div>
          <div className="font-medium">{row.fdContact}</div>
          <div className="text-[11px] text-[var(--color-secondary)]">Sales: {row.fdSalesNM || '-'}</div>
        </div>
      )
    },
    { key: 'fdHP', header: 'Handphone No.' },
    { key: 'fdTelp', header: 'Tel No.' },
    { key: 'fdFax', header: 'Fax No.' },
    { 
      key: 'fdEmail', 
      header: 'Email',
      render: (row: Customer) => (
        <span className="text-xs truncate max-w-[120px] block" title={row.fdEmail}>
          {row.fdEmail}
        </span>
      )
    },
    { key: 'fdCityName', header: 'City', sortable: true },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[140px] text-center',
      render: (row: Customer) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedRow(row)}
            className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-black/5 rounded"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-[var(--color-secondary)] hover:text-green-600 hover:bg-green-50 rounded"
            title="Contract Price"
          >
            <DollarSign className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-[var(--color-secondary)] hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Change Status"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <div className="w-6 flex items-center justify-center">
            <span className={`w-2 h-2 rounded-full ${statusConfig[(row.fdBlocked || 0) as keyof typeof statusConfig]?.dotClass || 'bg-gray-300'}`} title={statusConfig[(row.fdBlocked || 0) as keyof typeof statusConfig]?.label || 'UNKNOWN'} />
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="flex h-[calc(100vh-var(--topbar-height)-2rem)] gap-6 relative overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 h-full">
        
        {/* Header & Status Legend */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-bold font-[var(--font-display)] text-[var(--color-primary)]">Customer Information List</h1>
            <p className="text-xs text-[var(--color-secondary)] font-[var(--font-label)]">Total Registered Customers: {total}</p>
          </div>
          
          {/* Legenda Warna Baris */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-[var(--font-label)] tracking-wider">
            <span className="text-[var(--color-muted)] uppercase mr-1">Status:</span>
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
                    "flex items-center gap-1.5 px-2 py-1 rounded border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]",
                    isSelected 
                      ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]"
                      : "bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-gray-50",
                    blockStatusFilter && !isSelected && "opacity-50 grayscale"
                  )}
                  title={isSelected ? "Click to clear filter" : `Click to filter by ${config.label}`}
                >
                  <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
                  <span className="font-semibold">{config.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tabs Status Filter */}
        <div className="flex border-b border-[var(--color-border)]">
          {(['active', 'discontinued', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setStatusFilter(tab); goToPage(1) }}
              className={cn(
                "px-4 py-2 font-medium text-sm border-b-2 transition-colors capitalize",
                statusFilter === tab 
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]" 
                  : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              {tab} Customers
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-shrink-0 items-center justify-between gap-4 bg-[var(--color-surface)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm">
          <div className="w-full max-w-2xl">
            <SearchBar 
              value={search} 
              onChange={(val) => { setSearch(val); goToPage(1) }} 
              placeholder="Search name, code, contact, phone, email..." 
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
                className="bg-transparent border border-[var(--color-border)] rounded px-2 py-1 focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 min-h-0 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table
              columns={columns}
              data={customersList}
              isLoading={isLoading}
              keyExtractor={(row) => row.fdCustCode}
              onRowClick={(row) => setSelectedRow(row)}
              getRowClassName={(row) => statusConfig[(row.fdBlocked || 0) as keyof typeof statusConfig]?.bgClass || 'bg-white'}
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

      {/* Detail Panel Slider & Backdrop */}
      {selectedRow && (
        <>
          {/* Backdrop (Aktif di semua layar) */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedRow(null)}
          />

          {/* Panel Detail (Meluncur dari kanan menutupi layar penuh vertikal) */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[420px] bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-2xl flex flex-col animate-slideInRight h-full overflow-hidden">
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between p-5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold font-[var(--font-display)] truncate" title={selectedCustomer.fdCustName || ''}>{selectedCustomer.fdCustName || '-'}</h2>
                  <Badge variant={
                    (selectedCustomer.fdBlocked || 0) === 4 ? 'danger' : 
                    (selectedCustomer.fdBlocked || 0) === 3 ? 'warning' : 
                    (selectedCustomer.fdBlocked || 0) === 2 ? 'success' : 
                    (selectedCustomer.fdBlocked || 0) === 5 ? 'info' : 'default'
                  }>
                    {statusConfig[(selectedCustomer.fdBlocked || 0) as keyof typeof statusConfig]?.label || 'UNKNOWN'}
                  </Badge>
                  {selectedCustomer.fdDiscontinued === 1 && (
                    <Badge variant="default" className="bg-gray-200 text-gray-600 border-gray-300">DISCONTINUED</Badge>
                  )}
                </div>
                <p className="text-sm text-[var(--color-secondary)] font-mono">{selectedCustomer.fdCustCode}</p>
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
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'info' 
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                      : 'border-transparent text-[var(--color-secondary)] hover:text-gray-700'
                  }`}
                >
                  <Info className="w-4 h-4" />
                  Main Info
                </button>
                <button
                  onClick={() => setActiveTab('alamat')}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'alamat' 
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]' 
                      : 'border-transparent text-[var(--color-secondary)] hover:text-gray-700'
                  }`}
                >
                  Addresses
                  {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
                    <span className="bg-[var(--color-primary)] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {selectedCustomer.addresses.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-5 space-y-6 flex-1">
                
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    {/* Profil Utama */}
                    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                      {/* Card Header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">Company Profile</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedCustomer.fdBroker === 1 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 tracking-widest">BROKER</span>
                          )}
                          {selectedCustomer.fdDiscontinued === 1 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 tracking-widest border border-gray-200">DISCONTINUED</span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md tracking-widest ${
                            (selectedCustomer.fdBlocked || 0) === 4 ? 'bg-red-100 text-red-700' :
                            (selectedCustomer.fdBlocked || 0) === 3 ? 'bg-amber-100 text-amber-700' :
                            (selectedCustomer.fdBlocked || 0) === 2 ? 'bg-green-100 text-green-700' :
                            (selectedCustomer.fdBlocked || 0) === 5 ? 'bg-cyan-100 text-cyan-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{statusConfig[(selectedCustomer.fdBlocked || 0) as keyof typeof statusConfig]?.label || 'OK'}</span>
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-5">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Contact Person</p>
                          <p className="text-sm text-gray-900 font-medium">{selectedCustomer.fdContact || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Mobile</p>
                          <p className="text-sm text-gray-900 font-medium">{selectedCustomer.fdHP || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                          <p className="text-sm text-gray-900 font-medium">{selectedCustomer.fdTelp || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Email</p>
                          <p className="text-sm text-gray-900 font-medium truncate" title={selectedCustomer.fdEmail}>{selectedCustomer.fdEmail || '-'}</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-gray-50">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Main Address</p>
                          <p className="text-sm text-gray-900 font-medium leading-relaxed">{selectedCustomer.fdAddr1 || '-'}</p>
                          {selectedCustomer.fdCityName && (
                            <p className="text-xs text-gray-500 mt-0.5">{selectedCustomer.fdCityName}</p>
                          )}
                        </div>
                        <div className="col-span-2 pt-2 border-t border-gray-50">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Sales</p>
                          <p className="text-sm font-bold text-emerald-600">{selectedCustomer.fdSalesNM || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Alamat 2-Col Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Pengiriman */}
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/30 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-blue-100">
                          <Truck className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Shipping</span>
                        </div>
                        <div className="p-4 space-y-4">
                          <div>
                            <p className="text-[10px] text-blue-500 uppercase tracking-wider mb-1">Recipient</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedCustomer.fdNamaPengiriman || selectedCustomer.fdCustName || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-blue-500 uppercase tracking-wider mb-1">Address</p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {selectedCustomer.fdAlamatPengiriman || selectedCustomer.fdAddr1 || '-'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{selectedCustomer.fdKotaPengiriman || selectedCustomer.fdCityName || ''}</p>
                          </div>
                          <div className="pt-3 border-t border-blue-100 space-y-2">
                            <p className="text-[10px] text-blue-500 uppercase tracking-wider">Mobile</p>
                            <p className="text-xs font-medium text-gray-800">{selectedCustomer.fdHpPengiriman || selectedCustomer.fdHP || '-'}</p>
                            {(selectedCustomer.fdKetPengiriman || selectedCustomer.fdKeterangan) && (
                              <p className="text-[11px] text-gray-500 italic leading-relaxed">{selectedCustomer.fdKetPengiriman || selectedCustomer.fdKeterangan}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Penagihan */}
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/30 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-100">
                          <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Billing</span>
                        </div>
                        <div className="p-4 space-y-4">
                          <div>
                            <p className="text-[10px] text-amber-500 uppercase tracking-wider mb-1">Bill To</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedCustomer.fdBillTo || selectedCustomer.fdCustName || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-amber-500 uppercase tracking-wider mb-1">Address</p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {selectedCustomer.fdBillAddr1 || selectedCustomer.fdAddr1 || '-'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{selectedCustomer.fdBillCityName || selectedCustomer.fdCityName || ''}</p>
                          </div>
                          <div className="pt-3 border-t border-amber-100 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail className="w-3 h-3 text-amber-400" />
                              <span className="truncate" title={selectedCustomer.fdEmailPenagihan || selectedCustomer.fdEmail || '-'}>{selectedCustomer.fdEmailPenagihan || selectedCustomer.fdEmail || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Phone className="w-3 h-3 text-amber-400" />
                              <span>{selectedCustomer.fdHpPenagihan || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Warning Banner */}
                    {(selectedCustomer.fdBlocked || 0) > 1 && (
                      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                        <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 leading-relaxed">
                          Customer status: <strong>{statusConfig[(selectedCustomer.fdBlocked || 0) as keyof typeof statusConfig]?.label}</strong>. Check billing status before processing new orders.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'alamat' && (
                  <div className="space-y-4 flex flex-col h-full">
                    {/* Search Address */}
                    {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
                      <div className="flex-shrink-0">
                        <SearchBar 
                          value={addressSearch}
                          onChange={setAddressSearch}
                          placeholder="Search contact, address, city..."
                        />
                      </div>
                    )}

                    <div className="space-y-3 overflow-y-auto flex-1 pb-4 min-h-0">
                      {(!selectedCustomer.addresses || selectedCustomer.addresses.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                          <MapPin className="w-8 h-8 opacity-30" />
                          <p className="text-sm">No saved addresses found.</p>
                        </div>
                      ) : (
                        (() => {
                          const filtered = selectedCustomer.addresses.filter(addr => {
                            const s = addressSearch.toLowerCase()
                            return (
                              (addr.fdContact || '').toLowerCase().includes(s) ||
                              (addr.fdAddr || '').toLowerCase().includes(s) ||
                              (addr.fdCity || '').toLowerCase().includes(s) ||
                              (addr.fdHP || '').toLowerCase().includes(s) ||
                              (addr.fdTelp || '').toLowerCase().includes(s) ||
                              (addr.fdEmail || '').toLowerCase().includes(s) ||
                              (addr.fdJenis || '').toLowerCase().includes(s)
                            )
                          })

                          if (filtered.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                                <p className="text-sm">No addresses match your search.</p>
                              </div>
                            )
                          }

                          return filtered.map((addr) => (
                            <div key={addr.fdID} className={`rounded-xl border p-4 space-y-3 relative transition-all ${
                              addr.fdAktif === 0
                                ? 'bg-gray-50 border-gray-200 opacity-60'
                                : 'bg-white border-gray-100 shadow-sm'
                            }`}>
                              {/* Header Row */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                    <User className="w-3.5 h-3.5 text-indigo-500" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{addr.fdContact || '-'}</p>
                                    {addr.fdJenis && (
                                      <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{addr.fdJenis}</span>
                                    )}
                                  </div>
                                </div>
                                {addr.fdAktif === 0 ? (
                                  <span className="flex-shrink-0 text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-md font-bold tracking-widest uppercase">Inactive</span>
                                ) : addr.fdAktif === 1 ? (
                                  <span className="flex-shrink-0 text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-bold tracking-widest uppercase">Default</span>
                                ) : null}
                              </div>

                              {/* Info Details */}
                              <div className="pl-9 space-y-2">
                                {(addr.fdAddr || addr.fdCity) && (
                                  <div className="flex items-start gap-2 text-xs text-gray-600">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <span className="leading-relaxed">{[addr.fdAddr, addr.fdCity].filter(Boolean).join(', ')}</span>
                                  </div>
                                )}
                                {(addr.fdHP || addr.fdTelp) && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span>{addr.fdHP || addr.fdTelp}</span>
                                  </div>
                                )}
                                {addr.fdEmail && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="truncate" title={addr.fdEmail}>{addr.fdEmail}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        })()
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}