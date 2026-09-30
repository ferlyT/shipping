import { Tag } from 'lucide-react'
import { formatCurrency, cleanFoxProString } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatQtyDecimal, type ItemPriceEvaluation } from '../../utils/billing.utils'
import type { BillingDetail } from '../../types/billing.types'

import { formatWithCurrency } from '@/components/ui/CurrencyValue'

export interface FinancialAuditItem {
  item: BillingDetail
  evaluation: ItemPriceEvaluation
}

export interface FinancialAuditTabProps {
  evaluatedItems: FinancialAuditItem[]
  totalInvoice?: number
  currency?: string
}

function parsePriceDisplay(rawDisplay?: string): { pricePart: string; notePart?: string } {
  if (!rawDisplay) return { pricePart: '' }
  const str = cleanFoxProString(rawDisplay).trim()

  // Match pattern like: "Rp. 13,000,000.00 (Cust)" or "20 kg (Gudang)"
  const parenMatch = str.match(/^(.*?)\s*(\([^)]+\))$/)
  if (parenMatch) {
    return {
      pricePart: parenMatch[1].trim(),
      notePart: parenMatch[2].trim(),
    }
  }

  // Match pattern like: "0 di tbEntrylist"
  const diMatch = str.match(/^(.*?)\s+(di\s+tb[A-Za-z0-9_]+)$/i)
  if (diMatch) {
    return {
      pricePart: diMatch[1].trim(),
      notePart: diMatch[2].trim(),
    }
  }

  return { pricePart: str }
}

