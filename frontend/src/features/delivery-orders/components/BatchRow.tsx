import { Fragment } from 'react'
import { ChevronRight, Eye } from 'lucide-react'
import { DeliveryOrderDetails } from './DeliveryOrderDetails'
import { StatusPill } from './StatusPill'
import { cn } from '@/lib/utils'
import type { GroupedDataRow } from '../types/delivery-orders.types'

export function BatchRow({
  row,
  expanded,
  onToggle,
}: {
  row: GroupedDataRow
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <Fragment>
      <tr 
        className={cn(
          "group cursor-pointer border-b border-[var(--color-border)] transition-colors duration-200 hover:bg-[var(--color-neutral)]",
          expanded && "bg-[var(--color-neutral)]/70"
        )}
        onClick={onToggle}
      >
        <td className="py-4 pl-6 pr-4">
          <div className="flex items-center gap-3">
            <ChevronRight className={cn(
              "h-4 w-4 flex-shrink-0 text-[var(--color-secondary)] transition-transform duration-200",
              expanded && "rotate-90 text-[var(--color-tertiary)]"
            )} />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[var(--color-primary)] leading-tight">{row.listCode}</p>
                {row.branchCode && (
                  <span className="flex-shrink-0 rounded border border-blue-500/30 bg-transparent px-1.5 py-0.5 text-[10px] font-bold text-blue-500 uppercase" title={row.branchName || row.branchCode}>
                    {row.branchCode}
                  </span>
                )}
              </div>
              <span className="text-xs text-[var(--color-secondary)]" title={row.markingCode}>
                {row.markingCode}
              </span>
            </div>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex flex-col gap-0.5">
            <p className="max-w-[180px] truncate text-sm font-medium text-[var(--color-primary)] leading-tight" title={row.customerName || '-'}>
              {row.customerName || '-'}
            </p>
            <p className="max-w-[180px] truncate text-xs text-[var(--color-secondary)]" title={row.resiNo || '-'}>
              {row.resiNo || '-'}
            </p>
          </div>
        </td>
        <td className="py-4 px-4">
          <p className="max-w-[150px] truncate text-sm text-[var(--color-secondary)]" title={row.comodity || '-'}>
            {row.comodity || <span className="text-[var(--color-secondary)]/50">—</span>}
          </p>
        </td>
        <td className="py-4 px-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium tabular-nums text-[var(--color-primary)] leading-tight">
              {Number(row.totalQty || 0).toLocaleString('id-ID')} pkgs
            </p>
            <p className="text-xs tabular-nums text-[var(--color-secondary)]">
              {Number(row.totalTerkirim || 0).toLocaleString('id-ID')} delivered
            </p>
          </div>
        </td>
        <td className="py-4 px-4 tabular-nums">
          {Number(row.sisa || 0) > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-transparent text-rose-500 border border-rose-500/40">
              {Number(row.sisa || 0).toLocaleString('id-ID')} left
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-transparent text-emerald-500 border border-emerald-500/40">
              0 left
            </span>
          )}
        </td>
        <td className="py-4 px-4">
          <StatusPill isSent={row.isSent} />
        </td>
        <td className="py-4 pr-6 pl-4 text-right">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={cn(
              "inline-flex items-center justify-center p-2 text-[var(--color-secondary)] rounded-lg transition-all duration-200 cursor-pointer",
              expanded 
                ? "text-[var(--color-tertiary)] bg-[var(--color-tertiary)]/10" 
                : "hover:text-[var(--color-tertiary)] hover:bg-[var(--color-neutral)]"
            )}
          >
            <Eye className="w-4 h-4" />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="p-0 border-b border-[var(--color-border)]">
            <DeliveryOrderDetails listCode={row.listCode} />
          </td>
        </tr>
      )}
    </Fragment>
  )
}
