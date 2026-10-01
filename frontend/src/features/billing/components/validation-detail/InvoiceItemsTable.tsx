import { Receipt, Lock, Edit3, AlertTriangle, Truck } from 'lucide-react'
import { CurrencyValue, formatWithCurrency } from '@/components/ui/CurrencyValue'
import { cn } from '@/lib/utils'
import { formatQtyDecimal, getEffectiveInvoiceTotal } from '../../utils/billing.utils'
import { useTranslation } from '@/hooks/useTranslation'
import { ItemPriceBadge } from './ValidationBadges'
import type { Billing, BillingDetail, M3CheckResponse } from '../../types/billing.types'

export interface InvoiceItemsTableProps {
  details: BillingDetail[]
  data: Billing
  isLocked: boolean
  onOpenEditItemsModal: () => void
  hasUnbilledTransport: boolean
  unbilledExpedisiList: any[]
  totalUnbilledTransportAmount: number
  onOpenSummaryModal: () => void
  isCurrencyInputError: boolean
  currencyInputErrorDetail: {
    foreignCurr: string
    fdJumlah2: number
    correctTotalRp: number
    matchedItemName?: string
  } | null | undefined
  transportValidation?: any
  validExpedisiList: any[]
  evaluatedItems: Array<{ item: BillingDetail; evaluation: any }>
  validationData?: M3CheckResponse | null
  unitTotals: Record<string, number>
}

