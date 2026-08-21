import { useState, useMemo, Fragment } from 'react'
import {
  Eye, Receipt, ChevronDown, ChevronRight,
  Barcode, Tag, PackageSearch,
} from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'
import { getCommodityIcon } from '../utils/commodity'
import type { Shipment, ShipmentDimension } from '../types/shipments.types'

// ─── Grouping Helper ─────────────────────────────────────────────────────────

interface TerimaGroup {
  terimaCode: string
  hasTerima: boolean
  customerName: string
  totalPack: number
  totalBerat: number
  totalVolume: number
  items: Shipment[]
}

function groupByTerima(rows: Shipment[]): TerimaGroup[] {
  const groupsMap = new Map<string, Shipment[]>()

  for (const row of rows) {
    const terima = row.fdTerima ? String(row.fdTerima).trim() : ''
    const key = terima || '__EMPTY_TERIMA__'
    if (!groupsMap.has(key)) {
      groupsMap.set(key, [])
    }
    groupsMap.get(key)!.push(row)
  }

  const groups: TerimaGroup[] = []

  for (const [key, items] of groupsMap.entries()) {
    const hasTerima = key !== '__EMPTY_TERIMA__'
    const terimaCode = hasTerima ? key : 'Tanpa No. Resi'
    const customerName = items.find((it) => it.fdCustName)?.fdCustName || 'Customer Tidak Dikenal'

    const totalPack = items.reduce((sum, it) => sum + Number(it.fdJmlPack || 0), 0)
    const totalBerat = items.reduce((sum, it) => sum + Number(it.fdJmlBerat || 0), 0)
    const totalVolume = items.reduce((sum, it) => sum + Number(it.fdM3 || 0), 0)

    groups.push({
      terimaCode,
      hasTerima,
      customerName,
      totalPack,
      totalBerat,
      totalVolume,
      items,
    })
  }

  return groups
}

// ─── Column definitions ───────────────────────────────────────────────────────

interface BuildColumnsOptions {
  onDetail: (row: Shipment) => void
  isGrouped: boolean
}

