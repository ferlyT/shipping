import { X, CheckCircle2, AlertTriangle, XCircle, Mic } from 'lucide-react'
import { formatDate, displayCustName, cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { BillingPrintButtons } from '../BillingPrintButtons'
import { useVoiceAssistantPermission } from '@/hooks/useVoiceAssistantPermission'
import type { Billing } from '../../types/billing.types'

export interface ValidationSummaryHeaderProps {
  billingData: Billing
  customerName: string
  isOverallValid: boolean
  hasWarning: boolean
  isLoadingValidation?: boolean
  onClose: () => void
  isVoiceListening?: boolean
  voiceTranscript?: string
  voiceInterim?: string
  onToggleVoice?: () => void
  isVoiceSupported?: boolean
}

export function ValidationSummaryHeader({
  billingData,
  customerName,
  isOverallValid,
  hasWarning,
  isLoadingValidation = false,
  onClose,
  isVoiceListening = false,
  voiceTranscript = '',
  voiceInterim = '',
  onToggleVoice,
  isVoiceSupported = false,
}: ValidationSummaryHeaderProps) {
  const isLunas = billingData.fdGive2 === 1
  const isTerbit = billingData.fdGive === 1
  const canUseVoice = useVoiceAssistantPermission()

  return (
    <div className="flex items-center justify-between px-3.5 sm:px-4 py-2 sm:py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`p-1.5 rounded-lg border shrink-0 ${
            isLoadingValidation
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
              : isOverallValid
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : hasWarning
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
          }`}
        >
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

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-[13px] sm:text-[14px] font-bold font-[var(--font-label)] uppercase tracking-wide text-[var(--color-primary)]">
              Audit & Validasi Invoice {billingData.fdInvNo}
            </h3>
            <StatusBadge
              status={isLunas ? 'COLLECTED' : isTerbit ? 'ISSUED' : 'DRAFT'}
              size="sm"
            />
          </div>
          <p className="text-[11px] text-[var(--color-secondary)] truncate mt-0.5">
            Customer: <strong className="text-[var(--color-primary)]">{displayCustName(customerName)}</strong>
            {billingData.fdCustCode && ` (${billingData.fdCustCode})`} · Tgl:{' '}
            {billingData.fdInvDate ? formatDate(billingData.fdInvDate) : '—'}
            {billingData.fdMarkingCode && ` · Marking: ${billingData.fdMarkingCode}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <BillingPrintButtons
          invNo={billingData.fdInvNo}
          size="sm"
        />

        {canUseVoice && isVoiceSupported && onToggleVoice && (
          <button
            type="button"
            onClick={onToggleVoice}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border",
              isVoiceListening
                ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
                : "bg-slate-500/10 border-slate-500/30 text-slate-500 hover:bg-slate-500/15"
            )}
            title={
              isVoiceListening
                ? (`${voiceTranscript || ''} ${voiceInterim || ''}`.trim()
                  ? `Mendengarkan: "${`${voiceTranscript || ''} ${voiceInterim || ''}`.trim()}" (menunggu jeda 1 detik sebelum dieksekusi...)`
                  : "Standby Suara Aktif (Jeda 1 detik setelah bicara): Siap menerima 'Buka [No Invoice]', 'Terbitkan', 'Tab 1-5', 'Refresh', 'Tutup'. Klik untuk jeda.")
                : "Klik untuk aktifkan standby suara"
            }
          >
            {isVoiceListening ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
            )}
            <Mic className={cn("w-3.5 h-3.5", isVoiceListening ? "text-emerald-500" : "text-slate-400")} />
            <span className="hidden sm:inline max-w-[140px] truncate text-[11px] font-medium">
              {isVoiceListening
                ? (`${voiceTranscript || ''} ${voiceInterim || ''}`.trim()
                  ? `🎙️ "${`${voiceTranscript || ''} ${voiceInterim || ''}`.trim()}"`
                  : 'Standby Suara')
                : 'Mikrofon Jeda'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
