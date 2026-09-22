import { AlertTriangle, CheckCircle2, XCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface ValidationSummaryFooterProps {
  verdictTitle: string
  verdictDescription: string
  isOverallValid: boolean
  hasWarning: boolean
  isLoadingValidation?: boolean
  onOpenIssueModal?: () => void
  onClose: () => void
  canIssue?: boolean
}

export function ValidationSummaryFooter({
  verdictTitle,
  verdictDescription,
  isOverallValid,
  hasWarning,
  isLoadingValidation = false,
  onOpenIssueModal,
  onClose,
  canIssue = true,
}: ValidationSummaryFooterProps) {
  const handleIssueClick = () => {
    onClose()
    onOpenIssueModal?.()
  }

  return (
    <div className="px-4 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] space-y-2.5 shrink-0">
      {/* Verdict Alert Bar */}
      <div
        className={`p-2.5 rounded-lg border flex items-start gap-2.5 transition-colors ${
          isLoadingValidation
            ? 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400'
            : isOverallValid
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
              : hasWarning
                ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400'
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {isLoadingValidation ? (
            <div className="w-4 h-4 rounded skeleton-shimmer" />
          ) : isOverallValid ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : hasWarning ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-xs leading-snug">{verdictTitle}</div>
          <div className="text-[11px] mt-0.5 opacity-90 leading-snug">
            {verdictDescription}
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
        <div className="text-[11.5px] text-[var(--color-secondary)]">
          Pastikan seluruh data fisik & tarif telah terverifikasi sebelum penagihan.
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          {onOpenIssueModal && canIssue && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isLoadingValidation}
              onClick={handleIssueClick}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              title={isLoadingValidation ? "Menunggu validasi data fisik selesai..." : "Terbitkan invoice menjadi status Issued"}
            >
              <Send size={13} className="shrink-0" />
              <span>Terbitkan Invoice</span>
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="font-semibold px-4 py-1.5 cursor-pointer whitespace-nowrap min-w-[76px]"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  )
}
