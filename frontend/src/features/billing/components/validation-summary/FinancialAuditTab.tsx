import { formatCurrency, cleanFoxProString } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatQtyDecimal, type ItemPriceEvaluation } from '../../utils/billing.utils'
import type { BillingDetail } from '../../types/billing.types'

export interface FinancialAuditItem {
  item: BillingDetail
  evaluation: ItemPriceEvaluation
}

export interface FinancialAuditTabProps {
  evaluatedItems: FinancialAuditItem[]
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

export function FinancialAuditTab({ evaluatedItems }: FinancialAuditTabProps) {
  if (evaluatedItems.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--color-secondary)]">
        Tidak ada item penagihan untuk diaudit tarifnya.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[var(--color-neutral)]/40 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-2.5 py-1.5 w-10 text-center text-[10.5px] font-semibold text-[var(--color-secondary)] whitespace-nowrap">
                No
              </th>
              <th className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] min-w-[200px]">
                Item Tagihan
              </th>
              <th className="px-2.5 py-1.5 text-right text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap">
                Qty
              </th>
              <th className="px-2.5 py-1.5 text-right text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap min-w-[125px]">
                Tarif Tagihan
              </th>
              <th className="px-2.5 py-1.5 text-right text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap min-w-[125px]">
                Tarif Acuan
              </th>
              <th className="px-2.5 py-1.5 text-right text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap min-w-[120px]">
                Selisih
              </th>
              <th className="px-2.5 py-1.5 text-center text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap">
                Status Audit
              </th>
              <th className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-secondary)] whitespace-nowrap min-w-[130px]">
                Sumber Acuan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {evaluatedItems.map(({ item: billedItem, evaluation: item }, idx) => {
              const billedPrice = billedItem ? billedItem.fdItemPrice : item.profilePrice
              const targetPrice = item.maxTargetPrice || item.minTargetPrice || 0
              const diff = item.difference || 0
              const isUnder = item.isUndercharge
              const isOver = item.isOvercharge
              const isMatch = item.isMatched

              return (
                <tr key={idx} className="hover:bg-[var(--color-neutral)]/20 transition-colors">
                  <td className="px-2.5 py-1.5 text-center text-[var(--color-secondary)] tabular-nums whitespace-nowrap">
                    {idx + 1}
                  </td>
                  <td className="px-2.5 py-1.5 min-w-[200px]">
                    <div className="font-semibold text-[var(--color-primary)]">
                      {cleanFoxProString(billedItem?.fdItemName || item.comodityName || 'Item Tagihan')}
                    </div>
                    {item.targetColName && (
                      <div className="text-[10px] text-[var(--color-secondary)]">
                        Target: {cleanFoxProString(item.targetColName)}
                      </div>
                    )}
                  </td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums whitespace-nowrap">
                    {billedItem ? `${formatQtyDecimal(billedItem.fdQty, billedItem.fdListCode, billedItem.fdItemName)} ${billedItem.fdListCode || ''}` : '1'}
                  </td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums font-medium text-[var(--color-primary)] whitespace-nowrap">
                    {formatCurrency(billedPrice)}
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
                  <td className="px-2.5 py-1.5 text-center whitespace-nowrap">
                    <StatusBadge
                      status={
                        isMatch
                          ? 'MATCH'
                          : isUnder
                            ? 'UNDERCHARGE'
                            : isOver
                              ? 'OVERCHARGE'
                              : 'NO_TARGET'
                      }
                      size="sm"
                    />
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
        </table>
      </div>
    </div>
  )
}
