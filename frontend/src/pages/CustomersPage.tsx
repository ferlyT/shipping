import { useState } from 'react'
import { SearchBar } from '@/components/ui/SearchBar'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@/api/endpoints'
import { X, Building2, MapPin, Phone, Mail, User, Eye, DollarSign, ShieldAlert, Truck, Info, Calendar, Rows3, LayoutGrid } from 'lucide-react'
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
  fdCreatedDate: string | null
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

// Konfigurasi status: satu sumber kebenaran untuk badge, aksen baris, dan legenda filter.
// bgClass dihapus dari sini secara sengaja — status kini dikomunikasikan lewat kolom
// Badge eksplisit + aksen border kiri tipis, bukan full-row color wash yang sebelumnya
// sulit dibedakan antar status di layar penuh berisi ribuan baris.
const statusConfig = {
  0: { label: 'NO STATUS', badgeVariant: 'default' as const, accentClass: 'border-l-gray-200', dotClass: 'bg-gray-300' },
  1: { label: 'OK', badgeVariant: 'default' as const, accentClass: 'border-l-slate-400', dotClass: 'bg-slate-600' },
  2: { label: 'COD', badgeVariant: 'success' as const, accentClass: 'border-l-green-500', dotClass: 'bg-green-500' },
  3: { label: 'WARNING', badgeVariant: 'warning' as const, accentClass: 'border-l-amber-500', dotClass: 'bg-amber-500' },
  4: { label: 'BLOCKED', badgeVariant: 'danger' as const, accentClass: 'border-l-red-500', dotClass: 'bg-red-500' },
  5: { label: 'URGENT', badgeVariant: 'info' as const, accentClass: 'border-l-cyan-500', dotClass: 'bg-cyan-500' },
}

// Kelas warna solid untuk badge inline di panel detail (dipakai di luar komponen <Badge/> bersama)
const badgeColorClasses: Record<string, string> = {
  danger: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  success: 'bg-green-100 text-green-700',
  info: 'bg-cyan-100 text-cyan-700',
  default: 'bg-gray-100 text-gray-500',
}

// Prisma mengembalikan DateTime sebagai ISO string lewat JSON (mis. "2019-03-14T00:00:00.000Z").
// Guard untuk null/invalid karena fdCreatedDate bisa kosong pada data lama.
function formatCustomerSince(dateStr?: string | null) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

