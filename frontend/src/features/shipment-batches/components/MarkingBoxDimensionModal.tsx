import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { X, Layers, Box, AlertCircle, FileText, Sparkles } from 'lucide-react'
import { useModalEscape } from '@/hooks/useModalEscape'
import { useTranslation } from '@/hooks/useTranslation'
import { markingApi } from '../services/marking.service'
import type { BoxDimensionDetailResponse, BoxDimensionItem } from '../types/marking.types'
import { cn, displayCustName, formatNumber, formatDecimal } from '@/lib/utils'

export type BoxDimensionTabType = 'gudang' | 'asliGudang' | 'packingList' | 'komplain'

interface MarkingBoxDimensionModalProps {
  listCode: string | null
  customerName?: string | null
  markingNo?: string | null
  markingCode?: string | null
  isAir?: boolean
  initialTab?: BoxDimensionTabType
  onClose: () => void
}

export function MarkingBoxDimensionModal({
  listCode,
  customerName,
  markingNo,
  markingCode,
  isAir = false,
  initialTab = 'gudang',
  onClose,
}: MarkingBoxDimensionModalProps) {
  useModalEscape(Boolean(listCode), onClose)
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<BoxDimensionTabType>(initialTab)

  const { data, isLoading } = useQuery({
    queryKey: ['markingBoxDimensions', listCode],
    queryFn: async () => {
      if (!listCode) return null
      const res = await markingApi.getBoxDimensions(listCode)
      return res.data as { data: BoxDimensionDetailResponse }
    },
    enabled: !!listCode,
  })

  if (!listCode || typeof document === 'undefined') return null

  const boxData = data?.data
  const currentItems: BoxDimensionItem[] =
    activeTab === 'gudang'
      ? boxData?.gudang || []
      : activeTab === 'asliGudang'
      ? boxData?.asliGudang || []
      : activeTab === 'packingList'
      ? boxData?.packingList || []
      : boxData?.komplain || []

  const totalQty = currentItems.reduce((acc, it) => acc + (it.fdQty || 0), 0)
  const totalM3 = currentItems.reduce((acc, it) => acc + (it.m3 || 0), 0)
  const totalVFC = currentItems.reduce((acc, it) => acc + (it.vfc || 0), 0)

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal - Responsif Mobile & Desktop */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-tertiary)]">
              <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-[13px] sm:text-[15px] font-bold font-[var(--font-label)] text-[var(--color-primary)] uppercase tracking-wide leading-tight truncate">
                  {t('marking.sizeAudit.dimModalTitle')}
                </h2>
                <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)]">
                  {listCode}
                </span>
                {markingCode && (
                  <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)]">
                    {markingCode}
                  </span>
                )}
                {boxData?.hasMarkup && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500"
                    title={t('marking.sizeAudit.tagMarkupTooltip')}
                  >
                    <Sparkles size={10} />
                    {t('marking.sizeAudit.tagMarkup')}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-[12px] text-[var(--color-secondary)] mt-0.5 font-[var(--font-body)] truncate max-w-[260px] sm:max-w-md">
                {displayCustName(customerName)} {markingNo ? `• ${markingNo}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--color-neutral)] rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer shrink-0"
            title={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Cabang / Filter (Horizontal scrollable on mobile) */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 overflow-x-auto no-scrollbar">
          {/* Tab 1: Gudang Fisik Aktif */}
          <button
            type="button"
            onClick={() => setActiveTab('gudang')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 sm:py-1.25 rounded-lg text-[11px] sm:text-[12px] font-medium border transition-colors cursor-pointer shrink-0',
              activeTab === 'gudang'
                ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            )}
          >
            <Box size={13} className="shrink-0" />
            <span>{t('marking.sizeAudit.tabGudang')}</span>
            <span className="ml-0.5 text-[10.5px] px-1.5 py-0.2 rounded-full bg-[var(--color-neutral)] border border-[var(--color-border)]">
              {boxData?.gudang?.length || 0}
            </span>
          </button>

          {/* Tab 2: Gudang Asli / Ori (tbEntryListDetailOri) */}
          <button
            type="button"
            onClick={() => setActiveTab('asliGudang')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 sm:py-1.25 rounded-lg text-[11px] sm:text-[12px] font-medium border transition-colors cursor-pointer shrink-0',
              activeTab === 'asliGudang'
                ? 'bg-transparent border-amber-500 text-amber-500 shadow-xs'
                : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            )}
          >
            <Sparkles size={13} className={cn('shrink-0', (boxData?.asliGudang?.length || 0) > 0 ? 'text-amber-500' : '')} />
            <span>{t('marking.sizeAudit.tabAsliGudang')}</span>
            <span
              className={cn(
                'ml-0.5 text-[10.5px] px-1.5 py-0.2 rounded-full border',
                (boxData?.asliGudang?.length || 0) > 0
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold'
                  : 'bg-[var(--color-neutral)] border-[var(--color-border)]'
              )}
            >
              {boxData?.asliGudang?.length || 0}
            </span>
          </button>

          {/* Tab 3: Packing List (tbEntryListDetail_PackingList) */}
          <button
            type="button"
            onClick={() => setActiveTab('packingList')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 sm:py-1.25 rounded-lg text-[11px] sm:text-[12px] font-medium border transition-colors cursor-pointer shrink-0',
              activeTab === 'packingList'
                ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            )}
          >
            <FileText size={13} className="shrink-0" />
            <span>{t('marking.sizeAudit.tabPackingList')}</span>
            <span className="ml-0.5 text-[10.5px] px-1.5 py-0.2 rounded-full bg-[var(--color-neutral)] border border-[var(--color-border)]">
              {boxData?.packingList?.length || 0}
            </span>
          </button>

          {/* Tab 4: Komplain (tbEntryListDetail_Komplain) */}
          <button
            type="button"
            onClick={() => setActiveTab('komplain')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 sm:py-1.25 rounded-lg text-[11px] sm:text-[12px] font-medium border transition-colors cursor-pointer shrink-0',
              activeTab === 'komplain'
                ? 'bg-transparent border-red-500/60 text-red-500 shadow-xs'
                : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            )}
          >
            <AlertCircle size={13} className={cn('shrink-0', boxData?.komplain?.length ? 'text-red-500' : '')} />
            <span>{t('marking.sizeAudit.tabKomplain')}</span>
            <span
              className={cn(
                'ml-0.5 text-[10.5px] px-1.5 py-0.2 rounded-full border',
                (boxData?.komplain?.length || 0) > 0
                  ? 'bg-red-500/10 border-red-500/30 text-red-500 font-bold'
                  : 'bg-[var(--color-neutral)] border-[var(--color-border)]'
              )}
            >
              {boxData?.komplain?.length || 0}
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 bg-[var(--color-neutral)] min-h-[220px]">
          {isLoading ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl skeleton-shimmer" />
                ))}
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 w-full rounded-xl skeleton-shimmer" />
              ))}
            </div>
          ) : currentItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Box className="h-10 w-10 text-[var(--color-secondary)] opacity-40 mb-2" />
              <p className="text-[12px] text-[var(--color-secondary)] max-w-sm">
                {activeTab === 'komplain'
                  ? t('marking.sizeAudit.noKomplainData')
                  : activeTab === 'asliGudang'
                  ? t('marking.sizeAudit.noAsliGudangData')
                  : activeTab === 'packingList'
                  ? t('marking.sizeAudit.noPackingListData')
                  : t('marking.sizeAudit.noBoxData')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Alert Banner jika kargo ini mengalami mark up dimensi */}
              {boxData?.hasMarkup && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] sm:text-[11.5px] leading-tight">
                  <Sparkles size={14} className="shrink-0 text-amber-500" />
                  <span>{t('marking.sizeAudit.bannerMarkup')}</span>
                </div>
              )}

              {/* ── KPI Ringkasan Cepat (Total Koli, Volume M³, VFC) ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* Total Koli */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] sm:text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                    Total Koli
                  </span>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-[15px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)]">
                      {formatNumber(totalQty)}
                    </span>
                    <span className="text-[10.5px] text-[var(--color-secondary)]">pack</span>
                  </div>
                </div>

                {/* Total Volume M³ */}
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] sm:text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                    Total Volume
                  </span>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-[15px] sm:text-[17px] font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatDecimal(totalM3, 4)}
                    </span>
                    <span className="text-[10.5px] text-[var(--color-secondary)]">m³</span>
                  </div>
                </div>

                {/* Total VFC (jika udara) atau Rincian Varian */}
                {isAir ? (
                  <div className="col-span-2 sm:col-span-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] sm:text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                      Volume Kg (VFC)
                    </span>
                    <div className="mt-0.5 flex items-baseline gap-1">
                      <span className="text-[15px] sm:text-[17px] font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400">
                        {formatDecimal(totalVFC, 2)}
                      </span>
                      <span className="text-[10.5px] text-[var(--color-secondary)]">kg</span>
                    </div>
                  </div>
                ) : (
                  <div className="col-span-2 sm:col-span-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] sm:text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                      Rincian Ukuran
                    </span>
                    <div className="mt-0.5 flex items-baseline gap-1">
                      <span className="text-[15px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)]">
                        {currentItems.length}
                      </span>
                      <span className="text-[10.5px] text-[var(--color-secondary)]">varian</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Mobile View: Kartu Box Responsif (< 640px) ── */}
              <div className="block sm:hidden space-y-2">
                {currentItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xs space-y-2"
                  >
                    {/* Header Baris: #No/DCode + Dimensi P x L x T + Qty Coly */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)]">
                          #{item.fdListDCode || item.no || idx + 1}
                        </span>
                        <span className="text-[12.5px] font-mono font-bold text-[var(--color-primary)]">
                          {item.fdPjg} × {item.fdLbr} × {item.fdTng} cm
                        </span>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] tabular-nums">
                        {item.fdQty} koli
                      </span>
                    </div>

                    {/* Footer Baris: Volume M³, VFC, & Keterangan */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-[var(--color-border)]/60 text-[11px] tabular-nums">
                      <div className="flex items-center gap-1">
                        <span className="text-[var(--color-secondary)]">Vol:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatDecimal(item.m3, 4)} m³
                        </span>
                      </div>
                      {isAir && (
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--color-secondary)]">VFC:</span>
                          <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                            {formatDecimal(item.vfc, 2)} kg
                          </span>
                        </div>
                      )}
                      {item.fdDescr && (
                        <span className="text-[var(--color-secondary)] italic truncate max-w-[110px]" title={item.fdDescr || undefined}>
                          {item.fdDescr}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Desktop & Tablet View: Tabel Data Lengkap (>= 640px) ── */}
              <div className="hidden sm:block border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)] shadow-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-neutral)] border-b border-[var(--color-border)]">
                      <th className="py-2 px-3 text-left text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] w-10">
                        No
                      </th>
                      <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                        P (cm)
                      </th>
                      <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                        L (cm)
                      </th>
                      <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                        T (cm)
                      </th>
                      <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                        Qty
                      </th>
                      <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                        Volume (m³)
                      </th>
                      {isAir && (
                        <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                          VFC (kg)
                        </th>
                      )}
                      <th className="py-2 px-3 text-left text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] min-w-[100px]">
                        Ket
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {currentItems.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-[var(--color-neutral)]/40 transition-colors text-[12px] tabular-nums"
                      >
                        <td className="py-2 px-3 text-[var(--color-secondary)] font-mono text-[11px]">
                          {item.fdListDCode || item.no || idx + 1}
                        </td>
                        <td className="py-2 px-3 text-right text-[var(--color-primary)] font-medium">{item.fdPjg}</td>
                        <td className="py-2 px-3 text-right text-[var(--color-primary)] font-medium">{item.fdLbr}</td>
                        <td className="py-2 px-3 text-right text-[var(--color-primary)] font-medium">{item.fdTng}</td>
                        <td className="py-2 px-3 text-right text-[var(--color-primary)] font-bold">{item.fdQty}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatDecimal(item.m3, 4)}
                        </td>
                        {isAir && (
                          <td className="py-2 px-3 text-right font-mono font-semibold text-sky-600 dark:text-sky-400">
                            {formatDecimal(item.vfc, 2)}
                          </td>
                        )}
                        <td className="py-2 px-3 text-[11px] text-[var(--color-secondary)] truncate max-w-[140px]" title={item.fdDescr || undefined}>
                          {item.fdDescr || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[var(--color-neutral)]/80 border-t border-[var(--color-border)] text-[12px] font-bold tabular-nums">
                      <td colSpan={4} className="py-2.5 px-3 text-right text-[var(--color-primary)] uppercase">
                        Total :
                      </td>
                      <td className="py-2.5 px-3 text-right text-[var(--color-primary)] font-bold">
                        {formatNumber(totalQty)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatDecimal(totalM3, 4)} m³
                      </td>
                      {isAir && (
                        <td className="py-2.5 px-3 text-right font-mono text-sky-600 dark:text-sky-400 font-bold">
                          {formatDecimal(totalVFC, 2)} kg
                        </td>
                      )}
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          <div className="text-[11px] sm:text-[12px] text-[var(--color-secondary)] truncate max-w-[200px] sm:max-w-none">
            Total <strong className="text-[var(--color-primary)] font-semibold">{currentItems.length}</strong> rincian • <strong className="text-[var(--color-primary)] font-semibold">{formatNumber(totalQty)}</strong> koli
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11.5px] sm:text-[12px] font-semibold px-3 sm:px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-neutral)] text-[var(--color-primary)] transition-colors cursor-pointer shadow-xs shrink-0"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
