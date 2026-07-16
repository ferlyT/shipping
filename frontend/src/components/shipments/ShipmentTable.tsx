import { ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { Table } from '@/components/ui/Table'
import { cn } from '@/lib/utils'
import { ShipmentStatusBadge, STATUS_STYLES, STATUS_ORDER } from './ShipmentStatusBadge'
import type { Shipment } from '@/types/shipments'

interface ShipmentTableProps {
  dataList: Shipment[]
  isLoading: boolean
  groupByStatus: boolean
  collapsedGroups: Set<number>
  onToggleGroupCollapse: (step: number) => void
  selectedRow: Shipment | null
  onRowClick: (row: Shipment) => void
}

export function ShipmentTable({
  dataList,
  isLoading,
  groupByStatus,
  collapsedGroups,
  onToggleGroupCollapse,
  selectedRow,
  onRowClick,
}: ShipmentTableProps) {
  const columns = [
    { key: 'fdListCode', header: 'List Code' },
    { key: 'fdCustName', header: 'Customer' },
    { key: 'fdMarkingCode', header: 'Marking' },
    { key: 'fdDesc', header: 'Deskripsi' },
    {
      key: 'fdJmlPack',
      header: 'Pack',
      render: (row: Shipment) => Number(row.fdJmlPack || 0).toLocaleString('id-ID'),
    },
    {
      key: 'fdJmlBerat',
      header: 'Berat (kg)',
      render: (row: Shipment) => Number(row.fdJmlBerat || 0).toLocaleString('id-ID'),
    },
    {
      key: 'fdM3',
      header: 'Volume (m3)',
      render: (row: Shipment) => Number(row.fdM3 || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 }),
    },
    {
      key: 'shipmentStatus',
      header: 'Status Kirim',
      render: (row: Shipment) => <ShipmentStatusBadge status={row.shipmentStatus} />,
    },
    {
      key: 'aksi',
      header: 'Aksi',
      render: (row: Shipment) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRowClick(row)
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--color-border)] text-[var(--color-primary)] bg-white hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)] transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          View
        </button>
      ),
    },
  ]

  // Kolom list; saat grouping aktif, kolom Status Kirim disembunyikan karena sudah terwakili oleh header grup
  const listColumns = groupByStatus ? columns.filter((c) => c.key !== 'shipmentStatus') : columns

  const getRowClassName = (row: Shipment) => cn(
    'bg-white hover:bg-gray-50 border-l-4 border-l-gray-200 cursor-pointer',
    selectedRow?.fdListCode === row.fdListCode && 'bg-blue-50/50 border-l-blue-500'
  )

  if (!groupByStatus) {
    return (
      <Table
        columns={listColumns}
        data={dataList}
        keyExtractor={(row) => row.fdListCode}
        isLoading={isLoading}
        onRowClick={onRowClick}
        emptyMessage="Tidak ada data shipment ditemukan."
        getRowClassName={getRowClassName}
      />
    )
  }

  // Grouping shipment berdasarkan status kirim (dihitung dari data halaman saat ini)
  const groups = new Map<number, Shipment[]>()
  for (const row of dataList) {
    const step = row.shipmentStatus?.statusStep ?? 0
    if (!groups.has(step)) groups.set(step, [])
    groups.get(step)!.push(row)
  }
  const groupedByStatus = STATUS_ORDER
    .filter((step) => groups.has(step))
    .map((step) => ({
      step,
      label: STATUS_STYLES[step]?.label || 'Lainnya',
      className: STATUS_STYLES[step]?.className || STATUS_STYLES[0].className,
      rows: groups.get(step)!,
    }))

  return (
    <div className="divide-y divide-[var(--color-border)]">
      {groupedByStatus.length > 0 ? (
        groupedByStatus.map((group) => {
          const isCollapsed = collapsedGroups.has(group.step)
          return (
            <div key={group.step}>
              <button
                type="button"
                onClick={() => onToggleGroupCollapse(group.step)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-50/70 hover:bg-gray-100/70 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium',
                    group.className
                  )}>
                    {group.label}
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  {group.rows.length.toLocaleString('id-ID')} resi
                </span>
              </button>
              {!isCollapsed && (
                <Table
                  columns={listColumns}
                  data={group.rows}
                  keyExtractor={(row) => row.fdListCode}
                  onRowClick={onRowClick}
                  emptyMessage="Tidak ada data."
                  getRowClassName={getRowClassName}
                />
              )}
            </div>
          )
        })
      ) : (
        <div className="text-center text-sm text-[var(--color-secondary)] py-10">
          Tidak ada data shipment ditemukan.
        </div>
      )}
    </div>
  )
}
