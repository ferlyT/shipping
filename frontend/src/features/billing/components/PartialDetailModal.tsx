import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { X, Layers, FileText, User, Box, Hash, Receipt } from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDateTime, formatDecimal } from '@/lib/utils'
import type { PartialDetailItem, TargetBillingItem } from '../types/billing.types'

interface PartialDetailModalProps {
  item: TargetBillingItem | null
  onClose: () => void
}

export function PartialDetailModal({ item, onClose }: PartialDetailModalProps) {
  const markingCode = item?.markingCode || ''
  const customer = item?.customer || ''

  const { data: resData, isLoading } = useQuery({
    queryKey: ['billingPartialDetails', markingCode, customer],
    queryFn: async () => {
      const res = await billingApi.partialDetails({ markingCode, customer })
      return res.data as { data: PartialDetailItem[] }
    },
    enabled: Boolean(markingCode),
    staleTime: 30_000,
  })

  if (!item) return null

  const details: PartialDetailItem[] = resData?.data || []

  const totalColy = details.reduce((acc, d) => acc + (d.jmlPack || 0), 0)
  const totalM3 = details.reduce((acc, d) => acc + (d.m3 || 0), 0)
  const totalKg = details.reduce((acc, d) => acc + (d.berat || 0), 0)
  const distinctTerima = Array.from(new Set(details.map((d) => d.fdTerima).filter(Boolean)))

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-5xl xl:max-w-6xl overflow-hidden animate-fadeIn max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-[var(--color-primary)]">Data Pengiriman Parsial</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-transparent border border-purple-500/50 text-purple-600 dark:text-purple-400">
                  {details.length || item.countTerima || 0} Pengiriman
                </span>
                {distinctTerima.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-transparent border border-blue-500/40 text-blue-600 dark:text-blue-400">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Tanda Terima: <strong className="font-mono">{distinctTerima.join(', ')}</strong></span>
                  </span>
                )}
              </div>
              <span className="text-[11px] sm:text-xs block text-[var(--color-secondary)] mt-0.5">
                <strong className="text-[var(--color-primary)]">{item.customer}</strong> · {item.markingCode} · {item.branch}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)]">
              <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider block">Total Record</span>
              <span className="text-base font-bold text-[var(--color-primary)] font-mono">{details.length} list</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)]">
              <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider block">Total Qty</span>
              <span className="text-base font-bold text-[var(--color-primary)] font-mono">{totalColy} {item.satuan || 'COLY'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)]">
              <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider block">Total M3</span>
              <span className="text-base font-bold text-[var(--color-primary)] font-mono">{formatDecimal(totalM3, 4)} m³</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)]">
              <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider block">Total Berat</span>
              <span className="text-base font-bold text-[var(--color-primary)] font-mono">{formatDecimal(totalKg, 2)} kg</span>
            </div>
          </div>

          {/* Table Container */}
          {isLoading ? (
            <div className="py-12 flex justify-center items-center">
              <LoadingSpinner message="Memuat rincian parsial dari tbEntryList..." />
            </div>
          ) : details.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-secondary)]">
              Tidak ditemukan data pengiriman parsial untuk marking ini.
            </div>
          ) : (
            <div className="border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--color-neutral)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] border-b border-[var(--color-border)] font-[var(--font-display)]">
                  <tr>
                    <th className="px-4 py-3.5 w-[18%]">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                        <span>No. List</span>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 w-[32%]">
                      <div className="flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                        <span>Marking No / Coly</span>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 w-[22%]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                        <span>Input Oleh & Tgl</span>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 w-[18%]">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                        <span>No. Invoice</span>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 w-[10%] text-right">
                      <span>Qty / M3 / Berat</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {details.map((row, idx) => {
                    const hasInvoice = row.invNo && row.invNo !== '-'
                    return (
                      <tr
                        key={idx}
                        className={`transition-colors hover:bg-[var(--color-neutral)]/40 ${
                          idx % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-neutral)]/15'
                        }`}
                      >
                        {/* No List */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-[var(--color-primary)]">
                          {row.listCode || '-'}
                        </td>

                        {/* Marking No */}
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-[var(--color-primary)] block leading-snug">{row.markingNo || '-'}</span>
                          {row.desc && <p className="text-[10px] text-[var(--color-secondary)] truncate max-w-[280px] mt-0.5">{row.desc}</p>}
                        </td>

                        {/* Input Oleh & Tgl Input */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-[var(--color-primary)] text-xs">
                            {row.fdEmp1 || '-'}
                          </div>
                          <div className="text-[11px] text-[var(--color-secondary)] mt-0.5">
                            {row.fdLoad ? formatDateTime(row.fdLoad) : '-'}
                          </div>
                        </td>

                        {/* No Invoice (fdInvNo) */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {hasInvoice ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-transparent border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-mono">
                              {row.invNo}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)]">
                              Belum Diinvoice
                            </span>
                          )}
                        </td>

                        {/* Qty / M3 / Kg */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono">
                          <div className="font-bold text-[var(--color-primary)]">{row.jmlPack} {row.satuan}</div>
                          <div className="text-[10px] text-[var(--color-secondary)] mt-0.5">
                            {row.m3 > 0 ? `${formatDecimal(row.m3, 4)} m³` : ''}
                            {row.berat > 0 ? ` · ${formatDecimal(row.berat, 2)} kg` : ''}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/40 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[var(--color-secondary)]">
            Sumber Data: <code className="font-mono text-[10px] bg-[var(--color-neutral)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">tbEntryList</code>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
