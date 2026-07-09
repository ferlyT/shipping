import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { shipmentsApi } from '@/api/endpoints'
import { Package, Weight, Box, Receipt, ListChecks, Layers, ArrowRight, Eye } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { Table } from '@/components/ui/Table'
import { cn } from '@/lib/utils'

interface ShipmentStatus {
  fdLoadDate: string | null
  fdETD: string | null
  fdETA: string | null
  fdExitDate: string | null
  fdGudang: string | null
  statusLabel: string
  statusStep: number
}

interface Shipment {
  fdListCode: string
  fdCustName: string | null
  fdTerima: string | null
  fdTglAgent: string | null
  fdMarkingCode: string | null
  fdDesc: string | null
  fdComodity: string | null
  fdComodityName?: string | null
  fdBranchCode?: string | null
  fdJmlPack: number | null
  fdSatuan: string | null
  fdJmlBerat: number | null
  fdM3: number | null
  fdLocalTrackingNo?: string | null
  shipmentStatus?: ShipmentStatus
}

const STATUS_STYLES: Record<number, { label: string; className: string }> = {
  0: { label: 'Waiting', className: 'bg-slate-100 text-slate-700' },
  1: { label: 'Loading', className: 'bg-blue-50 text-blue-700' },
  2: { label: 'ETD', className: 'bg-indigo-50 text-indigo-700' },
  3: { label: 'ETA', className: 'bg-amber-50 text-amber-700' },
  4: { label: 'Warehouse', className: 'bg-emerald-50 text-emerald-700' },
  5: { label: 'Delivery', className: 'bg-cyan-50 text-cyan-700' },
  6: { label: 'Delivered', className: 'bg-green-50 text-green-700' },
}

function StatusBadge({ status }: { status?: ShipmentStatus }) {
  const step = status?.statusStep ?? 0
  const style = STATUS_STYLES[step] || STATUS_STYLES[0]
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
      style.className
    )}>
      {status?.statusLabel || style.label}
    </span>
  )
}

export default function ShipmentsDashboardPage() {
  const { data: kpiData, isLoading: isLoadingKpi } = useQuery({
    queryKey: ['shipmentsKpi', 'ALL'],
    queryFn: async () => {
      const res = await shipmentsApi.getKpis({})
      return { data: res }
    },
  })

  const { data: recentShipmentsData, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['recentShipments'],
    queryFn: async () => {
      // Assuming getList takes page and limit and returns latest sorted by fdlistcode desc
      const res = await shipmentsApi.getList({ page: 1, limit: 10 })
      return res
    },
  })

  const kpis = kpiData?.data
  const recentShipments = recentShipmentsData?.data || []

  const columns = [
    { key: 'fdCustName', header: 'Customer', className: 'py-5', fixed: true },
    {
      key: 'receiverTracking',
      header: 'Receiver / Tracking',
      className: 'py-5 min-w-[150px]',
      render: (row: Shipment) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs sm:text-sm font-medium text-slate-900 leading-tight">
            {row.fdTerima || '-'}
          </span>
          {row.fdLocalTrackingNo && (
            <span className="text-xs text-slate-500">
              <span className="font-medium text-blue-600">{row.fdLocalTrackingNo}</span>
            </span>
          )}
        </div>
      )
    },
    { key: 'fdMarkingCode', header: 'Marking', className: 'py-5' },
    {
      key: 'fdComodity',
      header: 'Commodity',
      className: 'py-5',
      render: (row: Shipment) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs sm:text-sm font-medium text-slate-900 leading-tight">
            {row.fdComodity || '-'}
          </span>
          {row.fdComodityName && (
            <span className="text-xs text-slate-500">
              {row.fdComodityName}
            </span>
          )}
        </div>
      )
    },
    { key: 'fdDesc', header: 'Description', className: 'py-5 text-slate-600 max-w-[200px] truncate' },
    {
      key: 'fisik',
      header: 'Summary',
      className: 'py-5',
      render: (row: Shipment) => (
        <div className="flex flex-col gap-1 text-xs whitespace-nowrap">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 w-14">Weight</span>
            <span className="font-medium text-slate-900">{Number(row.fdJmlBerat || 0).toLocaleString('id-ID')} <span className="text-slate-400 font-normal">kg</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 w-14">Volume</span>
            <span className="font-medium text-slate-900">{Number(row.fdM3 || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })} <span className="text-slate-400 font-normal">m³</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 w-14">Package</span>
            <span className="font-medium text-blue-600">
              {Number(row.fdJmlPack || 0).toLocaleString('id-ID')}
              {row.fdSatuan && row.fdSatuan.trim() ? ` ${row.fdSatuan.trim()}` : ''}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'shipmentStatus',
      header: 'Status',
      className: 'w-[140px] py-5',
      render: (row: Shipment) => <StatusBadge status={row.shipmentStatus} />
    },
    {
      key: 'aksi',
      header: '',
      className: 'w-[64px] py-5 text-right',
      render: (row: Shipment) => (
        <Link
          to={`${ROUTES.SHIPMENTS_LIST}?id=${row.fdListCode}`}
          className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
        >
          <Eye className="w-4 h-4" />
        </Link>
      )
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header Container */}
      <div className="flex flex-shrink-0 flex-col">
        <h1 className="font-[var(--font-display)] font-medium text-[40px] m-0 mb-1 tracking-[-0.02em] text-[var(--color-primary)]">
          Dashboard Shipments
        </h1>
        <p className="text-[15.2px] text-[var(--color-secondary)] m-0 mb-8">
          Ringkasan pengiriman secara keseluruhan.
        </p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Shortcut Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to={ROUTES.SHIPMENTS_LIST}
          className="group flex items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[var(--color-primary)] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
              <ListChecks className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-primary)] font-[var(--font-display)]">
                Daftar Resi
              </h3>
              <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                Lihat, cari, dan kelola seluruh resi pengiriman.
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
        </Link>

        <Link
          to={ROUTES.SHIPMENT_BATCHES}
          className="group flex items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[var(--color-primary)] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-primary)] font-[var(--font-display)]">
                Batch Marking
              </h3>
              <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                Kelola pengelompokan resi berdasarkan marking.
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
        </Link>
      </div>

      {/* Recent Shipments Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-primary)] font-[var(--font-display)]">
              Pengiriman Terbaru
            </h3>
            <p className="text-xs text-[var(--color-secondary)] mt-1">
              10 entri pengiriman terakhir
            </p>
          </div>
          <Link
            to={ROUTES.SHIPMENTS_LIST}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Lihat Semua
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-auto bg-white">
          <Table
            tableClassName="min-w-[1000px]"
            columns={columns}
            data={recentShipments}
            keyExtractor={(row) => row.fdListCode}
            isLoading={isLoadingRecent}
            emptyMessage="Tidak ada pengiriman terbaru."
            getRowClassName={() => 'bg-white hover:bg-[#EFF6FF] transition-colors duration-200 border-b border-slate-100'}
          />
        </div>
      </div>
    </div>
  )
}
