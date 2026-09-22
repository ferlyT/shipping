import { useTranslation } from '@/hooks/useTranslation'
import { formatCurrency } from '@/lib/utils'

interface BalanceIndicatorBarProps {
  totalRcv: number
  totalDetail: number
  balance: number
  isBalanced: boolean
}

export function BalanceIndicatorBar({
  totalRcv,
  totalDetail,
  balance,
  isBalanced,
}: BalanceIndicatorBarProps) {
  const { t } = useTranslation()

  return (
    <div
      className={`rounded-[var(--radius-lg)] border p-4 shadow-xs transition-colors ${
        isBalanced
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-amber-500/50 bg-amber-500/5'
      }`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Kolom 1: Total Uang Masuk */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border border-emerald-500/30 flex items-center justify-center bg-transparent text-emerald-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
              {t('cashier.colTotalRcv')} (Grid 1)
            </div>
            <div className="text-[16px] font-bold text-emerald-500 tabular-nums">
              {formatCurrency(totalRcv)}
            </div>
          </div>
        </div>

        {/* Separator icon */}
        <div className="hidden md:block text-[var(--color-secondary)] text-sm font-bold">
          vs
        </div>

        {/* Kolom 2: Total Alokasi Faktur */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border border-blue-500/30 flex items-center justify-center bg-transparent text-blue-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
              {t('cashier.colTotalDetail')} (Grid 2)
            </div>
            <div className="text-[16px] font-bold text-blue-500 tabular-nums">
              {formatCurrency(totalDetail)}
            </div>
          </div>
        </div>

        {/* Kolom 3: Status Selisih (Zero-Difference) */}
        <div className="flex items-center gap-3 md:ml-auto border-t md:border-t-0 md:border-l border-[var(--color-border)] pt-3 md:pt-0 md:pl-5 w-full md:w-auto">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center bg-transparent ${
              isBalanced ? 'border-emerald-500 text-emerald-500' : 'border-amber-500 text-amber-500'
            }`}
          >
            {isBalanced ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
              {t('cashier.colBalance')} (Zero-Diff)
            </div>
            <div
              className={`text-[16px] font-bold tabular-nums ${
                isBalanced ? 'text-emerald-500' : 'text-amber-500'
              }`}
            >
              {isBalanced ? 'SEIMBANG (Rp 0)' : `SELISIH: ${formatCurrency(balance)}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