export function FinancialAuditTab({
  evaluatedItems,
  totalInvoice,
  currency = 'Rp.',
}: FinancialAuditTabProps) {
  if (evaluatedItems.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--color-secondary)]">
        Tidak ada item penagihan untuk diaudit tarifnya.
      </div>
    )
  }

  // Calculate item counts & sum
  const underchargedCount = evaluatedItems.filter(({ evaluation }) => evaluation.statusType === 'LOWER' && !evaluation.isNonValidatedBranchDashFee).length
  const overchargedCount = evaluatedItems.filter(({ evaluation }) => evaluation.statusType === 'HIGHER' && !evaluation.isNonValidatedBranchDashFee).length

  const calculatedSum = evaluatedItems.reduce((acc, { item: billedItem, evaluation: item }) => {
    const billedPrice = billedItem ? Number(billedItem.fdItemPrice || 0) : Number(item.profilePrice || 0)
    const lineTotal = billedItem && Number(billedItem.fdTotal || 0) > 0
      ? Number(billedItem.fdTotal)
      : (Number(billedItem?.fdQty || 1) * billedPrice)
    return acc + lineTotal
  }, 0)

  const finalTotalInvoice = (totalInvoice !== undefined && totalInvoice > 0)
    ? totalInvoice
    : calculatedSum

  const formattedTotalInvoice = formatWithCurrency(finalTotalInvoice, currency)

  return (
    <div className="space-y-3.5">
      {/* Summary KPI Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="text-xs text-[var(--color-secondary)]">
            Total Item Tagihan: <strong className="text-[var(--color-primary)] font-semibold">{evaluatedItems.length} Item</strong>
          </div>
          {underchargedCount > 0 && (
            <span className="text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              {underchargedCount} Undercharge
            </span>
          )}
          {overchargedCount > 0 && (
            <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              {overchargedCount} Overcharge
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 bg-[var(--color-neutral)]/40 px-3 py-1.5 rounded-lg border border-[var(--color-border)]">
          <span className="text-[11px] uppercase tracking-wider text-[var(--color-secondary)] font-semibold">
            Total Invoice:
          </span>
          <span className="text-[15px] font-bold text-[var(--color-primary)] font-[var(--font-heading)] tabular-nums">
            {formattedTotalInvoice}
          </span>
        </div>
      </div>

      {/* Tabel Rincian Item Tagihan */}
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[var(--color-neutral)]/40 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-2.5 py-1.5 w-10 text-center text-[10.5px] font-semibold text-[var(--color-secondary)] whitespace-nowrap">
                No
              </th>
              <th className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] min-w-[200px]">
                Item Tagihan / Komoditi
              </th>
              <th className="px-2.5 py-1.5 text-right text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap">
                Qty
              </th>
              <th className="px-2.5 py-1.5 text-right text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap min-w-[115px]">
                Tarif Tagihan
              </th>
              <th className="px-2.5 py-1.5 text-right text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap min-w-[125px]">
                Subtotal
              </th>
              <th className="px-2.5 py-1.5 text-right text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap min-w-[115px]">
                Tarif Acuan
              </th>
              <th className="px-2.5 py-1.5 text-right text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap min-w-[110px]">
                Selisih
              </th>
              <th className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap min-w-[130px]">
                Sumber Acuan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {evaluatedItems.map(({ item: billedItem, evaluation: item }, idx) => {
              const billedPrice = billedItem ? Number(billedItem.fdItemPrice || 0) : Number(item.profilePrice || 0)
              const lineTotal = billedItem && Number(billedItem.fdTotal || 0) > 0
                ? Number(billedItem.fdTotal)
                : (Number(billedItem?.fdQty || 1) * billedPrice)
              const targetPrice = item.maxTargetPrice || item.minTargetPrice || 0
              const diff = item.difference || 0
              const isUnder = item.statusType === 'LOWER'
              const isOver = item.statusType === 'HIGHER'
              const isMatch = item.isMatched

              const displayComodity = item.isNonValidatedBranchDashFee
                ? (billedItem?.fdComodity && billedItem.fdComodity.trim() !== (billedItem?.fdItemName || '').trim()
                  ? billedItem.fdComodity.trim()
                  : 'BIAYA KHUSUS')
                : (item.comodityName && item.comodityName !== '—'
                  ? item.comodityName
                  : (billedItem?.fdComodity || ''))

              return (
                <tr key={idx} className="hover:bg-[var(--color-neutral)]/20 transition-colors">
                  <td className="px-2.5 py-1.5 text-center text-[var(--color-secondary)] tabular-nums whitespace-nowrap">
                    {idx + 1}
                  </td>
                  <td className="px-2.5 py-1.5 min-w-[200px]">
                    <div className="font-semibold text-[var(--color-primary)]">
                      {cleanFoxProString(billedItem?.fdItemName || item.comodityName || 'Item Tagihan')}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {displayComodity && (
                        <span
                          className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.2 rounded font-medium bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] whitespace-nowrap"
                          title={`Tipe Komoditi: ${cleanFoxProString(displayComodity)}`}
                        >
                          <Tag className="w-2.5 h-2.5 text-[var(--color-secondary)] shrink-0" />
                          <span>{cleanFoxProString(displayComodity)}</span>
                        </span>
                      )}
                      <StatusBadge
                        status={
                          item.isNonValidatedBranchDashFee
                            ? 'NON-VALIDASI'
                            : isMatch
                              ? 'MATCH'
                              : isUnder
                                ? 'UNDERCHARGE'
                                : isOver
                                  ? 'OVERCHARGE'
                                  : 'NO_TARGET'
                        }
                        variant={item.isNonValidatedBranchDashFee ? 'neutral' : undefined}
                        size="sm"
                      />
                    </div>
                  </td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums whitespace-nowrap">
                    {billedItem ? `${formatQtyDecimal(billedItem.fdQty, billedItem.fdListCode, billedItem.fdItemName)} ${billedItem.fdListCode || ''}` : '1'}
                  </td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums font-medium text-[var(--color-primary)] whitespace-nowrap">
                    {formatCurrency(billedPrice)}
                  </td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums font-semibold text-[var(--color-primary)] whitespace-nowrap">
                    {formatCurrency(lineTotal)}
                  </td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums text-[var(--color-secondary)] whitespace-nowrap">
                    {targetPrice > 0 ? formatCurrency(targetPrice) : '—'}
                  </td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums whitespace-nowrap">
                    {targetPrice > 0 ? (
                      <span
                        className={`font-semibold whitespace-nowrap ${isUnder
                          ? 'text-rose-500'
                          : isOver
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                          }`}
                      >
                        {diff > 0 ? `+${formatCurrency(diff)}` : diff < 0 ? formatCurrency(diff) : 'Rp 0'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-2.5 py-1.5 text-[11px] min-w-[130px] leading-tight">
                    <div className="font-semibold text-[var(--color-primary)]">
                      {cleanFoxProString(item.tierSource || 'Price List Master')}
                    </div>
                    {item.priceListDisplay && item.priceListDisplay !== item.tierSource && (() => {
                      const { pricePart, notePart } = parsePriceDisplay(item.priceListDisplay)
                      return (
                        <div className="text-[10px] text-[var(--color-secondary)] mt-0.5 leading-tight space-y-0.5">
                          {pricePart && (
                            <div>{pricePart}</div>
                          )}
                          {notePart && (
                            <div className="text-[9.5px] text-[var(--color-secondary)]/80">
                              {notePart}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-[var(--color-neutral)]/40 border-t-2 border-[var(--color-border)] font-semibold">
            <tr>
              <td colSpan={4} className="px-2.5 py-2 text-right text-xs uppercase tracking-wider text-[var(--color-secondary)] font-bold">
                Total Invoice ({evaluatedItems.length} Item):
              </td>
              <td className="px-2.5 py-2 text-right tabular-nums text-xs font-bold text-[var(--color-primary)] whitespace-nowrap">
                {formattedTotalInvoice}
              </td>
              <td colSpan={4} className="px-2.5 py-2 text-[10.5px] text-[var(--color-secondary)]">
                {underchargedCount === 0 && overchargedCount === 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Seluruh tarif cocok dengan acuan
                  </span>
                )}
                {underchargedCount > 0 && (
                  <span className="text-rose-500 font-medium">
                    ⚠ {underchargedCount} item di bawah acuan master
                  </span>
                )}
                {overchargedCount > 0 && underchargedCount === 0 && (
                  <span className="text-amber-500 font-medium">
                    ℹ {overchargedCount} item di atas acuan master (khusus/override)
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
