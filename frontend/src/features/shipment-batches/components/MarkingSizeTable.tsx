import { Layers, AlertCircle, Sparkles } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { MarkingSizeDetailItem } from '../types/marking.types'
import type { BoxDimensionTabType } from './MarkingBoxDimensionModal'
import { cn, displayCustName, formatNumber, formatDecimal } from '@/lib/utils'

interface MarkingSizeTableProps {
  items: MarkingSizeDetailItem[]
  isAir?: boolean
  markingCode?: string
  onViewDimensions: (item: MarkingSizeDetailItem, initialTab?: BoxDimensionTabType) => void
  isLoading?: boolean
}

export function MarkingSizeTable({
  items,
  isAir: _isAir = false,
  markingCode = '',
  onViewDimensions,
  isLoading = false,
}: MarkingSizeTableProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 shadow-xs">
        <div className="h-5 w-44 rounded skeleton-shimmer" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-10 w-full rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  // Akumulasi total footer
  const totalPackPL = items.reduce((acc, it) => acc + it.fdJmlPack, 0)
  const totalQtyGdg = items.reduce((acc, it) => acc + it.fdTotalQty, 0)
  const totalM3PL = items.reduce((acc, it) => acc + it.fdM3List, 0)
  const totalM3Gdg = items.reduce((acc, it) => acc + it.fdM3, 0)
  const totalM3Komplain = items.reduce((acc, it) => acc + it.fdm3Komplain, 0)
  const totalBeratList = items.reduce((acc, it) => acc + it.fdJmlBerat, 0)
  const totalBeratGdg = items.reduce((acc, it) => acc + it.fdJmlBeratGudang, 0)
  const totalBeratSJ = items.reduce((acc, it) => acc + it.fdJmlBeratSJ, 0)
  const totalBeratKomplain = items.reduce((acc, it) => acc + it.fdJmlBeratKomplain, 0)

  return (
    <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[var(--color-neutral)] border-b border-[var(--color-border)]">
              <th className="py-2 px-3 text-left text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] w-10">
                No
              </th>
              <th className="py-2 px-3 text-left text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] min-w-[90px]">
                ListCode
              </th>
              <th className="py-2 px-3 text-left text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] min-w-[200px]">
                Customer
              </th>
              <th className="py-2 px-3 text-left text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] min-w-[140px]">
                Marking No
              </th>
              <th className="py-2 px-3 text-left text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] min-w-[150px]">
                Komoditas
              </th>
              {/* Kolom Koli */}
              <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                Pack PL
              </th>
              <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                Qty Gdg
              </th>
              {/* Kolom Kubikasi */}
              <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                M³ PL
              </th>
              <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                M³ Gdg
              </th>
              <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                M³ Komplain
              </th>
              <th className="py-2 px-2 text-center text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] w-10">
                Detil
              </th>
              {/* Kolom Berat */}
              <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                Berat List
              </th>
              <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                Berat Gdg
              </th>
              <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                Berat SJ
              </th>
              <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                Berat Komp
              </th>
              <th className="py-2 px-3 text-left text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] min-w-[120px]">
                Keterangan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {items.length === 0 ? (
              <tr>
                <td colSpan={16} className="py-14 text-center text-[12px] text-[var(--color-secondary)]">
                  {!markingCode
                    ? t('marking.sizeAudit.selectMarkingPrompt')
                    : t('marking.sizeAudit.noDataFound')}
                </td>
              </tr>
            ) : (
              items.map((row, idx) => {
                const isPackDiff = row.fdJmlPack !== row.fdTotalQty
                const isM3Diff = Math.abs(row.fdM3List - row.fdM3) > 0.0001
                const hasM3Komplain = row.fdm3Komplain > 0
                const isBeratGdgDiff = Math.abs(row.fdJmlBerat - row.fdJmlBeratGudang) > 0.01
                const isBeratSJDiff = Math.abs(row.fdJmlBerat - row.fdJmlBeratSJ) > 0.01
                const hasBeratKomplain = row.fdJmlBeratKomplain > 0

                return (
                  <tr
                    key={row.fdListCode || idx}
                    className="hover:bg-[var(--color-neutral)]/40 transition-colors text-[12px] tabular-nums"
                  >
                    {/* No */}
                    <td className="py-2 px-3 text-[var(--color-secondary)] text-[11px]">{idx + 1}</td>

                    {/* ListCode */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-medium text-[var(--color-primary)]">
                          {row.fdListCode}
                        </span>
                        {row.hasMarkup && (
                          <button
                            type="button"
                            onClick={() => onViewDimensions(row, 'asliGudang')}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 transition-colors cursor-pointer"
                            title={t('marking.sizeAudit.tagMarkupTooltip')}
                          >
                            <Sparkles size={10} className="shrink-0" />
                            {t('marking.sizeAudit.tagMarkup')}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-2 px-3 font-medium text-[var(--color-primary)] max-w-[220px] truncate" title={displayCustName(row.fdCustName)}>
                      {displayCustName(row.fdCustName)}
                    </td>

                    {/* Marking No */}
                    <td className="py-2 px-3 font-mono text-[11px] text-[var(--color-primary)] max-w-[160px] truncate" title={row.fdMarkingNo}>
                      {row.fdMarkingNo || '—'}
                    </td>

                    {/* Komoditas */}
                    <td className="py-2 px-3 text-[11px] text-[var(--color-secondary)] max-w-[160px] truncate" title={row.fdComodity}>
                      {row.fdComodity || '—'}
                    </td>

                    {/* Jml Pack (PL) */}
                    <td className="py-2 px-3 text-right font-medium text-[var(--color-primary)]">
                      {formatNumber(row.fdJmlPack)}
                    </td>

                    {/* Qty Detil (Gudang) - Alert merah jika beda */}
                    <td className="py-2 px-3 text-right">
                      <span
                        className={cn(
                          'tabular-nums font-semibold',
                          isPackDiff
                            ? 'inline-flex items-center px-1.5 py-0.2 rounded text-[11px] bg-red-500/10 border border-red-500/30 text-red-500'
                            : 'text-[var(--color-primary)]'
                        )}
                        title={isPackDiff ? `Selisih koli: ${row.fdJmlPack - row.fdTotalQty}` : undefined}
                      >
                        {formatNumber(row.fdTotalQty)}
                      </span>
                    </td>

                    {/* M³ PL */}
                    <td className="py-2 px-3 text-right font-mono text-[var(--color-primary)]">
                      {formatDecimal(row.fdM3List, 4)}
                    </td>

                    {/* M³ Gudang - Alert merah jika beda */}
                    <td className="py-2 px-3 text-right font-mono">
                      <span
                        className={cn(
                          'font-semibold tabular-nums',
                          isM3Diff
                            ? 'inline-flex items-center px-1.5 py-0.2 rounded text-[11px] bg-red-500/10 border border-red-500/30 text-red-500'
                            : 'text-emerald-600 dark:text-emerald-400'
                        )}
                        title={isM3Diff ? `Selisih M³: ${(row.fdM3 - row.fdM3List).toFixed(4)}` : undefined}
                      >
                        {formatDecimal(row.fdM3, 4)}
                      </span>
                    </td>

                    {/* M³ Komplain - Alert merah jika > 0 */}
                    <td className="py-2 px-3 text-right font-mono">
                      {hasM3Komplain ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[11px] bg-red-500/10 border border-red-500/30 text-red-500 font-bold">
                          {formatDecimal(row.fdm3Komplain, 4)}
                        </span>
                      ) : (
                        <span className="text-[var(--color-secondary)]/50">0.0000</span>
                      )}
                    </td>

                    {/* Tombol Detil Koli Tunggal (Membuka modal 4-tab dimensi) */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onViewDimensions(row, hasM3Komplain || hasBeratKomplain ? 'komplain' : 'gudang')}
                        className={cn(
                          'p-1.5 rounded-md border transition-colors cursor-pointer inline-flex items-center justify-center',
                          hasM3Komplain || hasBeratKomplain
                            ? 'border-red-500/40 text-red-500 hover:bg-red-500/10'
                            : 'border-[var(--color-border)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                        )}
                        title={
                          hasM3Komplain || hasBeratKomplain
                            ? t('marking.sizeAudit.viewKomplainDims')
                            : t('marking.sizeAudit.viewBoxDims')
                        }
                      >
                        {hasM3Komplain || hasBeratKomplain ? (
                          <AlertCircle size={13} className="text-red-500" />
                        ) : (
                          <Layers size={13} />
                        )}
                      </button>
                    </td>

                    {/* Berat List */}
                    <td className="py-2 px-3 text-right text-[var(--color-primary)] font-mono">
                      {formatDecimal(row.fdJmlBerat, 2)}
                    </td>

                    {/* Berat Gudang - Alert jika beda */}
                    <td className="py-2 px-3 text-right font-mono">
                      <span
                        className={cn(
                          'tabular-nums',
                          isBeratGdgDiff
                            ? 'inline-flex items-center px-1.5 py-0.2 rounded text-[11px] bg-red-500/10 border border-red-500/30 text-red-500 font-semibold'
                            : 'text-[var(--color-primary)]'
                        )}
                      >
                        {formatDecimal(row.fdJmlBeratGudang, 2)}
                      </span>
                    </td>

                    {/* Berat SJ - Alert jika beda */}
                    <td className="py-2 px-3 text-right font-mono">
                      <span
                        className={cn(
                          'tabular-nums',
                          isBeratSJDiff
                            ? 'inline-flex items-center px-1.5 py-0.2 rounded text-[11px] bg-red-500/10 border border-red-500/30 text-red-500 font-semibold'
                            : 'text-[var(--color-primary)]'
                        )}
                      >
                        {formatDecimal(row.fdJmlBeratSJ, 2)}
                      </span>
                    </td>

                    {/* Berat Komplain */}
                    <td className="py-2 px-3 text-right font-mono">
                      {hasBeratKomplain ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[11px] bg-red-500/10 border border-red-500/30 text-red-500 font-bold">
                          {formatDecimal(row.fdJmlBeratKomplain, 2)}
                        </span>
                      ) : (
                        <span className="text-[var(--color-secondary)]/50">0.00</span>
                      )}
                    </td>

                    {/* Keterangan */}
                    <td className="py-2 px-3 text-[11px] text-[var(--color-secondary)] truncate max-w-[160px]" title={row.fdKeterangan || row.fdDesc}>
                      {row.fdKeterangan || row.fdDesc || '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-[var(--color-neutral)] border-t-2 border-[var(--color-border)] text-[12px] font-bold tabular-nums">
                <td colSpan={5} className="py-2.5 px-3 text-right text-[var(--color-primary)] uppercase tracking-wide">
                  Total :
                </td>
                {/* Total Pack PL */}
                <td className="py-2.5 px-3 text-right text-[var(--color-primary)] font-bold">
                  {formatNumber(totalPackPL)}
                </td>
                {/* Total Qty Gdg */}
                <td className="py-2.5 px-3 text-right text-[var(--color-primary)] font-bold">
                  {formatNumber(totalQtyGdg)}
                </td>
                {/* Total M3 PL */}
                <td className="py-2.5 px-3 text-right font-mono text-[var(--color-primary)] font-bold">
                  {formatDecimal(totalM3PL, 4)}
                </td>
                {/* Total M3 Gdg */}
                <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {formatDecimal(totalM3Gdg, 4)}
                </td>
                {/* Total M3 Komplain */}
                <td className="py-2.5 px-3 text-right font-mono text-red-500 font-bold">
                  {formatDecimal(totalM3Komplain, 4)}
                </td>
                {/* Detil */}
                <td></td>
                {/* Total Berat List */}
                <td className="py-2.5 px-3 text-right font-mono text-[var(--color-primary)] font-bold">
                  {formatDecimal(totalBeratList, 2)}
                </td>
                {/* Total Berat Gdg */}
                <td className="py-2.5 px-3 text-right font-mono text-[var(--color-primary)] font-bold">
                  {formatDecimal(totalBeratGdg, 2)}
                </td>
                {/* Total Berat SJ */}
                <td className="py-2.5 px-3 text-right font-mono text-[var(--color-primary)] font-bold">
                  {formatDecimal(totalBeratSJ, 2)}
                </td>
                {/* Total Berat Komp */}
                <td className="py-2.5 px-3 text-right font-mono text-red-500 font-bold">
                  {formatDecimal(totalBeratKomplain, 2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