export function InvoiceItemsTable({
  details,
  data,
  isLocked,
  onOpenEditItemsModal,
  hasUnbilledTransport,
  unbilledExpedisiList,
  totalUnbilledTransportAmount,
  onOpenSummaryModal,
  isCurrencyInputError,
  currencyInputErrorDetail,
  transportValidation,
  validExpedisiList,
  evaluatedItems,
  validationData,
  unitTotals,
}: InvoiceItemsTableProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs overflow-hidden h-fit max-h-[calc(100vh-13rem)]">
      {/* Header */}
      <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[var(--color-tertiary)]/15 text-[var(--color-tertiary)] flex items-center justify-center shrink-0">
            <Receipt size={13} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] font-[var(--font-label)] truncate">
            Rincian Item Tagihan
          </span>
          <span className="text-[11px] font-semibold text-[var(--color-secondary)] px-1.5 py-0.2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shrink-0">
            {details.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenEditItemsModal}
          className={cn(
            'px-2.5 py-1 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0',
            isLocked
              ? 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-primary)] hover:border-[var(--color-tertiary)]'
          )}
          title={isLocked ? 'Invoice berstatus ISSUED / LUNAS (Mode Baca)' : 'Edit Kuantitas, Harga, Satuan, atau Tambah/Hapus Baris Item'}
        >
          {isLocked ? (
            <>
              <Lock size={13} className="text-amber-500" />
              <span>Lihat Item</span>
            </>
          ) : (
            <>
              <Edit3 size={13} className="text-[var(--color-tertiary)]" />
              <span>Edit Item</span>
            </>
          )}
        </button>
      </div>

      {/* Warning jika ada ekspedisi Harus Tagih namun item tagihan tidak ada */}
      {hasUnbilledTransport && (
        <div className="p-2.5 sm:p-3 bg-amber-500/10 border-b border-amber-500/25 flex items-start justify-between gap-2.5 text-xs shadow-2xs">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={12} />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-amber-900 dark:text-amber-200 block text-[11px] sm:text-xs">
                Peringatan tbExpIndo: Biaya Ekspedisi (Harus Tagih) Belum Ditagihkan!
              </span>
              <span className="text-[10px] sm:text-[11px] text-amber-800/90 dark:text-amber-300 block leading-tight">
                Ditemukan {unbilledExpedisiList.length} catatan ekspedisi berstatus Harus Tagih (fdPaid: 1) di <code className="font-mono px-1 rounded bg-amber-500/20">tbExpIndo</code> senilai total <strong className="font-mono font-bold text-amber-950 dark:text-amber-100">{formatWithCurrency(totalUnbilledTransportAmount, 'Rp.')}</strong> ({unbilledExpedisiList[0]?.fdExpName || 'Ekspedisi'}{unbilledExpedisiList[0]?.fdResiExp ? ` Resi: ${unbilledExpedisiList[0].fdResiExp}` : ''}), namun belum ada baris item tagihan Transport / Ongkir pada invoice ini.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSummaryModal}
            className="px-2 py-1 rounded text-[11px] font-bold border border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/25 transition-colors shrink-0 whitespace-nowrap cursor-pointer self-start"
          >
            Detail →
          </button>
        </div>
      )}

      {/* Body */}
      <div className="overflow-y-auto min-h-0 max-h-[calc(100vh-20rem)] divide-y divide-[var(--color-border)]/60">
        {details.length > 0 ? (
          <>
            {/* MOBILE CARDS VIEW (< sm) */}
            <div className="sm:hidden divide-y divide-[var(--color-border)]/60">
              {details.map((row) => (
                <div key={row.fdID} className="p-3 space-y-2 hover:bg-[var(--color-neutral)]/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-[var(--color-primary)] text-xs leading-snug" title={row.fdItemName}>
                          {row.fdItemName}
                        </p>
                        {isCurrencyInputError && currencyInputErrorDetail && Math.abs(Number(row.fdTotal || 0) - currencyInputErrorDetail.fdJumlah2) < 1 && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-0.5 shrink-0"
                            title={`Nilai item ini (${formatWithCurrency(row.fdTotal, 'Rp.')}) keliru diinput sebagai valas ${currencyInputErrorDetail.foreignCurr}`}
                          >
                            <AlertTriangle size={9} className="shrink-0" />
                            <span>Salah Input ke Valas</span>
                          </span>
                        )}
                      </div>
                      {/* Baris Rincian tbExpIndo jika item adalah Transport */}
                      {/(TRANSPORT|DELIVERY|ONGKIR|TRUCKING)/i.test(row.fdItemName || '') && (
                        <div className="text-[10px] text-[var(--color-secondary)] flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5">
                            <Truck size={10} />
                            <span>tbExpIndo:</span>
                          </span>
                          {transportValidation?.matchingExpedisi ? (
                            <>
                              <span className="font-semibold text-[var(--color-primary)]">
                                {transportValidation.matchingExpedisi.fdExpName || 'Ekspedisi'}
                              </span>
                              {transportValidation.matchingExpedisi.fdResiExp && (
                                <span className="font-mono text-[9px] text-[var(--color-secondary)]">
                                  ({transportValidation.matchingExpedisi.fdResiExp.trim()})
                                </span>
                              )}
                              {transportValidation.matchingExpedisi.fdPaid === 1 ? (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                  Harus Tagih
                                </span>
                              ) : transportValidation.matchingExpedisi.fdPaid === 2 ? (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/30">
                                  COD
                                </span>
                              ) : null}
                              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                • Real: {formatWithCurrency(transportValidation.matchingExpedisi.fdTotalExp, 'Rp.')}
                              </span>
                            </>
                          ) : validExpedisiList.length > 0 ? (
                            <>
                              <span className="font-semibold text-[var(--color-primary)]">
                                {validExpedisiList[0].fdExpName || 'Ekspedisi'}
                              </span>
                              {validExpedisiList[0].fdResiExp && (
                                <span className="font-mono text-[9px] text-[var(--color-secondary)]">
                                  ({validExpedisiList[0].fdResiExp.trim()})
                                </span>
                              )}
                              {validExpedisiList[0].fdPaid === 1 ? (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                  Harus Tagih
                                </span>
                              ) : validExpedisiList[0].fdPaid === 2 ? (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/30">
                                  COD
                                </span>
                              ) : null}
                              <span className="font-mono text-[var(--color-primary)]">
                                • tbExpIndo: {formatWithCurrency(validExpedisiList[0].fdTotalExp, 'Rp.')}
                              </span>
                            </>
                          ) : transportValidation?.expedisiList && transportValidation.expedisiList.length > 0 ? (
                            <span className="italic text-amber-600 dark:text-amber-400">
                              tbExpIndo: Biaya Rp 0 (Belum Terisi / Tidak Valid)
                            </span>
                          ) : (
                            <span className="italic text-amber-600 dark:text-amber-400">
                              Belum ada data di tbExpIndo
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right font-mono font-bold text-xs text-[var(--color-primary)] shrink-0">
                      <CurrencyValue value={row.fdTotal} currency={row.fdCurr} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-secondary)]">
                    <span className="flex items-center gap-1 font-sans">
                      <span className="font-semibold text-[var(--color-primary)] font-mono">
                        {formatQtyDecimal(row.fdQty, row.fdListCode, row.fdItemName)}
                      </span>
                      {row.fdListCode && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--color-neutral)] border border-[var(--color-border)]">
                          {row.fdListCode.trim()}
                        </span>
                      )}
                    </span>
                    <span>@ {formatWithCurrency(row.fdItemPrice, row.fdCurr)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-[var(--color-border)]/40 flex-wrap">
                    {(() => {
                      const evalItem = evaluatedItems.find((e) => e.item.fdID === row.fdID)?.evaluation
                      const displayComodity = evalItem?.comodityName && evalItem.comodityName !== '—'
                        ? evalItem.comodityName
                        : row.fdComodity
                      return (
                        <>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {displayComodity && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] font-medium truncate max-w-[150px]">
                                {displayComodity}
                              </span>
                            )}
                          </div>
                          <ItemPriceBadge
                            row={row}
                            validationData={validationData}
                            expedisiList={validExpedisiList}
                            evaluation={evalItem}
                          />
                        </>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP / TABLET SPREADSHEET TABLE (>= sm) */}
            <table className="hidden sm:table w-full table-fixed text-left text-xs">
              <colgroup>
                <col style={{ width: '52%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <thead className="bg-[var(--color-neutral)]/80 sticky top-0 z-10 text-[10px] uppercase font-bold text-[var(--color-secondary)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-3.5 py-2">Deskripsi / Komoditas</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3.5 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/60">
                {details.map((row) => (
                  <tr key={row.fdID} className="hover:bg-[var(--color-neutral)]/30 transition-colors">
                    <td className="px-3.5 py-2.5 leading-snug">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-[var(--color-primary)] text-xs line-clamp-2" title={row.fdItemName}>
                          {row.fdItemName}
                        </p>
                        {isCurrencyInputError && currencyInputErrorDetail && Math.abs(Number(row.fdTotal || 0) - currencyInputErrorDetail.fdJumlah2) < 1 && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-0.5 shrink-0"
                            title={`Nilai item ini (${formatWithCurrency(row.fdTotal, 'Rp.')}) keliru diinput sebagai valas ${currencyInputErrorDetail.foreignCurr}`}
                          >
                            <AlertTriangle size={9} className="shrink-0" />
                            <span>Salah Input ke Valas</span>
                          </span>
                        )}
                      </div>
                      {/* Baris Rincian tbExpIndo jika item adalah Transport */}
                      {/(TRANSPORT|DELIVERY|ONGKIR|TRUCKING)/i.test(row.fdItemName || '') && (
                        <div className="text-[10px] text-[var(--color-secondary)] flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5">
                            <Truck size={10} />
                            <span>tbExpIndo:</span>
                          </span>
                          {transportValidation?.matchingExpedisi ? (
                            <>
                              <span className="font-semibold text-[var(--color-primary)]">
                                {transportValidation.matchingExpedisi.fdExpName || 'Ekspedisi'}
                              </span>
                              {transportValidation.matchingExpedisi.fdResiExp && (
                                <span className="font-mono text-[9px] text-[var(--color-secondary)]">
                                  ({transportValidation.matchingExpedisi.fdResiExp.trim()})
                                </span>
                              )}
                              {transportValidation.matchingExpedisi.fdPaid === 1 ? (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                  Harus Tagih
                                </span>
                              ) : transportValidation.matchingExpedisi.fdPaid === 2 ? (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/30">
                                  COD
                                </span>
                              ) : null}
                              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                • Real: {formatWithCurrency(transportValidation.matchingExpedisi.fdTotalExp, 'Rp.')}
                              </span>
                            </>
                          ) : validExpedisiList.length > 0 ? (
                            <>
                              <span className="font-semibold text-[var(--color-primary)]">
                                {validExpedisiList[0].fdExpName || 'Ekspedisi'}
                              </span>
                              {validExpedisiList[0].fdResiExp && (
                                <span className="font-mono text-[9px] text-[var(--color-secondary)]">
                                  ({validExpedisiList[0].fdResiExp.trim()})
                                </span>
                              )}
                              {validExpedisiList[0].fdPaid === 1 ? (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                  Harus Tagih
                                </span>
                              ) : validExpedisiList[0].fdPaid === 2 ? (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/30">
                                  COD
                                </span>
                              ) : null}
                              <span className="font-mono text-[var(--color-primary)]">
                                • tbExpIndo: {formatWithCurrency(validExpedisiList[0].fdTotalExp, 'Rp.')}
                              </span>
                            </>
                          ) : transportValidation?.expedisiList && transportValidation.expedisiList.length > 0 ? (
                            <span className="italic text-amber-600 dark:text-amber-400">
                              tbExpIndo: Biaya Rp 0 (Belum Terisi / Tidak Valid)
                            </span>
                          ) : (
                            <span className="italic text-amber-600 dark:text-amber-400">
                              Belum ada data di tbExpIndo
                            </span>
                          )}
                        </div>
                      )}
                      {(() => {
                        const evalItem = evaluatedItems.find((e) => e.item.fdID === row.fdID)?.evaluation
                        const displayComodity = evalItem?.comodityName && evalItem.comodityName !== '—'
                          ? evalItem.comodityName
                          : row.fdComodity
                        return (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {displayComodity && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] font-medium truncate max-w-[130px]">
                                {displayComodity}
                              </span>
                            )}
                            <span className="text-[10px] text-[var(--color-secondary)] font-mono">
                              @ {formatWithCurrency(row.fdItemPrice, row.fdCurr)}
                            </span>
                            <ItemPriceBadge
                              row={row}
                              validationData={validationData}
                              expedisiList={validExpedisiList}
                              evaluation={evalItem}
                            />
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-medium text-[var(--color-primary)]">
                      {formatQtyDecimal(row.fdQty, row.fdListCode, row.fdItemName)}
                      {row.fdListCode && (
                        <span className="text-[9px] text-[var(--color-secondary)] block font-sans">
                          {row.fdListCode.trim()}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[var(--color-primary)]">
                      <CurrencyValue value={row.fdTotal} currency={row.fdCurr} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="py-10 text-center text-xs text-[var(--color-secondary)]">
            {t('billing.detail.noItems')}
          </div>
        )}
      </div>

      {/* Sticky Footer: Totals */}
      <div className="p-3 sm:p-3.5 bg-[var(--color-neutral)]/70 border-t border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {Object.entries(unitTotals).map(([unit, qty]) => (
            <span key={unit} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] font-semibold text-xs text-[var(--color-primary)] shadow-2xs">
              <span className="text-[var(--color-secondary)] font-normal">{unit}:</span>
              <span>{formatQtyDecimal(qty, unit)}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
          <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">Total:</span>
          {isCurrencyInputError && currencyInputErrorDetail ? (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className="font-mono font-bold text-base sm:text-lg text-[var(--color-tertiary)]">
                {formatWithCurrency(currencyInputErrorDetail.correctTotalRp, 'Rp.')}
              </span>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 whitespace-nowrap"
                title={`fdJumlah2 ${currencyInputErrorDetail.foreignCurr} ${currencyInputErrorDetail.fdJumlah2.toLocaleString('id-ID')} adalah kesalahan input FoxPro (nilai riil Rupiah)`}
              >
                <AlertTriangle size={9} className="shrink-0" />
                <span>⚠ fdJumlah2 {currencyInputErrorDetail.foreignCurr} Keliru</span>
              </span>
            </div>
          ) : (
            <span className="font-mono font-bold text-base sm:text-lg text-[var(--color-tertiary)]">
              {(() => {
                const { total, currency } = getEffectiveInvoiceTotal(data, details)
                return formatWithCurrency(total, currency)
              })()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
