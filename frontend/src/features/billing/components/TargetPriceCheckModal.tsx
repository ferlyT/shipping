import { useModalEscape } from '@/hooks/useModalEscape'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Info,
  HelpCircle,
  Building2,
  FileSpreadsheet,
  RefreshCw,
  Calendar,
  Plane,
  Ship,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { formatCurrency, formatDate, formatDateTime, cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { TargetBillingItem, TargetPriceCheckData } from '../types/billing.types'

interface TargetPriceCheckModalProps {
  item: TargetBillingItem | null
  activeMode?: 'all' | 'udara' | 'laut'
  onClose: () => void
}

export function TargetPriceCheckModal({ item, activeMode, onClose }: TargetPriceCheckModalProps) {
  useModalEscape(Boolean(item), onClose)
  const itemMode = (item as any)?.mode?.toLowerCase() === 'udara' ? 'udara' : (item as any)?.mode?.toLowerCase() === 'laut' ? 'laut' : ''
  const isAirMarking = !!item?.markingCode && /^26A|^A[A-Z]{2}|AGZ|ASH|AYW|ASZ|AHK|ASG|AIR/i.test(item.markingCode.trim())
  const modeParam = itemMode || (isAirMarking ? 'udara' : (activeMode === 'udara' ? 'udara' : activeMode === 'laut' ? 'laut' : ''))

  const { data: resData, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['targetPriceCheck', item?.listCode, item?.listNo, item?.markingCode, item?.markingNo, item?.branch, item?.customer, item?.sales, item?.type, item?.comodity, item?.harga, modeParam],
    queryFn: async () => {
      if (!item?.markingCode && !item?.listCode && !item?.listNo) return null
      const res = await billingApi.targetPriceCheck({
        listCode: item.listCode || item.listNo || '',
        markingCode: item.markingCode,
        markingNo: item.markingNo,
        customer: item.customer,
        custCode: (item as any)?.custCode || (item as any)?.fdCustCode || '',
        branch: item.branch,
        sales: item.sales,
        type: item.type,
        comodity: item.comodity,
        mode: modeParam,
        harga: item.harga,
      })
      return res.data?.data as TargetPriceCheckData
    },
    enabled: !!(item?.markingCode || item?.listCode || item?.listNo),
    staleTime: 30000,
  })

  if (!item) return null

  const data = resData
  const currentMode = (data as any)?.mode || (modeParam === 'udara' ? 'UDARA' : modeParam === 'laut' ? 'LAUT' : '')
  const isAir = currentMode.toUpperCase() === 'UDARA' || modeParam === 'udara'

  const isBranchMatch = (tBranch?: string | null) => {
    if (!tBranch || !data?.branch) return true
    const b1 = tBranch.trim().toUpperCase()
    const b2 = data.branch.trim().toUpperCase()
    if (b1 === b2) return true
    const norm1 = b1.includes('SINGAPORE') || b1 === 'SG' ? 'SG' : b1.includes('GUANGZHOU') || b1 === 'GZ' ? 'GZ' : b1.includes('HONGKONG') || b1 === 'HK' ? 'HK' : b1.includes('SHENZHEN') || b1 === 'SZ' ? 'SZ' : b1.includes('YIWU') || b1 === 'YW' ? 'YW' : b1.includes('SHANGHAI') || b1 === 'SH' ? 'SH' : b1
    const norm2 = b2.includes('SINGAPORE') || b2 === 'SG' ? 'SG' : b2.includes('GUANGZHOU') || b2 === 'GZ' ? 'GZ' : b2.includes('HONGKONG') || b2 === 'HK' ? 'HK' : b2.includes('SHENZHEN') || b2 === 'SZ' ? 'SZ' : b2.includes('YIWU') || b2 === 'YW' ? 'YW' : b2.includes('SHANGHAI') || b2 === 'SH' ? 'SH' : b2
    return norm1 === norm2
  }

  const isModeMatch = (t: any) => {
    if (isAir) {
      return t.listType === 1 || t.jenis === 'UC' || (t.jenis && String(t.jenis).toUpperCase().includes('UC'))
    }
    return t.listType === 2 || t.jenis === 'LR' || (t.jenis && String(t.jenis).toUpperCase().includes('LR'))
  }

  const getNormalizedCategoryKey = (cat?: string | null): string => {
    const s = String(cat || '').toUpperCase().trim().replace(/[\s\-_]+/g, '')
    if (s.includes('LARTASN') || s.includes('LARTASNORMAL') || s === 'LN') return 'LARTAS_N'
    if (s.includes('LARTASS') || s.includes('LARTASSUPER') || s.includes('LARTASSPECIAL') || s === 'LS') return 'LARTAS_S'
    if (s.includes('SEMIGARMENT') || s.includes('SEMI')) return 'SEMI_GARMENT'
    if (s.includes('GARMENT')) return 'GARMENT'
    if (s.includes('TEKSTIL') || s.includes('TEXTILE')) return 'TEKSTIL'
    if (s.includes('UMUM') || s.includes('GENERAL') || s.includes('GEN')) return 'UMUM'
    if (s.includes('BRANDED') || s.includes('BRAND')) return 'BRANDED'
    if (s.includes('FOOD') || s.includes('MAKANAN')) return 'FOOD'
    if (s.includes('SHOES') || s.includes('SEPATU')) return 'SHOES'
    return s
  }

  const isCategoryMatch = (t: any) => {
    const tCatKey = getNormalizedCategoryKey(t.comodityName)
    const curTypeKey = getNormalizedCategoryKey(data?.currentType)
    const matchedCatKey = getNormalizedCategoryKey(data?.matchedCategory)

    if (data?.matchedTariff?.typeComodity && t.typeComodity === data.matchedTariff.typeComodity) return true
    if (tCatKey && curTypeKey && tCatKey === curTypeKey) return true
    if (tCatKey && matchedCatKey && tCatKey === matchedCatKey) return true
    return false
  }

  const isRowMatch = (t: any) => {
    return isBranchMatch(t.branchName) && isModeMatch(t) && isCategoryMatch(t)
  }

  const matchingCustomerTariffs = (data?.customerTariffs || []).filter(isRowMatch)

  const getStatusBadge = (status?: string, difference?: number) => {
    if (status === 'MATCH') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-2xs">
          <CheckCircle2 className="hidden sm:inline-block w-3.5 h-3.5 text-emerald-500 shrink-0" />
          Sesuai Database
        </span>
      )
    }
    if (status === 'DIFFERENT') {
      if ((difference ?? 0) > 0) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <TrendingUp className="hidden sm:inline-block w-3.5 h-3.5 text-emerald-500 shrink-0" />
            Harga di Atas Acuan
          </span>
        )
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-transparent border border-rose-500/50 text-rose-600 dark:text-rose-400 shadow-2xs">
          <AlertTriangle className="hidden sm:inline-block w-3.5 h-3.5 text-rose-500 shrink-0" />
          Terdapat Selisih Harga
        </span>
      )
    }
    if (status === 'NOT_SET') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-transparent border border-purple-500/50 text-purple-600 dark:text-purple-400 shadow-2xs">
          <Info className="hidden sm:inline-block w-3.5 h-3.5 text-purple-500 shrink-0" />
          Tarif Ada di DB (Belum Diisi)
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-transparent border border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-2xs">
        <HelpCircle className="hidden sm:inline-block w-3.5 h-3.5 text-amber-500 shrink-0" />
        Belum Ada Tarif di Database
      </span>
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 lg:p-8 bg-black/60 backdrop-blur-xs animate-fadeIn font-[var(--font-body)]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl xl:max-w-7xl max-h-[92vh] flex flex-col rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex flex-col gap-2 sm:gap-2.5 shrink-0">
          {/* Top Row: Title + Code/Mode + Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="hidden sm:flex p-1.5 sm:p-2.5 rounded-xl bg-transparent border border-[var(--color-tertiary)]/40 text-[var(--color-tertiary)] shrink-0">
                <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                <h3 className="text-xs sm:text-base lg:text-lg font-bold font-[var(--font-heading)] text-[var(--color-primary)] truncate">
                  Cek Kesesuaian Harga
                </h3>
                {(data?.listCode || item.listCode || item.listNo) && (
                  <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded font-mono font-bold bg-amber-500/10 border border-amber-500/40 text-amber-600 dark:text-amber-400 shrink-0" title="Nomor List Entry (Unik)">
                    #{data?.listCode || item.listCode || item.listNo}
                  </span>
                )}
                <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded font-mono font-bold bg-transparent border border-[var(--color-border)] text-[var(--color-primary)] shrink-0">
                  {item.markingCode}
                </span>
                {currentMode && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold uppercase shrink-0 border shadow-2xs',
                      isAir
                        ? 'bg-sky-500/10 border-sky-500/40 text-sky-600 dark:text-sky-400'
                        : 'bg-teal-500/10 border-teal-500/40 text-teal-600 dark:text-teal-400'
                    )}
                  >
                    {isAir ? <Plane className="w-3 h-3" /> : <Ship className="w-3 h-3" />}
                    {currentMode}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-1.5 sm:p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
                title="Refresh Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Sub Header & Meta Chips Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 text-xs">
            <p className="text-[11px] sm:text-xs text-[var(--color-secondary)] truncate">
              <strong className="text-[var(--color-primary)]">{item.customer || data?.customer || 'Customer'}</strong> · Cabang: <span className="font-semibold text-[var(--color-primary)]">{item.branch || data?.branch || '—'}</span> {item.sales || data?.sales ? <>· Sales: <span className="font-semibold text-[var(--color-primary)]">{item.sales || data?.sales}</span></> : null}
            </p>

            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {data?.tglAgen && (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-mono">
                  <Calendar className="hidden sm:inline-block w-3 h-3 text-blue-500" />
                  <span>Tgl Agen: <strong>{formatDate(data.tglAgen)}</strong></span>
                </span>
              )}
              {data?.effectiveDate && (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 font-mono">
                  <span>Periode PL: <strong>{formatDate(data.effectiveDate)}</strong></span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 lg:p-7 overflow-y-auto space-y-6 flex-1">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <LoadingSpinner message="Mengecek data tarif di database..." />
            </div>
          ) : isError || !data ? (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
              <span>Gagal memuat rincian tarif database untuk marking ini.</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="underline font-semibold cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              <div
                className={`p-4 sm:p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  data.status === 'MATCH' || data.difference > 0
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : data.status === 'DIFFERENT'
                      ? 'border-rose-500/40 bg-rose-500/5'
                      : data.status === 'NOT_SET'
                        ? 'border-purple-500/40 bg-purple-500/5'
                        : 'border-amber-500/40 bg-amber-500/5'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getStatusBadge(data.status, data.difference)}
                    <span className="text-xs sm:text-sm font-bold text-[var(--color-primary)]">
                      {data.difference > 0 ? 'Harga di Atas Acuan Database' : data.statusLabel}
                    </span>
                    {data.priceSourceLabel && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)]">
                        Sumber: {data.priceSourceLabel}
                      </span>
                    )}
                    {data.isCommodityOverride && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 inline-flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        Override Komoditi: {data.commodityOverrideDetail || data.matchedCategory}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-secondary)] leading-relaxed">
                    {data.difference > 0
                      ? `Harga saat ini (${formatCurrency(data.currentPrice)}) berada DI ATAS acuan database (${formatCurrency(data.dbPrice)}). Selisih: +${formatCurrency(data.difference)}.`
                      : data.statusDescription}
                  </p>
                </div>

                {data.difference !== 0 && (
                  <div className="shrink-0 text-right sm:border-l sm:border-[var(--color-border)] sm:pl-5">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-secondary)]">
                      Selisih Tarif
                    </p>
                    <p className={`text-base sm:text-lg font-bold tabular-nums ${data.difference > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {data.difference > 0 ? `+${formatCurrency(data.difference)}` : formatCurrency(data.difference)}
                    </p>
                  </div>
                )}
              </div>

              {/* Grid Ringkasan Perbandingan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Card 1: Harga Saat Ini di Target Bill */}
                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/40 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                    Harga di Target Bill
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-[var(--color-primary)] tabular-nums whitespace-nowrap">
                    {data.currentPrice > 0 ? formatCurrency(data.currentPrice) : 'Belum Diisi (Rp 0)'}
                  </p>
                  <div className="text-[11px] text-[var(--color-secondary)] pt-1.5 border-t border-[var(--color-border)]/60 flex items-center justify-between">
                    <span>Tipe Komoditi:</span>
                    <span className="font-semibold text-[var(--color-primary)] truncate max-w-[150px]" title={data.currentType}>
                      {data.currentType || '—'}
                    </span>
                  </div>
                </div>

                {/* Card 2: Tarif Acuan Database / Price List */}
                <div className={`p-4 rounded-xl border space-y-1.5 ${
                  data.difference > 0
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : data.dbPrice > 0
                      ? 'border-[var(--color-tertiary)]/50 bg-transparent'
                      : 'border-[var(--color-border)] bg-[var(--color-neutral)]/40'
                }`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                      Acuan Price List Database
                    </p>
                    {data.difference > 0 ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5 shadow-2xs">
                        <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
                        Di Atas Acuan
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-transparent border border-[var(--color-tertiary)]/40 text-[var(--color-tertiary)]">
                        {data.appliedTierLabel ? data.appliedTierLabel.split(':')[0] : 'Price List'}
                      </span>
                    )}
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-[var(--color-tertiary)] tabular-nums whitespace-nowrap">
                    {data.dbPrice > 0 ? (
                      <>
                        {formatCurrency(data.dbPrice)}
                        <span className="text-xs font-normal text-[var(--color-secondary)] ml-1">
                          {isAir ? '/ kg' : '/ m³'}
                        </span>
                      </>
                    ) : 'Belum Terdaftar'}
                  </p>
                  <div className="text-[11px] text-[var(--color-secondary)] pt-1.5 border-t border-[var(--color-border)]/60 flex items-center justify-between">
                    <span>Acuan Komoditi:</span>
                    <span className="font-semibold text-[var(--color-primary)] truncate max-w-[150px]" title={data.matchedCategory || data.currentType}>
                      {data.matchedCategory || data.currentType || '—'}
                    </span>
                  </div>
                  {data.isCommodityOverride && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/30">
                      <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="truncate" title={`Override Komoditi: ${data.commodityOverrideDetail || data.matchedCategory}`}>
                        {data.commodityOverrideDetail || 'Override: SEMI GARMENT'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card 3: Acuan Master Rate CS vs MKT (Berdasarkan Tgl. Agen) */}
                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                      Master Rate (Tgl. Agen)
                    </p>
                    {data.effectiveDate && (
                      <span className="text-[9px] text-[var(--color-secondary)]">
                        PL {formatDate(data.effectiveDate)}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${!data.isBroker && data.matchedWith === 'MASTER_CS' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-[var(--color-secondary)]'}`}>
                        Harga CS:
                      </span>
                      <span className="font-bold tabular-nums text-[var(--color-primary)]">
                        {data.priceCS ? `${formatCurrency(data.priceCS)} ${isAir ? '/ kg' : '/ m³'}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${data.isBroker && data.matchedWith === 'MASTER_MKT' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-[var(--color-secondary)]'}`}>
                        Harga MKT:
                      </span>
                      <span className="font-bold tabular-nums text-[var(--color-primary)]">
                        {data.priceMKT ? `${formatCurrency(data.priceMKT)} ${isAir ? '/ kg' : '/ m³'}` : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-[var(--color-secondary)] pt-1 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-1">
                    <span className="truncate">Sales: {data.sales || '—'}</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[9px] uppercase shrink-0 ${
                        data.isBroker
                          ? 'border border-amber-500/40 text-amber-600 dark:text-amber-400 bg-transparent'
                          : 'border border-blue-500/40 text-blue-600 dark:text-blue-400 bg-transparent'
                      }`}
                    >
                      {data.isBroker ? 'Acuan MKT (Broker / Sales MKT)' : 'Acuan CS (Non-Broker)'}
                    </span>
                  </div>
                </div>

                {/* Card 4: Info Update Terakhir */}
                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/40 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                    Update Terakhir
                  </p>
                  <p className="text-xs font-bold text-[var(--color-primary)] truncate">
                    {data.matchedTariff?.updateBy || item.updateBy || '—'}
                  </p>
                  <div className="text-[11px] text-[var(--color-secondary)] pt-1.5 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-1">
                    <span className="shrink-0">Tgl Update:</span>
                    <span className="font-medium text-[var(--color-primary)] text-right truncate">
                      {data.matchedTariff?.updateDate ? formatDateTime(data.matchedTariff.updateDate) : item.updateDate ? formatDateTime(item.updateDate) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 1: Tarif Terdaftar Customer di Database (vwCustomersHarga) - Hanya Tampil Jika Ada yang Cocok */}
              {matchingCustomerTariffs.length > 0 && (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden space-y-0">
                  <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Building2 className="hidden sm:inline-block w-4 h-4 text-[var(--color-primary)]" />
                      <h4 className="text-xs sm:text-sm font-bold font-[var(--font-heading)] text-[var(--color-primary)]">
                        Tarif Khusus Customer (vwCustomersHarga - {data.branch || 'Cabang'})
                      </h4>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {matchingCustomerTariffs.length} Kategori Cocok
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-secondary)]">
                      {matchingCustomerTariffs.length} Baris
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap">
                          <th className="px-5 py-3">Kategori Komoditi</th>
                          <th className="px-5 py-3">Jenis</th>
                          <th className="px-5 py-3">Cabang</th>
                          <th className="px-5 py-3 text-right">Tarif DB (Rp)</th>
                          <th className="px-5 py-3">Diupdate Oleh</th>
                          <th className="px-5 py-3">Tgl Update</th>
                          <th className="px-5 py-3 text-center">Kesesuaian Target Bill</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {matchingCustomerTariffs.map((t, idx) => (
                          <tr
                            key={idx}
                            className="bg-emerald-500/10 dark:bg-emerald-500/15 font-semibold text-[var(--color-primary)] transition-colors whitespace-nowrap"
                          >
                            <td className="px-5 py-3 font-medium">
                              <div className="flex items-center gap-2">
                                <span>{t.comodityName || '—'}</span>
                                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500 text-white dark:bg-emerald-600">
                                  Item Target (Cocok)
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-[var(--color-secondary)]">
                              {t.jenis || (t.listType === 1 ? 'UC' : 'LR')}
                            </td>
                            <td className="px-5 py-3 text-[var(--color-secondary)]">
                              {t.branchName || '—'}
                            </td>
                            <td className="px-5 py-3 text-right font-bold tabular-nums text-[var(--color-primary)]">
                              {formatCurrency(t.harga)}
                            </td>
                            <td className="px-5 py-3 text-[var(--color-secondary)]">
                              {t.updateBy || '—'}
                            </td>
                            <td className="px-5 py-3 text-[var(--color-secondary)]">
                              {t.updateDate ? formatDateTime(t.updateDate) : '—'}
                            </td>
                            <td className="px-5 py-3 text-center">
                              {data.currentPrice === t.harga ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded font-bold border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-transparent">
                                  <CheckCircle2 className="hidden sm:inline-block w-3 h-3" /> Cocok (Tarif Customer)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded font-bold border border-rose-500/50 text-rose-600 dark:text-rose-400 bg-transparent">
                                  <AlertTriangle className="hidden sm:inline-block w-3 h-3" /> Selisih ({formatCurrency(data.currentPrice - t.harga)})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section 2: Uploaded Customer Price List (tbCustomerPriceListUpload) jika ada */}
              {data.customerPriceList && data.customerPriceList.items.length > 0 && (
                <div className="rounded-xl border border-purple-500/40 bg-purple-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="hidden sm:inline-block w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <h4 className="text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-300">
                        Price List Khusus Customer (Upload File)
                      </h4>
                    </div>
                    {data.customerPriceList.effectiveDate && (
                      <span className="text-[11px] text-[var(--color-secondary)]">
                        Berlaku: {formatDate(data.customerPriceList.effectiveDate)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {data.customerPriceList.items.map((it, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-1">
                        <p className="text-[10px] font-bold text-[var(--color-secondary)] uppercase truncate">
                          {it.branch} · {it.category}
                        </p>
                        <p className="text-xs sm:text-sm font-bold text-[var(--color-primary)] tabular-nums">
                          {formatCurrency(it.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold font-[var(--font-label)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
