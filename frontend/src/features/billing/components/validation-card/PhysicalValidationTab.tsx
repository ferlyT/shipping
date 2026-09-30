import React from 'react'
import { AlertTriangle, Check, X, Info, ExternalLink, Ruler } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDecimal, formatCurrency, formatNumber } from '@/lib/utils'
import { Type2ComparisonPanel } from '../Type2ComparisonPanel'
import type { ValidationCardDerivedProps } from './types'

export const PhysicalValidationTab: React.FC<ValidationCardDerivedProps> = ({
  isType2,
  invoiceNo,
  listCode,
  markingCode,
  validation,
  localType2Compare,
  isType2Discrepancy,
  isAir,
  isBilledBelowMinM3,
  effectiveBilledKg,
  billedM3,
  effectiveBilledVfc,
  effectiveMinChargeM3,
  overweight,
  hasWeightMismatch,
  activeWeights,
  hasQtyMismatch,
  activeQtys,
  airPrimaryMatch,
  isWeightListDiff,
  beratList,
  qtyList,
  fdSatuan,
  isWeightSJDiff,
  beratSJ,
  isWeightKomplainDiff,
  beratKomplain,
  qtyKomplain,
  minChargeKg,
  isVfcMatched,
  vfcGudang,
  gudangValues,
  setDimensionInitialSource,
  setIsDimensionModalOpen,
  seaPrimaryMatch,
  isQtyListDiff,
  listBatchValues,
  isQtyPLDiff,
  plValues,
  qtyPL,
  isQtyGudangDiff,
  qtyGudang,
  isQtyKomplainDiff,
  komplainValues,
  res,
  setIsCustMarkingModalOpen,
  totalEntryList,
  matchStatus,
  custMarkingValues,
  plPerMarkingValues,
  totalEntryKomplain,
  komplainPerMarkingValues,
  isMinChargeApplied,
  matchedSourceName,
  matchedRawVal,
  isCodUrgentShortfall,
  recommendedM3,
}) => {
  const { t } = useTranslation()

  if (isType2) {
    return (
      <div className="space-y-4">
        <Type2ComparisonPanel
          invNo={invoiceNo || ''}
          listCode={listCode}
          markingCode={markingCode}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Baris 1: Card Billed + Box Data Utama */}
      <div className="flex gap-2.5 items-stretch">
        {/* Card 1: Billed Metric — lebar tetap */}
        <div
          className={`rounded-[var(--radius-lg)] border-2 ${isBilledBelowMinM3
              ? 'border-amber-500 bg-amber-500/5'
              : 'border-[var(--color-primary)] bg-[var(--color-neutral)]'
            } p-2.5 sm:p-3 shrink-0 w-28 sm:w-32 flex flex-col justify-center`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold font-[var(--font-label)] text-[var(--color-secondary)]">
              {isAir ? 'Tagihan Berat (Billed KG)' : t('billing.validation.billedM3')}
            </p>
            {isBilledBelowMinM3 && (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
          </div>
          <p className="mt-1 text-sm sm:text-base font-bold text-[var(--color-primary)] tabular-nums">
            {isAir ? `${formatDecimal(effectiveBilledKg, 2)} kg` : `${formatDecimal(billedM3, 4)} m³`}
          </p>
          {isAir && effectiveBilledVfc > 0 && (
            <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 font-semibold">
              VFC: {formatDecimal(effectiveBilledVfc, 2)} kg
            </p>
          )}
          {isAir && billedM3 > 0 && (
            <p className="text-[10px] text-[var(--color-secondary)] mt-0.5 font-mono">
              Vol: {formatDecimal(billedM3, 4)} m³
            </p>
          )}
          {!isAir && isBilledBelowMinM3 && (
            <div className="mt-1 flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded px-1 py-0.2 inline-block">
                ⚠ &lt; Min {formatDecimal(effectiveMinChargeM3, 2)} m³
              </span>
              <span className="text-[8.5px] text-[var(--color-secondary)] leading-tight font-mono">
                Basis KG: {formatDecimal(overweight.refM3, 2)} m³
              </span>
            </div>
          )}
          {!isAir && !isBilledBelowMinM3 && overweight?.isMinM3EnforcedForKg && (
            <p className="text-[9.5px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium leading-tight">
              Basis KG: 0.1 m³
            </p>
          )}
        </div>

        {/* JIKA UDARA (isAir / fdListType = 1) -> Tampilkan Berat Timbangan */}
        {isAir ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-2">
              <p className="text-[10px] uppercase font-bold font-[var(--font-label)] text-[var(--color-secondary)]">
                Data Berat Timbangan & Tarif (Udara)
              </p>
              <div className="flex items-center gap-1.5">
                {hasWeightMismatch ? (
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>{t('billing.validation.weightMismatch') || 'Selisih Berat'}</span>
                  </Badge>
                ) : activeWeights.length > 1 ? (
                  <Badge variant="success" className="text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[2.5]" />
                    <span>{t('billing.validation.weightMatch') || 'Berat Sama'}</span>
                  </Badge>
                ) : null}
                {hasQtyMismatch ? (
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>{t('billing.validation.qtyMismatch') || 'Selisih Qty'}</span>
                  </Badge>
                ) : activeQtys.length > 0 ? (
                  <Badge variant="success" className="text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[2.5]" />
                    <span>{t('billing.validation.qtyMatch') || 'Qty Sama'}</span>
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {/* Berat EntryList */}
              <div
                className={`rounded-md border p-2 transition-colors ${airPrimaryMatch?.sourceKey === 'EntryList'
                    ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                    : isWeightListDiff
                      ? 'border-amber-400 dark:border-amber-600/60 bg-transparent ring-1 ring-amber-500/20'
                      : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                    Berat EntryList
                  </p>
                  {isWeightListDiff && (
                    <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400">Beda</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {beratList > 0 ? `${formatDecimal(beratList, 2)} kg` : '0 kg'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span>Qty</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {qtyList !== null ? `${formatNumber(qtyList)}${fdSatuan ? ` ${fdSatuan}` : ''}` : '—'}
                  </span>
                </p>
              </div>

              {/* Berat Surat Jalan */}
              <div
                className={`rounded-md border p-2 transition-colors ${airPrimaryMatch?.sourceKey === 'SJ'
                    ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                    : isWeightSJDiff
                      ? 'border-amber-400 dark:border-amber-600/60 bg-transparent ring-1 ring-amber-500/20'
                      : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                    Berat Surat Jalan
                  </p>
                  {isWeightSJDiff && (
                    <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400">Beda</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {beratSJ > 0 ? `${formatDecimal(beratSJ, 2)} kg` : '—'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span>Sumber</span>
                  <span className="font-semibold text-[var(--color-primary)]">tbDelivery</span>
                </p>
              </div>

              {/* Berat Komplain */}
              <div
                className={`rounded-md border p-2 transition-colors ${airPrimaryMatch?.sourceKey === 'Komplain'
                    ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                    : isWeightKomplainDiff
                      ? 'border-amber-400 dark:border-amber-600/60 bg-transparent ring-1 ring-amber-500/20'
                      : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                    Berat Komplain
                  </p>
                  {isWeightKomplainDiff && (
                    <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400">Beda</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {beratKomplain > 0 ? `${formatDecimal(beratKomplain, 2)} kg` : 'Normal (0 kg)'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span>Qty</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {qtyKomplain !== null && qtyKomplain > 0 ? `${formatNumber(qtyKomplain)}${fdSatuan ? ` ${fdSatuan}` : ''}` : '—'}
                  </span>
                </p>
              </div>

              {/* Min Charge KG */}
              <div
                className={`rounded-md border p-2 transition-colors ${airPrimaryMatch?.sourceKey === 'MinCharge'
                    ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                    : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                  }`}
              >
                <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                  Min. Charge KG
                </p>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {formatDecimal(minChargeKg, 2)} kg
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span>Status</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {beratList < minChargeKg ? 'Kena Min' : 'Normal'}
                  </span>
                </p>
              </div>

              {/* VFC Gudang */}
              <div
                className={`rounded-md border p-2 transition-colors ${isVfcMatched
                    ? 'border-purple-500 dark:border-purple-400 bg-transparent ring-1 ring-purple-500/30'
                    : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                    VFC Gudang
                  </p>
                  {isVfcMatched && (
                    <span className="text-[8px] px-1 py-0 font-bold border border-purple-500/40 text-purple-500 rounded">
                      COCOK
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {vfcGudang > 0 ? `${formatDecimal(vfcGudang, 2)} kg` : '—'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span>Vol. Flight</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {gudangValues.length > 0 ? `${formatDecimal(gudangValues[0], 4)} m³` : '—'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* JIKA LAUT (fdListType = 2 / !isAir) -> Tampilkan M3 Per ListCode */
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                <p className="text-[10px] uppercase font-bold font-[var(--font-label)] text-[var(--color-secondary)]">
                  {t('billing.validation.referenceGroup') || 'Per ListCode'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDimensionInitialSource('entryList')
                    setIsDimensionModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border border-blue-500/30 transition-colors cursor-pointer"
                  title="Lihat Rincian Dimensi (P x L x T x Qty) & Volume M3 dari tbEntryListDetail, tbEntryListDetail_PackingList, dan tbEntryListDetail_Komplain"
                >
                  <Ruler className="w-3 h-3" />
                  <span>Detail Dimensi</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {hasWeightMismatch && (
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>{t('billing.validation.weightMismatch') || 'Selisih Berat'}</span>
                  </Badge>
                )}
                {hasQtyMismatch ? (
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>{t('billing.validation.qtyMismatch') || 'Selisih Qty'}</span>
                  </Badge>
                ) : activeQtys.length > 0 ? (
                  <Badge variant="success" className="text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[2.5]" />
                    <span>{t('billing.validation.qtyMatch') || 'Qty Sama'}</span>
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* EntryList / ListBatch */}
              <div
                className={`rounded-md border p-2 transition-colors ${seaPrimaryMatch?.sourceKey === 'ListBatch'
                    ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                    : isQtyListDiff
                      ? 'border-amber-400 dark:border-amber-600/60 bg-transparent'
                      : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                    {t('billing.validation.listBatch')}
                  </p>

                </div>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {listBatchValues.length > 0 ? `${formatDecimal(listBatchValues[0], 4)} m³` : '—'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span className="flex items-center gap-1">
                    <span>Qty</span>
                    {isQtyListDiff && (
                      <Badge variant="warning" className="text-[8px] px-1 py-0 font-bold">
                        {t('billing.validation.qtyDiff') || 'Beda'}
                      </Badge>
                    )}
                  </span>
                  <span className={`font-semibold ${isQtyListDiff ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--color-primary)]'}`}>
                    {qtyList !== null ? `${formatNumber(qtyList)}${fdSatuan ? ` ${fdSatuan}` : ''}` : '—'}
                  </span>
                </p>
              </div>

              {/* Packing List */}
              <div
                className={`rounded-md border p-2 transition-colors ${seaPrimaryMatch?.sourceKey === 'PL' || seaPrimaryMatch?.sourceKey === 'PackingList'
                    ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                    : isQtyPLDiff
                      ? 'border-amber-400 dark:border-amber-600/60 bg-transparent'
                      : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                    {t('billing.validation.pl')}
                  </p>

                </div>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {plValues.length > 0 ? `${formatDecimal(plValues[0], 4)} m³` : '—'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span className="flex items-center gap-1">
                    <span>Qty</span>
                    {isQtyPLDiff && (
                      <Badge variant="warning" className="text-[8px] px-1 py-0 font-bold">
                        {t('billing.validation.qtyDiff') || 'Beda'}
                      </Badge>
                    )}
                  </span>
                  <span className={`font-semibold ${isQtyPLDiff ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--color-primary)]'}`}>
                    {qtyPL !== null ? `${formatNumber(qtyPL)}${fdSatuan ? ` ${fdSatuan}` : ''}` : '—'}
                  </span>
                </p>
              </div>

              {/* Gudang */}
              <div
                className={`rounded-md border p-2 transition-colors ${seaPrimaryMatch?.sourceKey === 'Gudang'
                    ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                    : isQtyGudangDiff
                      ? 'border-amber-400 dark:border-amber-600/60 bg-transparent'
                      : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                  }`}
              >
                <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                  {t('billing.validation.gudang')}
                </p>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {gudangValues.length > 0 ? `${formatDecimal(gudangValues[0], 4)} m³` : '—'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span className="flex items-center gap-1">
                    <span>Qty</span>
                    {isQtyGudangDiff && (
                      <Badge variant="warning" className="text-[8px] px-1 py-0 font-bold">
                        {t('billing.validation.qtyDiff') || 'Beda'}
                      </Badge>
                    )}
                  </span>
                  <span className={`font-semibold ${isQtyGudangDiff ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--color-primary)]'}`}>
                    {qtyGudang !== null ? `${formatNumber(qtyGudang)}${fdSatuan ? ` ${fdSatuan}` : ''}` : '—'}
                  </span>
                </p>
              </div>

              {/* Komplain */}
              <div
                className={`rounded-md border p-2 transition-colors ${seaPrimaryMatch?.sourceKey === 'Komplain'
                    ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                    : isQtyKomplainDiff
                      ? 'border-amber-400 dark:border-amber-600/60 bg-transparent'
                      : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                    {t('billing.validation.komplain')}
                  </p>

                </div>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {komplainValues.length > 0 ? `${formatDecimal(komplainValues[0], 4)} m³` : '—'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span className="flex items-center gap-1">
                    <span>Qty</span>
                    {qtyKomplain === null || qtyKomplain === 0 ? (
                      <span className="text-[8px] text-[var(--color-secondary)] font-normal">
                        ({t('billing.validation.normal') || 'Normal'})
                      </span>
                    ) : isQtyKomplainDiff ? (
                      <Badge variant="warning" className="text-[8px] px-1 py-0 font-bold">
                        {t('billing.validation.qtyDiff') || 'Beda'}
                      </Badge>
                    ) : null}
                  </span>
                  <span className={`font-semibold ${isQtyKomplainDiff ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--color-primary)]'}`}>
                    {qtyKomplain !== null && qtyKomplain > 0 ? `${formatNumber(qtyKomplain)}${fdSatuan ? ` ${fdSatuan}` : ''}` : '—'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Baris 2: Per Marking & SJ */}
      {isAir ? (
        /* UDARA (fdListType = 1): Baris 2 adalah Per Marking & SJ */
        <div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 w-full">
            <div className="flex items-center justify-between gap-1 mb-2">
              <p className="text-[10px] uppercase font-bold font-[var(--font-label)] text-[var(--color-secondary)]">
                Per Marking & SJ
              </p>
              {res.customer?.fdCustCode && (
                <button
                  type="button"
                  onClick={() => setIsCustMarkingModalOpen(true)}
                  className="text-blue-600 hover:text-blue-800 transition-colors p-0.5 cursor-pointer"
                  title={t('billing.validation.viewCustMarkingDetail')}
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* VFC Per Marking */}
              <div className="rounded-md border p-2 border-[var(--color-border)] bg-[var(--color-neutral)]">
                <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                  VFC Marking
                </p>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {res.vfcGudangPerMarking ? `${formatDecimal(res.vfcGudangPerMarking, 2)} kg` : '—'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span className="text-[9px] truncate mr-1">Total LC</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {totalEntryList !== null ? `${formatNumber(totalEntryList)}` : '—'}
                  </span>
                </p>
              </div>

              {/* Berat SJ */}
              <div
                className={`rounded-md border p-2 transition-colors ${airPrimaryMatch?.sourceKey === 'SJ'
                    ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                    : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                  }`}
              >
                <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                  Berat SJ
                </p>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {beratSJ > 0 ? `${formatDecimal(beratSJ, 2)} kg` : '—'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span className="text-[9px] truncate mr-1">Surat Jalan</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {beratSJ > 0 ? 'Tercatat' : '—'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* LAUT (fdListType = 2): Baris 2 adalah Per Marking M3 */
        <div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 w-full">
            <div className="flex items-center justify-between gap-1 mb-2">
              <p className="text-[10px] uppercase font-bold font-[var(--font-label)] text-[var(--color-secondary)]">
                {t('billing.validation.perMarkingGroup') || 'Per Marking'}
              </p>
              {res.customer?.fdCustCode && (
                <button
                  type="button"
                  onClick={() => setIsCustMarkingModalOpen(true)}
                  className="text-blue-600 hover:text-blue-800 transition-colors p-0.5 cursor-pointer"
                  title={t('billing.validation.viewCustMarkingDetail')}
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* M3 Cust Per Marking */}
              <div
                className={`rounded-md border p-2 transition-colors ${matchStatus === 'MATCH_MARKING'
                    ? 'border-sky-500 dark:border-sky-400 bg-transparent ring-1 ring-sky-500/30'
                    : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                  }`}
              >
                <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                  {t('billing.validation.custPerMarking') || 'M3 Marking'}
                </p>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {custMarkingValues.length > 0 ? `${formatDecimal(custMarkingValues[0], 4)} m³` : '—'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span className="text-[9px] truncate mr-1">Total LC</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {totalEntryList !== null ? `${formatNumber(totalEntryList)}` : '—'}
                  </span>
                </p>
              </div>

              {/* PL Per Marking */}
              <div
                className={`rounded-md border p-2 transition-colors ${seaPrimaryMatch?.sourceKey === 'PLPerMarking'
                    ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                    : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                  }`}
              >
                <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                  {t('billing.validation.plPerMarking') || 'PL Per Marking'}
                </p>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {plPerMarkingValues.length > 0 ? `${formatDecimal(plPerMarkingValues[0], 4)} m³` : '—'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span className="text-[9px] truncate mr-1">Total LC</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {totalEntryList !== null ? `${formatNumber(totalEntryList)}` : '—'}
                  </span>
                </p>
              </div>

              {/* Komplain Per Marking */}
              <div
                className={`rounded-md border p-2 transition-colors ${seaPrimaryMatch?.sourceKey === 'KomplainPerMarking'
                    ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                    : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                  }`}
              >
                <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                  {t('billing.validation.komplainPerMarking') || 'Komplain Per Marking'}
                </p>
                <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                  {komplainPerMarkingValues.length > 0 ? `${formatDecimal(komplainPerMarkingValues[0], 4)} m³` : '—'}
                </p>
                <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                  <span className="text-[9px] truncate mr-1">Total LC</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {totalEntryKomplain !== null && totalEntryKomplain > 0 ? `${formatNumber(totalEntryKomplain)}` : '—'}
                  </span>
                </p>
              </div>

              {/* Komplain Parsial + Gudang (Hybrid) if applicable */}
              {res?.m3KomplainPlusGudang && res.m3KomplainPlusGudang > 0 ? (
                <div
                  className={`rounded-md border p-2 transition-colors ${seaPrimaryMatch?.sourceKey === 'KomplainHybrid'
                      ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                      : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                    }`}
                >
                  <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)] truncate" title={t('billing.validation.komplainHybrid') || 'Komplain + Gudang'}>
                    {t('billing.validation.komplainHybrid') || 'Komplain + Gudang'}
                  </p>
                  <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                    {formatDecimal(res.m3KomplainPlusGudang, 4)} m³
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                    <span className="text-[9px] truncate mr-1">LC Gabungan</span>
                    <span className="font-semibold text-[var(--color-primary)]">
                      {(res.countKomplainLC ?? 0) + (res.countGudangLC ?? 0)}
                    </span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Status Explanation Message */}
      <div className="space-y-2">
        {isType2 ? (
          !isType2Discrepancy ? (
            <div className="flex items-start gap-2 text-xs text-[var(--color-success)] bg-emerald-50/80 dark:bg-transparent border border-[var(--color-success)] rounded-[var(--radius-md)] p-2.5">
              <Check className="w-4 h-4 text-[var(--color-success)] shrink-0 mt-0.5 stroke-[2.5]" />
              <span className="font-medium">
                Tagihan Type 2 COCOK dengan perbandingan M3 vs KG (Basis penagihan tertinggi: {(validation?.type2CompareData?.overallWinner || localType2Compare?.overallWinner) || 'M3'} senilai {formatCurrency(validation?.type2CompareData?.totalNilaiTagihanIdeal || localType2Compare?.totalNilaiTagihanIdeal || 0)})
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-xs text-[var(--color-warning)] bg-amber-50/80 dark:bg-transparent border border-[var(--color-warning)] rounded-[var(--radius-md)] p-2.5">
              <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
              <span className="font-medium">
                Tagihan Type 2 terindikasi {(validation?.type2CompareData?.validationStatus || localType2Compare?.validationStatus) === 'UNDERCHARGE' ? 'kurang tagih (undercharge)' : 'lebih tagih (overcharge)'} sebesar {formatCurrency(Math.abs((validation?.type2CompareData?.selisihVsAktual || localType2Compare?.selisihVsAktual) || 0))} dibanding acuan ideal M3 vs KG ({formatCurrency(validation?.type2CompareData?.totalNilaiTagihanIdeal || localType2Compare?.totalNilaiTagihanIdeal || 0)})
              </span>
            </div>
          )
        ) : isAir ? (
          matchStatus === 'MATCH_PRIMARY' ? (
            <div className="flex items-start gap-2 text-xs text-[var(--color-success)] bg-emerald-50/80 dark:bg-transparent border border-[var(--color-success)] rounded-[var(--radius-md)] p-2.5">
              <Check className="w-4 h-4 text-[var(--color-success)] shrink-0 mt-0.5 stroke-[2.5]" />
              <span className="font-medium">
                {isMinChargeApplied
                  ? `Berat Tagihan (${formatDecimal(effectiveBilledKg, 2)} kg) SESUAI dengan aturan Min. Charge (${formatDecimal(minChargeKg, 2)} kg · Berat Real: ${formatDecimal(beratList, 2)} kg)`
                  : `Berat Tagihan (${formatDecimal(effectiveBilledKg, 2)} kg) COCOK dengan data ${matchedSourceName}`}
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-xs text-[var(--color-danger)] bg-rose-50/80 dark:bg-transparent border border-[var(--color-danger)] rounded-[var(--radius-md)] p-2.5">
              <X className="w-4 h-4 text-[var(--color-danger)] shrink-0 mt-0.5 stroke-[2.5]" />
              <span className="font-medium">
                {effectiveBilledKg === 0
                  ? `Tagihan berat belum diisi (0 kg). Berat Real EntryList adalah ${formatDecimal(beratList, 2)} kg${minChargeKg > 0 ? ` (Min. Charge: ${formatDecimal(minChargeKg, 2)} kg)` : ''}.`
                  : `Berat Tagihan (${formatDecimal(effectiveBilledKg, 2)} kg) TIDAK COCOK dengan Berat Real (${formatDecimal(beratList, 2)} kg)${minChargeKg > 0 ? ` maupun Min. Charge (${formatDecimal(minChargeKg, 2)} kg)` : ''}.`}
              </span>
            </div>
          )
        ) : (
          <>
            {matchStatus === 'MATCH_PRIMARY' && (
              <div className="flex items-start gap-2 text-xs text-[var(--color-success)] bg-emerald-50/80 dark:bg-transparent border border-[var(--color-success)] rounded-[var(--radius-md)] p-2.5">
                <Check className="w-4 h-4 text-[var(--color-success)] shrink-0 mt-0.5 stroke-[2.5]" />
                <span className="font-medium">
                  {validation?.isChildBillMerged
                    ? `Tagihan ini merupakan invoice pecahan yang digabung ke Invoice Induk (${validation.relatedBillsSummary?.parentInvNo}). Validasi fisik terpenuhi pada invoice induk.`
                    : validation?.isRelatedBillsMatch
                      ? `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) COCOK dengan total fisik akumulasi bill terkait (${formatDecimal(validation.relatedBillsSummary?.sumM3Gudang || billedM3, 4)} m³ · ${validation.relatedBillsSummary?.relatedInvoices?.map((i) => i.invNo).join(' + ')})`
                      : isMinChargeApplied
                        ? `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) SESUAI aturan M3 Minimal 0,1 m³ (Data ${matchedSourceName}: ${formatDecimal(matchedRawVal, 4)} m³)`
                        : `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) COCOK dengan data ${matchedSourceName}`}
                </span>
              </div>
            )}

            {matchStatus === 'MATCH_MARKING' && (
              <div className="flex items-start gap-2 text-xs text-[var(--color-tertiary)] bg-sky-50/80 dark:bg-transparent border border-[var(--color-tertiary)] rounded-[var(--radius-md)] p-2.5">
                <Info className="w-4 h-4 text-[var(--color-tertiary)] shrink-0 mt-0.5" />
                <span className="font-medium">
                  {isMinChargeApplied
                    ? `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) SESUAI aturan M3 Minimal 0,1 m³ (Data M3 per Marking: ${formatDecimal(matchedRawVal, 4)} m³)`
                    : `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) COCOK dengan M3 per Marking`}
                </span>
              </div>
            )}

            {matchStatus === 'NO_MATCH' && (
              <div className="flex items-start gap-2 text-xs text-[var(--color-danger)] bg-rose-50/80 dark:bg-transparent border border-[var(--color-danger)] rounded-[var(--radius-md)] p-2.5">
                <X className="w-4 h-4 text-[var(--color-danger)] shrink-0 mt-0.5 stroke-[2.5]" />
                <span className="font-medium">
                  {t('billing.validation.noMatch').replace('{billed}', formatDecimal(billedM3, 4))}
                </span>
              </div>
            )}

            {/* Alert Peringatan Tagihan di Bawah Min Charge M3 */}
            {isBilledBelowMinM3 && (
              <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-[var(--radius-md)] p-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="font-medium">
                  <span className="font-bold">Peringatan: Tagihan di Bawah Batas Minimum Charge M3. </span>
                  <span>
                    Volume yang ditagihkan ({formatDecimal(billedM3, 4)} m³) lebih rendah dari batas minimum charge ({formatDecimal(effectiveMinChargeM3, 4)} m³{res?.profileHarga?.minChargeM3 ? ' master customer' : ' standar 0.1 m³'}).
                    {matchStatus === 'MATCH_PRIMARY' || matchStatus === 'MATCH_MARKING'
                      ? ` Data fisik ${matchedSourceName} cocok (${formatDecimal(matchedRawVal, 4)} m³), namun pastikan apakah penagihan volume riil ini disengaja atau seharusnya dikenakan tarif batas minimum.`
                      : ''}
                  </span>
                </div>
              </div>
            )}

            {/* COD / URGENT Alert */}
            {isCodUrgentShortfall && (
              <div className="flex items-start gap-2 text-xs text-[var(--color-warning)] bg-amber-50/80 dark:bg-transparent border border-[var(--color-warning)] rounded-[var(--radius-md)] p-2.5">
                <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
                <span className="font-medium">
                  {t('billing.validation.codUrgentWarning').replace('{recommended}', formatDecimal(recommendedM3, 4))}
                </span>
              </div>
            )}
          </>
        )}

        {/* Qty Mismatch Alert */}
        {hasQtyMismatch && (
          <div className="flex items-start gap-2 text-xs text-[var(--color-warning)] bg-amber-50/80 dark:bg-transparent border border-[var(--color-warning)] rounded-[var(--radius-md)] p-2.5">
            <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{t('billing.validation.qtyMismatch')}: </span>
              <span>
                Terdapat perbedaan jumlah Qty antara{' '}
                {activeQtys.map((q) => `${q.label} (${formatNumber(q.val)})`).join(', ')}
                {fdSatuan ? ` ${fdSatuan}` : ''}.
              </span>
            </div>
          </div>
        )}

        {/* Weight Mismatch Alert */}
        {hasWeightMismatch && (
          <div className="flex items-start gap-2 text-xs text-[var(--color-warning)] bg-amber-50/80 dark:bg-transparent border border-[var(--color-warning)] rounded-[var(--radius-md)] p-2.5">
            <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{t('billing.validation.weightMismatch') || 'Selisih Berat Fisik'}: </span>
              <span>
                Terdapat perbedaan berat fisik antara{' '}
                {activeWeights.map((w) => `${w.label} (${formatDecimal(w.val, 2)} kg)`).join(' vs ')}. Harap pastikan kebenaran data timbangan operasional atau surat jalan.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