// Versi ringkas untuk tabel: "5 tahun", "8 bulan", atau "Baru" untuk customer <1 bulan.
// Dipakai di kolom Customer Name (bukan kolom terpisah) supaya tidak menambah lebar tabel.
function formatCustomerTenure(dateStr?: string | null): string | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null
  const now = new Date()
  let months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
  if (now.getDate() < date.getDate()) months -= 1
  if (months < 1) return 'Baru'
  if (months < 12) return `${months} bln`
  const years = Math.floor(months / 12)
  return `${years} thn`
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 'grid' : 'table'
    }
    return 'table'
  })
  const { page, limit, setLimit, goToPage } = usePagination(10)
  
  const [sortField, setSortField] = useState('fdCustName')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<'active' | 'discontinued' | 'all'>('active')
  const [blockStatusFilter, setBlockStatusFilter] = useState<string | null>(null)
  
  const [jumpPage, setJumpPage] = useState('')

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
        blockStatus: blockStatusFilter || ''
      })
      return res.data as { data: Customer[]; meta: { total: number; totalPages: number } }
    }
  })

  // Fetch detail customer terpilih untuk mendapatkan daftar alamat
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
      className: 'w-[260px]',
      render: (row: Customer) => (
        <div className="min-w-0">
          <div className="text-[13px] font-semibold flex items-center gap-2 min-w-0">
            <span className="truncate">{row.fdCustName || '-'}</span>
            {row.fdBroker === 1 && (
              <span className="shrink-0 bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider border border-blue-200">BROKER</span>
            )}
            {row.fdDiscontinued === 1 && (
              <span className="shrink-0 bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider border border-gray-200">DISCONTINUED</span>
            )}
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
    <div className="flex h-[calc(100vh-var(--topbar-height)-2rem)] gap-6 relative overflow-hidden p-4 sm:p-6 lg:p-8">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 h-full">
        
        {/* Header & Status Legend */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="font-[var(--font-display)] font-medium text-[40px] m-0 mb-1 tracking-[-0.02em] text-[var(--color-primary)]">Customer Information List</h1>
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
          
          <div className="flex items-center gap-2.5 shrink-0 text-[13.6px] text-[var(--color-secondary)]">
            <div className="flex items-center gap-1 bg-[#F7F5F2] rounded-lg p-0.5 border border-[#E4E1DA]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn('p-1.5 rounded-md transition-all', viewMode === 'table' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
              >
                <Rows3 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 rounded-md transition-all', viewMode === 'grid' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
              >
                <LayoutGrid size={16} />
              </button>
            </div>

            <div className="w-px h-5 bg-[#E4E1DA] mx-1 hidden sm:block"></div>

            <div className="items-center gap-2 text-sm text-[var(--color-secondary)] whitespace-nowrap hidden sm:flex">
              <span>Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  goToPage(1)
                }}
                className="bg-transparent border border-[var(--color-border)] rounded px-2 py-1 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
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
        <div className="flex-1 min-h-0 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm flex flex-col overflow-hidden">
          <div className={cn("flex-1 overflow-auto", viewMode === 'grid' && "p-4 bg-[#F8FAFC]")}>
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-full min-h-[200px] gap-4 p-6">
                <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[var(--color-secondary)] text-sm animate-pulse">Memuat data pelanggan...</p>
              </div>
            ) : customersList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 min-h-[200px]">
                <p className="text-[var(--color-secondary)] text-sm font-medium">Tidak ada data customer yang ditemukan.</p>
              </div>
            ) : viewMode === 'table' ? (
              <Table
                columns={columns}
                data={customersList}
                isLoading={false}
                keyExtractor={(row) => row.fdCustCode}
                onRowClick={(row) => setSelectedRow(row)}
                getRowClassName={(row) => cn(
                  'bg-white hover:bg-gray-50 border-l-4',
                  statusConfig[(row.fdBlocked || 0) as keyof typeof statusConfig]?.accentClass || 'border-l-gray-200'
                )}
                onSort={handleSort}
                sortColumn={sortField}
                sortDirection={sortDir}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {customersList.map((row) => (
                  <div
                    key={row.fdCustCode}
                    onClick={() => setSelectedRow(row)}
                    className={cn(
                      "bg-[var(--color-surface)] border rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col group relative",
                      statusConfig[(row.fdBlocked || 0) as keyof typeof statusConfig]?.accentClass ? "border-l-4 " + statusConfig[(row.fdBlocked || 0) as keyof typeof statusConfig]?.accentClass : "border-l-4 border-l-gray-200"
                    )}
                  >
                    <div className="p-4 border-b border-[var(--color-border)]">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-[14px] text-[var(--color-primary)] truncate" title={row.fdCustName}>{row.fdCustName || '-'}</h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[11px] text-[var(--color-secondary)] font-mono bg-slate-100 px-1.5 py-0.5 rounded">{row.fdCustCode}</span>
                            {formatCustomerTenure(row.fdCreatedDate) && (
                              <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100" title={`Customer since ${formatCustomerSince(row.fdCreatedDate)}`}>
                                {formatCustomerTenure(row.fdCreatedDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={statusConfig[(row.fdBlocked || 0) as keyof typeof statusConfig]?.badgeVariant || 'default'} className="shrink-0 text-[10px] px-1.5 py-0.5 h-auto">
                          {statusConfig[(row.fdBlocked || 0) as keyof typeof statusConfig]?.label || 'UNKNOWN'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-3 text-[12.5px] text-[var(--color-primary)] font-medium">
                        <User className="w-3.5 h-3.5 text-[var(--color-muted)]" />
                        <span className="truncate">{row.fdContact || '-'}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50/50 flex-1 flex flex-col gap-2.5 text-[12px]">
                      <div className="flex items-start gap-2 text-[var(--color-secondary)]">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-[var(--color-muted)] shrink-0" />
                        <span className="line-clamp-2">{row.fdCityName || '-'}</span>
                      </div>
                      
                      {(row.fdHP || row.fdTelp) && (
                        <div className="flex items-center gap-2 text-[var(--color-secondary)]">
                          <Phone className="w-3.5 h-3.5 text-[var(--color-muted)] shrink-0" />
                          <span className="truncate">{row.fdHP || row.fdTelp}</span>
                        </div>
                      )}
                      
                      <div className="mt-auto pt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {row.fdBroker === 1 && <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider border border-blue-200">BROKER</span>}
                          {row.fdDiscontinued === 1 && <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider border border-gray-200">DISCONTINUED</span>}
                        </div>
                        <div className="text-[11px] font-medium text-[var(--color-muted)] shrink-0">
                          Sales: <span className="text-[var(--color-secondary)]">{row.fdSalesNM || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border)] p-4">
            <Pagination
              page={page}
              limit={limit}
              total={total}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
            {totalPages > 1 && (
              <div className="flex flex-shrink-0 items-center gap-1.5 px-3 py-2 text-xs text-[var(--color-secondary)]">
                <span className="hidden sm:inline">Go to page</span>
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
                  }}
                  className="w-14 text-center bg-transparent border border-[var(--color-border)] rounded px-1 py-1 focus:outline-none focus:border-[var(--color-primary)]"
                />
                <span>of {totalPages.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedRow(null)}
          />

          {/* Modal Container */}
          <div className="relative z-50 w-full max-w-3xl bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between p-5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold font-[var(--font-display)] truncate" title={selectedCustomer?.fdCustName || ''}>{selectedCustomer?.fdCustName || '-'}</h2>
                  <Badge variant={statusConfig[(selectedCustomer?.fdBlocked || 0) as keyof typeof statusConfig]?.badgeVariant || 'default'}>
                    {statusConfig[(selectedCustomer?.fdBlocked || 0) as keyof typeof statusConfig]?.label || 'UNKNOWN'}
                  </Badge>
                  {selectedCustomer?.fdDiscontinued === 1 && (
                    <Badge variant="default" className="bg-gray-200 text-gray-600 border-gray-300">DISCONTINUED</Badge>
                  )}
                </div>
                <p className="text-sm text-[var(--color-secondary)] font-mono">{selectedCustomer?.fdCustCode}</p>
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
                  {selectedCustomer?.addresses && selectedCustomer?.addresses.length > 0 && (
                    <span className="bg-[var(--color-primary)] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {selectedCustomer?.addresses.length}
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
                          {selectedCustomer?.fdBroker === 1 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 tracking-widest">BROKER</span>
                          )}
                          {selectedCustomer?.fdDiscontinued === 1 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 tracking-widest border border-gray-200">DISCONTINUED</span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md tracking-widest ${
                            badgeColorClasses[statusConfig[(selectedCustomer?.fdBlocked || 0) as keyof typeof statusConfig]?.badgeVariant || 'default']
                          }`}>{statusConfig[(selectedCustomer?.fdBlocked || 0) as keyof typeof statusConfig]?.label || 'OK'}</span>
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-5">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Contact Person</p>
                          <p className="text-sm text-gray-900 font-medium">{selectedCustomer?.fdContact || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Mobile</p>
                          <p className="text-sm text-gray-900 font-medium">{selectedCustomer?.fdHP || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                          <p className="text-sm text-gray-900 font-medium">{selectedCustomer?.fdTelp || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Email</p>
                          <p className="text-sm text-gray-900 font-medium truncate" title={selectedCustomer?.fdEmail}>{selectedCustomer?.fdEmail || '-'}</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-gray-50">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Main Address</p>
                          <p className="text-sm text-gray-900 font-medium leading-relaxed">{selectedCustomer?.fdAddr1 || '-'}</p>
                          {selectedCustomer?.fdCityName && (
                            <p className="text-xs text-gray-500 mt-0.5">{selectedCustomer?.fdCityName}</p>
                          )}
                        </div>
                        <div className="pt-2 border-t border-gray-50">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Sales</p>
                          <p className="text-sm font-bold text-emerald-600">{selectedCustomer?.fdSalesNM || '-'}</p>
                        </div>
                        <div className="pt-2 border-t border-gray-50">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Customer Since
                          </p>
                          <p className="text-sm text-gray-900 font-medium">{formatCustomerSince(selectedCustomer?.fdCreatedDate)}</p>
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
                            <p className="text-sm font-semibold text-gray-900">{selectedCustomer?.fdNamaPengiriman || selectedCustomer?.fdCustName || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-blue-500 uppercase tracking-wider mb-1">Address</p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {selectedCustomer?.fdAlamatPengiriman || selectedCustomer?.fdAddr1 || '-'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{selectedCustomer?.fdKotaPengiriman || selectedCustomer?.fdCityName || ''}</p>
                          </div>
                          <div className="pt-3 border-t border-blue-100 space-y-2">
                            <p className="text-[10px] text-blue-500 uppercase tracking-wider">Mobile</p>
                            <p className="text-xs font-medium text-gray-800">{selectedCustomer?.fdHpPengiriman || selectedCustomer?.fdHP || '-'}</p>
                            {(selectedCustomer?.fdKetPengiriman || selectedCustomer?.fdKeterangan) && (
                              <p className="text-[11px] text-gray-500 italic leading-relaxed">{selectedCustomer?.fdKetPengiriman || selectedCustomer?.fdKeterangan}</p>
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
                            <p className="text-sm font-semibold mt-1">{selectedCustomer?.fdCustName || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-amber-500 uppercase tracking-wider mb-1">Address</p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {selectedCustomer?.fdAddr1 || '-'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{selectedCustomer?.fdCityName || ''}</p>
                          </div>
                          <div className="pt-3 border-t border-amber-100 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail className="w-3 h-3 text-amber-400" />
                              <span className="truncate" title={selectedCustomer?.fdEmailPenagihan || selectedCustomer?.fdEmail || '-'}>{selectedCustomer?.fdEmailPenagihan || selectedCustomer?.fdEmail || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Phone className="w-3 h-3 text-amber-400" />
                              <span>{selectedCustomer?.fdHpPenagihan || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Warning Banner */}
                    {(selectedCustomer?.fdBlocked || 0) > 1 && (
                      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                        <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 leading-relaxed">
                          Customer status: <strong>{statusConfig[(selectedCustomer?.fdBlocked || 0) as keyof typeof statusConfig]?.label}</strong>. Check billing status before processing new orders.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'alamat' && (
                  <div className="space-y-4 flex flex-col h-full">
                    {/* Search Address */}
                    {selectedCustomer?.addresses && selectedCustomer?.addresses.length > 0 && (
                      <div className="flex-shrink-0">
                        <SearchBar 
                          value={addressSearch}
                          onChange={setAddressSearch}
                          placeholder="Search contact, address, city..."
                        />
                      </div>
                    )}

                    <div className="space-y-3 overflow-y-auto flex-1 pb-4 min-h-0">
                      {(!selectedCustomer?.addresses || selectedCustomer?.addresses.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                          <MapPin className="w-8 h-8 opacity-30" />
                          <p className="text-sm">No saved addresses found.</p>
                        </div>
                      ) : (
                        (() => {
                          const filtered = selectedCustomer?.addresses.filter(addr => {
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
        </div>
      )}
    </div>
  )
}