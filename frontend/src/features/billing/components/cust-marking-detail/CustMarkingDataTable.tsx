import { useMemo, Fragment } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
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
      return <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[var(--color-tertiary)]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[var(--color-tertiary)]" />
    )
  }

  const thClass =
    'px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] border-b border-[var(--color-border)] select-none cursor-pointer hover:text-[var(--color-primary)]'

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[var(--color-surface)] sticky top-0 z-10 border-b border-[var(--color-border)]">
          <tr>
            <th className="px-2.5 py-2 w-10 text-center text-[11px] font-semibold text-[var(--color-secondary)] border-b border-[var(--color-border)]">
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

            {/* Kolom Fisik & M3 */}
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
                    <span>Berat Gdg (kg)</span>
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
                <th onClick={() => onSort('rasio')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Rasio</span>
                    {renderSortIcon('rasio')}
                  </div>
                </th>
                <th onClick={() => onSort('overWeight')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Overweight</span>
                    {renderSortIcon('overWeight')}
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

            {/* Kolom Finansial */}
            {(columnPreset === 'all' || columnPreset === 'finance') && (
              <>
                <th onClick={() => onSort('value2')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Tagihan (Rp)</span>
                    {renderSortIcon('value2')}
                  </div>
                </th>
                <th onClick={() => onSort('fc')} className={`${thClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Tax Return</span>
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
              <td colSpan={20} className="px-4 py-8 text-center text-[var(--color-secondary)]">
                Tidak ada data yang cocok dengan kriteria filter.
              </td>
            </tr>
          ) : (
            groupedRows.map((group) => (
              <Fragment key={group.branchCode}>
                <tr className="bg-[var(--color-neutral)]/40 font-bold text-[11px] text-[var(--color-primary)]">
                  <td colSpan={20} className="px-3 py-1.5 border-y border-[var(--color-border)]">
                    <span className="text-[var(--color-tertiary)] uppercase tracking-wider mr-2">
                      CABANG: {group.branchCode}
                    </span>
                    <span className="font-normal text-[var(--color-secondary)]">
                      ({group.count} baris · {formatNumber(group.weight)} kg · {formatDecimal(group.m3, 3)} m³)
                    </span>
                  </td>
                </tr>
                {group.rows.map((r, idx) => (
                  <tr
                    key={`${r.invoice}-${r.listCode}-${idx}`}
                    className="hover:bg-[var(--color-neutral)]/20 transition-colors"
                  >
                    <td className="px-2.5 py-2 text-center text-[var(--color-secondary)] tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-2.5 py-2 font-medium text-[var(--color-primary)] tabular-nums">
                      {r.invoice}
                    </td>
                    <td className="px-2.5 py-2 text-[var(--color-secondary)] tabular-nums whitespace-nowrap">
                      {r.dateStr ? formatDate(r.dateStr) : '—'}
                    </td>
                    <td className="px-2.5 py-2">
                      <span className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold border border-[var(--color-border)] text-[var(--color-secondary)]">
                        {r.branchCode}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 font-medium text-[var(--color-primary)] tabular-nums">
                      {r.listCode}
                    </td>
                    <td className="px-2.5 py-2 text-[var(--color-secondary)] tabular-nums">
                      {r.terima}
                    </td>
                    <td className="px-2.5 py-2 font-semibold text-[var(--color-primary)]">
                      {r.marking || '—'}
                    </td>
                    <td className="px-2.5 py-2 text-[var(--color-secondary)] max-w-xs truncate" title={r.comodity}>
                      {r.comodity}
                    </td>

                    {/* Fisik & M3 values */}
                    {(columnPreset === 'all' || columnPreset === 'physical') && (
                      <>
                        <td className="px-2.5 py-2 text-right tabular-nums">
                          {formatNumber(r.qtyGdg || r.qtySJ)}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums">
                          {formatNumber(r.weight)}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums font-medium text-[var(--color-primary)]">
                          {formatDecimal(r.m3Gdg, 4)}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums text-[var(--color-secondary)]">
                          {r.m3PL > 0 ? formatDecimal(r.m3PL, 4) : '—'}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums text-[var(--color-secondary)]">
                          {r.rasio > 0 ? formatNumber(r.rasio) : '—'}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums">
                          {r.overWeight && r.overWeight > 0 ? (
                            <span className="font-semibold text-rose-500">+{formatNumber(r.overWeight)} kg</span>
                          ) : (
                            <span className="text-[var(--color-secondary)]">—</span>
                          )}
                        </td>
                      </>
                    )}

                    {/* Komplain values */}
                    {(columnPreset === 'all' || columnPreset === 'complaint') && (
                      <>
                        <td className="px-2.5 py-2 text-right tabular-nums">
                          {r.qtyK > 0 ? formatNumber(r.qtyK) : '—'}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums">
                          {r.weightK > 0 ? formatNumber(r.weightK) : '—'}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums">
                          {r.m3K > 0 ? (
                            <span className="font-semibold text-amber-500">{formatDecimal(r.m3K, 4)}</span>
                          ) : (
                            '—'
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
                            '—'
                          )}
                        </td>
                      </>
                    )}

                    {/* Finansial values */}
                    {(columnPreset === 'all' || columnPreset === 'finance') && (
                      <>
                        <td className="px-2.5 py-2 text-right tabular-nums font-semibold text-[var(--color-primary)]">
                          {formatCurrency(r.value2)}
                        </td>
                        <td className="px-2.5 py-2 text-right tabular-nums text-[var(--color-secondary)]">
                          {r.fc > 0 ? formatCurrency(r.fc) : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
