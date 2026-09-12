import { useQuery } from "@tanstack/react-query"
import { Scale, CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react"
import { useState } from "react"
import { billingApi } from "../services/billing.service"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

interface Type2ComparisonPanelProps {
  invNo: string
  listCode?: string | null
  markingCode?: string | null
  defaultExpanded?: boolean
}

function formatRp(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

type CompareResult = {
  invNo: string
  listCode: string
  markingCode: string
  priceM3: number
  priceKG: number
  totalM3: number
  totalKG: number
  m3Source?: string
  isGabungan?: boolean
  totalNilaiM3: number
  totalNilaiKG: number
  overallWinner: "M3" | "KG"
  totalNilaiTagihanIdeal: number
  totalBilled: number
  selisihVsAktual: number
  validationStatus: "VALID" | "OVERCHARGE" | "UNDERCHARGE" | "EQUAL"
  items: Array<{
    fdListCode: string
    fdCustCode: string
    fdCustName: string
    fdMarkingNo: string
    fdTerima: string
    fdJmlPack: number
    fdSatuan: string
    m3: number
    m3Source?: string
    kg: number
    kgSource?: string
    priceM3: number
    priceKG: number
    nilaiM3: number
    nilaiKG: number
    nilaiTagihan: number
    winner: "M3" | "KG"
    selisihM3vsKG: number
    selisihAbs: number
    isM3Higher: boolean
  }>
}

export function Type2ComparisonPanel({ invNo, listCode, markingCode, defaultExpanded = true }: Type2ComparisonPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["type2Compare", invNo, listCode],
    queryFn: async () => {
      const res = await billingApi.type2CompareCheck({
        invNo,
        listCode: listCode || undefined,
        markingCode: markingCode || undefined,
      })
      return res.data?.data as CompareResult
    },
    enabled: !!invNo,
    staleTime: 120000,
  })

  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center justify-center">
        <LoadingSpinner message="Memuat validasi M3 vs KG..." fullscreen={false} />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-2">
        <Info className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-xs text-amber-600 dark:text-amber-400">Tidak dapat memuat data validasi M3 vs KG</span>
      </div>
    )
  }

  const { validationStatus, overallWinner, totalBilled, totalNilaiTagihanIdeal, selisihVsAktual, items } = data

  const statusCfg = {
    EQUAL: { label: "SESUAI", color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/5", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> },
    VALID: { label: "SESUAI", color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/5", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> },
    OVERCHARGE: { label: "TAGIHAN LEBIH TINGGI", color: "text-red-600 dark:text-red-400", border: "border-red-500/30", bg: "bg-red-500/5", icon: <TrendingUp className="w-3.5 h-3.5 text-red-500" /> },
    UNDERCHARGE: { label: "TAGIHAN LEBIH RENDAH", color: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/5", icon: <TrendingDown className="w-3.5 h-3.5 text-amber-500" /> },
  }

  const st = statusCfg[validationStatus]
  const hasNoPricing = data.priceM3 === 0 && data.priceKG === 0

  return (
    <div className={`rounded-[var(--radius-lg)] border ${st.border} ${st.bg} overflow-hidden`}>
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer select-none group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-1.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs">
          <Scale className="w-3.5 h-3.5 text-[var(--color-tertiary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold font-[var(--font-label)] uppercase tracking-wider text-[var(--color-primary)]">
              Validasi Compare M3 vs KG
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-transparent border ${st.border} ${st.color}`}>
              {st.icon}
              {st.label}
            </span>
            {overallWinner && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-transparent border border-[var(--color-tertiary)]/30 text-[var(--color-tertiary)]">
                BASIS: {overallWinner}
              </span>
            )}
          </div>
          {!hasNoPricing && (
            <p className="mt-0.5 text-[11px] text-[var(--color-secondary)]">
              Tagihan: {formatRp(totalBilled)} · Ideal: {formatRp(totalNilaiTagihanIdeal)} · Selisih: {selisihVsAktual >= 0 ? "+" : ""}{formatRp(selisihVsAktual)}
            </p>
          )}
        </div>
        <button className="shrink-0 text-[var(--color-secondary)] group-hover:text-[var(--color-primary)] transition-colors">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          {hasNoPricing ? (
            <div className="px-4 py-4 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Harga M3 dan KG belum terdefinisi di rincian tagihan. Pastikan detail billing memiliki item kode <strong>M3</strong> dan/atau <strong>KG</strong>.
              </span>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-[var(--color-border)]">
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Total Volume</p>
                    {data.m3Source && (
                      <span className="text-[9px] font-mono text-[var(--color-tertiary)] font-semibold">
                        {data.m3Source}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-[var(--color-primary)] tabular-nums">
                    {data.totalM3.toLocaleString("id-ID", { minimumFractionDigits: 4 })} M3
                  </p>
                  {data.priceM3 > 0 && <p className="text-[11px] text-[var(--color-secondary)]">@ {formatRp(data.priceM3)}/M3</p>}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Total Berat</p>
                  <p className="text-sm font-bold text-[var(--color-primary)] tabular-nums">
                    {data.totalKG.toLocaleString("id-ID", { minimumFractionDigits: 2 })} KG
                  </p>
                  {data.priceKG > 0 && <p className="text-[11px] text-[var(--color-secondary)]">@ {formatRp(data.priceKG)}/KG</p>}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Nilai M3</p>
                  <p className={`text-sm font-bold tabular-nums ${overallWinner === "M3" ? "text-[var(--color-tertiary)]" : "text-[var(--color-secondary)]"}`}>
                    {formatRp(data.totalNilaiM3)}
                  </p>
                  {overallWinner === "M3" && <span className="text-[10px] font-bold text-[var(--color-tertiary)]">▲ DIPILIH</span>}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Nilai KG</p>
                  <p className={`text-sm font-bold tabular-nums ${overallWinner === "KG" ? "text-[var(--color-tertiary)]" : "text-[var(--color-secondary)]"}`}>
                    {formatRp(data.totalNilaiKG)}
                  </p>
                  {overallWinner === "KG" && <span className="text-[10px] font-bold text-[var(--color-tertiary)]">▲ DIPILIH</span>}
                </div>
              </div>

              {/* Comparison Summary */}
              <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/50">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-[var(--font-label)] uppercase tracking-wider text-[var(--color-secondary)]">Tagihan Aktual</span>
                  <span className="font-bold font-mono text-[var(--color-primary)]">{formatRp(totalBilled)}</span>
                </div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-[var(--font-label)] uppercase tracking-wider text-[var(--color-secondary)]">Nilai Ideal ({overallWinner})</span>
                  <span className="font-bold font-mono text-[var(--color-tertiary)]">{formatRp(totalNilaiTagihanIdeal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-[var(--color-border)] pt-1.5 mt-1">
                  <span className="font-[var(--font-label)] uppercase tracking-wider font-bold text-[var(--color-secondary)]">Selisih</span>
                  <span className={`font-bold font-mono ${selisihVsAktual > 10 ? "text-red-500" : selisihVsAktual < -10 ? "text-amber-500" : "text-emerald-500"}`}>
                    {selisihVsAktual >= 0 ? "+" : ""}{formatRp(selisihVsAktual)}
                  </span>
                </div>
              </div>

              {/* Per-Entry Table */}
              {items.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)]/60 text-[var(--color-secondary)] font-[var(--font-label)] uppercase tracking-wider">
                        <th className="px-3 py-2 text-left font-semibold">Customer / Resi</th>
                        <th className="px-3 py-2 text-right font-semibold">M3</th>
                        <th className="px-3 py-2 text-right font-semibold">Nilai M3</th>
                        <th className="px-3 py-2 text-right font-semibold">KG</th>
                        <th className="px-3 py-2 text-right font-semibold">Nilai KG</th>
                        <th className="px-3 py-2 text-center font-semibold">Basis</th>
                        <th className="px-3 py-2 text-right font-semibold">Selisih M3-KG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                          <td className="px-3 py-2">
                            <div className="font-semibold text-[var(--color-primary)] truncate max-w-[160px]" title={item.fdCustName}>
                              {item.fdCustName}
                            </div>
                            {item.fdTerima && <div className="text-[10px] text-[var(--color-secondary)] font-mono">{item.fdTerima}</div>}
                            <div className="text-[10px] text-[var(--color-secondary)]">{item.fdJmlPack} {item.fdSatuan}</div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[var(--color-primary)]">
                            <div>{item.m3.toLocaleString("id-ID", { minimumFractionDigits: 4 })}</div>
                            {item.m3Source && (
                              <div className="text-[9px] text-[var(--color-secondary)] font-mono">
                                ({item.m3Source})
                              </div>
                            )}
                          </td>
                          <td className={`px-3 py-2 text-right tabular-nums font-semibold ${item.winner === "M3" ? "text-[var(--color-tertiary)]" : "text-[var(--color-secondary)]"}`}>
                            {formatRp(item.nilaiM3)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[var(--color-primary)]">
                            <div>{item.kg.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</div>
                            {item.kgSource && (
                              <div className="text-[9px] text-[var(--color-secondary)] font-mono">
                                ({item.kgSource})
                              </div>
                            )}
                          </td>
                          <td className={`px-3 py-2 text-right tabular-nums font-semibold ${item.winner === "KG" ? "text-[var(--color-tertiary)]" : "text-[var(--color-secondary)]"}`}>
                            {formatRp(item.nilaiKG)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] bg-transparent border ${item.winner === "M3" ? "border-[var(--color-tertiary)]/40 text-[var(--color-tertiary)]" : "border-amber-500/40 text-amber-600 dark:text-amber-400"}`}>
                              {item.winner}
                            </span>
                          </td>
                          <td className={`px-3 py-2 text-right tabular-nums font-mono text-[11px] ${item.selisihM3vsKG > 0 ? "text-[var(--color-tertiary)]" : item.selisihM3vsKG < 0 ? "text-amber-600 dark:text-amber-400" : "text-[var(--color-secondary)]"}`}>
                            {item.selisihM3vsKG >= 0 ? "+" : ""}{formatRp(item.selisihM3vsKG)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {items.length === 0 && (
                <div className="px-4 py-4 text-center text-xs text-[var(--color-secondary)]">
                  Tidak ada data entry list untuk nomor surat jalan ini
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
