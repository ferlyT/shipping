import { Fragment } from 'react'
import { ChevronRight, Eye } from 'lucide-react'
import { DeliveryOrderDetails } from './DeliveryOrderDetails'
import { StatusPill } from './StatusPill'
import { cn, displayCustName, formatNumber, formatDecimal } from '@/lib/utils'
import type { GroupedDataRow } from '../types/delivery-orders.types'

export function BatchRow({
  row,
  index,
  expanded,
  onToggle,
}: {
  row: GroupedDataRow
  index?: number
  expanded: boolean
  onToggle: () => void
}) {
  const totalWeight = Number(row.totalWeight || 0)
  const totalM3 = Number(row.m3 || 0)
  const satuan = (row.satuan || 'KOLI').trim()
  const sisa = Number(row.sisa || 0)
  const terkirim = Number(row.totalTerkirim || 0)
  const totalQty = Number(row.totalQty || 0)

  return (
    <Fragment>
      <tr 
        className={cn(
          "group cursor-pointer border-b border-[var(--color-border)] transition-colors duration-200 hover:bg-[var(--color-neutral)]/50",
          expanded && "bg-[var(--color-neutral)]/60"
        )}
        onClick={onToggle}
      >
        {/* Kolom 0: Nomor Urut */}
        {index !== undefined && (
          <td className="py-3 px-3 text-center text-xs text-[var(--color-secondary)] font-mono">
            {index + 1}
          </td>
        )}

        {/* Kolom 1: List Code & Cabang / Marking */}
        <td className="py-3 px-3">
          <div className="flex items-center gap-2.5">
            <ChevronRight className={cn(
              "h-4 w-4 flex-shrink-0 text-[var(--color-secondary)] transition-transform duration-200",
              expanded && "rotate-90 text-[var(--color-tertiary)]"
            )} />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold font-mono text-[var(--color-primary)] leading-tight">
                  {row.listCode}
                </span>
                {row.branchCode && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold border border-sky-500/30 text-sky-600 dark:text-sky-400 uppercase tracking-wider"
                    title={row.branchName ? `${row.branchCode} — ${row.branchName.trim()}` : row.branchCode}
                  >
                    {row.branchCode}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[var(--color-secondary)] truncate max-w-[160px]" title={row.markingCode}>
                {row.markingCode}
              </span>
            </div>
          </div>
        </td>

        {/* Kolom 2: Customer / Resi */}
        <td className="py-3 px-3">
          <div className="flex flex-col gap-0.5">
            <p className="max-w-[200px] truncate text-xs font-semibold text-[var(--color-primary)] leading-tight" title={displayCustName(row.customerName, '-')}>
              {displayCustName(row.customerName, '-')}
            </p>
            <p className="max-w-[180px] truncate text-[11px] text-[var(--color-secondary)] font-mono" title={row.resiNo || '-'}>
              {row.resiNo || '—'}
            </p>
          </div>
        </td>

        {/* Kolom 3: Komoditas */}
        <td className="py-3 px-3">
          <p className="max-w-[170px] truncate text-xs text-[var(--color-secondary)]" title={row.comodity || row.typeComodityName || '-'}>
            {row.comodity || row.typeComodityName || <span className="text-[var(--color-secondary)]/40">—</span>}
          </p>
        </td>

        {/* Kolom 4: Total Muatan (Qty, Berat, Volume) */}
        <td className="py-3 px-3">
          <div className="flex flex-col gap-0.5 text-xs tabular-nums">
            <span className="font-bold text-[var(--color-primary)]">
              {formatNumber(totalQty)} {satuan}
            </span>
            <div className="flex items-center gap-2 text-[10.5px] text-[var(--color-secondary)]">
              {totalWeight > 0 && <span>{formatNumber(totalWeight)} kg</span>}
              {totalM3 > 0 && <span>{formatDecimal(totalM3, 3)} m³</span>}
            </div>
          </div>
        </td>

        {/* Kolom 5: Progres Pengiriman (Terkirim vs Sisa) */}
        <td className="py-3 px-3">
          <div className="flex flex-col gap-1 tabular-nums">
            <span className="text-xs text-[var(--color-secondary)]">
              {formatNumber(terkirim)} terkirim
            </span>
            {sisa > 0 ? (
              <span className="inline-flex items-center w-fit px-1.5 py-0.2 rounded text-[10.5px] font-bold bg-transparent text-rose-500 border border-rose-500/40">
                {formatNumber(sisa)} sisa
              </span>
            ) : (
              <span className="inline-flex items-center w-fit px-1.5 py-0.2 rounded text-[10.5px] font-semibold bg-transparent text-emerald-500 border border-emerald-500/40">
                Lengkap
              </span>
            )}
          </div>
        </td>

        {/* Kolom 6: Status Kirim */}
        <td className="py-3 px-3">
          <StatusPill isSent={row.isSent} />
        </td>

        {/* Kolom 7: Aksi Expand Surat Jalan */}
        <td className="py-3 px-3 text-right">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer border",
              expanded 
                ? "text-[var(--color-tertiary)] border-[var(--color-tertiary)] bg-[var(--color-tertiary)]/10 shadow-xs" 
                : "border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]"
            )}
            title={expanded ? "Tutup rincian Surat Jalan" : "Buka rincian Surat Jalan"}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{expanded ? 'Tutup SJ' : 'Buka SJ'}</span>
          </button>
        </td>
      </tr>

      {/* Row Ekspansi: Rincian Surat Jalan Terkait */}
      {expanded && (
        <tr>
          <td colSpan={index !== undefined ? 8 : 7} className="p-0 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/20">
            <DeliveryOrderDetails listCode={row.listCode} />
          </td>
        </tr>
      )}
    </Fragment>
  )
}
