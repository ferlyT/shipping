import { ChevronRight } from 'lucide-react'
import { cn, formatDate, formatDecimal } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'
import type { Shipment } from '../types/shipments.types'

interface ShipmentMobileCardProps {
  item: Shipment
  isSelected?: boolean
  onClick?: () => void
}

export function ShipmentMobileCard({ item, isSelected, onClick }: ShipmentMobileCardProps) {
  const isCanceled = Number(item.fdCancel) === 1
  const isUdara = item.fdListType === 1

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3.5 flex flex-col gap-2 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/20 transition-colors cursor-pointer',
        isSelected && 'bg-[var(--color-primary)]/8 ring-1 ring-inset ring-[var(--color-primary)]/20'
      )}
    >
      {/* Top: Status / Mode / No. List / Resi */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={item.shipmentStatus} />

          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider',
              isUdara
                ? 'bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400'
                : 'bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400'
            )}
          >
            {isUdara ? 'UDARA' : 'LAUT'}
          </span>

          <span className="font-mono text-[11px] font-bold text-[var(--color-primary)] bg-[var(--color-neutral)] px-2 py-0.5 rounded border border-[var(--color-border)]">
            #{item.fdListCode}
          </span>
        </div>

        {item.fdTerima && (
          <span className="text-[11px] font-mono text-[var(--color-secondary)] bg-[var(--color-neutral)]/70 px-2 py-0.5 rounded border border-[var(--color-border)]/60">
            Resi: {item.fdTerima}
          </span>
        )}
      </div>

      {/* Customer & Branch */}
      <div className="min-w-0">
        <div className="font-bold text-[var(--color-primary)] text-sm leading-tight truncate" title={item.fdCustName || 'Customer Tidak Dikenal'}>
          {item.fdCustName || 'Customer Tidak Dikenal'}
        </div>
        <div className="text-[11px] text-[var(--color-secondary)] mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span>Cabang: {item.fdBranchCode || '-'}</span>
          {item.fdTglAgent && <span>· Tgl Agen: {formatDate(item.fdTglAgent)}</span>}
          {item.fdLocalTrackingNo && <span>· Resi Lokal: {item.fdLocalTrackingNo}</span>}
        </div>
      </div>

      {/* Marking & Badges Card (Mirrors Target Bill) */}
      <div className="p-2.5 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)]/80 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[var(--color-primary)] font-mono text-xs">
                {item.fdMarkingCode || '-'}
              </span>
              {isCanceled && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-rose-500/10 border border-rose-500/40 text-rose-600 dark:text-rose-400">
                  CANCELED
                </span>
              )}
            </div>
            {item.fdMarkingNo && (
              <span className="text-[11px] text-[var(--color-secondary)] font-mono font-medium truncate" title={item.fdMarkingNo}>
                #{item.fdMarkingNo}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {item.fdComodityName && item.fdComodityName.trim() !== '' && item.fdComodityName.trim() !== '-' && item.fdComodityName.trim() !== '0' ? (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)]">
                {item.fdComodityName}
              </span>
            ) : (
              <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide rounded bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400">
                Belum Set Tipe
              </span>
            )}
          </div>
        </div>

        {/* Baris 1: Nama Komoditi (Satu Baris Penuh / Multi-line wrap) */}
        <div className="pt-1.5 border-t border-[var(--color-border)]/50">
          <p className="text-xs font-semibold text-[var(--color-primary)] leading-snug break-words">
            {item.fdComodity || item.fdDesc || '-'}
          </p>
        </div>

        {/* Baris 2: Qty, Berat, dan M3 */}
        <div className="flex items-center justify-between gap-1.5 text-[11px] text-[var(--color-secondary)] font-mono flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[var(--color-primary)]">
              {Number(item.fdJmlPack || 0).toLocaleString('en-US')} {item.fdSatuan?.trim() || 'COLY'}
            </span>
            {Number(item.fdM3 || 0) > 0 && (
              <>
                <span className="text-[var(--color-border)]">·</span>
                <span>{formatDecimal(Number(item.fdM3), 4)} m³</span>
              </>
            )}
            {Number(item.fdJmlBerat || 0) > 0 && (
              <>
                <span className="text-[var(--color-border)]">·</span>
                <span>{formatDecimal(Number(item.fdJmlBerat), 2)} kg</span>
              </>
            )}
          </div>

          <ChevronRight size={14} className="text-[var(--color-secondary)] shrink-0 ml-auto" />
        </div>
      </div>
    </div>
  )
}
