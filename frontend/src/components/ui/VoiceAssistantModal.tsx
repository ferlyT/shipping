import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Mic,
  MicOff,
  Search,
  ShieldCheck,
  Send,
  X,
  ChevronRight,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Compass,
  Copy,
  Check,
  Play,
  Keyboard,
} from 'lucide-react'
import { useModalEscape } from '@/hooks/useModalEscape'
import { useVoiceRecognition } from '@/features/billing/hooks/useVoiceRecognition'
import {
  parseVoiceIntent,
  type VoiceIntent,
} from '@/features/billing/utils/voiceSearch.utils'
import { useVoiceAssistantStore } from '@/stores/voiceAssistantStore'
import { billingApi } from '@/features/billing/services/billing.service'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/stores/toastStore'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { VoiceVisualizerGraphic } from './VoiceVisualizerGraphic'

interface SearchResultBilling {
  fdInvNo: string
  fdInvDate?: string
  fdJumlah1?: number
  fdCurr1?: string | null
  fdListType?: number | null
  customer?: {
    fdCustName?: string | null
  } | null
  fdCustCode?: string | null
  fdMarkingCode?: string | null
  fdMarkingNo?: string | null
}

export function VoiceAssistantModal() {
  const navigate = useNavigate()
  const { isOpen, closeAssistant, context, displayMode } = useVoiceAssistantStore()

  useModalEscape(isOpen, closeAssistant)

  const [activeIntent, setActiveIntent] = useState<VoiceIntent | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResultBilling[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasExecutedAction, setHasExecutedAction] = useState(false)
  const [autoNavCountdown, setAutoNavCountdown] = useState<number | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [copiedFlag, setCopiedFlag] = useState(false)
  const [copiedIp, setCopiedIp] = useState(false)
  const [hardwareTest, setHardwareTest] = useState<{
    isRunning: boolean
    result?: {
      isAvailable: boolean
      deviceName: string
      peakVolume: number
      hasAudioSignal: boolean
      signalStrength?: 'GOOD' | 'WEAK' | 'NONE'
      error?: string
    }
  }>({ isRunning: false })

  const handleTestMic = async () => {
    setHardwareTest({ isRunning: true })
    stopListening()
    const res = await testHardwareMic()
    setHardwareTest({ isRunning: false, result: res })
  }

  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    isSupported,
    isListening,
    isStarting,
    isSoundDetected,
    micVolume,
    isInsecureOrigin,
    currentLang,
    setCurrentLang,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
    testHardwareMic,
  } = useVoiceRecognition({
    lang: 'id-ID',
    continuous: false,
    interimResults: true,
  })

  // Start listening saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setActiveIntent(null)
      setSearchResults([])
      setIsSearching(false)
      setHasExecutedAction(false)
      setAutoNavCountdown(null)
      setManualInput('')
      resetTranscript()

      if (isSupported) {
        const timer = setTimeout(() => {
          startListening()
        }, 150)
        return () => clearTimeout(timer)
      }
    } else {
      stopListening()
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
    }
  }, [isOpen, isSupported, startListening, stopListening, resetTranscript])

  // Parser intent saat ucapan berubah
  const currentSpeechText = (transcript || interimTranscript || '').trim()

  useEffect(() => {
    if (!currentSpeechText) {
      setActiveIntent(null)
      return
    }

    const intent = parseVoiceIntent(currentSpeechText)
    setActiveIntent(intent)
  }, [currentSpeechText])

  // Deteksi sinyal audio ucapan live (interim transcript atau getaran mic hardware aktif)
  const [lastSpeechTime, setLastSpeechTime] = useState<number>(0)
  const [isReceivingVoice, setIsReceivingVoice] = useState(false)

  useEffect(() => {
    if (interimTranscript || isSoundDetected || micVolume > 5) {
      setLastSpeechTime(Date.now())
      setIsReceivingVoice(true)
    } else if (transcript) {
      setLastSpeechTime(Date.now())
    }
  }, [interimTranscript, isSoundDetected, micVolume, transcript])

  useEffect(() => {
    if (!isListening) {
      setIsReceivingVoice(false)
      return
    }

    if (interimTranscript || isSoundDetected || micVolume > 5) {
      setIsReceivingVoice(true)
    } else {
      const diff = Date.now() - lastSpeechTime
      if (lastSpeechTime > 0 && diff < 850) {
        setIsReceivingVoice(true)
        const timer = setTimeout(() => setIsReceivingVoice(false), 850 - diff)
        return () => clearTimeout(timer)
      } else {
        setIsReceivingVoice(false)
      }
    }
  }, [isListening, interimTranscript, isSoundDetected, micVolume, lastSpeechTime])

  // Eksekutor Intent Terpusat
  const executeIntent = useCallback(
    (intent: VoiceIntent) => {
      if (!intent || intent.type === 'UNKNOWN') return

      setHasExecutedAction(true)
      stopListening()

      // 1. Intent: Cancel
      if (intent.type === 'CANCEL') {
        closeAssistant()
        return
      }

      // 2. Intent: Navigasi Halaman Global
      if (intent.type === 'NAVIGATE_PAGE' && intent.route) {
        navigate(intent.route)
        toast.success(`Membuka halaman ${intent.pageName || 'Tujuan'}`)
        closeAssistant()
        return
      }

      // 3. Intent: Tutup Summary Modal (jika di halaman validasi detail)
      if (intent.type === 'CLOSE_SUMMARY') {
        if (context?.onCloseSummary) {
          context.onCloseSummary()
          toast.info('Menutup dialog summary validasi')
        }
        closeAssistant()
        return
      }

      // 4. Intent: Validasi Bill & Audit
      if (intent.type === 'VALIDATE_BILL') {
        // A. Spesifik invoice target (misal: "Validasi bill GZS 010751" atau "Validasi Santoso")
        if (intent.targetMode === 'SPECIFIC' && intent.query) {
          executeSearch(intent.query)
          return
        }

        // B. Di halaman detail invoice aktif (context tersedia)
        if (context?.onOpenSummary) {
          context.onOpenSummary(intent.tab)
          const tabMsg = intent.tabLabel ? ` (${intent.tabLabel})` : ''
          toast.success(`Menjalankan Validasi Bill ${context.currentInvNo || ''}${tabMsg}`)
          closeAssistant()
          return
        }

        // C. Di halaman lain: navigasi ke Antrean Validasi Bill
        navigate(ROUTES.BILLING_VALIDATION_LIST)
        toast.success('Membuka Antrean Validasi Billing')
        closeAssistant()
        return
      }

      // 5. Intent: Refresh / Muat Ulang Validasi
      if (intent.type === 'REFRESH_VALIDATION') {
        if (context?.onRefreshValidation) {
          context.onRefreshValidation()
          toast.success(`Memuat ulang data validasi ${context.currentInvNo || ''}`)
        } else {
          toast.info('Memuat ulang validasi billing...')
          window.location.reload()
        }
        closeAssistant()
        return
      }

      // 6. Intent: Open Summary / Tab Summary
      if (intent.type === 'OPEN_SUMMARY') {
        if (context?.onOpenSummary) {
          context.onOpenSummary(intent.tab)
          const tabMsg = intent.tabLabel ? ` (${intent.tabLabel})` : ''
          toast.success(`Membuka Summary Validasi${tabMsg}`)
        } else {
          navigate(ROUTES.BILLING_VALIDATION_SUMMARY)
          toast.success('Membuka Rekapitulasi Validasi Billing')
        }
        closeAssistant()
        return
      }

      // 7. Intent: Issue Invoice
      if (intent.type === 'ISSUE_INVOICE' || intent.type === 'CONFIRM_ISSUE') {
        if (context?.onTriggerIssue) {
          if (context.isIssued) {
            toast.warning('Invoice ini sudah berstatus ISSUED (Diterbitkan)')
          } else {
            context.onTriggerIssue()
          }
        } else {
          toast.warning('Perintah terbitkan invoice hanya dapat digunakan saat membuka detail invoice')
        }
        closeAssistant()
        return
      }

      // 8. Intent: Search Invoice
      if (intent.type === 'SEARCH_INVOICE' && intent.query) {
        executeSearch(intent.query)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context, closeAssistant, navigate, stopListening]
  )

  // Tangani eksekusi otomatis saat final transcript selesai didengar
  useEffect(() => {
    if (!transcript || hasExecutedAction) return

    const intent = parseVoiceIntent(transcript)
    if (intent && intent.type !== 'UNKNOWN') {
      executeIntent(intent)
    }
  }, [transcript, hasExecutedAction, executeIntent])

  // Auto-execute jeda hening setelah ucapan valid dikenali
  useEffect(() => {
    if (!currentSpeechText || hasExecutedAction) return
    const intent = parseVoiceIntent(currentSpeechText)
    if (!intent || intent.type === 'UNKNOWN') return

    // SEMUA intent yang valid otomatis dieksekusi setelah jeda hening 900ms
    const timer = setTimeout(() => {
      if (!hasExecutedAction) {
        executeIntent(intent)
      }
    }, 900)
    return () => clearTimeout(timer)
  }, [currentSpeechText, hasExecutedAction, executeIntent])

  // Fungsi pencarian invoice ke backend API
  const executeSearch = async (queryStr: string) => {
    setIsSearching(true)
    setSearchResults([])

    try {
      const res = await billingApi.list({
        hasAmount: 'true',
        draftOnly: 'true',
        noPagination: 'true',
        minYear: '2023',
        search: queryStr,
      })

      const list: SearchResultBilling[] = res.data?.data || []
      setSearchResults(list)

      // Jika hanya ada 1 invoice yang cocok
      if (list.length === 1) {
        const target = list[0]
        if (target.fdInvNo === context?.currentInvNo) {
          toast.info(`Invoice ${target.fdInvNo} sedang dibuka saat ini`)
        } else {
          setAutoNavCountdown(1)
          countdownTimerRef.current = setTimeout(() => {
            navigate(ROUTES.BILLING_VALIDATION_DETAIL(target.fdInvNo))
            toast.success(`Membuka Invoice ${target.fdInvNo}`)
            closeAssistant()
          }, 800)
        }
      }
    } catch {
      toast.error('Gagal mencari invoice')
    } finally {
      setIsSearching(false)
    }
  }

  // Handle pilih invoice manual dari list hasil
  const handleSelectInvoiceResult = (invNo: string) => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
    if (invNo === context?.currentInvNo) {
      toast.info(`Invoice ${invNo} sedang dibuka saat ini`)
    } else {
      navigate(ROUTES.BILLING_VALIDATION_DETAIL(invNo))
      toast.success(`Membuka Invoice ${invNo}`)
    }
    closeAssistant()
  }

  // Handle ulangi mendengarkan
  const handleRetryListening = () => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
    setAutoNavCountdown(null)
    setSearchResults([])
    setActiveIntent(null)
    setHasExecutedAction(false)
    resetTranscript()
    startListening()
  }

  // Handle tap tombol mikrofon: jika sedang aktif dan ada intent yang dikenali, langsung eksekusi!
  const handleMicToggle = () => {
    if (isListening) {
      if (activeIntent && activeIntent.type !== 'UNKNOWN') {
        executeIntent(activeIntent)
        return
      }
      stopListening()
    } else {
      handleRetryListening()
    }
  }

  // Handle submit perintah teks manual
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanText = manualInput.trim()
    if (!cleanText) return

    const intent = parseVoiceIntent(cleanText)
    if (intent && intent.type !== 'UNKNOWN') {
      executeIntent(intent)
    } else {
      executeIntent({
        type: 'SEARCH_INVOICE',
        query: cleanText,
        rawTranscript: cleanText,
      })
    }
    setManualInput('')
  }

  // Copy helper
  const copyFlagUrl = () => {
    navigator.clipboard.writeText('chrome://flags/#unsafely-treat-insecure-origin-as-secure')
    setCopiedFlag(true)
    toast.success('URL Chrome Flags disalin ke clipboard!')
    setTimeout(() => setCopiedFlag(false), 2500)
  }

  const copyIpUrl = () => {
    navigator.clipboard.writeText('http://36.93.22.142')
    setCopiedIp(true)
    toast.success('Alamat IP disalin ke clipboard!')
    setTimeout(() => setCopiedIp(false), 2500)
  }

  if (!isOpen || displayMode === 'hud') return null

  // Warna aksen badge intent
  const getIntentBadge = (intent: VoiceIntent | null) => {
    if (!intent) return null
    switch (intent.type) {
      case 'NAVIGATE_PAGE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <Compass className="w-3.5 h-3.5" />
            <span>Buka Halaman: <strong>{intent.pageName}</strong></span>
          </span>
        )
      case 'SEARCH_INVOICE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
            <Search className="w-3.5 h-3.5" />
            <span>Cari Invoice: <strong>{intent.query}</strong></span>
          </span>
        )
      case 'OPEN_SUMMARY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Buka Summary: <strong>{intent.tabLabel || 'Semua'}</strong></span>
          </span>
        )
      case 'CLOSE_SUMMARY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            <X className="w-3.5 h-3.5" />
            <span>Tutup Summary</span>
          </span>
        )
      case 'VALIDATE_BILL':
        if (intent.targetMode === 'SPECIFIC' && intent.query) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Validasi Invoice: <strong>{intent.query}</strong></span>
            </span>
          )
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              Validasi Bill: <strong>{intent.tabLabel || (context?.currentInvNo ? context.currentInvNo : 'Antrean Validasi')}</strong>
            </span>
          </span>
        )
      case 'REFRESH_VALIDATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Muat Ulang Validasi: <strong>{context?.currentInvNo || 'Aktif'}</strong></span>
          </span>
        )
      case 'ISSUE_INVOICE':
      case 'CONFIRM_ISSUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Send className="w-3.5 h-3.5" />
            <span>
              Terbitkan Invoice: <strong>{context?.currentInvNo || 'Aktif'}</strong>
              {context?.underchargedCount && context.underchargedCount > 0 ? ` (⚠️ ${context.underchargedCount} undercharge)` : ''}
            </span>
          </span>
        )
      default:
        return null
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn font-[var(--font-body)]">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={closeAssistant} />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 z-10 animate-scaleUp overflow-hidden max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)]/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-display)] flex items-center gap-1.5">
                <span>Global Voice Assistant</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                  Semua Halaman
                </span>
              </h3>
              <p className="text-[11px] text-[var(--color-secondary)]">
                Navigasi modul, cari invoice, atau kelola validasi hands-free
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAssistant}
            className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fallback Jika Browser Tidak Mendukung Web Speech API */}
        {!isSupported ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Browser Tidak Mendukung Pengenalan Suara</span>
            </div>
            <p className="text-[11.5px] leading-relaxed">
              Fitur input suara membutuhkan Web Speech API bawaan. Harap gunakan <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, atau browser Chromium terkini.
            </p>
          </div>
        ) : (
          <>
            {/* Visualizer Area Mikrofon */}
            <div className="flex flex-col items-center justify-center py-2 sm:py-3 space-y-3">
              <div className="relative flex items-center justify-center py-2">
                {isListening && (
                  <>
                    {/* Ring Luar 3: Ripple Sonar Lebar */}
                    <span
                      className={cn(
                        'absolute rounded-full transition-all duration-300 opacity-60',
                        isReceivingVoice
                          ? 'w-36 h-36 bg-emerald-500/25 animate-ping'
                          : 'w-26 h-26 bg-sky-500/15 animate-ping'
                      )}
                    />
                    {/* Ring Luar 2: Denyut Gelombang Suara */}
                    <span
                      className={cn(
                        'absolute rounded-full transition-all duration-300',
                        isReceivingVoice
                          ? 'w-28 h-28 bg-emerald-500/30 animate-pulse'
                          : 'w-22 h-22 bg-sky-500/25 animate-pulse'
                      )}
                    />
                    {/* Ring Luar 1: Aura Neon */}
                    <span
                      className={cn(
                        'absolute rounded-full transition-all duration-300',
                        isReceivingVoice
                          ? 'w-22 h-22 bg-cyan-400/30 blur-xs'
                          : 'w-18 h-18 bg-sky-400/20 blur-xs'
                      )}
                    />
                  </>
                )}

                <button
                  type="button"
                  onClick={handleMicToggle}
                  className={cn(
                    'relative w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg border-2 z-10 touch-manipulation select-none active:scale-95',
                    isStarting
                      ? 'bg-sky-600 text-white border-sky-400 shadow-sky-500/40 animate-pulse'
                      : isListening
                      ? isReceivingVoice
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white border-emerald-300 shadow-emerald-500/50 scale-105 ring-4 ring-emerald-400/30 animate-pulse'
                        : 'bg-rose-600 text-white border-rose-400 shadow-rose-500/30 hover:scale-105'
                      : 'bg-sky-600 text-white border-sky-400 shadow-sky-500/30 hover:scale-105'
                  )}
                  title={isListening ? 'Klik untuk memproses / berhenti merekam' : 'Klik untuk mulai merekam suara'}
                >
                  {isStarting ? (
                    <Loader2 className="w-7 h-7 animate-spin stroke-[2.5]" />
                  ) : isListening ? (
                    <Mic className="w-7 h-7 animate-pulse stroke-[2.5]" />
                  ) : (
                    <MicOff className="w-7 h-7 stroke-[2]" />
                  )}
                </button>
              </div>

              {/* Komponen Grafis Spektrum & Gelombang Audio Reaktif */}
              <VoiceVisualizerGraphic
                isListening={isListening || isStarting}
                isReceivingVoice={isReceivingVoice}
                className="my-1"
              />

              {/* Real-time Hardware Mic VU Meter */}
              <div className="w-full flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full transition-all',
                      micVolume > 5
                        ? 'bg-emerald-500 animate-ping'
                        : isListening
                        ? 'bg-amber-400'
                        : 'bg-slate-400/50'
                    )}
                  />
                  <span className="text-[11px] font-semibold text-[var(--color-secondary)]">
                    Sinyal Suara Mic:
                  </span>
                </div>

                <div className="flex-1 max-w-[140px] sm:max-w-[180px] h-2 rounded-full bg-[var(--color-neutral)] overflow-hidden relative border border-[var(--color-border)]/50">
                  <div
                    className={cn(
                      'h-full transition-all duration-75 rounded-full',
                      micVolume > 60
                        ? 'bg-rose-500'
                        : micVolume > 20
                        ? 'bg-emerald-500'
                        : micVolume > 4
                        ? 'bg-sky-500'
                        : 'bg-slate-400/30'
                    )}
                    style={{ width: `${Math.max(2, micVolume)}%` }}
                  />
                </div>

                <span className="text-[10.5px] font-mono font-bold text-[var(--color-primary)] w-8 text-right">
                  {micVolume}%
                </span>
              </div>

              {/* Status Listening Teks */}
              <div className="text-center space-y-1 w-full">
                {isListening && micVolume === 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400/90 font-medium">
                    💡 Meteran suara 0%. Jika sedang bicara tapi bar tidak bergerak, cek apakah mic di Windows/HP dalam keadaan MUTE atau pilihlah perangkat input mic yang aktif di Chrome.
                  </p>
                )}
                <p className="text-xs font-bold text-[var(--color-primary)]">
                  {isStarting ? (
                    <span className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Menghubungkan mikrofon hardware...
                    </span>
                  ) : isListening ? (
                    isReceivingVoice ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Mendengar ucapan Anda secara langsung...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Mendengarkan... Silakan bicara
                      </span>
                    )
                  ) : isSearching ? (
                    <span className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mencari data invoice...
                    </span>
                  ) : (
                    <span className="text-[var(--color-secondary)]">
                      Mikrofon siaga. Tap tombol mic atau ketik perintah di bawah.
                    </span>
                  )}
                </p>

                {/* Error Panel Terperinci */}
                {isInsecureOrigin && !speechError && !isListening && (
                  <p className="text-[10.5px] text-amber-600 dark:text-amber-400/90 font-medium">
                    ⚡ Akses via HTTP ({window.location.hostname}). Jika mic tidak merespons, aktifkan izin via flags Chrome.
                  </p>
                )}

                {speechError && (
                  <div className="space-y-1.5 mt-2">
                    {speechError === 'not-allowed' || (isInsecureOrigin && speechError) ? (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs text-left space-y-2">
                        <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                          <span>Penyebab Suara Tidak Masuk: Mikrofon Diblokir Browser</span>
                        </div>
                        <p className="text-[11.5px] leading-relaxed">
                          Chrome memblokir mikrofon karena alamat menggunakan <strong>HTTP</strong> (bukan HTTPS). Buka kunci mikrofon dengan langkah berikut:
                        </p>
                        
                        <div className="space-y-2 bg-[var(--color-surface)]/70 p-2.5 rounded-lg border border-amber-500/20 text-[11px]">
                          <div>
                            <strong>Langkah 1:</strong> Buka tab baru di Chrome, salin dan buka URL flags:
                            <div className="flex items-center gap-1 mt-1">
                              <code className="flex-1 px-2 py-1 bg-black/10 dark:bg-white/10 rounded font-mono text-[10px] break-all select-all">
                                chrome://flags/#unsafely-treat-insecure-origin-as-secure
                              </code>
                              <button
                                type="button"
                                onClick={copyFlagUrl}
                                className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center gap-1 text-[10px] font-semibold cursor-pointer shrink-0"
                              >
                                {copiedFlag ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedFlag ? 'Tersalin' : 'Salin URL'}</span>
                              </button>
                            </div>
                          </div>

                          <div>
                            <strong>Langkah 2:</strong> Masukkan alamat server ERP ini pada kotak isian flags:
                            <div className="flex items-center gap-1 mt-1">
                              <code className="flex-1 px-2 py-1 bg-black/10 dark:bg-white/10 rounded font-mono text-[10.5px]">
                                http://36.93.22.142
                              </code>
                              <button
                                type="button"
                                onClick={copyIpUrl}
                                className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center gap-1 text-[10px] font-semibold cursor-pointer shrink-0"
                              >
                                {copiedIp ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedIp ? 'Tersalin' : 'Salin IP'}</span>
                              </button>
                            </div>
                          </div>

                          <p>
                            <strong>Langkah 3:</strong> Ubah dropdown dari <em>Disabled</em> menjadi <strong>Enabled</strong>, lalu tap tombol <strong>Relaunch</strong> di pojok kanan bawah Chrome.
                          </p>
                          <p>
                            <strong>Langkah 4:</strong> Masuk kembali ke aplikasi & saat muncul pop-up izin mikrofon, pilih <strong>Izinkan (Allow)</strong>.
                          </p>
                        </div>
                      </div>
                    ) : speechError === 'no-speech' ? (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs text-left space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Tidak Ada Suara Terdeteksi</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Mikrofon tidak menangkap getaran suara. Dekatkan mikrofon HP, pastikan volume mic tidak mati, atau gunakan kolom ketik perintah di bawah.
                        </p>
                      </div>
                    ) : speechError === 'network' ? (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs text-left space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Gangguan Jaringan Google Speech</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Chrome membutuhkan koneksi internet stabil untuk mengirim audio ke server pengenal suara Google. Periksa koneksi data/Wi-Fi Anda.
                        </p>
                      </div>
                    ) : speechError === 'audio-capture' ? (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs text-left space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Hardware Mikrofon Tidak Tersedia</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Mikrofon mungkin sedang dipakai aplikasi lain (telepon/WhatsApp) atau tidak terdeteksi oleh sistem.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                        Error Speech Recognition: {speechError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Tombol & Hasil Diagnostik Hardware Mikrofon */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-[11px] text-[var(--color-secondary)]">Uji responsif mikrofon browser:</span>
                  <button
                    type="button"
                    onClick={handleTestMic}
                    disabled={hardwareTest.isRunning}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    {hardwareTest.isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '🔍 Test Sinyal Mic'}
                  </button>
                </div>

                {hardwareTest.result && (
                  <div className={cn(
                    "p-2.5 rounded-xl border text-[11.5px] flex items-center justify-between gap-2 animate-fadeIn",
                    hardwareTest.result.signalStrength === 'GOOD'
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                      : hardwareTest.result.signalStrength === 'WEAK'
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                  )}>
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-base shrink-0 mt-0.5">
                        {hardwareTest.result.signalStrength === 'GOOD'
                          ? '✅'
                          : hardwareTest.result.signalStrength === 'WEAK'
                          ? '⚠️'
                          : '❌'}
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-bold truncate">
                          {hardwareTest.result.deviceName} — Peak Volume: {hardwareTest.result.peakVolume}%
                        </p>
                        <p className="text-[10.5px] leading-tight">
                          {hardwareTest.result.signalStrength === 'GOOD'
                            ? 'Sinyal audio sangat baik dan optimal untuk diproses suara!'
                            : hardwareTest.result.signalStrength === 'WEAK'
                            ? 'Volume suara terlalu kecil (hanya ' + hardwareTest.result.peakVolume + '%). Google Speech API menganggapnya noise/hening! Buka Windows Settings > System > Sound > Microphone Properties (Levels) dan naikkan volume ke 90-100%.'
                            : 'Volume suara 0%! Periksa Windows Volume Mixer atau pastikan mic tidak dalam keadaan mute hardware.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHardwareTest({ isRunning: false })}
                      className="p-1 opacity-70 hover:opacity-100 cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Live Transcript & Intent Action Box */}
              <div className="w-full min-h-[58px] p-3 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] flex flex-col items-center justify-center text-center space-y-2">
                {currentSpeechText ? (
                  <div className="space-y-1.5 w-full">
                    <p className="text-sm font-semibold text-[var(--color-primary)] font-mono">
                      "{currentSpeechText}"
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {getIntentBadge(activeIntent)}
                      {activeIntent && activeIntent.type !== 'UNKNOWN' && (
                        <button
                          type="button"
                          onClick={() => executeIntent(activeIntent)}
                          className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs cursor-pointer transition-all active:scale-95"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Jalankan Sekarang</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-secondary)] italic">
                    "Contoh: Buka dashboard / Validasi bill ini / Cari GZS 010751 / Buka kasir"
                  </p>
                )}
              </div>

              {/* Input Manual Fallback (Ketik Perintah Jika Mic Bermasalah) */}
              <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5 w-full">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[var(--color-secondary)]">
                    <Keyboard className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Atau ketik perintah: misal 'Validasi bill 010751'..."
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] placeholder-[var(--color-secondary)]/60 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1 shrink-0 shadow-2xs active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kirim</span>
                </button>
              </form>
            </div>

            {/* Hasil Pencarian Invoice (Jika Intent SEARCH_INVOICE) */}
            {isSearching && (
              <div className="flex items-center justify-center py-4 text-xs text-[var(--color-secondary)] gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                <span>Mencari invoice yang sesuai...</span>
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-2 border-t border-[var(--color-border)]/60 pt-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-secondary)]">
                  <span>Ditemukan {searchResults.length} invoice cocok:</span>
                  {autoNavCountdown !== null && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                      Membuka otomatis dalam {autoNavCountdown}s...
                    </span>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {searchResults.map((inv) => {
                    const isCurrent = inv.fdInvNo === context?.currentInvNo
                    return (
                      <div
                        key={inv.fdInvNo}
                        onClick={() => handleSelectInvoiceResult(inv.fdInvNo)}
                        className={cn(
                          'p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all',
                          isCurrent
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-sky-500 hover:bg-sky-500/5'
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-[var(--color-primary)]">
                              {inv.fdInvNo}
                            </span>
                            {isCurrent && (
                              <Badge variant="success" className="text-[9px] px-1.5 py-0">
                                Sedang Dibuka
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--color-secondary)] truncate">
                            {inv.customer?.fdCustName || inv.fdCustCode || '—'}
                            {inv.fdMarkingCode && ` • ${inv.fdMarkingCode}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {inv.fdJumlah1 !== undefined && (
                            <span className="font-mono font-bold text-[var(--color-primary)]">
                              <CurrencyValue value={inv.fdJumlah1} currency={inv.fdCurr1 || 'IDR'} />
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-[var(--color-secondary)]" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!isSearching &&
              activeIntent?.type === 'SEARCH_INVOICE' &&
              searchResults.length === 0 &&
              transcript && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs text-center space-y-1">
                  <p className="font-semibold">
                    Tidak ada invoice draft yang cocok dengan "{activeIntent.query}"
                  </p>
                  <p className="text-[11px] text-[var(--color-secondary)]">
                    Silakan ucapkan nomor lain atau sebutkan nama halaman untuk navigasi.
                  </p>
                </div>
              )}

            {/* Quick Action Pills & Hints */}
            <div className="space-y-1.5 border-t border-[var(--color-border)]/60 pt-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
                {context?.currentInvNo ? `Perintah Suara Validasi (${context.currentInvNo}):` : 'Perintah Cepat yang Didukung:'}
              </span>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {context?.currentInvNo ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (context.onOpenSummary) context.onOpenSummary()
                        toast.success(`Membuka Kesimpulan Validasi ${context.currentInvNo}`)
                        closeAssistant()
                      }}
                      className="px-2 py-0.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer font-semibold"
                    >
                      🛡️ "Validasi Bill Ini"
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (context.onOpenSummary) context.onOpenSummary('m3_weight')
                        toast.success('Membuka Audit Fisik M³')
                        closeAssistant()
                      }}
                      className="px-2 py-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-sky-500/50 transition-colors cursor-pointer"
                    >
                      📏 "Audit Fisik"
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (context.onOpenSummary) context.onOpenSummary('items')
                        toast.success('Membuka Audit Tarif & Item')
                        closeAssistant()
                      }}
                      className="px-2 py-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-sky-500/50 transition-colors cursor-pointer"
                    >
                      🏷️ "Audit Tarif"
                    </button>
                    {context.onRefreshValidation && (
                      <button
                        type="button"
                        onClick={() => {
                          context.onRefreshValidation!()
                          toast.success('Memuat ulang data validasi...')
                          closeAssistant()
                        }}
                        className="px-2 py-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-sky-500/50 transition-colors cursor-pointer"
                      >
                        🔄 "Refresh Validasi"
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(ROUTES.BILLING_VALIDATION_LIST)
                        toast.success('Membuka Antrean Validasi Bill')
                        closeAssistant()
                      }}
                      className="px-2 py-0.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer font-semibold"
                    >
                      🛡️ "Validasi Bill"
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(ROUTES.DASHBOARD)
                        toast.success('Membuka Dashboard')
                        closeAssistant()
                      }}
                      className="px-2 py-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-sky-500/50 transition-colors cursor-pointer"
                    >
                      📊 "Dashboard"
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(ROUTES.DELIVERY_ORDERS_MONITORING)
                        toast.success('Membuka Monitoring Surat Jalan')
                        closeAssistant()
                      }}
                      className="px-2 py-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-sky-500/50 transition-colors cursor-pointer"
                    >
                      🚚 "Monitoring SJ"
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(ROUTES.CASHIER)
                        toast.success('Membuka Kasir')
                        closeAssistant()
                      }}
                      className="px-2 py-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-sky-500/50 transition-colors cursor-pointer"
                    >
                      💰 "Kasir"
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate(ROUTES.SHIPMENT_BATCHES)
                        toast.success('Membuka Kontainer')
                        closeAssistant()
                      }}
                      className="px-2 py-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-sky-500/50 transition-colors cursor-pointer"
                    >
                      📦 "Kontainer"
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]/60 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--color-secondary)] hidden sm:inline">
              Bahasa:
            </span>
            <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setCurrentLang('id-ID')
                  if (isListening) startListening('id-ID')
                }}
                className={cn(
                  'px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer',
                  currentLang === 'id-ID'
                    ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                🇮🇩 ID
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentLang('en-US')
                  if (isListening) startListening('en-US')
                }}
                className={cn(
                  'px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer',
                  currentLang === 'en-US'
                    ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                🇬🇧 EN
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRetryListening}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-primary)] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Mulai Ulang Mic</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
