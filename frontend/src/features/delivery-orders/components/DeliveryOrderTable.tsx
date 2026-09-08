import { Link } from 'react-router-dom'
import {
  Truck,
  Calendar,
  Package,
  Weight,
  User,
  ExternalLink,
  ChevronRight,
  Inbox,
  Car,
} from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { formatDate, cn } from '@/lib/utils'
import type { DeliveryOrder } from '../types/delivery-orders.types'
import type { DeliveryViewMode } from './DeliveryOrderToolbar'

interface DeliveryOrderTableProps {
  data: DeliveryOrder[]
  isLoading?: boolean
  viewMode: DeliveryViewMode
  onResetFilter?: () => void
  hasSearch?: boolean
}

export function DeliveryOrderTable({
  data,
  isLoading,
  viewMode,
  onResetFilter,
  hasSearch,
}: DeliveryOrderTableProps) {
  if (isLoading) {
    return (
      <div className="bg-[var(--color-surface)]">
        {/* Desktop skeleton */}
        <div className={cn(viewMode === 'cards' ? 'hidden' : 'hidden sm:block', 'overflow-x-auto')}>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)]/60 text-[var(--color-secondary)] text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">No. Surat Jalan</th>
                <th className="py-3 px-4">Tanggal SJ</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Deskripsi / Muatan</th>
                <th className="py-3 px-4">Supir & Kendaraan</th>
                <th className="py-3 px-4 text-right">Pack / Koli</th>
                <th className="py-3 px-4 text-right">Berat (Kg)</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--color-border)]">
                  <td className="py-3 px-4"><div className="h-4 w-28 rounded-md skeleton-shimmer" /></td>
                  <td className="py-3 px-4"><div className="h-3.5 w-20 rounded skeleton-shimmer" /></td>
                  <td className="py-3 px-4"><div className="h-4 w-36 rounded skeleton-shimmer" /></td>
                  <td className="py-3 px-4"><div className="h-3.5 w-40 rounded skeleton-shimmer" /></td>
                  <td className="py-3 px-4"><div className="h-3.5 w-28 rounded skeleton-shimmer" /></td>
                  <td className="py-3 px-4 text-right"><div className="h-3.5 w-14 rounded skeleton-shimmer ml-auto" /></td>
                  <td className="py-3 px-4 text-right"><div className="h-3.5 w-16 rounded skeleton-shimmer ml-auto" /></td>
                  <td className="py-3 px-4 text-center"><div className="h-7 w-16 rounded-lg skeleton-shimmer mx-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile skeleton */}
        <div className={cn(viewMode === 'table' ? 'sm:hidden' : 'block', 'divide-y divide-[var(--color-border)]')}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3.5 sm:p-4 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <div className="h-4 w-28 rounded-md skeleton-shimmer" />
                <div className="h-4 w-20 rounded-md skeleton-shimmer" />
              </div>
              <div className="space-y-1">
                <div className="h-4 w-40 rounded skeleton-shimmer" />
                <div className="h-3 w-56 rounded skeleton-shimmer" />
              </div>
              <div className="p-2 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] flex justify-between items-center">
                <div className="h-3.5 w-28 rounded skeleton-shimmer" />
                <div className="h-3.5 w-24 rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center gap-3 bg-[var(--color-surface)]">
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-neutral)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-secondary)]">
          <Inbox size={24} />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--color-primary)]">Tidak ada surat jalan ditemukan</p>
          <p className="text-xs text-[var(--color-secondary)] mt-0.5 max-w-sm">
            {hasSearch
              ? 'Tidak ada hasil yang sesuai dengan kata kunci pencarian Anda.'
              : 'Belum ada data surat jalan yang tersimpan.'}
          </p>
        </div>
        {hasSearch && onResetFilter && (
          <button
            type="button"
            onClick={onResetFilter}
            className="mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            Reset Pencarian
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-surface)]">
      {/* ── Desktop Table View ── */}
      <div className={cn(viewMode === 'cards' ? 'hidden' : 'hidden sm:block', 'overflow-x-auto')}>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)]/60 text-[var(--color-secondary)] text-[11px] font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">No. Surat Jalan</th>
              <th className="py-3 px-4">Tanggal SJ</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Deskripsi / Muatan</th>
              <th className="py-3 px-4">Supir & Kendaraan</th>
              <th className="py-3 px-4 text-right">Pack / Koli</th>
              <th className="py-3 px-4 text-right">Berat (Kg)</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {data.map((item) => (
              <tr
                key={item.fdSJNo}
                className="hover:bg-[var(--color-neutral)]/40 transition-colors group"
              >
                {/* No. SJ */}
                <td className="py-3 px-4">
                  <Link
                    to={ROUTES.DELIVERY_DETAIL(item.fdSJNo)}
                    className="inline-flex items-center gap-1.5 font-mono font-bold text-[var(--color-primary)] hover:text-[var(--color-tertiary)] hover:underline transition-colors"
                  >
                    <Truck size={13} className="text-[var(--color-secondary)] group-hover:text-[var(--color-tertiary)] shrink-0" />
                    <span>{item.fdSJNo}</span>
                  </Link>
                </td>

                {/* Tanggal SJ */}
                <td className="py-3 px-4 whitespace-nowrap text-[var(--color-secondary)]">
                  <div className="inline-flex items-center gap-1.5">
                    <Calendar size={12} className="opacity-70 shrink-0" />
                    <span>{formatDate(item.fdSJDate)}</span>
                  </div>
                </td>

                {/* Customer */}
                <td className="py-3 px-4 max-w-[200px]">
                  <div className="font-semibold text-[var(--color-text)] truncate" title={item.fdCustNameSJ || item.fdCustCode || '—'}>
                    {item.fdCustNameSJ || item.fdCustCode || '—'}
                  </div>
                  {item.fdCustCode && item.fdCustNameSJ && (
                    <div className="text-[10px] text-[var(--color-secondary)] font-mono">
                      {item.fdCustCode}
                    </div>
                  )}
                </td>

                {/* Deskripsi */}
                <td className="py-3 px-4 max-w-[220px]">
                  <div className="text-[var(--color-secondary)] line-clamp-2" title={item.fdDescr}>
                    {item.fdDescr || '—'}
                  </div>
                </td>

                {/* Supir & Kendaraan */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    <div className="inline-flex items-center gap-1 text-[var(--color-text)] font-medium">
                      <User size={11} className="text-[var(--color-secondary)] shrink-0" />
                      <span>{item.fdSupir || 'Supir TBD'}</span>
                    </div>
                    {item.fdCarID && (
                      <div className="inline-flex items-center gap-1 text-[10px] text-[var(--color-secondary)] font-mono">
                        <Car size={10} className="shrink-0" />
                        <span>{item.fdCarID}</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Pack / Koli */}
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-[var(--color-text)] tabular-nums">
                    <Package size={12} className="text-[var(--color-secondary)]" />
                    {Number(item.fdJmlPackSJ || 0).toLocaleString('en-US')}
                  </span>
                </td>

                {/* Berat (Kg) */}
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-[var(--color-primary)] tabular-nums">
                    <Weight size={12} className="text-amber-500" />
                    {Number(item.fdJmlBeratSJ || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </td>

                {/* Aksi */}
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <Link
                    to={ROUTES.DELIVERY_DETAIL(item.fdSJNo)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--color-neutral)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] border border-[var(--color-border)] text-[var(--color-text)] transition-all cursor-pointer shadow-2xs"
                  >
                    <span>Detail</span>
                    <ChevronRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile / Cards View ── */}
      <div className={cn(viewMode === 'table' ? 'sm:hidden' : 'block', 'divide-y divide-[var(--color-border)]')}>
        {data.map((item) => (
          <div
            key={item.fdSJNo}
            className="p-3.5 sm:p-4 flex flex-col gap-2.5 hover:bg-[var(--color-neutral)]/30 transition-colors"
          >
            {/* Top row: SJ No + Date */}
            <div className="flex items-center justify-between gap-2">
              <Link
                to={ROUTES.DELIVERY_DETAIL(item.fdSJNo)}
                className="inline-flex items-center gap-1.5 font-mono font-bold text-sm text-[var(--color-primary)] hover:underline"
              >
                <Truck size={14} className="text-[var(--color-secondary)]" />
                <span>{item.fdSJNo}</span>
              </Link>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] text-[10px] font-semibold whitespace-nowrap">
                <Calendar size={10} />
                {formatDate(item.fdSJDate)}
              </span>
            </div>

            {/* Customer & Description */}
            <div className="space-y-0.5">
              <div className="font-semibold text-xs text-[var(--color-text)]">
                {item.fdCustNameSJ || item.fdCustCode || '—'}
              </div>
              {item.fdDescr && (
                <p className="text-[11px] text-[var(--color-secondary)] line-clamp-2 leading-relaxed">
                  {item.fdDescr}
                </p>
              )}
            </div>

            {/* Logistics & Metrics Bar */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--color-neutral)]/60 border border-[var(--color-border)]/80 text-xs">
              <div className="flex items-center gap-1.5 text-[11px] min-w-0">
                <User size={12} className="text-[var(--color-secondary)] shrink-0" />
                <span className="font-medium truncate">{item.fdSupir || 'Supir TBD'}</span>
                {item.fdCarID && (
                  <span className="text-[10px] text-[var(--color-secondary)] font-mono shrink-0">
                    ({item.fdCarID})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 font-mono font-bold text-[11px] text-[var(--color-text)]">
                  <Package size={11} className="text-[var(--color-secondary)]" />
                  <span>{Number(item.fdJmlPackSJ || 0).toLocaleString('en-US')}</span>
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-[11px] text-[var(--color-primary)]">
                  <Weight size={11} className="text-amber-500" />
                  <span>{Number(item.fdJmlBeratSJ || 0).toLocaleString('en-US')} kg</span>
                </div>
              </div>
            </div>

            {/* Action Row */}
            <div className="flex items-center justify-end pt-0.5">
              <Link
                to={ROUTES.DELIVERY_DETAIL(item.fdSJNo)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-neutral)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] border border-[var(--color-border)] text-[var(--color-text)] transition-all cursor-pointer"
              >
                <span>Lihat Detail Surat Jalan</span>
                <ExternalLink size={11} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
