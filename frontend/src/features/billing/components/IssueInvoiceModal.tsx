import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { billingApi } from '../services/billing.service'
import {
  formatCurrency,
  formatDate,
  copyToClipboard,
  displayCustName,
  getInitials,
  cn,
} from '@/lib/utils'
import {
  Send,
  AlertCircle,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Mic,
  MicOff,
  Copy,
  UserCheck,
  Lock,
  Calendar,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition'
import { useVoiceAssistantStore } from '@/stores/voiceAssistantStore'

export interface UnderchargedItemInfo {
  itemName: string
  billedPrice: number
  targetPrice: number
  difference: number
  priceSource?: string
  priceListDisplay?: string
}

interface IssueInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invNo: string
  custName?: string
  custCode?: string
  invDate?: string | Date
  totalAmount?: number
  currency?: string
  onSuccess?: () => void
  underchargedItems?: UnderchargedItemInfo[]
}

interface EmployeeItem {
  fdEmpCode: string
  fdEmpName: string
}

export function IssueInvoiceModal({
  isOpen,
  onClose,
  invNo,
  custName,
  custCode,
  invDate,
  totalAmount,
  currency,
  onSuccess,
  underchargedItems,
}: IssueInvoiceModalProps) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { suppressVoice, isMuted, toggleVoiceMute } = useVoiceAssistantStore()

  const [employees, setEmployees] = useState<EmployeeItem[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [selectedEmpId, setSelectedEmpId] = useState<string>('')
  const [isOverrideEmp, setIsOverrideEmp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasConfirmedUndercharge, setHasConfirmedUndercharge] = useState(false)
  const [isCopiedInv, setIsCopiedInv] = useState(false)

  const hasUndercharge = Boolean(underchargedItems && underchargedItems.length > 0)

  // Supresi asisten suara global selama modal konfirmasi terbuka
  useEffect(() => {
    if (!isOpen) return
    const unsuppress = suppressVoice()
    return () => {
      unsuppress()
    }
  }, [isOpen, suppressVoice])

  const isOpenRef = useRef(isOpen)
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  const isManuallyStoppedRef = useRef(false)
  const isProcessingRef = useRef(false)
  const hasConfirmedUnderchargeRef = useRef(false)
  const rearmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition({
    lang: 'id-ID',
    continuous: false,
    interimResults: true,
    onEnd: () => {
      // Auto re-arm standby jika modal konfirmasi masih terbuka, tidak distop manual, dan TIDAK MUTED TERPUSAT
      if (isOpenRef.current && !isManuallyStoppedRef.current && !useVoiceAssistantStore.getState().isMuted) {
        if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
        rearmTimerRef.current = setTimeout(() => {
          if (isOpenRef.current && !isManuallyStoppedRef.current && !useVoiceAssistantStore.getState().isMuted) {
            startListening()
          }
        }, 200)
      }
    },
  })

  // Standby otomatis mendengarkan seketika saat modal konfirmasi dibuka HANYA JIKA !isMuted
  useEffect(() => {
    if (isOpen && isSupported && !isMuted) {
      isManuallyStoppedRef.current = false
      const timer = setTimeout(() => {
        if (isOpenRef.current && !isManuallyStoppedRef.current && !useVoiceAssistantStore.getState().isMuted) {
          startListening()
        }
      }, 150)
      return () => {
        clearTimeout(timer)
        if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      }
    } else {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopListening()
      resetTranscript()
    }
  }, [isOpen, isSupported, isMuted, startListening, stopListening, resetTranscript])

  // KONTROL TERPUSAT: Bereaksi seketika terhadap perubahan isMuted (dari Floating HUD atau Alt+V) saat modal konfirmasi terbuka
  useEffect(() => {
    if (!isOpen) return
    if (isMuted) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopListening()
      resetTranscript()
    } else if (isSupported && isOpenRef.current) {
      isManuallyStoppedRef.current = false
      startListening()
    }
  }, [isMuted, isOpen, isSupported, startListening, stopListening, resetTranscript])

  // Shortcut Alt+V di dalam modal konfirmasi untuk toggle mic terpusat
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAltV = e.altKey && (e.key?.toLowerCase() === 'v' || e.code === 'KeyV')
      if (isAltV) {
        e.preventDefault()
        e.stopPropagation()
        toggleVoiceMute() // Sinkronkan ke Master Control terpusat!
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, toggleVoiceMute])

  // Sinkronisasi hasConfirmedUnderchargeRef agar selalu mutakhir tanpa stale closure
  useEffect(() => {
    hasConfirmedUnderchargeRef.current = hasConfirmedUndercharge
  }, [hasConfirmedUndercharge])

  // Default ke fdEmpCode dari user yang sedang login & reset warning state
  useEffect(() => {
    if (isOpen) {
      setHasConfirmedUndercharge(false)
      hasConfirmedUnderchargeRef.current = false
      isProcessingRef.current = false
      setIsCopiedInv(false)
      if (user?.fdEmpCode) {
        setSelectedEmpId(user.fdEmpCode.trim())
        setIsOverrideEmp(false)
      } else {
        setSelectedEmpId('')
        setIsOverrideEmp(true)
      }
    } else {
      isProcessingRef.current = false
    }
  }, [isOpen, user?.fdEmpCode])

  // Fetch daftar karyawan saat modal dibuka atau saat override aktif
  useEffect(() => {
    if (isOpen && (isOverrideEmp || !user?.fdEmpCode) && employees.length === 0) {
      setIsLoadingEmployees(true)
      billingApi
        .getEmployees()
        .then((res) => {
          setEmployees(res.data.data || [])
        })
        .catch(() => {
          toast.error('Gagal memuat daftar master karyawan')
        })
        .finally(() => {
          setIsLoadingEmployees(false)
        })
    }
  }, [isOpen, isOverrideEmp, user?.fdEmpCode, employees.length])

  // Close modal on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isSubmitting, onClose])

  const handleCopyInvoice = async () => {
    if (!invNo) return
    const ok = await copyToClipboard(invNo)
    if (ok) {
      setIsCopiedInv(true)
      toast.success(`Nomor invoice ${invNo} disalin`)
      setTimeout(() => setIsCopiedInv(false), 2000)
    }
  }

  const handleIssue = useCallback(
    async (bypassUnderchargeCheck = false) => {
      if (isProcessingRef.current || isSubmitting) return

      const finalEmpId = (isOverrideEmp || !user?.fdEmpCode ? selectedEmpId : user?.fdEmpCode)?.trim()

      if (!finalEmpId) {
        toast.error('Silakan pilih karyawan penyerah invoice')
        isManuallyStoppedRef.current = false
        if (isOpenRef.current) startListening()
        return
      }

      if (
        underchargedItems &&
        underchargedItems.length > 0 &&
        !hasConfirmedUnderchargeRef.current &&
        !bypassUnderchargeCheck
      ) {
        toast.warning(
          'Peringatan: Harap centang persetujuan peringatan undercharge terlebih dahulu sebelum menerbitkan!'
        )
        return
      }

      isProcessingRef.current = true
      setIsSubmitting(true)
      try {
        const res = await billingApi.issueInvoice(invNo, { fdEmpId: finalEmpId })
        const data = res.data.data
        toast.success(data?.message || `Invoice ${invNo} berhasil diterbitkan (Issued)!`)

        // Invalidate react-query caches
        queryClient.invalidateQueries({ queryKey: ['billingDetail'] })
        queryClient.invalidateQueries({ queryKey: ['billingList'] })
        queryClient.invalidateQueries({ queryKey: ['billingValidationList'] })
        queryClient.invalidateQueries({ queryKey: ['billingM3Check'] })
        queryClient.invalidateQueries({ queryKey: ['m3-check'] })

        onSuccess?.()
        onClose()
      } catch (err: any) {
        const errorMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Gagal menerbitkan invoice'
        toast.error(errorMsg)
        // Re-arm standby suara jika modal tetap terbuka
        isManuallyStoppedRef.current = false
        if (isOpenRef.current) {
          startListening()
        }
      } finally {
        setIsSubmitting(false)
        isProcessingRef.current = false
      }
    },
    [
      invNo,
      isOverrideEmp,
      isSubmitting,
      onClose,
      onSuccess,
      queryClient,
      selectedEmpId,
      startListening,
      underchargedItems,
      user?.fdEmpCode,
    ]
  )

  // Keyboard shortcut Enter untuk konfirmasi cepat
  useEffect(() => {
    if (!isOpen || isSubmitting) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement
        if (
          target &&
          (target.tagName === 'SELECT' || target.tagName === 'INPUT' || target.tagName === 'BUTTON')
        ) {
          return
        }
        e.preventDefault()
        handleIssue(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, handleIssue])

  // Voice confirmation trigger: "Ya", "Ok", "Terbitkan", "Setuju", "Konfirmasi" atau "Batal", "Cancel", "Tutup"
  useEffect(() => {
    if (!isOpen || isSubmitting || isProcessingRef.current) return
    const text = (transcript || interimTranscript || '').toLowerCase().trim()
    if (!text) return

    // 1. Perintah Batal / Cancel / Tutup Modal Konfirmasi
    if (
      /\b(batal|batalkan|cancel|tutup|tutup\s+modal|kembali|keluar|tidak|enggak|nggak|jangan)\b/i.test(
        text
      )
    ) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopListening()
      resetTranscript()
      onClose()
      return
    }

    // 2. Perintah Terbitkan / Konfirmasi ("ya", "ok", "oke", "terbitkan", "setuju", "konfirmasi", dll)
    if (
      /\b(ya|iya|yup|ok|oke|okay|yes|terbitkan|terbitkan\s+invoice|terbitkan\s+bill|setuju|konfirmasi|lanjut|lanjutkan|proses|siap|sip|acc|confirm)\b/i.test(
        text
      )
    ) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopListening()
      resetTranscript()
      if (underchargedItems && underchargedItems.length > 0) {
        setHasConfirmedUndercharge(true)
        hasConfirmedUnderchargeRef.current = true
      }
      handleIssue(true)
      return
    }
  }, [
    transcript,
    interimTranscript,
    isOpen,
    isSubmitting,
    underchargedItems,
    onClose,
    stopListening,
    resetTranscript,
    handleIssue,
  ])

  const userHasMapping = Boolean(user?.fdEmpCode)
  const customerDisplayName = displayCustName(custName || custCode || '—')
  const customerInitials = getInitials(customerDisplayName)

  if (!isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-invoice-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn font-[var(--font-body)]"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden animate-slideUp flex flex-col max-h-[92vh] transition-all',
          hasUndercharge && 'border-amber-500/40 dark:border-amber-500/30'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div
          className={cn(
            'h-1.5 w-full bg-gradient-to-r shrink-0',
            hasUndercharge
              ? 'from-amber-500 via-rose-500 to-amber-500'
              : 'from-emerald-500 via-teal-400 to-emerald-500'
          )}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs',
                hasUndercharge
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              )}
            >
              {hasUndercharge ? (
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <Send className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  id="issue-invoice-modal-title"
                  className="text-[15px] sm:text-[16px] font-bold font-[var(--font-label)] uppercase tracking-wide text-[var(--color-primary)] truncate"
                >
                  Penerbitan Invoice Resmi
                </h3>
                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  DRAFT &rarr; ISSUED
                </span>
              </div>
              <p className="text-[11.5px] text-[var(--color-secondary)] truncate mt-0.5">
                Konfirmasi legalitas dan pencatatan staf penyerah invoice
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup dialog"
            className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto min-h-0 flex-1 text-xs">
          {/* 1. Executive Summary Card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs overflow-hidden">
            {/* Top Identity Row */}
            <div className="px-4 py-3 bg-[var(--color-neutral)]/30 border-b border-[var(--color-border)] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)]">
                  No. Faktur
                </span>
                <span className="font-mono font-bold text-sm sm:text-base text-[var(--color-primary)] tracking-tight">
                  {invNo}
                </span>
                <button
                  type="button"
                  onClick={handleCopyInvoice}
                  className="p-1 rounded-md text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer border border-[var(--color-border)]/50"
                  title="Salin Nomor Invoice"
                >
                  {isCopiedInv ? (
                    <Check size={12} className="text-emerald-500 stroke-[3]" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>

              {invDate && (
                <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-secondary)] font-mono">
                  <Calendar size={13} className="text-[var(--color-secondary)] shrink-0" />
                  <span>{formatDate(invDate)}</span>
                </div>
              )}
            </div>

            {/* Customer & Total Tagihan Grid */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
              {/* Customer Box */}
              <div className="sm:col-span-7 flex items-center gap-3 min-w-0 pr-1">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center shrink-0 font-bold text-xs text-blue-600 dark:text-blue-400 font-mono shadow-2xs">
                  {customerInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider">
                    Pelanggan
                  </div>
                  <div
                    className="font-bold text-[13px] sm:text-[14px] text-[var(--color-primary)] leading-snug line-clamp-2"
                    title={customerDisplayName}
                  >
                    {customerDisplayName}
                  </div>
                  {custCode && (
                    <span className="inline-block text-[10.5px] font-mono text-[var(--color-secondary)] mt-0.5">
                      Kode: <strong className="text-[var(--color-primary)]">{custCode}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Total Tagihan KPI Box */}
              <div className="sm:col-span-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col justify-between gap-1 shadow-2xs">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                  <span>Total Tagihan Resmi</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    Siap Ditagihkan
                  </span>
                </div>
                <div className="flex items-baseline justify-end gap-1.5 font-mono whitespace-nowrap mt-1">
                  {typeof totalAmount === 'number' && totalAmount >= 0 ? (
                    <>
                      <span className="text-xs sm:text-sm font-semibold text-emerald-600/80 dark:text-emerald-400/80">
                        {(() => {
                          const sym = (currency || 'Rp.').trim()
                          return sym.toUpperCase() === 'RP' || sym.toUpperCase() === 'RP.' ? 'Rp.' : sym
                        })()}
                      </span>
                      <span className="text-xl sm:text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {new Intl.NumberFormat('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(totalAmount)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-[var(--color-secondary)]">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Petugas Penyerah Invoice (tbBillingGiveEmp) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-primary)]">
              <span className="flex items-center gap-1.5">
                <UserCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Petugas Penyerah Invoice (fdEmpId)</span>
              </span>
              {userHasMapping && (
                <button
                  type="button"
                  onClick={() => setIsOverrideEmp(!isOverrideEmp)}
                  className="text-[11px] text-[var(--color-tertiary)] hover:underline font-medium cursor-pointer"
                >
                  {isOverrideEmp ? 'Gunakan Akun Saya' : 'Ganti Petugas...'}
                </button>
              )}
            </div>

            {!isOverrideEmp && userHasMapping ? (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-[var(--color-primary)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[var(--color-primary)]">{user?.fdEmpCode}</span>
                      <span className="text-[var(--color-primary)]">
                        {user?.fdEmpName || user?.fullName}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[var(--color-secondary)] truncate mt-0.5">
                      Penerbitan otomatis dicatat atas nama akun aktif Anda.
                    </p>
                  </div>
                </div>

                <Badge
                  variant="success"
                  className="text-[9.5px] font-semibold px-2 py-0.5 shrink-0 bg-transparent border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                >
                  Akun Anda
                </Badge>
              </div>
            ) : (
              <div className="space-y-2">
                {!userHasMapping && (
                  <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-[11px] flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span className="leading-relaxed">
                      Akun login Anda belum terhubung ke master karyawan. Silakan pilih petugas penyerah di bawah:
                    </span>
                  </div>
                )}

                <div className="relative">
                  <select
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    disabled={isLoadingEmployees || isSubmitting}
                    className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="">— Pilih Karyawan Penyerah —</option>
                    {employees.map((emp) => (
                      <option key={emp.fdEmpCode} value={emp.fdEmpCode}>
                        {emp.fdEmpCode} - {emp.fdEmpName}
                      </option>
                    ))}
                  </select>
                  {isLoadingEmployees && (
                    <div className="absolute right-3 top-2.5">
                      <Loader2 size={16} className="animate-spin text-[var(--color-secondary)]" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Undercharge Warning Panel (Financial Audit Compliance) */}
          {hasUndercharge && (
            <div className="p-3.5 sm:p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                  <AlertTriangle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>Peringatan Risiko: {underchargedItems?.length} Item di Bawah Tarif Acuan</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 uppercase">
                  Undercharge
                </span>
              </div>

              <p className="text-[11px] text-[var(--color-secondary)] leading-relaxed">
                Pemeriksaan sistem mendeteksi item berikut ditagih dengan tarif lebih rendah dari acuan resmi multi-tier:
              </p>

              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {underchargedItems?.map((u, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-rose-500/25 text-[11px] flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-[var(--color-primary)] truncate block">
                        {u.itemName}
                      </span>
                      <span className="text-[10px] text-[var(--color-secondary)]">
                        Ditagih:{' '}
                        <strong className="font-mono text-[var(--color-primary)]">
                          {formatCurrency(u.billedPrice)}
                        </strong>{' '}
                        vs Acuan:{' '}
                        <strong className="font-mono text-blue-600 dark:text-blue-400">
                          {u.priceListDisplay || formatCurrency(u.targetPrice)}
                        </strong>
                      </span>
                    </div>
                    <span className="text-[10.5px] font-mono font-bold text-rose-600 dark:text-rose-400 shrink-0">
                      Selisih -{formatCurrency(Math.abs(u.difference))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Checkbox Konfirmasi Risiko */}
              <label
                className={cn(
                  'flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none',
                  hasConfirmedUndercharge
                    ? 'bg-rose-500/15 border-rose-500/50 shadow-xs'
                    : 'bg-[var(--color-surface)] border-rose-500/30 hover:border-rose-500/50'
                )}
              >
                <input
                  type="checkbox"
                  checked={hasConfirmedUndercharge}
                  onChange={(e) => setHasConfirmedUndercharge(e.target.checked)}
                  className="mt-0.5 rounded border-rose-400 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-200 leading-snug">
                  Saya memahami dan menyetujui selisih tarif (undercharge) dan mengonfirmasi untuk tetap menerbitkan invoice ini.
                </span>
              </label>
            </div>
          )}

          {/* 4. Ketentuan SOP & Legalitas */}
          <div className="p-3 rounded-xl bg-[var(--color-neutral)]/40 border border-[var(--color-border)] text-[10.5px] text-[var(--color-secondary)] leading-relaxed flex items-start gap-2.5">
            <Lock size={14} className="shrink-0 mt-0.5 text-[var(--color-secondary)]" />
            <p>
              Status invoice akan dikunci permanen menjadi <strong className="text-[var(--color-primary)]">ISSUED (Terbit)</strong> pada database ERP. Riwayat penerbit disimpan ke log audit penagihan dan tidak dapat diubah kembali menjadi draft.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/40 shrink-0 flex-wrap">
          {/* Voice Standby Indicator Button */}
          {isSupported && (
            <button
              type="button"
              onClick={() => {
                toggleVoiceMute() // Sinkronkan ke Master Control terpusat!
              }}
              className={cn(
                'px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs',
                !isMuted && isListening
                  ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
              title={
                isMuted
                  ? 'Mikrofon dijeda terpusat. Klik atau tekan Alt+V untuk aktifkan'
                  : isListening
                  ? "Standby Suara Aktif: Katakan 'Ya' / 'Ok' / 'Terbitkan' atau 'Batal' / 'Cancel'. Klik untuk jeda (Alt+V)."
                  : 'Klik untuk aktifkan standby suara (Alt+V)'
              }
            >
              {!isMuted && isListening ? (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              ) : (
                <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
              )}
              {isMuted ? (
                <MicOff className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Mic
                  className={cn(
                    'w-3.5 h-3.5',
                    isListening ? 'text-emerald-500' : 'text-[var(--color-secondary)]'
                  )}
                />
              )}
              <span className="font-medium text-[11px] max-w-[150px] sm:max-w-[200px] truncate">
                {!isMuted && isListening
                  ? interimTranscript || transcript || 'Standby ("Ya" / "Batal")'
                  : 'Mikrofon Jeda'}
              </span>
            </button>
          )}

          {/* Action CTAs */}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-semibold"
            >
              Batal
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleIssue(false)}
              disabled={isSubmitting || (!selectedEmpId && (!userHasMapping || isOverrideEmp))}
              className={cn(
                'font-semibold flex items-center gap-2 shadow-sm transition-all text-xs px-3.5 py-1.5 rounded-lg active:scale-[0.98]',
                hasUndercharge
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Menerbitkan...</span>
                </>
              ) : (
                <>
                  <Send size={13} className="stroke-[2.5]" />
                  <span>Ya, Terbitkan Invoice</span>
                  <span className="hidden sm:inline-block text-[10px] opacity-75 ml-1 border-l border-white/30 pl-1.5 font-mono">
                    ↵
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
