import { AlertTriangle } from 'lucide-react'
import { formatDecimal, formatNumber } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Type2ComparisonPanel } from '../Type2ComparisonPanel'
import type { M3CheckResponse } from '../../types/billing.types'

export interface PhysicalAuditTabProps {
  isAir: boolean
  isType2: boolean
  billedM3: number
  effectiveBilledKg: number
  validationData?: M3CheckResponse | null
  invNo: string
  markingCode?: string | null
  isMatch: boolean
  matchLabel: string
  minChargeM3?: number
  isBilledBelowMinM3?: boolean
}

export function PhysicalAuditTab({
  isAir,
  isType2,
  billedM3,
  effectiveBilledKg,
  validationData: res,
  invNo,
  markingCode,
  isMatch,
  matchLabel,
  minChargeM3 = 0.1,
  isBilledBelowMinM3 = false,
}: PhysicalAuditTabProps) {
  // Jika ini Type 2 (Compare M3 vs KG)
  if (isType2) {
    return (
      <div className="space-y-4">
        <Type2ComparisonPanel
          invNo={invNo}
          markingCode={markingCode}
        />
      </div>
    )
  }

  const m3Gdg = res?.m3Gudang?.values?.[0] ?? 0
  const m3PL = res?.m3PackingList?.values?.[0] ?? 0
  const m3K = res?.m3Komplain?.values?.[0] ?? 0
  const beratGdg = res?.fdJmlBeratGudang ?? res?.fdBeratList ?? 0
  const beratK = res?.fdJmlBeratKomplain ?? 0
  const qtyList = res?.fdQtyList ?? 0
  const qtyGdg = res?.fdTotalQtyGudang ?? 0
  const qtyK = res?.fdTotalQtyKomplain ?? 0

  return (
    <div className="space-y-3">
      {/* Peringatan Tagihan di Bawah Min Charge M3 */}
      {isBilledBelowMinM3 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="font-medium">
            <span className="font-bold">Peringatan: Tagihan di Bawah Batas Minimum Charge ({formatDecimal(minChargeM3, 3)} m³).</span>
            <p className="mt-0.5 text-[11px] opacity-90">
              Volume yang ditagihkan ({formatDecimal(billedM3, 4)} m³) lebih rendah dari batas minimum charge ({formatDecimal(minChargeM3, 4)} m³). Pastikan apakah penagihan volume riil ini disengaja atau seharusnya ditagihkan dengan tarif batas minimum.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards Ukuran */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        <div className={`p-2.5 rounded-lg border ${
          isBilledBelowMinM3
            ? 'border-amber-500/50 bg-amber-500/5'
            : 'border-[var(--color-border)] bg-[var(--color-neutral)]/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
              {isAir ? 'Berat Ditagihkan' : 'Volume Ditagihkan'}
            </span>
            {isBilledBelowMinM3 && (
              <span className="text-[8.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded px-1">
                &lt; Min M3
              </span>
            )}
          </div>
          <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
            {isAir ? `${formatNumber(effectiveBilledKg)} kg` : `${formatDecimal(billedM3, 4)} m³`}
          </div>
          <span className="text-[10.5px] text-[var(--color-secondary)]">
            {isBilledBelowMinM3 ? `Min: ${formatDecimal(minChargeM3, 3)} m³` : `Status: ${matchLabel}`}
          </span>
        </div>

        <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
          <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
            {isAir ? 'Berat Gudang' : 'Volume Gudang'}
          </span>
          <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
            {isAir ? `${formatNumber(beratGdg)} kg` : `${formatDecimal(m3Gdg, 4)} m³`}
          </div>
          <span className="text-[10.5px] text-[var(--color-secondary)]">
            {m3Gdg > 0 || beratGdg > 0 ? 'Data Fisik Tersedia' : 'Belum Ada Ukuran'}
          </span>
        </div>

        {!isAir && (
          <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
            <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
              Volume Packing List
            </span>
            <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
              {m3PL > 0 ? `${formatDecimal(m3PL, 4)} m³` : '—'}
            </div>
            <span className="text-[10.5px] text-[var(--color-secondary)]">Dokumen Supplier</span>
          </div>
        )}

        <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
          <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
            {isAir ? 'Berat Komplain' : 'Volume Komplain'}
          </span>
          <div className="text-[16px] sm:text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
            {isAir ? (beratK > 0 ? `${formatNumber(beratK)} kg` : '—') : m3K > 0 ? `${formatDecimal(m3K, 4)} m³` : '—'}
          </div>
          <span className="text-[10.5px] text-[var(--color-secondary)]">
            {m3K > 0 || beratK > 0 ? 'Klaim Disetujui' : 'Tidak Ada Komplain'}
          </span>
        </div>
      </div>

      {/* Rincian Koli & Timbangan */}
      <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
          Audit Konsistensi Muatan Fisik
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
          <div className="p-2 rounded-md bg-[var(--color-neutral)]/20 border border-[var(--color-border)]">
            <span className="text-[10.5px] text-[var(--color-secondary)]">Jumlah Koli (Qty)</span>
            <div className="text-xs font-semibold text-[var(--color-primary)] mt-0.5">
              Entry: {formatNumber(qtyList)} · Gudang: {formatNumber(qtyGdg)} {qtyK > 0 && `· K: ${formatNumber(qtyK)}`}
            </div>
          </div>

          <div className="p-2 rounded-md bg-[var(--color-neutral)]/20 border border-[var(--color-border)]">
            <span className="text-[10.5px] text-[var(--color-secondary)]">Kesesuaian Timbangan</span>
            <div className="text-xs font-semibold text-[var(--color-primary)] mt-0.5">
              {formatNumber(beratGdg)} kg {beratK > 0 ? `(Komplain: ${formatNumber(beratK)} kg)` : '(Sesuai)'}
            </div>
          </div>

          <div className="p-2 rounded-md bg-[var(--color-neutral)]/20 border border-[var(--color-border)] flex items-center justify-between">
            <div>
              <span className="text-[10.5px] text-[var(--color-secondary)] block">Status Audit Fisik</span>
              <span className="text-xs font-semibold text-[var(--color-primary)]">
                {isMatch ? 'Ukuran Cocok' : 'Ada Selisih'}
              </span>
            </div>
            <StatusBadge status={isMatch ? 'MATCHED' : 'UNMATCHED'} size="sm" />
          </div>
        </div>
      </div>
    </div>
  )
}
