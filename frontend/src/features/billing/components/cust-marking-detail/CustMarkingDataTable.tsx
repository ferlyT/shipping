import { useMemo, Fragment } from 'react'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
  ChevronDown,
  ChevronRight,
  Receipt,
  AlertTriangle,
} from 'lucide-react'
import { formatDate, formatDecimal, formatNumber } from '@/lib/utils'
import type {
  ColumnPreset,
  InvoiceGroup,
  NormalizedMarkingRow,
  SortField,
  SortOrder,
} from './types'

export interface CustMarkingDataTableProps {
  rows: NormalizedMarkingRow[]
  columnPreset: ColumnPreset
  sortField: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  groupByInvoice?: boolean
  invoiceGroups?: InvoiceGroup[]
  collapsedInvoices?: Set<string>
  onToggleCollapse?: (inv: string) => void
}

export function CustMarkingDataTable({
  rows,
  columnPreset,
  sortField,
  sortOrder,
  onSort,
  groupByInvoice = true,
  invoiceGroups = [],
  collapsedInvoices,
  onToggleCollapse,
}: CustMarkingDataTableProps) {
  // Detect if current rows represent Air shipment mode
  const isAirMode = useMemo(() => rows.some((r) => r.listType === 1), [rows])

  // M3 uses 4 decimal digits as project standard, while Air VFC uses 2 decimal digits
  const volDecimals = isAirMode ? 2 : 4

  // Count unique branches present in the dataset
  const uniqueBranchCount = useMemo(
    () => new Set(rows.map((r) => r.branchCode || r.bc).filter(Boolean)).size,
    [rows]
  )

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[var(--color-tertiary)] shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[var(--color-tertiary)] shrink-0" />
    )
  }

  const thClass =
    'px-2 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-secondary)] border-b border-[var(--color-border)] select-none cursor-pointer hover:text-[var(--color-primary)] group transition-colors whitespace-nowrap'

  // Visibility flags per preset
  const showFinance = columnPreset === 'all' || columnPreset === 'finance'
  const showPhysical = columnPreset === 'all' || columnPreset === 'physical'
  const showComplaint = columnPreset === 'all' || columnPreset === 'complaint'

  const visibleColCount = useMemo(() => {
    let count = 7 // Base: No, BC., No. Invoice, Tgl. Inv, Marking No, Comodity, Ket
    if (showFinance) count += 3 // Curr, Value, Fc
    if (showPhysical) count += 2 // Berat, Berat SJ
    if (showComplaint) count += 1 // Berat K
    if (showFinance) count += 1 // KG Bill
    if (showPhysical) count += 3 // Qty SJ, Qty Gdg, Qty PL
    if (showComplaint) count += 1 // Qty K
    if (showFinance) count += 2 // Tipe, Tax
    if (showPhysical) count += 2 // M3 Pl, M3/Vfc
    if (showComplaint) count += 1 // M3 K/Vfc K
    if (showPhysical) count += 1 // M3 Bill/Vfc Bill
    return count
  }, [showFinance, showPhysical, showComplaint])

  const renderRow = (
    r: NormalizedMarkingRow,
    idx: number,
    displayNo: string | number,
    isGrouped: boolean = false
  ) => {
    const m3Current = isAirMode ? r.vfcGdg : r.m3Gdg
    const m3Komplain = isAirMode ? r.vfcK : r.m3K
    const m3Billing = isAirMode ? r.vfcBill : r.m3Bill
    const hasRowDiscrepancy =
      r.isQtyKomplainMismatch ||
      (r.owGdg || 0) > 0 ||
      (r.owSJ || 0) > 0 ||
      (r.owK || 0) > 0 ||
      r.isUnderbilledM3

    return (
      <tr
        key={`${r.invoice}-${r.listCode}-${idx}`}
        className={`hover:bg-[var(--color-neutral)]/40 transition-colors text-[11px] group ${
          hasRowDiscrepancy
            ? r.isQtyKomplainMismatch
              ? 'bg-amber-500/5 dark:bg-amber-950/10 border-l-2 border-l-amber-500'
              : 'bg-rose-500/5 dark:bg-rose-950/10 border-l-2 border-l-rose-500'
            : isGrouped
              ? 'border-l-2 border-l-[var(--color-tertiary)]/30'
              : ''
        }`}
      >
        {/* 1. No - Sticky Left 0 */}
        <td className="sticky left-0 z-20 bg-[var(--color-surface)] group-hover:bg-[var(--color-neutral)]/20 px-2 py-1.5 text-center text-[var(--color-secondary)] font-mono tabular-nums border-r border-[var(--color-border)]">
          {displayNo}
        </td>

        {/* 2. BC. - Sticky Left 40px (left-10) */}
        <td className="sticky left-10 z-20 bg-[var(--color-surface)] group-hover:bg-[var(--color-neutral)]/20 px-2 py-1.5 text-center border-r border-[var(--color-border)]">
          <span className="px-1 py-0.5 rounded-xs text-[10px] font-semibold border border-[var(--color-border)] bg-[var(--color-neutral)]/60 text-[var(--color-secondary)] font-mono">
            {r.branchCode}
          </span>
        </td>

        {/* 3. No. Invoice - Sticky Left 88px */}
        <td className="sticky left-[88px] z-20 bg-[var(--color-surface)] group-hover:bg-[var(--color-neutral)]/20 px-2 py-1.5 font-mono font-semibold text-[var(--color-primary)] tabular-nums whitespace-nowrap border-r border-[var(--color-border)] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.25)]">
          {isGrouped ? (
            <div className="flex items-center gap-1">
              <span className="text-[var(--color-secondary)]/50 text-[10px]">↳</span>
              <span>{r.invoice}</span>
            </div>
          ) : (
            r.invoice
          )}
        </td>

        {/* 4. Tgl. Inv */}
        <td className="px-2 py-1.5 text-[var(--color-secondary)] tabular-nums whitespace-nowrap font-mono">
          {r.dateStr ? formatDate(r.dateStr) : '—'}
        </td>

        {/* 5. Marking No */}
        <td className="px-2 py-1.5 font-bold text-[var(--color-primary)] whitespace-nowrap">
          {r.markingNo || r.marking || '—'}
        </td>

        {/* 6. Comodity */}
        <td
          className="px-2 py-1.5 text-[var(--color-secondary)] max-w-[140px] truncate"
          title={r.fdComodity || r.comodity}
        >
          {r.fdComodity || r.comodity || '—'}
        </td>

        {/* 7. Ket */}
        <td className="px-2 py-1.5 text-[var(--color-secondary)] max-w-[140px] truncate" title={r.fdDesc}>
          {r.fdDesc || '—'}
        </td>

        {/* 8, 9, 10. Curr, Value, Fc */}
        {showFinance && (
          <>
            <td className="px-2 py-1.5 text-center font-mono text-[var(--color-secondary)]">
              {r.currValue1 || '—'}
            </td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--color-primary)]">
              {r.value2 > 0 ? formatNumber(r.value2) : '0'}
            </td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--color-primary)]">
              {r.fc > 0 ? formatNumber(r.fc) : '0'}
            </td>
          </>
        )}

        {/* 11, 12. Berat, Berat SJ */}
        {showPhysical && (
          <>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--color-primary)] font-medium">
              {formatDecimal(r.weightGdg, 2)}
            </td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--color-secondary)]">
              {formatDecimal(r.weightSJ, 2)}
            </td>
          </>
        )}

        {/* 13. Berat K */}
        {showComplaint && (
          <td className="px-2 py-1.5 text-right font-mono tabular-nums">
            {r.weightK > 0 ? (
              <span className="font-semibold text-amber-500">{formatDecimal(r.weightK, 2)}</span>
            ) : (
              <span className="text-[var(--color-secondary)]">—</span>
            )}
          </td>
        )}

        {/* 14. KG Bill */}
        {showFinance && (
          <td className="px-2 py-1.5 text-right font-mono tabular-nums font-semibold text-[var(--color-primary)]">
            {formatDecimal(r.kgBill, 2)}
          </td>
        )}

        {/* 15, 16, 17. Qty SJ, Qty Gdg, Qty PL */}
        {showPhysical && (
          <>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--color-secondary)]">
              {formatNumber(r.qtySJ)}
            </td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums font-medium text-[var(--color-primary)]">
              {formatNumber(r.qtyGdg)}
            </td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">
              {r.isPlEmpty ? (
                <span
                  className="inline-block px-1 py-0.5 rounded-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  title="Qty PL = 0 (Data fisik belum lengkap)"
                >
                  0
                </span>
              ) : (
                formatNumber(r.qtyPL)
              )}
            </td>
          </>
        )}

        {/* 18. Qty K */}
        {showComplaint && (
          <td className="px-2 py-1.5 text-right font-mono tabular-nums">
            {r.qtyK > 0 ? (
              r.isQtyKomplainMismatch ? (
                <span
                  className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40"
                  title={`Peringatan: Qty Komplain (${formatNumber(r.qtyK)}) berbeda dengan Qty Gudang (${formatNumber(r.qtyGdg)})`}
                >
                  {formatNumber(r.qtyK)} ⚠️
                </span>
              ) : (
                <span className="font-semibold text-amber-500">{formatNumber(r.qtyK)}</span>
              )
            ) : (
              <span className="text-[var(--color-secondary)]">—</span>
            )}
          </td>
        )}

        {/* 19, 20. Tipe, Tax */}
        {showFinance && (
          <>
            <td className="px-2 py-1.5 text-center whitespace-nowrap">
              <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-medium bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)]">
                {r.typeComodityText || '—'}
              </span>
            </td>
            <td className="px-2 py-1.5 text-center whitespace-nowrap">
              {r.isTax ? (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  title="Tax Return (YES)"
                >
                  YES
                </span>
              ) : (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded-xs text-[10px] font-medium border border-dashed border-[var(--color-border)] text-[var(--color-secondary)]/60"
                  title="Non Tax (NO)"
                >
                  NO
                </span>
              )}
            </td>
          </>
        )}

        {/* 21, 22. M3 Pl, M3/Vfc */}
        {showPhysical && (
          <>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">
              {r.isPlEmpty ? (
                <span
                  className="inline-block px-1 py-0.5 rounded-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  title="Qty PL = 0"
                >
                  {formatDecimal(r.m3PL, 4)}
                </span>
              ) : (
                <span className="text-[var(--color-secondary)]">
                  {r.m3PL > 0 ? formatDecimal(r.m3PL, 4) : '—'}
                </span>
              )}
            </td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">
              {r.isStatusNonStandard ? (
                <span
                  className="inline-block px-1 py-0.5 rounded-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30"
                  title={`Status transaksi: ${r.status}`}
                >
                  {formatDecimal(m3Current, volDecimals)}
                </span>
              ) : (
                <span className="font-semibold text-[var(--color-primary)]">
                  {formatDecimal(m3Current, volDecimals)}
                </span>
              )}
            </td>
          </>
        )}

        {/* 23. M3 K / Vfc K */}
        {showComplaint && (
          <td className="px-2 py-1.5 text-right font-mono tabular-nums">
            {m3Komplain > 0 ? (
              <span className="font-semibold text-amber-500">{formatDecimal(m3Komplain, volDecimals)}</span>
            ) : (
              <span className="text-[var(--color-secondary)]">—</span>
            )}
          </td>
        )}

        {/* 24. M3 Bill / Vfc Bill */}
        {showPhysical && (
          <td className="px-2 py-1.5 text-right font-mono tabular-nums">
            {r.isUnderbilledM3 ? (
              <span
                className="inline-block px-1 py-0.5 rounded-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                title="Peringatan: M³ Gudang > M³ Bill"
              >
                {formatDecimal(m3Billing, volDecimals)}
              </span>
            ) : (
              <span className="font-bold text-[var(--color-primary)]">
                {formatDecimal(m3Billing, volDecimals)}
              </span>
            )}
          </td>
        )}
      </tr>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[var(--color-surface)] font-[var(--font-body)]">
      <table className="w-full text-left text-xs border-collapse min-w-max">
        {/* Sticky Header - 23 Columns with Sticky Identity Columns (No, BC, No. Invoice) */}
        <thead className="bg-[var(--color-surface)] sticky top-0 z-30 border-b border-[var(--color-border)] shadow-xs">
          <tr>
            {/* 1. No - Sticky Left 0 */}
            <th className="sticky left-0 z-40 bg-[var(--color-surface)] px-2 py-2 w-10 text-center text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-secondary)] border-b border-r border-[var(--color-border)]">
              No.
            </th>
            {/* 2. BC - Sticky Left 40px (left-10) */}
            <th
              onClick={() => onSort('branchCode')}
              className={`sticky left-10 z-40 bg-[var(--color-surface)] ${thClass} text-center w-12 border-r border-[var(--color-border)]`}
            >
              <div className="flex items-center justify-center gap-1">
                <span>BC.</span>
                {renderSortIcon('branchCode')}
              </div>
            </th>
            {/* 3. No. Invoice - Sticky Left 88px */}
            <th
              onClick={() => onSort('invoice')}
              className={`sticky left-[88px] z-40 bg-[var(--color-surface)] ${thClass} border-r border-[var(--color-border)] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.25)]`}
            >
              <div className="flex items-center gap-1">
                <span>No. Invoice</span>
                {renderSortIcon('invoice')}
              </div>
            </th>
            {/* 4. Tgl. Inv */}
            <th onClick={() => onSort('date')} className={thClass}>
              <div className="flex items-center gap-1">
                <span>Tgl. Inv</span>
                {renderSortIcon('date')}
              </div>
            </th>
            {/* 5. Marking No */}
            <th onClick={() => onSort('markingNo')} className={thClass}>
              <div className="flex items-center gap-1">
                <span>Marking No</span>
                {renderSortIcon('markingNo')}
              </div>
            </th>
            {/* 6. Comodity */}
            <th onClick={() => onSort('comodity')} className={thClass}>
              <div className="flex items-center gap-1">
                <span>Comodity</span>
                {renderSortIcon('comodity')}
              </div>
            </th>
            {/* 7. Ket */}
            <th onClick={() => onSort('fdDesc')} className={thClass}>
              <div className="flex items-center gap-1">
                <span>Ket</span>
                {renderSortIcon('fdDesc')}
              </div>
            </th>

            {/* 8, 9, 10. Curr, Value, Fc (Finance) */}
            {showFinance && (
              <>
                <th onClick={() => onSort('currValue1')} className={`${thClass} text-center w-12`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Curr</span>
                    {renderSortIcon('currValue1')}
                  </div>
                </th>
                <th onClick={() => onSort('value2')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Value</span>
                    {renderSortIcon('value2')}
                  </div>
                </th>
                <th onClick={() => onSort('fc')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Fc</span>
                    {renderSortIcon('fc')}
                  </div>
                </th>
              </>
            )}

            {/* 11, 12. Berat, Berat SJ (Physical) */}
            {showPhysical && (
              <>
                <th onClick={() => onSort('weightGdg')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Berat</span>
                    {renderSortIcon('weightGdg')}
                  </div>
                </th>
                <th onClick={() => onSort('weightSJ')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Berat SJ</span>
                    {renderSortIcon('weightSJ')}
                  </div>
                </th>
              </>
            )}

            {/* 13. Berat K (Complaint) */}
            {showComplaint && (
              <th onClick={() => onSort('weightK')} className={`${thClass} text-right`}>
                <div className="flex items-center justify-end gap-1">
                  <span>Berat K</span>
                  {renderSortIcon('weightK')}
                </div>
              </th>
            )}

            {/* 14. KG Bill (Finance) */}
            {showFinance && (
              <th onClick={() => onSort('kgBill')} className={`${thClass} text-right`}>
                <div className="flex items-center justify-end gap-1">
                  <span>KG Bill</span>
                  {renderSortIcon('kgBill')}
                </div>
              </th>
            )}

            {/* 15, 16, 17. Qty SJ, Qty Gdg, Qty PL (Physical) */}
            {showPhysical && (
              <>
                <th onClick={() => onSort('qtySJ')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Qty SJ</span>
                    {renderSortIcon('qtySJ')}
                  </div>
                </th>
                <th onClick={() => onSort('qtyGdg')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Qty Gdg</span>
                    {renderSortIcon('qtyGdg')}
                  </div>
                </th>
                <th onClick={() => onSort('qtyPL')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Qty PL</span>
                    {renderSortIcon('qtyPL')}
                  </div>
                </th>
              </>
            )}

            {/* 18. Qty K (Complaint) */}
            {showComplaint && (
              <th onClick={() => onSort('qtyK')} className={`${thClass} text-right`}>
                <div className="flex items-center justify-end gap-1">
                  <span>Qty K</span>
                  {renderSortIcon('qtyK')}
                </div>
              </th>
            )}

            {/* 19, 20. Tipe, Tax (Finance) */}
            {showFinance && (
              <>
                <th onClick={() => onSort('typeComodityText')} className={`${thClass} text-center`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Tipe</span>
                    {renderSortIcon('typeComodityText')}
                  </div>
                </th>
                <th onClick={() => onSort('taxVal')} className={`${thClass} text-center w-14`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Tax</span>
                    {renderSortIcon('taxVal')}
                  </div>
                </th>
              </>
            )}

            {/* 21, 22. M3 Pl, M3 / Vfc (Physical) */}
            {showPhysical && (
              <>
                <th onClick={() => onSort('m3PL')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>M3 Pl</span>
                    {renderSortIcon('m3PL')}
                  </div>
                </th>
                <th onClick={() => onSort('m3Gdg')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{isAirMode ? 'Vfc' : 'M3'}</span>
                    {renderSortIcon('m3Gdg')}
                  </div>
                </th>
              </>
            )}

            {/* 23. M3 K / Vfc K (Complaint) */}
            {showComplaint && (
              <th onClick={() => onSort('m3K')} className={`${thClass} text-right`}>
                <div className="flex items-center justify-end gap-1">
                  <span>{isAirMode ? 'Vfc K' : 'M3 K'}</span>
                  {renderSortIcon('m3K')}
                </div>
              </th>
            )}

            {/* 24. M3 Bill / Vfc Bill (Physical / Final Volume) */}
            {showPhysical && (
              <th onClick={() => onSort('m3Bill')} className={`${thClass} text-right`}>
                <div className="flex items-center justify-end gap-1">
                  <span>{isAirMode ? 'Vfc Bill' : 'M3 Bill'}</span>
                  {renderSortIcon('m3Bill')}
                </div>
              </th>
            )}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-[var(--color-border)]/60">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={visibleColCount} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center justify-center text-[var(--color-secondary)]">
                  <Inbox className="w-8 h-8 opacity-30 mb-2" />
                  <p className="text-xs font-semibold text-[var(--color-primary)]">Tidak ada data yang cocok</p>
                  <p className="text-[11px] mt-0.5 opacity-80">Silakan sesuaikan filter pencarian atau cabang Anda.</p>
                </div>
              </td>
            </tr>
          ) : groupByInvoice && invoiceGroups.length > 0 ? (
            invoiceGroups.map((group, groupIdx) => {
              const isCollapsed = collapsedInvoices?.has(group.invoice) ?? false
              return (
                <Fragment key={`inv-group-${group.invoice}-${groupIdx}`}>
                  {/* Header Group Baris Invoice */}
                  <tr
                    onClick={() => onToggleCollapse?.(group.invoice)}
                    className="bg-[var(--color-neutral)]/40 hover:bg-[var(--color-neutral)]/70 dark:bg-[var(--color-neutral)]/25 dark:hover:bg-[var(--color-neutral)]/45 border-t-2 border-b border-[var(--color-border)] cursor-pointer select-none transition-colors"
                  >
                    <td colSpan={visibleColCount} className="px-3 py-2">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        {/* Sisi Kiri: Chevron, No. Invoice, Klasifikasi, Tgl, BC, Item count */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="p-0.5 rounded text-[var(--color-secondary)] hover:text-[var(--color-primary)]">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-[var(--color-secondary)]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[var(--color-tertiary)]" />
                            )}
                          </span>

                          <Receipt className="w-3.5 h-3.5 text-[var(--color-tertiary)] opacity-80" />

                          <span className="font-mono font-bold text-xs text-[var(--color-primary)] tracking-wide">
                            {group.invoice}
                          </span>

                          {group.isInvoiceUtama && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                              Utama
                            </span>
                          )}
                          {group.isBillGabungan && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                              Gabungan
                            </span>
                          )}
                          {group.isBillTambahan && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Tambahan
                            </span>
                          )}

                          {group.dateStr && (
                            <span className="text-[11px] font-mono text-[var(--color-secondary)]">
                              {formatDate(group.dateStr)}
                            </span>
                          )}

                          {group.branchCode && group.branchCode !== '—' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)]">
                              BC: {group.branchCode}
                            </span>
                          )}

                          <span className="px-1.5 py-0.2 rounded-full text-[10.5px] font-mono font-medium bg-[var(--color-neutral)] text-[var(--color-secondary)]">
                            {group.rows.length} {group.rows.length > 1 ? 'baris data' : 'baris'}
                          </span>

                          {group.hasSelisih && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Ada Selisih
                            </span>
                          )}
                          {group.isQtyKomplainMismatch && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Qty Mismatch
                            </span>
                          )}
                        </div>

                        {/* Sisi Kanan: Mini Subtotal Baris Invoice */}
                        <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums flex-wrap text-[var(--color-secondary)]">
                          {showPhysical && (
                            <>
                              <span>
                                Qty: <strong className="text-[var(--color-primary)]">{formatNumber(group.totalQtyGdg)}</strong>
                              </span>
                              <span>
                                Berat: <strong className="text-[var(--color-primary)]">{formatDecimal(group.totalWeightGdg, 2)}</strong> kg
                              </span>
                              <span>
                                {isAirMode ? 'VFC' : 'M³'}:{' '}
                                <strong className="text-[var(--color-primary)]">
                                  {formatDecimal(isAirMode ? group.totalVfcGdg : group.totalM3Gdg, volDecimals)}
                                </strong>
                              </span>
                              <span>
                                Bill:{' '}
                                <strong className="text-[var(--color-primary)]">
                                  {formatDecimal(isAirMode ? group.totalVfcBill : group.totalM3Bill, volDecimals)}
                                </strong>
                              </span>
                            </>
                          )}
                          {showFinance && group.totalValue2 > 0 && (
                            <span>
                              Rp <strong className="text-emerald-600 dark:text-emerald-400">{formatNumber(group.totalValue2)}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Baris data kargo jika grup dibuka */}
                  {!isCollapsed &&
                    group.rows.map((r, itemIdx) =>
                      renderRow(
                        r,
                        itemIdx,
                        group.rows.length > 1 ? `${groupIdx + 1}.${itemIdx + 1}` : groupIdx + 1,
                        true
                      )
                    )}

                  {/* Subtotal Row jika grup memiliki > 1 item dan tidak collapsed */}
                  {!isCollapsed && group.rows.length > 1 && (
                    <tr className="bg-[var(--color-neutral)]/20 border-b border-dashed border-[var(--color-border)] font-semibold text-[10.5px]">
                      {/* 1. No - Sticky Left 0 */}
                      <td className="sticky left-0 z-20 bg-[var(--color-surface)] py-1.5 px-2 text-center text-[var(--color-secondary)] text-[10px] font-mono border-r border-[var(--color-border)]">
                        ∑
                      </td>
                      {/* 2. BC - Sticky Left 40px */}
                      <td className="sticky left-10 z-20 bg-[var(--color-surface)] py-1.5 px-1 text-center text-[var(--color-secondary)] text-[10px] border-r border-[var(--color-border)]">
                        —
                      </td>
                      {/* 3. No. Invoice - Sticky Left 88px */}
                      <td className="sticky left-[88px] z-20 bg-[var(--color-surface)] py-1.5 px-2 font-mono text-[10px] text-[var(--color-secondary)] whitespace-nowrap border-r border-[var(--color-border)] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.25)]">
                        Subtotal ({group.rows.length})
                      </td>
                      {/* 4. Tgl */}
                      <td className="py-1.5 px-2 text-[var(--color-secondary)] font-mono text-[10px]">—</td>
                      {/* 5. Marking No */}
                      <td className="py-1.5 px-2 text-[var(--color-secondary)] font-mono text-[10px]">—</td>
                      {/* 6. Comodity */}
                      <td className="py-1.5 px-2 text-[var(--color-secondary)] font-mono text-[10px]">—</td>
                      {/* 7. Ket */}
                      <td className="py-1.5 px-2 text-[var(--color-secondary)] font-mono text-[10px]">—</td>

                      {/* 8, 9, 10. Curr, Value, Fc */}
                      {showFinance && (
                        <>
                          <td className="py-1.5 px-1 text-center text-[var(--color-secondary)]">—</td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums text-[var(--color-primary)]">
                            {group.totalValue2 > 0 ? formatNumber(group.totalValue2) : '0'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums text-[var(--color-primary)]">
                            {group.totalFc > 0 ? formatNumber(group.totalFc) : '0'}
                          </td>
                        </>
                      )}

                      {/* 11, 12. Berat, Berat SJ */}
                      {showPhysical && (
                        <>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums text-[var(--color-primary)] font-bold">
                            {formatDecimal(group.totalWeightGdg, 2)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums text-[var(--color-secondary)]">
                            {formatDecimal(group.totalWeightSJ, 2)}
                          </td>
                        </>
                      )}

                      {/* 13. Berat K */}
                      {showComplaint && (
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums text-amber-500 font-bold">
                          {group.totalWeightK > 0 ? formatDecimal(group.totalWeightK, 2) : '—'}
                        </td>
                      )}

                      {/* 14. KG Bill */}
                      {showFinance && (
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums font-bold text-[var(--color-primary)]">
                          {formatDecimal(group.totalKgBill, 2)}
                        </td>
                      )}

                      {/* 15, 16, 17. Qty SJ, Qty Gdg, Qty PL */}
                      {showPhysical && (
                        <>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums text-[var(--color-secondary)]">
                            {formatNumber(group.totalQtySJ)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums font-bold text-[var(--color-primary)]">
                            {formatNumber(group.totalQtyGdg)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums text-[var(--color-secondary)]">
                            {formatNumber(group.totalQtyPL)}
                          </td>
                        </>
                      )}

                      {/* 18. Qty K */}
                      {showComplaint && (
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums text-amber-500">
                          {group.totalQtyK > 0 ? formatNumber(group.totalQtyK) : '—'}
                        </td>
                      )}

                      {/* 19, 20. Tipe, Tax */}
                      {showFinance && (
                        <>
                          <td className="py-1.5 px-1 text-center text-[var(--color-secondary)]">—</td>
                          <td className="py-1.5 px-1 text-center text-[var(--color-secondary)]">—</td>
                        </>
                      )}

                      {/* 21, 22. M3 PL, M3/VFC */}
                      {showPhysical && (
                        <>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums text-[var(--color-secondary)]">
                            {formatDecimal(group.totalM3PL, 4)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums text-[var(--color-primary)] font-bold">
                            {formatDecimal(isAirMode ? group.totalVfcGdg : group.totalM3Gdg, volDecimals)}
                          </td>
                        </>
                      )}

                      {/* 23. M3 K / VFC K */}
                      {showComplaint && (
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums font-bold text-amber-500">
                          {formatDecimal(isAirMode ? group.totalVfcK : group.totalM3K, volDecimals)}
                        </td>
                      )}

                      {/* 24. M3 Bill / VFC Bill */}
                      {showPhysical && (
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums font-bold text-[var(--color-primary)]">
                          {formatDecimal(isAirMode ? group.totalVfcBill : group.totalM3Bill, volDecimals)}
                        </td>
                      )}
                    </tr>
                  )}
                </Fragment>
              )
            })
          ) : (
            rows.map((r, idx) => renderRow(r, idx, idx + 1, false))
          )}
        </tbody>

        {/* Sticky Footer - Exact 24 columns alignment with sums matching FoxPro Grid */}
        {rows.length > 0 && (
          <tfoot className="sticky bottom-0 z-30 bg-[var(--color-surface)] border-t-2 border-[var(--color-border)] font-bold text-[11px] shadow-lg">
            <tr className="divide-x divide-[var(--color-border)]/50">
              {/* 1. TOTAL label - Sticky Left 0 */}
              <td className="sticky left-0 z-40 bg-[var(--color-surface)] py-2 px-2 text-center uppercase tracking-wider text-[var(--color-secondary)] font-bold font-mono border-r border-[var(--color-border)]">
                TOT
              </td>
              {/* 2. BC - Sticky Left 10 (40px) */}
              <td className="sticky left-10 z-40 bg-[var(--color-surface)] py-2 px-1 text-center text-[var(--color-secondary)] text-[10px] border-r border-[var(--color-border)]">
                {uniqueBranchCount} Cab
              </td>
              {/* 3. Total Rows - Sticky Left 88px */}
              <td className="sticky left-[88px] z-40 bg-[var(--color-surface)] py-2 px-2 font-mono tabular-nums text-[var(--color-primary)] whitespace-nowrap border-r border-[var(--color-border)] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.25)]">
                {rows.length} Data
              </td>
              {/* 4. Tgl */}
              <td className="py-2 px-2 text-[var(--color-secondary)] font-mono text-[10px]">—</td>
              {/* 5. Marking */}
              <td className="py-2 px-2 text-[var(--color-secondary)] font-mono text-[10px]">—</td>
              {/* 6. Comodity */}
              <td className="py-2 px-2 text-[var(--color-secondary)] font-mono text-[10px]">—</td>
              {/* 7. Ket */}
              <td className="py-2 px-2 text-[var(--color-secondary)] font-mono text-[10px]">—</td>

              {/* 8, 9, 10. Curr, Value, Fc */}
              {showFinance && (
                <>
                  <td className="py-2 px-1 text-center text-[var(--color-secondary)]">—</td>
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-[var(--color-primary)]">
                    {formatNumber(rows.reduce((sum, r) => sum + (r.value2 || 0), 0))}
                  </td>
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-[var(--color-primary)]">
                    {formatNumber(rows.reduce((sum, r) => sum + (r.fc || 0), 0))}
                  </td>
                </>
              )}

              {/* 11, 12. Berat, Berat SJ */}
              {showPhysical && (
                <>
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-[var(--color-primary)] font-bold">
                    {formatDecimal(rows.reduce((sum, r) => sum + (r.weightGdg || 0), 0), 2)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-[var(--color-secondary)]">
                    {formatDecimal(rows.reduce((sum, r) => sum + (r.weightSJ || 0), 0), 2)}
                  </td>
                </>
              )}

              {/* 13. Berat K */}
              {showComplaint && (
                <td className="py-2 px-2 text-right font-mono tabular-nums text-amber-500 font-bold">
                  {formatDecimal(rows.reduce((sum, r) => sum + (r.weightK || 0), 0), 2)}
                </td>
              )}

              {/* 14. KG Bill */}
              {showFinance && (
                <td className="py-2 px-2 text-right font-mono tabular-nums font-bold text-[var(--color-primary)]">
                  {formatDecimal(rows.reduce((sum, r) => sum + (r.kgBill || 0), 0), 2)}
                </td>
              )}

              {/* 15, 16, 17. Qty SJ, Qty Gdg, Qty PL */}
              {showPhysical && (
                <>
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-[var(--color-secondary)]">
                    {formatNumber(rows.reduce((sum, r) => sum + (r.qtySJ || 0), 0))}
                  </td>
                  <td className="py-2 px-2 text-right font-mono tabular-nums font-bold text-[var(--color-primary)]">
                    {formatNumber(rows.reduce((sum, r) => sum + (r.qtyGdg || 0), 0))}
                  </td>
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-[var(--color-secondary)]">
                    {formatNumber(rows.reduce((sum, r) => sum + (r.qtyPL || 0), 0))}
                  </td>
                </>
              )}

              {/* 18. Qty K */}
              {showComplaint && (
                <td className="py-2 px-2 text-right font-mono tabular-nums text-amber-500">
                  {(() => {
                    const totalK = rows.reduce((sum, r) => sum + (r.qtyK || 0), 0)
                    const totalGdg = rows.reduce((sum, r) => sum + (r.qtyGdg || 0), 0)
                    const hasMismatch = totalK > 0 && totalK !== totalGdg
                    return hasMismatch ? (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40"
                        title={`Peringatan: Total Qty Komplain (${formatNumber(totalK)}) berbeda dengan Total Qty Gudang (${formatNumber(totalGdg)})`}
                      >
                        {formatNumber(totalK)} ⚠️
                      </span>
                    ) : (
                      formatNumber(totalK)
                    )
                  })()}
                </td>
              )}

              {/* 19, 20. Tipe, Tax */}
              {showFinance && (
                <>
                  <td className="py-2 px-1 text-center text-[var(--color-secondary)]">—</td>
                  <td className="py-2 px-1 text-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {rows.filter((r) => r.isTax).length} YES
                  </td>
                </>
              )}

              {/* 21, 22. M3 Pl, M3/Vfc */}
              {showPhysical && (
                <>
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-[var(--color-secondary)]">
                    {formatDecimal(rows.reduce((sum, r) => sum + (r.m3PL || 0), 0), 4)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono tabular-nums text-[var(--color-primary)]">
                    {formatDecimal(
                      rows.reduce((sum, r) => sum + (isAirMode ? (r.vfcGdg || 0) : (r.m3Gdg || 0)), 0),
                      volDecimals
                    )}
                  </td>
                </>
              )}

              {/* 23. M3 K / Vfc K */}
              {showComplaint && (
                <td className="py-2 px-2 text-right font-mono tabular-nums font-bold text-amber-500">
                  {formatDecimal(
                    rows.reduce((sum, r) => sum + (isAirMode ? (r.vfcK || 0) : (r.m3K || 0)), 0),
                    volDecimals
                  )}
                </td>
              )}

              {/* 24. M3 Bill / Vfc Bill */}
              {showPhysical && (
                <td className="py-2 px-2 text-right font-mono tabular-nums font-bold text-[var(--color-primary)]">
                  {formatDecimal(
                    rows.reduce((sum, r) => sum + (isAirMode ? (r.vfcBill || 0) : (r.m3Bill || 0)), 0),
                    volDecimals
                  )}
                </td>
              )}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
