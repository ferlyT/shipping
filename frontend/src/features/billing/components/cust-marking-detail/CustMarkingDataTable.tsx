import { useMemo, Fragment } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react'
import { formatDate, formatDecimal, formatNumber, formatCurrency } from '@/lib/utils'
import type { ColumnPreset, NormalizedMarkingRow, SortField, SortOrder } from './types'

export interface CustMarkingDataTableProps {
  rows: NormalizedMarkingRow[]
  columnPreset: ColumnPreset
  sortField: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
}

export function CustMarkingDataTable({
  rows,
  columnPreset,
  sortField,
  sortOrder,
  onSort,
}: CustMarkingDataTableProps) {
  // Group rows by branch code for sectioning
  const groupedRows = useMemo(() => {
    const map = new Map<string, NormalizedMarkingRow[]>()
    rows.forEach((r) => {
      const code = r.bc && r.bc !== '—' ? r.bc : 'LAINNYA'
      if (!map.has(code)) map.set(code, [])
      map.get(code)!.push(r)
    })
    return Array.from(map.entries()).map(([branchCode, bRows]) => ({
      branchCode,
      count: bRows.length,
      weight: bRows.reduce((sum, r) => sum + r.weight, 0),
      m3: bRows.reduce((sum, r) => sum + r.activeM3, 0),
      rows: bRows,
    }))
  }, [rows])

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[var(--color-tertiary)]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[var(--color-tertiary)]" />
    )
  }

  const thClass =
    'px-2.5 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-secondary)] border-b border-[var(--color-border)] select-none cursor-pointer hover:text-[var(--color-primary)] group transition-colors'

  const totalColSpan =
    8 +
    (columnPreset === 'all' || columnPreset === 'physical' ? 4 : 0) +
    (columnPreset === 'all' || columnPreset === 'complaint' ? 4 : 0) +
    (columnPreset === 'all' || columnPreset === 'finance' ? 2 : 0)

  return (
    <div className="flex-1 overflow-auto bg-[var(--color-surface)] font-[var(--font-body)]">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[var(--color-surface)] sticky top-0 z-10 border-b border-[var(--color-border)] shadow-2xs">
          <tr>
            <th className="px-2.5 py-2.5 w-10 text-center text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-secondary)] border-b border-[var(--color-border)]">
              No
            </th>
            <th onClick={() => onSort('invoice')} className={thClass}>
              <div className="flex items-center gap-1">
                <span>No. Invoice</span>
                {renderSortIcon('invoice')}
              </div>
            </th>
            <th onClick={() => onSort('date')} className={thClass}>
              <div className="flex items-center gap-1">
                <span>Tgl Inv</span>
                {renderSortIcon('date')}
              </div>
            </th>
            <th onClick={() => onSort('branchCode')} className={thClass}>
              <div className="flex items-center gap-1">
                <span>Cabang</span>
                {renderSortIcon('branchCode')}
              </div>
            </th>
            <th onClick={() => onSort('listCode')} className={thClass}>
              <div className="flex items-center gap-1">
                <span>Listcode</span>
                {renderSortIcon('listCode')}
              </div>
            </th>
            <th onClick={() => onSort('terima')} className={thClass}>
              <div className="flex items-center gap-1">
                <span>No. Terima</span>
                {renderSortIcon('terima')}
              </div>
            </th>
            <th onClick={() => onSort('marking')} className={thClass}>
              <div className="flex items-center gap-1">
                <span>Marking</span>
                {renderSortIcon('marking')}
              </div>
            </th>
            <th onClick={() => onSort('comodity')} className={thClass}>
              <div className="flex items-center gap-1">
                <span>Komoditas</span>
                {renderSortIcon('comodity')}
              </div>
            </th>

            {/* Kolom Fisik & M3 (Rasio & Overweight tidak perlu / dihapus) */}
            {(columnPreset === 'all' || columnPreset === 'physical') && (
              <>
                <th onClick={() => onSort('qtyGdg')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Qty Gdg</span>
                    {renderSortIcon('qtyGdg')}
                  </div>
                </th>
                <th onClick={() => onSort('weightGdg')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Berat (kg)</span>
                    {renderSortIcon('weightGdg')}
                  </div>
                </th>
                <th onClick={() => onSort('m3Gdg')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>M³ Gudang</span>
                    {renderSortIcon('m3Gdg')}
                  </div>
                </th>
                <th onClick={() => onSort('m3PL')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>M³ PL</span>
                    {renderSortIcon('m3PL')}
                  </div>
                </th>
              </>
            )}

            {/* Kolom Komplain */}
            {(columnPreset === 'all' || columnPreset === 'complaint') && (
              <>
                <th onClick={() => onSort('qtyK')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Qty K</span>
                    {renderSortIcon('qtyK')}
                  </div>
                </th>
                <th onClick={() => onSort('weightK')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Berat K (kg)</span>
                    {renderSortIcon('weightK')}
                  </div>
                </th>
                <th onClick={() => onSort('m3K')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>M³ Komplain</span>
                    {renderSortIcon('m3K')}
                  </div>
                </th>
                <th onClick={() => onSort('selisihM3')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Selisih M³</span>
                    {renderSortIcon('selisihM3')}
                  </div>
                </th>
              </>
            )}

            {/* Kolom Finansial (Tax Return cukup pakai tag) */}
            {(columnPreset === 'all' || columnPreset === 'finance') && (
              <>
                <th onClick={() => onSort('value2')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Tagihan (Rp)</span>
                    {renderSortIcon('value2')}
                  </div>
                </th>
                <th onClick={() => onSort('fc')} className={`${thClass} text-center w-20`}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Tax</span>
                    {renderSortIcon('fc')}
                  </div>
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={totalColSpan} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center justify-center text-[var(--color-secondary)]">
                  <Inbox className="w-8 h-8 opacity-30 mb-2" />
                  <p className="text-xs font-semibold text-[var(--color-primary)]">Tidak ada data yang cocok</p>
                  <p className="text-[11px] mt-0.5 opacity-80">Silakan sesuaikan filter pencarian atau cabang Anda.</p>
                </div>
              </td>
            </tr>
          ) : (
            groupedRows.map((group) => (
              <Fragment key={group.branchCode}>
                <tr className="bg-[var(--color-neutral)]/40 font-bold text-[11px] text-[var(--color-primary)]">
                  <td colSpan={totalColSpan} className="px-3 py-1.5 border-y border-[var(--color-border)]">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10.5px] font-bold bg-[var(--color-tertiary)]/10 border border-[var(--color-tertiary)]/30 text-[var(--color-tertiary)] uppercase tracking-wider">
                          CABANG: {group.branchCode}
                        </span>
                        <span className="font-normal text-[var(--color-secondary)]">
                          {group.count} baris item
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-[var(--color-secondary)]">
                        <span>
                          Total Berat: <strong className="text-[var(--color-primary)]">{formatNumber(group.weight)} kg</strong>
                        </span>
                        <span className="text-[var(--color-border)]">•</span>
                        <span>
                          Total M³: <strong className="text-[var(--color-primary)]">{formatDecimal(group.m3, 3)} m³</strong>
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
                {group.rows.map((r, idx) => (
                  <tr
                    key={`${r.invoice}-${r.listCode}-${idx}`}
                    className="hover:bg-[var(--color-neutral)]/30 transition-colors"
                  >
                    <td className="px-2.5 py-2 text-center text-[var(--color-secondary)] font-mono text-[11px] tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-2.5 py-2 font-mono text-[11.5px] font-semibold text-[var(--color-primary)] tabular-nums whitespace-nowrap">
                      {r.invoice}
                    </td>
                    <td className="px-2.5 py-2 text-[var(--color-secondary)] tabular-nums whitespace-nowrap text-[11px]">
                      {r.dateStr ? formatDate(r.dateStr) : '—'}
                    </td>
                    <td className="px-2.5 py-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[var(--color-border)] bg-[var(--color-neutral)]/50 text-[var(--color-secondary)] font-mono">
                        {r.branchCode}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 font-mono text-[11px] text-[var(--color-primary)] tabular-nums whitespace-nowrap">
                      {r.listCode}
                    </td>
                    <td className="px-2.5 py-2 font-mono text-[11px] text-[var(--color-secondary)] tabular-nums whitespace-nowrap">
                      {r.terima}
                    </td>
                    <td className="px-2.5 py-2 font-bold text-[var(--color-primary)] text-[11.5px] whitespace-nowrap">
                      {r.marking || '—'}
                    </td>
                    <td className="px-2.5 py-2 text-[var(--color-secondary)] max-w-[200px] truncate text-[11px]" title={r.comodity}>
                      {r.comodity}
                    </td>

                    {/* Fisik & M3 values */}
                    {(columnPreset === 'all' || columnPreset === 'physical') && (
                      <>
                        <td className="px-2.5 py-2 text-right tabular-nums font-medium text-[var(--color-primary)]">
                          {formatNumber(r.qtyGdg || r.qtySJ)}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums font-medium text-[var(--color-primary)]">
                          {formatNumber(r.weight)}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums font-bold text-[var(--color-primary)]">
                          {formatDecimal(r.m3Gdg, 4)}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums text-[var(--color-secondary)]">
                          {r.m3PL > 0 ? formatDecimal(r.m3PL, 4) : '—'}
                        </td>
                      </>
                    )}

                    {/* Komplain values */}
                    {(columnPreset === 'all' || columnPreset === 'complaint') && (
                      <>
                        <td className="px-2.5 py-2 text-right tabular-nums text-[var(--color-secondary)]">
                          {r.qtyK > 0 ? formatNumber(r.qtyK) : '—'}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums text-[var(--color-secondary)]">
                          {r.weightK > 0 ? formatNumber(r.weightK) : '—'}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums">
                          {r.m3K > 0 ? (
                            <span className="font-semibold text-amber-500 tabular-nums">{formatDecimal(r.m3K, 4)}</span>
                          ) : (
                            <span className="text-[var(--color-secondary)]">—</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums">
                          {Math.abs(r.selisihM3) > 0.0001 ? (
                            <span
                              className={
                                r.selisihM3 < 0
                                  ? 'text-rose-500 font-semibold'
                                  : 'text-emerald-500 font-semibold'
                              }
                            >
                              {r.selisihM3 > 0 ? '+' : ''}
                              {formatDecimal(r.selisihM3, 4)}
                            </span>
                          ) : (
                            <span className="text-[var(--color-secondary)]">—</span>
                          )}
                        </td>
                      </>
                    )}

                    {/* Finansial values (Tax Return berupa Tag Badge) */}
                    {(columnPreset === 'all' || columnPreset === 'finance') && (
                      <>
                        <td className="px-2.5 py-2 text-right tabular-nums font-bold text-[var(--color-primary)]">
                          {formatCurrency(r.value2)}
                        </td>
                        <td className="px-2.5 py-2 text-center whitespace-nowrap">
                          {r.isTax ? (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              title={r.fc > 0 ? `Tax Return: ${formatCurrency(r.fc)}` : 'Tax Return (TAX)'}
                            >
                              TAX
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-dashed border-[var(--color-border)] text-[var(--color-secondary)]/50"
                              title="Non Tax"
                            >
                              NON
                            </span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </Fragment>
            ))
          )}
        </tbody>

        {/* Footer Akumulasi Ringkasan */}
        {rows.length > 0 && (
          <tfoot className="sticky bottom-0 z-10 bg-[var(--color-surface)] border-t-2 border-[var(--color-border)] font-bold text-xs shadow-xs">
            <tr>
              <td colSpan={8} className="py-2.5 px-3 text-right uppercase tracking-wider text-[var(--color-secondary)] font-semibold text-[11px]">
                Total ({rows.length} item) :
              </td>

              {/* Fisik & M3 Totals */}
              {(columnPreset === 'all' || columnPreset === 'physical') && (
                <>
                  <td className="py-2.5 px-2.5 text-right tabular-nums font-bold text-[var(--color-primary)]">
                    {formatNumber(rows.reduce((sum, r) => sum + (r.qtyGdg || r.qtySJ || 0), 0))}
                  </td>
                  <td className="py-2.5 px-2.5 text-right tabular-nums font-bold text-[var(--color-primary)]">
                    {formatNumber(rows.reduce((sum, r) => sum + r.weight, 0))}
                  </td>
                  <td className="py-2.5 px-2.5 text-right tabular-nums font-bold text-[var(--color-primary)]">
                    {formatDecimal(rows.reduce((sum, r) => sum + (r.m3Gdg || 0), 0), 4)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right tabular-nums font-semibold text-[var(--color-secondary)]">
                    {formatDecimal(rows.reduce((sum, r) => sum + (r.m3PL || 0), 0), 4)}
                  </td>
                </>
              )}

              {/* Komplain Totals */}
              {(columnPreset === 'all' || columnPreset === 'complaint') && (
                <>
                  <td className="py-2.5 px-2.5 text-right tabular-nums font-medium text-[var(--color-secondary)]">
                    {formatNumber(rows.reduce((sum, r) => sum + (r.qtyK || 0), 0))}
                  </td>
                  <td className="py-2.5 px-2.5 text-right tabular-nums font-medium text-[var(--color-secondary)]">
                    {formatNumber(rows.reduce((sum, r) => sum + (r.weightK || 0), 0))}
                  </td>
                  <td className="py-2.5 px-2.5 text-right tabular-nums font-bold text-amber-500">
                    {formatDecimal(rows.reduce((sum, r) => sum + (r.m3K || 0), 0), 4)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right tabular-nums font-bold">
                    {(() => {
                      const totalSelisih = rows.reduce((sum, r) => sum + (r.selisihM3 || 0), 0)
                      return (
                        <span
                          className={
                            totalSelisih < 0
                              ? 'text-rose-500'
                              : totalSelisih > 0
                              ? 'text-emerald-500'
                              : 'text-[var(--color-secondary)]'
                          }
                        >
                          {totalSelisih > 0 ? '+' : ''}
                          {formatDecimal(totalSelisih, 4)}
                        </span>
                      )
                    })()}
                  </td>
                </>
              )}

              {/* Finansial Totals */}
              {(columnPreset === 'all' || columnPreset === 'finance') && (
                <>
                  <td className="py-2.5 px-2.5 text-right tabular-nums font-bold text-[var(--color-primary)]">
                    {formatCurrency(rows.reduce((sum, r) => sum + (r.value2 || 0), 0))}
                  </td>
                  <td className="py-2.5 px-2.5 text-center">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {rows.filter((r) => r.isTax).length} TAX
                    </span>
                  </td>
                </>
              )}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