function buildColumns({ onDetail, isGrouped }: BuildColumnsOptions) {
  return [
    // Kolom 1: Identitas Baris (No. List & Marking) - Diperlebar
    {
      key: 'identity',
      header: isGrouped ? 'No. List & Marking' : 'Customer & No. List',
      fixed: true,
      className: isGrouped ? 'w-[320px]' : 'w-[340px]',
      render: (row: Shipment) => {
        const markingFull = [row.fdMarkingCode, row.fdMarkingNo].filter(Boolean).join(' ')

        if (isGrouped) {
          return (
            <div className="flex flex-col gap-2 py-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-[var(--color-text)] bg-[var(--color-neutral)] px-2 py-0.5 rounded-md border border-[var(--color-border)] shadow-2xs">
                  {row.fdListCode}
                </span>
                {row.fdBranchCode && (
                  <span className="text-[10px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded border border-[var(--color-primary)]/20">
                    {row.fdBranchCode}
                  </span>
                )}
              </div>
              {markingFull ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)] uppercase tracking-wide">
                  <Tag size={12} className="text-[var(--color-primary)] shrink-0" />
                  <span className="truncate">{markingFull}</span>
                </div>
              ) : (
                <span className="text-xs text-[var(--color-secondary)] font-medium">—</span>
              )}
            </div>
          )
        }

        // Flat Mode: Tampilkan Customer & No. List
        return (
          <div className="flex flex-col gap-2 py-1">
            <span className="font-semibold text-[var(--color-text)] text-sm leading-tight truncate max-w-[280px]" title={row.fdCustName || ''}>
              {row.fdCustName || '—'}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-[var(--color-text)] bg-[var(--color-neutral)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                {row.fdListCode}
              </span>
              {markingFull && (
                <span className="text-xs font-semibold text-[var(--color-secondary)] uppercase truncate max-w-[200px]" title={markingFull}>
                  {markingFull}
                </span>
              )}
            </div>
          </div>
        )
      },
    },

    // Kolom 2: Tracking / Resi
    {
      key: 'tracking',
      header: isGrouped ? 'Local Tracking' : 'Resi / Tracking',
      className: 'w-[170px]',
      render: (row: Shipment) => (
        <div className="flex flex-col gap-1">
          {!isGrouped && row.fdTerima && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text)]">
              <Receipt size={13} className="text-[var(--color-primary)] shrink-0" />
              <span className="font-mono">{row.fdTerima}</span>
            </div>
          )}
          {row.fdLocalTrackingNo ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text)]">
              <Barcode size={14} className="text-[var(--color-secondary)] shrink-0" />
              <span className="truncate font-mono">{row.fdLocalTrackingNo}</span>
            </div>
          ) : (
            <span className="text-xs text-[var(--color-secondary)]">—</span>
          )}
        </div>
      ),
    },

    // Kolom 3: Komoditas & Keterangan - Diperkecil
    {
      key: 'commodity',
      header: 'Komoditas & Keterangan',
      className: 'w-[180px]',
      render: (row: Shipment) => {
        const comodityInfo = getCommodityIcon(row.fdComodityName)
        const Icon = comodityInfo.Icon
        return (
          <div className="flex items-start gap-2 min-w-0">
            <div
              title={comodityInfo.tooltip}
              className={cn('flex items-center justify-center p-1.5 rounded-lg shrink-0 mt-0.5 transition-colors', comodityInfo.bg, comodityInfo.color)}
            >
              <Icon size={14} />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="font-semibold text-[var(--color-text)] text-xs leading-snug truncate block max-w-[130px]" title={row.fdComodity || '—'}>
                {row.fdComodity || '—'}
              </span>
              {row.fdDesc && row.fdDesc.trim() !== row.fdComodity?.trim() && (
                <span className="text-[11px] text-[var(--color-secondary)] leading-tight truncate block max-w-[130px]" title={row.fdDesc.trim()}>
                  {row.fdDesc.trim()}
                </span>
              )}
            </div>
          </div>
        )
      },
    },

    // Kolom 4: Rincian Fisik (Koli / Berat / Volume)
    {
      key: 'summary',
      header: 'Fisik Pengiriman',
      className: 'w-[160px] text-right',
      render: (row: Shipment) => (
        <div className="flex flex-col gap-0.5 text-xs text-right items-end font-medium">
          <div className="text-[var(--color-text)] font-semibold tabular-nums">
            <span>{Number(row.fdJmlPack || 0).toLocaleString('id-ID')}</span>
            <span className="text-[var(--color-secondary)] font-normal text-[11px] ml-1 uppercase">{row.fdSatuan?.trim() || 'koli'}</span>
          </div>
          <div className="text-[var(--color-secondary)] tabular-nums text-xs">
            <span>{Number(row.fdJmlBerat || 0).toLocaleString('id-ID')}</span>
            <span className="text-[var(--color-secondary)] ml-1">kg</span>
          </div>
          <div className="text-[var(--color-primary)] tabular-nums text-xs font-semibold">
            <span>{Number(row.fdM3 || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</span>
            <span className="text-[var(--color-primary)]/60 ml-1 font-normal">m³</span>
          </div>
        </div>
      ),
    },

    // Kolom 5: Status
    {
      key: 'status',
      header: 'Status',
      className: 'w-[140px] text-right',
      render: (row: Shipment) => (
        <div className="flex justify-end">
          <StatusBadge status={row.shipmentStatus} />
        </div>
      ),
    },

    // Kolom 6: Aksi
    {
      key: 'aksi',
      header: '',
      className: 'w-[48px] text-right',
      render: (row: Shipment) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDetail(row) }}
          className="inline-flex items-center justify-center w-8 h-8 text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors cursor-pointer"
          title="Lihat Detail Pengiriman"
        >
          <Eye size={15} />
        </button>
      ),
    },
  ]
}

export const dimColumns = [
  { key: 'fdPjg', header: 'L (cm)', className: 'py-3', render: (row: ShipmentDimension) => formatNumber(row.fdPjg) },
  { key: 'fdLbr', header: 'W (cm)', className: 'py-3', render: (row: ShipmentDimension) => formatNumber(row.fdLbr) },
  { key: 'fdTng', header: 'H (cm)', className: 'py-3', render: (row: ShipmentDimension) => formatNumber(row.fdTng) },
  { key: 'fdQty', header: 'Qty',    className: 'py-3 font-medium', render: (row: ShipmentDimension) => formatNumber(row.fdQty) },
  { key: 'fdDescr', header: 'Description', className: 'py-3' },
]

