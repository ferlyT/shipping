import { createPortal } from 'react-dom'
import { X, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { formatDecimal } from '@/lib/utils'
import type { TargetBillingItem } from '../types/billing.types'

interface MismatchModalProps {
  item: TargetBillingItem | null
  onClose: () => void
}

export function MismatchModal({ item, onClose }: MismatchModalProps) {
  if (!item) return null

  const m3K    = Number(item.m3Komplain || 0)
  const jml    = Number(item.jmlPack || 0)
  const qtyG   = Number(item.totalQtyGudang || 0)
  const qtyK   = Number(item.totalQtyKomplain || 0)
  const beratK = Number(item.jmlBeratKomplain || 0)
  const berat  = Number(item.berat || 0)
  const m3G    = Number(item.m3Gudang || 0)
  const m3L    = Number(item.m3List || 0)

  const hasKomplainM3    = m3K > 0
  const hasKomplainBerat = beratK > 0

  // Identifikasi penyebab mismatch
  const issues: string[] = []
  if (hasKomplainM3) {
    if (qtyK !== jml) {
      issues.push(`Qty Komplain (${qtyK} ${item.satuan || 'coly'}) berbeda dengan Qty List (${jml} ${item.satuan || 'coly'})`)
    }
    if (qtyK !== qtyG) {
      issues.push(`Qty Komplain (${qtyK} ${item.satuan || 'coly'}) berbeda dengan Qty Gudang (${qtyG} ${item.satuan || 'coly'})`)
    }
  } else {
    if (qtyG !== jml) {
      issues.push(`Qty Fisik Gudang (${qtyG} ${item.satuan || 'coly'}) berbeda dengan Qty Packing List (${jml} ${item.satuan || 'coly'})`)
    }
  }

  if (hasKomplainBerat && Math.abs(beratK - berat) >= 0.01) {
    issues.push(`Berat Komplain (${formatDecimal(beratK, 2)} kg) berbeda dengan Berat Real (${formatDecimal(berat, 2)} kg)`)
  }

  // Detail cek komparasi
  const checks: { label: string; desc: string; ok: boolean; val1: string; val2: string }[] = []
  if (hasKomplainM3) {
    checks.push(
      {
        label: 'Qty Komplain vs Qty List',
        desc: 'Jumlah coly pada klaim komplain vs packing list',
        ok: qtyK === jml,
        val1: `${qtyK} ${item.satuan || 'coly'}`,
        val2: `${jml} ${item.satuan || 'coly'}`,
      },
      {
        label: 'Qty Komplain vs Qty Gudang',
        desc: 'Jumlah coly klaim komplain vs fisik gudang',
        ok: qtyK === qtyG,
        val1: `${qtyK} ${item.satuan || 'coly'}`,
        val2: `${qtyG} ${item.satuan || 'coly'}`,
      },
      {
        label: 'M3 Komplain vs M3 Gudang',
        desc: 'Volume kubikasi komplain vs pengukuran gudang',
        ok: Math.abs(m3K - m3G) < 0.0001,
        val1: `${formatDecimal(m3K, 4)} m³`,
        val2: `${formatDecimal(m3G, 4)} m³`,
      },
    )
  } else {
    checks.push(
      {
        label: 'Qty Gudang vs Qty List',
        desc: 'Jumlah coly yang diukur gudang vs dokumen list',
        ok: qtyG === jml,
        val1: `${qtyG} ${item.satuan || 'coly'}`,
        val2: `${jml} ${item.satuan || 'coly'}`,
      },
      {
        label: 'M3 Gudang vs M3 List',
        desc: 'Kubikasi fisik gudang vs estimasi list',
        ok: Math.abs(m3G - m3L) < 0.0001,
        val1: `${formatDecimal(m3G, 4)} m³`,
        val2: `${formatDecimal(m3L, 4)} m³`,
      },
    )
  }

  if (hasKomplainBerat) {
    checks.push({
      label: 'Berat Komplain vs Berat Real',
      desc: 'Total kilogram komplain vs timbangan fisik',
      ok: Math.abs(beratK - berat) < 0.01,
      val1: `${formatDecimal(beratK, 2)} kg`,
      val2: `${formatDecimal(berat, 2)} kg`,
    })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <div>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">Penyebab Data Mismatch</span>
              <span className="text-[10px] block text-[var(--color-secondary)]">
                {hasKomplainM3 || hasKomplainBerat ? 'Validasi Klaim Komplain Barang' : 'Validasi Qty Fisik Gudang vs List'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info baris */}
        <div className="px-5 py-3 bg-[var(--color-neutral)]/40 border-b border-[var(--color-border)]">
          <div className="text-xs font-bold text-[var(--color-primary)]">{item.customer || '-'}</div>
          <div className="text-[11px] text-[var(--color-secondary)] mt-0.5">
            <span className="font-semibold text-[var(--color-primary)]">{item.markingCode}</span>
            {item.markingNo ? ` · ${item.markingNo}` : ''} · {item.branch}
          </div>
        </div>

        {/* Alert Ringkasan Masalah */}
        {issues.length > 0 && (
          <div className="px-5 pt-4">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
              <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Ditemukan {issues.length} Ketidaksesuaian:
              </div>
              <ul className="space-y-1 pl-4 list-disc text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                {issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tabel Validasi Komparasi */}
        <div className="px-5 py-4 space-y-2.5 max-h-[50vh] overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
            Rincian Komparasi Nilai
          </p>
          {checks.map((c, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border transition-all ${
                c.ok
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-xs font-semibold ${c.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                    {c.label}
                  </span>
                  <p className="text-[10px] text-[var(--color-secondary)]">{c.desc}</p>
                </div>
                {c.ok ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sesuai
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                    <XCircle className="w-3.5 h-3.5" /> Selisih
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-border)]/50 text-xs font-mono">
                <span className={c.ok ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                  {c.val1}
                </span>
                <span className="text-[10px] text-[var(--color-secondary)] font-sans">dibandingkan dengan</span>
                <span className={c.ok ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                  {c.val2}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-1 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/30 flex justify-end">
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
