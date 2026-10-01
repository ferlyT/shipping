import { useNavigate } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import type { CashierItem } from '../types/cashier.types'

interface CashierTableProps {
  mode: 'OFFICIAL' | 'TEMPORARY'
  items: CashierItem[]
  isLoading?: boolean
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onAttachClick?: (item: CashierItem) => void
}

export function CashierTable({
  mode,
  items,
  isLoading,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onAttachClick,
}: CashierTableProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const safeItems = Array.isArray(items) ? items : []

  const handleRowClick = (id: string) => {
    navigate(ROUTES.CASHIER_DETAIL(id))
  }

  if (!isLoading && safeItems.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
        <EmptyState
          title={mode === 'OFFICIAL' ? t('cashier.emptyOfficial') : t('cashier.emptyTemp')}
          description="Gunakan tombol di atas untuk membuat transaksi baru atau sesuaikan filter pencarian Anda."
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Mobile Touch Cards View (< md) */}
      <div className="md:hidden divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
        {safeItems.map((item) => (
          <div
            key={item.fdCashierID}
            onClick={() => handleRowClick(item.fdCashierID)}
            className="p-3.5 space-y-3 hover:bg-[var(--color-neutral)]/30 active:bg-[var(--color-neutral)]/50 transition-colors cursor-pointer"
          >
            {/* Top row: ID badge + Date + Status */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[var(--color-tertiary)] bg-[var(--color-neutral)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                  {item.fdCashierID}
                </span>
                <span className="text-[11px] text-[var(--color-secondary)]">
                  {item.fdCashierDate ? formatDate(item.fdCashierDate) : '-'}
                </span>
              </div>

              {/* Status Badge */}
              {mode === 'OFFICIAL' ? (
                item.fdPost === 1 ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-500/30 bg-slate-500/10 text-slate-400">
                    {t('cashier.statusPosted')}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-sky-500/30 bg-sky-500/10 text-sky-500">
                    {t('cashier.statusOpen')}
                  </span>
                )
              ) : item.fdPost === 1 ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                  {t('cashier.statusAttached')}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/30 bg-amber-500/10 text-amber-500">
                  {t('cashier.statusUnattached')}
                </span>
              )}
            </div>

            {/* Customer Info */}
            <div>
              <h4 className="text-xs font-bold text-[var(--color-primary)] line-clamp-1">
                {item.fdCustName}
              </h4>
              <span className="text-[10px] font-mono text-[var(--color-secondary)]">
                {item.fdCustCode}
                {mode === 'OFFICIAL' && item.fdCashierXX && (
                  <span className="ml-2 text-indigo-400">· Ref: {item.fdCashierXX}</span>
                )}
              </span>
            </div>

            {/* Financial Metrics 2-column Grid */}
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)] text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                  {t('cashier.colTotalRcv')}
                </span>
                <span className="font-mono font-bold text-emerald-500 text-xs mt-0.5 block">
                  {formatCurrency(item.totalRcv)}
                </span>
                <span className="text-[10px] text-[var(--color-secondary)]">
                  {item.rcvCount} instrumen
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                  {t('cashier.colTotalDetail')}
                </span>
                <span className="font-mono font-bold text-blue-500 text-xs mt-0.5 block">
                  {formatCurrency(item.totalDetail)}
                </span>
                <span className="text-[10px] text-[var(--color-secondary)]">
                  {item.detailCount} faktur
                </span>
              </div>
            </div>

            {/* Bottom Row: Balance + Actions */}
            <div className="flex items-center justify-between pt-1 gap-2">
              <div>
                {item.isBalanced ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                    {t('cashier.statusBalanced')}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-500">
                    {t('cashier.statusUnbalanced')} ({formatCurrency(item.balance)})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => handleRowClick(item.fdCashierID)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--color-tertiary)] hover:bg-[var(--color-neutral)] border border-[var(--color-border)] cursor-pointer"
                >
                  {t('common.detail')}
                </button>

                {mode === 'TEMPORARY' && item.fdPost === 0 && onAttachClick && (
                  <button
                    type="button"
                    onClick={() => onAttachClick(item)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/40 cursor-pointer"
                  >
                    {t('cashier.btnAttach')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)] text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
              <th className="py-2.5 px-3 text-left">{t('cashier.colNumber')}</th>
              <th className="py-2.5 px-3 text-left">{t('cashier.colDate')}</th>
              <th className="py-2.5 px-3 text-left">{t('cashier.colCustomer')}</th>
              <th className="py-2.5 px-3 text-right">{t('cashier.colTotalRcv')}</th>
              <th className="py-2.5 px-3 text-right">{t('cashier.colTotalDetail')}</th>
              <th className="py-2.5 px-3 text-center">{t('cashier.colBalance')}</th>
              {mode === 'OFFICIAL' && (
                <th className="py-2.5 px-3 text-left">{t('cashier.colRefTemp')}</th>
              )}
              <th className="py-2.5 px-3 text-center">{t('cashier.colStatus')}</th>
              <th className="py-2.5 px-3 text-center">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)] text-xs tabular-nums">
            {safeItems.map((item) => (
              <tr
                key={item.fdCashierID}
                onClick={() => handleRowClick(item.fdCashierID)}
                className="hover:bg-[var(--color-neutral)]/40 transition-colors cursor-pointer"
              >
                {/* No. Registrasi */}
                <td className="py-2.5 px-3 font-semibold text-[var(--color-tertiary)]">
                  {item.fdCashierID}
                </td>

                {/* Tanggal */}
                <td className="py-2.5 px-3 text-[var(--color-secondary)]">
                  {item.fdCashierDate ? formatDate(item.fdCashierDate) : '-'}
                </td>

                {/* Pelanggan (Single Source of Truth) */}
                <td className="py-2.5 px-3">
                  <div className="font-medium text-[var(--color-primary)] max-w-[200px] truncate">
                    {item.fdCustName}
                  </div>
                  <div className="text-[10.5px] text-[var(--color-secondary)] font-mono">
                    {item.fdCustCode}
                  </div>
                </td>

                {/* Total Uang Masuk */}
                <td className="py-2.5 px-3 text-right font-medium text-emerald-500">
                  {formatCurrency(item.totalRcv)}
                  <div className="text-[10.5px] text-[var(--color-secondary)]">
                    {item.rcvCount} instrumen
                  </div>
                </td>

                {/* Total Alokasi Faktur */}
                <td className="py-2.5 px-3 text-right font-medium text-blue-500">
                  {formatCurrency(item.totalDetail)}
                  <div className="text-[10.5px] text-[var(--color-secondary)]">
                    {item.detailCount} faktur
                  </div>
                </td>

                {/* Status Keseimbangan (Zero-Difference) */}
                <td className="py-2.5 px-3 text-center">
                  {item.isBalanced ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-transparent border border-emerald-500/40 text-emerald-500">
                      {t('cashier.statusBalanced')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-transparent border border-amber-500/40 text-amber-500">
                      {t('cashier.statusUnbalanced')} ({formatCurrency(item.balance)})
                    </span>
                  )}
                </td>

                {/* Ref Kasir Sementara (Mode Official) */}
                {mode === 'OFFICIAL' && (
                  <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--color-secondary)]">
                    {item.fdCashierXX || '-'}
                  </td>
                )}

                {/* Status Posting / Attach */}
                <td className="py-2.5 px-3 text-center">
                  {mode === 'OFFICIAL' ? (
                    item.fdPost === 1 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-transparent border border-slate-500/40 text-slate-400">
                        {t('cashier.statusPosted')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-transparent border border-sky-500/40 text-sky-500">
                        {t('cashier.statusOpen')}
                      </span>
                    )
                  ) : item.fdPost === 1 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-transparent border border-emerald-500/40 text-emerald-500">
                      {t('cashier.statusAttached')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-transparent border border-amber-500/40 text-amber-500">
                      {t('cashier.statusUnattached')}
                    </span>
                  )}
                </td>

                {/* Tombol Aksi */}
                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRowClick(item.fdCashierID)}
                      className="px-2 py-1 rounded text-xs font-semibold text-[var(--color-tertiary)] hover:bg-[var(--color-neutral)] border border-transparent hover:border-[var(--color-border)] transition-colors cursor-pointer"
                    >
                      {t('common.detail')}
                    </button>

                    {mode === 'TEMPORARY' && item.fdPost === 0 && onAttachClick && (
                      <button
                        type="button"
                        onClick={() => onAttachClick(item)}
                        className="px-2 py-1 rounded text-xs font-semibold text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/40 transition-colors cursor-pointer"
                      >
                        {t('cashier.btnAttach')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center px-1">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={totalItems}
            limit={itemsPerPage}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  )
}