// ─── Table Skeleton Loader ───────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="w-full divide-y divide-[var(--color-border)]">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4 animate-pulse bg-[var(--color-surface)]">
          <div className="flex items-center gap-3 w-1/4">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-border)] shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 bg-[var(--color-border)] rounded w-3/4" />
              <div className="h-2.5 bg-[var(--color-neutral)] rounded w-1/2" />
            </div>
          </div>
          <div className="w-1/6 space-y-1.5">
            <div className="h-3 bg-[var(--color-border)] rounded w-2/3" />
            <div className="h-2.5 bg-[var(--color-neutral)] rounded w-1/2" />
          </div>
          <div className="w-1/4 space-y-1.5">
            <div className="h-3 bg-[var(--color-border)] rounded w-3/4" />
            <div className="h-2 bg-[var(--color-neutral)] rounded w-1/3" />
          </div>
          <div className="w-1/8 space-y-1 text-right flex flex-col items-end">
            <div className="h-3 bg-[var(--color-border)] rounded w-12" />
            <div className="h-2.5 bg-[var(--color-neutral)] rounded w-8" />
          </div>
          <div className="w-24 h-6 bg-[var(--color-border)] rounded-full" />
          <div className="w-8 h-8 bg-[var(--color-neutral)] rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ShipmentTableViewProps {
  data: Shipment[]
  isLoading: boolean
  selectedCode: string | undefined
  onRowClick: (row: Shipment) => void
  search?: string
  isGroupedByTerima?: boolean
}

