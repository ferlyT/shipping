import React from 'react'
import {
  Tag,
  Clock,
  History,
  FileText,
  Plane,
  Ship,
  Check,
  TrendingUp,
  TrendingDown,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDate, formatDecimal, formatCurrency, cleanFoxProString } from '@/lib/utils'
import { evaluateItemPrice } from '../../utils/billing.utils'
import type { InvoiceDetail, M3CheckResponse } from './types'

export interface ProfilePricingTabProps {
  res: M3CheckResponse
  isAir: boolean
  defaultTypeId: number | null
  defaultComodityName: string
  branchCode?: string | null
  invoiceNo?: string | null
  invoiceDetails: InvoiceDetail[]
  evaluatedItems: any[]
  effectiveNoteMode: 'air' | 'sea'
  setSelectedNoteMode: (mode: 'air' | 'sea') => void
  setIsModalOpen: (open: boolean) => void
  onOpenAuditModal?: () => void
}

export const ProfilePricingTab: React.FC<ProfilePricingTabProps> = ({
  res,
  isAir,
  defaultTypeId,
  defaultComodityName,
  branchCode,
  invoiceNo,
  invoiceDetails,
  evaluatedItems,
  effectiveNoteMode,
  setSelectedNoteMode,
  setIsModalOpen,
  onOpenAuditModal,
}) => {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      {res.profileHarga && (
        <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>{t('billing.validation.custPriceProfile')}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(res.profileHarga.fdUpdate || res.profileHarga.fdUpdateDate) && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)]">
                  <Clock size={11} className="text-[var(--color-tertiary)] shrink-0" />
                  <span>Update: <strong className="text-[var(--color-primary)] font-semibold">{res.profileHarga.fdUpdate || '—'}</strong></span>
                  {res.profileHarga.fdUpdateDate && (
                    <>
                      <span>•</span>
                      <span>{formatDate(res.profileHarga.fdUpdateDate)}</span>
                    </>
                  )}
                  {res.profileHarga.fdUpdateSource === 'AUDIT' ? (
                    <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                      tbAuditHarga
                    </span>
                  ) : res.profileHarga.fdUpdateSource === 'CUSTOMER_HARGA' ? (
                    <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/30">
                      tbCustomerHarga
                    </span>
                  ) : null}
                </div>
              )}
              {onOpenAuditModal && (
                <button
                  type="button"
                  onClick={onOpenAuditModal}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-transparent border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer shadow-2xs"
                  title={t('billing.validation.priceAuditTooltip')}
                >
                  <History className="w-3 h-3 text-amber-500" />
                  <span>{t('billing.validation.priceAudit')}</span>
                </button>
              )}
              <Badge variant="default" className="text-[10px] font-mono">
                {t('billing.validation.billTypeLabel')}: {
                  res.profileHarga.typeTagihan === 1
                    ? '1 (m3 + Kg)'
                    : res.profileHarga.typeTagihan === 2
                      ? '2 (compare m3 : Kg)'
                      : res.profileHarga.typeTagihan === 3
                        ? '3 (m3 tidak kena Kg)'
                        : res.profileHarga.typeTagihan === 4
                          ? '4 (Kg)'
                          : `${res.profileHarga.typeTagihan}`
                }
              </Badge>
            </div>
          </div>

          {/* Kelompok Tarif Utama — full width */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 space-y-2">
            <p className="text-[10px] uppercase font-sans text-[var(--color-secondary)] font-bold tracking-wider">
              {t('billing.validation.mainTariff')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md p-2">
                <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">{t('billing.validation.m3Price')}</p>
                <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                  {res.profileHarga.harga > 0 ? formatCurrency(res.profileHarga.harga) : '—'}
                </p>
              </div>

              <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md p-2">
                <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">{t('billing.validation.kgPrice')}</p>
                <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                  {res.profileHarga.kg > 0 ? `${formatDecimal(res.profileHarga.kg, 0)} kg` : '—'}
                </p>
              </div>

              <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md p-2">
                <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">{t('billing.validation.ratio')}</p>
                <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                  {res.profileHarga.rasio > 0 ? formatDecimal(res.profileHarga.rasio, 2) : '—'}
                </p>
              </div>

              <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md p-2">
                <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">
                  {res.fdListType === 1 ? t('billing.validation.minChargeKg') : t('billing.validation.minChargeM3')}
                </p>
                <div className="mt-0.5">
                  {res.fdListType === 1 ? (
                    (res.profileHarga.minChargeKg ?? 0) > 0 ? (
                      <p className="font-bold text-[var(--color-primary)] text-xs sm:text-sm">
                        {`${formatDecimal(res.profileHarga.minChargeKg, 2)} kg`}
                      </p>
                    ) : (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-bold text-[var(--color-primary)] text-xs sm:text-sm">
                          3.00 kg
                        </span>
                        <Badge variant="warning" className="text-[8px] px-1 py-0 font-bold">
                          {t('billing.validation.noDataYet')}
                        </Badge>
                      </div>
                    )
                  ) : (res.profileHarga.minChargeM3 ?? 0) > 0 ? (
                    <p className="font-bold text-[var(--color-primary)] text-xs sm:text-sm">
                      {`${formatDecimal(res.profileHarga.minChargeM3, 4)} m³`}
                    </p>
                  ) : (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-bold text-[var(--color-primary)] text-xs sm:text-sm">
                        0.1000 m³
                      </span>
                      <Badge variant="warning" className="text-[8px] px-1 py-0 font-bold">
                        {t('billing.validation.noDataYet')}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Baris Rata Samping: Tax Return & Catatan Tarif Customer ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {/* Kolom 1: Kelompok Tax Return */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 space-y-2 flex flex-col justify-between">
              <p className="text-[10px] uppercase font-sans text-[var(--color-secondary)] font-bold tracking-wider">
                {t('billing.validation.taxReturnTitle')}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono flex-1">
                <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md p-2 flex flex-col justify-between">
                  <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">
                    {t('billing.validation.taxReturnTariff')}
                  </p>
                  <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                    {res.profileHarga.taxReturnPrice > 0 ? formatCurrency(res.profileHarga.taxReturnPrice) : '—'}
                  </p>
                </div>

                <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md p-2 flex flex-col justify-between">
                  <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">
                    {t('billing.validation.taxReturnMinCharge')}
                  </p>
                  <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                    {res.profileHarga.taxReturnMinCharge > 0 ? `${formatDecimal(res.profileHarga.taxReturnMinCharge, 4)} m³` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Kolom 2: Catatan Khusus Tarif Customer (Sesuai Mode Tagihan & Dapat Beralih) */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <p className="text-[10px] uppercase font-sans text-[var(--color-secondary)] font-bold tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>{t('billing.validation.tariffNotesTitle')}</span>
                  <span className="text-[9px] font-normal text-[var(--color-secondary)] lowercase font-mono">
                    (tbCustomersHarga)
                  </span>
                </p>

                {/* Pill selector: Udara dan Laut */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedNoteMode('air')}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all cursor-pointer ${
                      effectiveNoteMode === 'air'
                        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/40 shadow-2xs font-bold'
                        : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] border border-transparent hover:border-[var(--color-border)]'
                    }`}
                    title="Tampilkan Catatan Tarif Udara (fdNote)"
                  >
                    <Plane size={11} />
                    <span>Udara</span>
                    {isAir && <span className="text-[8px] opacity-75 font-normal">(Bill)</span>}
                    {Boolean(res.profileHarga.fdNoteAir?.trim()) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" title="Ada catatan udara" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNoteMode('sea')}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all cursor-pointer ${
                      effectiveNoteMode === 'sea'
                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/40 shadow-2xs font-bold'
                        : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] border border-transparent hover:border-[var(--color-border)]'
                    }`}
                    title="Tampilkan Catatan Tarif Laut (fdNote 1)"
                  >
                    <Ship size={11} />
                    <span>Laut</span>
                    {!isAir && <span className="text-[8px] opacity-75 font-normal">(Bill)</span>}
                    {Boolean(res.profileHarga.fdNote1Sea?.trim()) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Ada catatan laut" />
                    )}
                  </button>
                </div>
              </div>

              {/* Konten Catatan Tarif Sesuai Mode */}
              {effectiveNoteMode === 'air' ? (
                <div className="p-2 rounded-md border border-sky-500/40 bg-sky-500/5 transition-all flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className="text-[10px] uppercase font-bold flex items-center gap-1 text-sky-600 dark:text-sky-400">
                        <Plane size={12} className="shrink-0" />
                        <span>{t('billing.validation.noteAirLabel')}</span>
                        <span className="text-[8.5px] font-mono text-[var(--color-secondary)] font-normal">
                          (fdNote)
                        </span>
                      </span>
                      {isAir && (
                        <span className="text-[8.5px] px-1.5 py-0.2 rounded font-bold border border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/10">
                          {t('billing.validation.activeModeBadge')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] font-mono text-[var(--color-primary)] leading-relaxed whitespace-pre-wrap break-words">
                      {res.profileHarga.fdNoteAir ? (
                        cleanFoxProString(res.profileHarga.fdNoteAir)
                      ) : (
                        <span className="text-[var(--color-secondary)] italic text-[11px]">
                          {t('billing.validation.noAirNote')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2 rounded-md border border-blue-500/40 bg-blue-500/5 transition-all flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className="text-[10px] uppercase font-bold flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <Ship size={12} className="shrink-0" />
                        <span>{t('billing.validation.noteSeaLabel')}</span>
                        <span className="text-[8.5px] font-mono text-[var(--color-secondary)] font-normal">
                          (fdNote 1)
                        </span>
                      </span>
                      {!isAir && (
                        <span className="text-[8.5px] px-1.5 py-0.2 rounded font-bold border border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10">
                          {t('billing.validation.activeModeBadge')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] font-mono text-[var(--color-primary)] leading-relaxed whitespace-pre-wrap break-words">
                      {res.profileHarga.fdNote1Sea ? (
                        cleanFoxProString(res.profileHarga.fdNote1Sea)
                      ) : (
                        <span className="text-[var(--color-secondary)] italic text-[11px]">
                          {t('billing.validation.noSeaNote')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validasi Komoditas & Price List (3-Way Comparison) */}
      {invoiceDetails && invoiceDetails.length > 0 && (
        <div className="pt-3 border-t border-[var(--color-border)] space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold font-[var(--font-label)] text-[var(--color-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[var(--color-tertiary)]" />
                {t('billing.validation.itemPriceCheck')}
              </p>
              <Badge variant="info" className="text-[10px] font-bold px-2 py-0.5">
                {defaultComodityName}
              </Badge>
            </div>
            <span className="text-[10px] font-sans text-[var(--color-secondary)]">
              {t('billing.validation.itemCountLabel', { count: invoiceDetails.length })}
            </span>
          </div>

          <div className="space-y-1.5">
            {invoiceDetails.map((item, idx) => {
              const evalObj = evaluatedItems.find((e) => e.item.fdID === item.fdID)
              const evaluation = evalObj?.evaluation || evaluateItemPrice(item, {
                res,
                isAir,
                defaultTypeId,
                defaultComodityName,
                branchCode,
                invNo: invoiceNo,
              })
              const {
                comodityName,
                profilePrice,
                minTargetPrice,
                maxTargetPrice,
                priceListDisplay,
                isMatched,
                hasTargetPrice,
                isTaxReturnItem,
                targetColName,
              } = evaluation

              const billedPrice = Number(item.fdItemPrice || 0)

              const statusBadge = evaluation.isNonValidatedBranchDashFee ? (
                <Badge variant="default" className="shrink-0 text-[10px]" title="Item biaya invoice cabang -- (tidak divalidasi ke database tarif)">
                  Non-Validasi
                </Badge>
              ) : isMatched ? (
                <Badge variant="success" className="inline-flex items-center gap-1 font-semibold text-[10px] shrink-0">
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                  <span>{t('billing.validation.matchBadge')}</span>
                </Badge>
              ) : hasTargetPrice && (isTaxReturnItem ? profilePrice > 0 : evaluation.priceItem !== null) ? (
                billedPrice > (isTaxReturnItem ? profilePrice : maxTargetPrice) ? (
                  <Badge variant="info" className="inline-flex items-center gap-1 font-semibold text-[10px] shrink-0" title={`Harga invoice (${formatCurrency(billedPrice)}) lebih tinggi dari acuan (${priceListDisplay}) - Diizinkan`}>
                    <TrendingUp className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>Overcharge</span>
                  </Badge>
                ) : billedPrice < (isTaxReturnItem ? profilePrice : minTargetPrice) ? (
                  <Badge variant="danger" className="inline-flex items-center gap-1 font-semibold text-[10px] shrink-0" title={`Peringatan: Harga invoice (${formatCurrency(billedPrice)}) lebih rendah dari acuan (${priceListDisplay})`}>
                    <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Undercharge</span>
                  </Badge>
                ) : (
                  <Badge variant="warning" className="shrink-0 text-[10px]">{targetColName}</Badge>
                )
              ) : (
                <span className="text-[10px] text-[var(--color-secondary)]">—</span>
              )

              return (
                <div
                  key={item.fdID || idx}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/30 transition-colors overflow-hidden"
                >
                  {/* Row 1: Deskripsi + Komoditi + Status */}
                  <div className="flex items-start justify-between gap-2 px-2.5 py-1.5 border-b border-[var(--color-border)]/60">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[var(--color-primary)] leading-tight" title={item.fdItemName}>
                          {item.fdItemName}
                        </p>
                        {isTaxReturnItem && (res.profileHarga?.taxReturnMinCharge ?? 0) > 0 && (
                          <span className="text-[9px] font-normal text-[var(--color-secondary)]">
                            Min Charge: {formatDecimal(res.profileHarga?.taxReturnMinCharge, 4)} m³
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-[var(--color-tertiary)] whitespace-nowrap shrink-0 mt-0.5">
                        {comodityName}
                      </span>
                    </div>
                    <div className="shrink-0 mt-0.5">
                      {statusBadge}
                    </div>
                  </div>

                  {/* Row 2: Tiga kolom harga */}
                  <div className="grid grid-cols-3 divide-x divide-[var(--color-border)]/60 text-[11px]">
                    <div className="px-2.5 py-1.5">
                      <p className="text-[9px] uppercase font-bold text-[var(--color-secondary)] mb-0.5">
                        {t('billing.validation.invoicePriceCol')}
                      </p>
                      <p className="font-mono font-bold text-[var(--color-primary)]">
                        {formatCurrency(billedPrice)}
                      </p>
                    </div>
                    <div className="px-2.5 py-1.5">
                      <p className="text-[9px] uppercase font-bold text-[var(--color-secondary)] mb-0.5">
                        {t('billing.validation.priceProfileCol')}
                      </p>
                      <p className="font-mono text-[var(--color-secondary)]">
                        {profilePrice > 0 ? formatCurrency(profilePrice) : '—'}
                      </p>
                    </div>
                    <div className="px-2.5 py-1.5">
                      <p className="text-[9px] uppercase font-bold text-[var(--color-secondary)] mb-0.5">
                        {t('billing.validation.priceListCol')}
                      </p>
                      <p className="font-mono font-semibold text-blue-700 dark:text-blue-300 break-all leading-tight">
                        {priceListDisplay}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Price List Info & Action Link Acuan Tarif */}
      {(res.priceValidation?.effectiveDate || (res.priceValidation?.items && res.priceValidation.items.length > 0)) && (
        <div className="pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-secondary)]">
          <div className="flex items-center gap-2 flex-wrap">
            {res.priceValidation.hasCustomerPriceList && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-500 bg-transparent px-2 py-0.5 rounded border border-purple-500/40">
                <Tag className="w-3 h-3 text-purple-500" />
                <span>{t('billing.validation.customerPriceActive') || 'Price List Khusus Customer'}</span>
              </span>
            )}
            {res.priceValidation.effectiveDate && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-secondary)]">
                <Tag className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{t('billing.validation.effectivePriceDate')}:</span>
                <span className="font-semibold text-blue-500">{formatDate(res.priceValidation.effectiveDate)}</span>
              </div>
            )}
          </div>

          {res.priceValidation.items && res.priceValidation.items.length > 0 && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-400 hover:underline transition-colors cursor-pointer ml-auto"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('billing.validation.viewPriceList')}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
