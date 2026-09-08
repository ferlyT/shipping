import { useModalEscape } from '@/hooks/useModalEscape'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { X, Layers, FileText, User, Box, Hash, Receipt, Tag } from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDateTime, formatDecimal } from '@/lib/utils'
import type { PartialDetailItem, TargetBillingItem } from '../types/billing.types'

interface PartialDetailModalProps {
  item: TargetBillingItem | null
  onClose: () => void
}

export function PartialDetailModal({ item, onClose }: PartialDetailModalProps) {
  useModalEscape(Boolean(item), onClose)
  const markingCode = item?.markingCode || ''
  const customer = item?.customer || ''
  const custCode = item?.custCode || ''

  const { data: resData, isLoading } = useQuery({
    queryKey: ['billingPartialDetails', markingCode, customer, custCode],
    queryFn: async () => {
      const res = await billingApi.partialDetails({ markingCode, customer, custCode })
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-fadeIn font-[var(--font-body)]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-5xl xl:max-w-6xl overflow-hidden animate-fadeIn max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 sm:py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)] shrink-0 gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="hidden sm:flex p-2 sm:p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xs sm:text-base font-bold text-[var(--color-primary)]">
                  Data Pengiriman Parsial
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-transparent border border-purple-500/50 text-purple-600 dark:text-purple-400">
                  {details.length || item.countTerima || 0} Pengiriman
                </span>
                {distinctTerima.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-transparent border border-blue-500/40 text-blue-600 dark:text-blue-400">
                    <FileText className="hidden sm:inline-block w-3 h-3 text-blue-500" />
                    <span>Resi Agent ({distinctTerima.length}): <strong className="font-mono">{distinctTerima.join(', ')}</strong></span>
                  </span>
                )}
              </div>
              <span className="text-[11px] sm:text-xs block text-[var(--color-secondary)] mt-0.5 truncate">
                <strong className="text-[var(--color-primary)]">{item.customer}</strong> · {item.markingCode} · {item.branch}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3.5 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)]">
              <span className="text-[9px] sm:text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider block">
                Total Record
              </span>
              <span className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-mono">
                {details.length} list
              </span>
            </div>
            <div className="p-2.5 sm:p-3.5 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)]">
              <span className="text-[9px] sm:text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider block">
                No. Resi
              </span>
              <span className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400 font-mono">
                {distinctTerima.length} resi
              </span>
            </div>
            <div className="p-2.5 sm:p-3.5 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)]">
              <span className="text-[9px] sm:text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider block">
                Total Qty
              </span>
              <span className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-mono">
                {totalColy} {item.satuan || 'COLY'}
              </span>
            </div>
            <div className="p-2.5 sm:p-3.5 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)]">
              <span className="text-[9px] sm:text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider block">
                Total M3 / Berat
              </span>
              <span className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-mono">
                {formatDecimal(totalM3, 4)} m³ <span className="text-xs text-[var(--color-secondary)]">({formatDecimal(totalKg, 2)} kg)</span>
              </span>
            </div>
          </div>

          {/* Table Container / Shortlist */}
          {isLoading ? (
            <div className="py-12 flex justify-center items-center">
              <LoadingSpinner message="Memuat rincian parsial dari tbEntryList..." />
            </div>
          ) : details.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-secondary)]">
              Tidak ditemukan data pengiriman parsial untuk marking ini.
            </div>
          ) : (
            <>
              {/* ── MOBILE SHORTLIST (< sm) ── */}
              <div className="sm:hidden space-y-2.5">
                {details.map((row, idx) => {
                  const hasInvoice = row.invNo && row.invNo !== '-'
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2 shadow-2xs"
                    >
                      {/* Top: No. List + Invoice Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase">No. List:</span>
                          <span className="font-mono font-bold text-xs text-[var(--color-primary)]">
                            {row.listCode || '-'}
                          </span>
                        </div>
                        {hasInvoice ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/5">
                            <Receipt className="hidden sm:inline-block w-3 h-3" />
                            {row.invNo}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border border-[var(--color-border)] text-[var(--color-secondary)]">
                            Belum Diinvoice
                          </span>
                        )}
                      </div>

                      {/* Marking Code, No & Resi Agent */}
                      <div className="p-2.5 rounded-lg bg-[var(--color-neutral)]/50 border border-[var(--color-border)]/60 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {row.markingCode && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 font-mono">
                                <Tag className="w-2.5 h-2.5 text-purple-500" />
                                {row.markingCode}
                              </span>
                            )}
                            <span className="font-bold text-xs text-[var(--color-primary)] font-mono">
                              {row.markingNo || '-'}
                            </span>
                          </div>
                          {row.fdTerima && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-transparent border border-blue-500/40 text-blue-600 dark:text-blue-400 font-mono" title="Resi Agent">
                              <FileText className="w-2.5 h-2.5 text-blue-500" />
                              {row.fdTerima}
                            </span>
                          )}
                        </div>
                        {row.desc && (
                          <p className="text-[11px] text-[var(--color-secondary)] leading-snug break-words">
                            {row.desc}
                          </p>
                        )}
                      </div>

                      {/* Bottom: Input Info & Specs */}
                      <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)] pt-1.5 border-t border-[var(--color-border)]/50 gap-2 flex-wrap">
                        <div className="flex items-center gap-1 truncate max-w-[55%]">
                          <User className="hidden sm:inline-block w-3 h-3 text-[var(--color-tertiary)] shrink-0" />
                          <span className="font-semibold text-[var(--color-primary)] truncate">{row.fdEmp1 || '-'}</span>
                          {row.fdLoad && (
                            <span className="text-[10px] text-[var(--color-secondary)] truncate">
                              · {formatDateTime(row.fdLoad)}
                            </span>
                          )}
                        </div>
                        <div className="font-mono font-bold text-[var(--color-primary)] text-right shrink-0 text-xs">
                          <span>{row.jmlPack} {row.satuan}</span>
                          {row.m3 > 0 && <span className="text-[var(--color-secondary)] font-medium"> · {formatDecimal(row.m3, 4)} m³</span>}
                          {row.berat > 0 && <span className="text-[var(--color-secondary)] font-medium"> · {formatDecimal(row.berat, 2)} kg</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── DESKTOP TABLE (>= sm) ── */}
              <div className="hidden sm:block border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--color-neutral)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] border-b border-[var(--color-border)] font-[var(--font-display)]">
                    <tr>
                      <th className="px-4 py-3.5 w-[14%]">
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                          <span>No. List</span>
                        </div>
                      </th>
                      <th className="px-4 py-3.5 w-[14%]">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                          <span>Marking Code</span>
                        </div>
                      </th>
                      <th className="px-4 py-3.5 w-[14%]">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                          <span>Resi Agent</span>
                        </div>
                      </th>
                      <th className="px-4 py-3.5 w-[22%]">
                        <div className="flex items-center gap-1.5">
                          <Box className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                          <span>Marking No / Deskripsi</span>
                        </div>
                      </th>
                      <th className="px-4 py-3.5 w-[16%]">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                          <span>Input Oleh & Tgl</span>
                        </div>
                      </th>
                      <th className="px-4 py-3.5 w-[10%]">
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
                          className={`transition-colors hover:bg-[var(--color-neutral)]/40 ${idx % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-neutral)]/15'
                            }`}
                        >
                          {/* No List */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-[var(--color-primary)]">
                            {row.listCode || '-'}
                          </td>

                          {/* Marking Code */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {row.markingCode ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-transparent border border-purple-500/40 text-purple-600 dark:text-purple-400 font-mono">
                                <Tag className="w-3 h-3 text-purple-500" />
                                {row.markingCode}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[var(--color-secondary)]">-</span>
                            )}
                          </td>

                          {/* Tanda Terima (fdTerima) */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {row.fdTerima ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-transparent border border-blue-500/40 text-blue-600 dark:text-blue-400 font-mono">
                                <FileText className="w-3 h-3 text-blue-500" />
                                {row.fdTerima}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[var(--color-secondary)]">-</span>
                            )}
                          </td>

                          {/* Marking No */}
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-[var(--color-primary)] block leading-snug">{row.markingNo || '-'}</span>
                            {row.desc && <p className="text-[10px] text-[var(--color-secondary)] truncate max-w-[220px] mt-0.5">{row.desc}</p>}
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 sm:py-3.5 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/40 flex items-center justify-between shrink-0">
          <span className="text-[10px] sm:text-[11px] text-[var(--color-secondary)] truncate">
            Sumber: <code className="font-mono text-[9px] sm:text-[10px] bg-[var(--color-neutral)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">tbEntryList</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-semibold rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