export function ShipmentTableView({
  data,
  isLoading,
  selectedCode,
  onRowClick,
  search = '',
  isGroupedByTerima = true,
}: ShipmentTableViewProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const isGroupingActive = Boolean(isGroupedByTerima || search.trim().length > 0)

  const groups = useMemo(() => {
    if (!isGroupingActive) return []
    return groupByTerima(data)
  }, [data, isGroupingActive])

  const toggleGroupCollapse = (terimaCode: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(terimaCode)) {
        next.delete(terimaCode)
      } else {
        next.add(terimaCode)
      }
      return next
    })
  }

  const columns = buildColumns({ onDetail: onRowClick, isGrouped: isGroupingActive })

  if (isLoading) {
    return <TableSkeleton />
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-neutral)] text-[var(--color-secondary)] flex items-center justify-center mb-3">
          <PackageSearch size={24} />
        </div>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Tidak ada data pengiriman</h3>
        <p className="text-xs text-[var(--color-secondary)] max-w-xs">
          Coba sesuaikan filter atau kata kunci pencarian untuk menemukan pengiriman yang diinginkan.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full relative">
      <table className="w-full text-xs sm:text-sm table-fixed min-w-[1020px]">
        <thead className="sticky top-0 z-20 shadow-xs bg-[var(--color-neutral)] border-b border-[var(--color-border)]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 sm:px-5 py-3 text-left font-semibold text-[var(--color-secondary)] text-[11px] tracking-wider uppercase whitespace-nowrap',
                  col.fixed && 'sticky left-0 z-30 bg-[var(--color-neutral)] shadow-[1px_0_0_0_var(--color-border)]',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Grouped Rendering */}
        {isGroupingActive ? (
          <tbody className="divide-y divide-[var(--color-border)]">
            {groups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.terimaCode)

              return (
                <Fragment key={group.terimaCode}>
                  {/* Group Header Row */}
                  <tr
                    onClick={() => toggleGroupCollapse(group.terimaCode)}
                    className="bg-[var(--color-neutral)] hover:opacity-90 transition-colors cursor-pointer border-t-2 border-[var(--color-border)] select-none group"
                  >
                    <td colSpan={columns.length} className="px-4 sm:px-5 py-2.5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        {/* Left: Collapse toggle + Terima info + Customer */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-wrap sm:flex-nowrap">
                          <button
                            type="button"
                            className="p-1 rounded-md text-[var(--color-secondary)] group-hover:text-[var(--color-text)] transition-colors cursor-pointer"
                            title={isCollapsed ? 'Buka grup' : 'Tutup grup'}
                          >
                            {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                          </button>

                          {/* 1. Customer Name */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-sm text-[var(--color-text)] truncate max-w-[280px]">
                              {group.customerName}
                            </span>
                          </div>

                          {/* 2. Nomor Resi (Terima) */}
                          <div className="inline-flex items-center gap-1.5 bg-[var(--color-surface)] px-2.5 py-0.5 rounded-lg border border-[var(--color-border)] shadow-2xs text-xs shrink-0 font-medium">
                            <Receipt size={12} className="text-[var(--color-primary)] shrink-0" />
                            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-secondary)]">Resi:</span>
                            <span className="font-mono font-bold text-[var(--color-text)]">{group.terimaCode}</span>
                          </div>

                          {/* 3. Parcial Tag */}
                          {group.items.length > 1 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                              {group.items.length} marking (parcial)
                            </span>
                          )}
                        </div>

                        {/* Right: Aggregate totals for this Terima group */}
                        <div className="flex items-center gap-3 sm:gap-4 text-xs text-[var(--color-secondary)] shrink-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[var(--color-secondary)]">Koli:</span>
                            <strong className="text-[var(--color-text)] font-semibold tabular-nums">{group.totalPack.toLocaleString('id-ID')}</strong>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[var(--color-secondary)]">Berat:</span>
                            <strong className="text-[var(--color-text)] font-semibold tabular-nums">{group.totalBerat.toLocaleString('id-ID')} kg</strong>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[var(--color-secondary)]">Volume:</span>
                            <strong className="text-[var(--color-primary)] font-semibold tabular-nums">{group.totalVolume.toLocaleString('id-ID', { maximumFractionDigits: 2 })} m³</strong>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Group Child Items */}
                  {!isCollapsed &&
                    group.items.map((row) => {
                      const isSelected = selectedCode === row.fdListCode
                      return (
                        <tr
                          key={row.fdListCode}
                          onClick={() => onRowClick(row)}
                          className={cn(
                            'border-b border-[var(--color-border)] transition-colors duration-150 bg-[var(--color-surface)] hover:bg-[var(--color-primary)]/5 cursor-pointer',
                            isSelected && 'bg-[var(--color-primary)]/8 ring-1 ring-inset ring-[var(--color-primary)]/20'
                          )}
                        >
                          {columns.map((col) => (
                            <td
                              key={col.key}
                              className={cn(
                                'px-4 sm:px-5 py-3 align-middle text-[var(--color-text)] text-xs sm:text-sm overflow-hidden',
                                col.fixed && 'sticky left-0 z-10 bg-inherit shadow-[1px_0_0_0_var(--color-border)]',
                                col.className
                              )}
                            >
                              {col.render ? col.render(row) : String((row as unknown as Record<string, unknown>)[col.key] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                </Fragment>
              )
            })}
          </tbody>
        ) : (
          /* Standard Flat Rendering (Non-grouped) */
          <tbody className="divide-y divide-[var(--color-border)]">
            {data.map((row) => {
              const isSelected = selectedCode === row.fdListCode
              return (
                <tr
                  key={row.fdListCode}
                  onClick={() => onRowClick(row)}
                  className={cn(
                    'border-b border-[var(--color-border)] transition-colors duration-150 bg-[var(--color-surface)] hover:bg-[var(--color-primary)]/5 cursor-pointer',
                    isSelected && 'bg-[var(--color-primary)]/8 ring-1 ring-inset ring-[var(--color-primary)]/20'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 sm:px-5 py-3 align-middle text-[var(--color-text)] text-xs sm:text-sm overflow-hidden',
                        col.fixed && 'sticky left-0 z-10 bg-inherit shadow-[1px_0_0_0_var(--color-border)]',
                        col.className
                      )}
                    >
                      {col.render ? col.render(row) : String((row as unknown as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        )}
      </table>
    </div>
  )
}
