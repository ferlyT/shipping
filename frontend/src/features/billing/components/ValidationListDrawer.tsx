import { useModalEscape } from '@/hooks/useModalEscape'
import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { X, Search, Plane, Ship, LayoutGrid, Check, ChevronRight, FileText, User, Mic, AlertTriangle, Loader2 } from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { CurrencyValue } from '@/components/ui/CurrencyValue'
import { useTranslation } from '@/hooks/useTranslation'
import { useDebounce } from '@/hooks/useDebounce'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition'
import { normalizeInvoiceVoiceTranscript } from '../utils/voiceSearch.utils'
import { useVoiceAssistantStore } from '@/stores/voiceAssistantStore'
import { cn } from '@/lib/utils'

interface ValidationListDrawerProps {
  isOpen: boolean
  onClose: () => void
  currentInvNo: string
  onSelectInvoice: (invNo: string) => void
}

interface Billing {
  fdInvNo: string
  fdInvDate: string
  fdCustCode: string
  fdDescr: string
  fdJumlah1: number
  fdJumlah2?: number | null
  fdCurr1: string | null
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdListType?: number | null
  fdGive?: number | null
  fdGive2?: number | null
  fdCekDate?: string | null
  fdConsignee?: string | null
  employee?: {
    fdEmpName: string | null
  } | null
  customer?: {
    fdCustName: string | null
  } | null
}

export function ValidationListDrawer({
  isOpen,
  onClose,
  currentInvNo,
  onSelectInvoice,
}: ValidationListDrawerProps) {
  useModalEscape(isOpen, onClose)
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [modeFilter, setModeFilter] = useState<'all' | 1 | 2>('all')
  const [authorFilter, setAuthorFilter] = useState<string>('all')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const canUseVoice = true
  const isManuallyStoppedRef = useRef(false)
  const isProcessingActionRef = useRef(false)
  const isOpenRef = useRef(isOpen)
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])
  const rearmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { suppressVoice } = useVoiceAssistantStore()

  // Supresi asisten suara global selama drawer pencarian terbuka
  useEffect(() => {
    if (!isOpen) return
    const unsuppress = suppressVoice()
    return () => {
      unsuppress()
    }
  }, [isOpen, suppressVoice])
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

  const {
    isSupported: isVoiceSupported,
    isListening: isVoiceListening,
    transcript: voiceTranscript,
    interimTranscript: voiceInterim,
    error: voiceError,
    startListening: startVoiceListening,
    stopListening: stopVoiceListening,
    resetTranscript,
    testHardwareMic,
  } = useVoiceRecognition({
    lang: 'id-ID',
    continuous: true,
    interimResults: true,
    onEnd: () => {
      // Auto re-arm saat drawer masih terbuka dan tidak dihentikan manual atau sedang proses aksi
      if (isOpenRef.current && !isManuallyStoppedRef.current && !isProcessingActionRef.current) {
        if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
        rearmTimerRef.current = setTimeout(() => {
          if (isOpenRef.current && !isManuallyStoppedRef.current && !isProcessingActionRef.current) {
            startVoiceListening()
          }
        }, 300)
      }
    },
  })

  const handleTestMic = async () => {
    setHardwareTest({ isRunning: true })
    isManuallyStoppedRef.current = true
    if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
    stopVoiceListening()
    const res = await testHardwareMic()
    setHardwareTest({ isRunning: false, result: res })
  }

  // Otomatis aktifkan mikrofon seketika saat drawer dibuka agar bisa langsung bicara hands-free
  useEffect(() => {
    if (isOpen) {
      isProcessingActionRef.current = false
      isManuallyStoppedRef.current = false
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      setHighlightedIndex(0)
      resetTranscript()
      document.body.style.overflow = 'hidden'
      const timer = setTimeout(() => {
        inputRef.current?.focus()
        if (isVoiceSupported && isOpenRef.current && !isManuallyStoppedRef.current) {
          startVoiceListening()
        }
      }, 150)
      return () => {
        clearTimeout(timer)
        if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      }
    } else {
      isManuallyStoppedRef.current = true
      isProcessingActionRef.current = false
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      document.body.style.overflow = 'unset'
      stopVoiceListening()
      resetTranscript()
    }
  }, [isOpen, isVoiceSupported, resetTranscript, startVoiceListening, stopVoiceListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopVoiceListening()
      resetTranscript()
    }
  }, [stopVoiceListening, resetTranscript])

  const { data: listRes, isLoading, isError } = useQuery({
    queryKey: ['billingValidationListDrawer', debouncedSearch],
    queryFn: async () => {
      const res = await billingApi.list({
        hasAmount: 'true',
        draftOnly: 'true',
        noPagination: 'true',
        minYear: '2023',
        ...(debouncedSearch && { search: debouncedSearch }),
      })
      return res.data
    },
    enabled: isOpen,
    placeholderData: keepPreviousData,
    staleTime: 60000,
  })

  const billingsData = listRes?.data || []

  const activeDraftBillings = useMemo(() => {
    return billingsData.filter((b: Billing) => {
      if (b.fdInvDate) {
        const year = new Date(b.fdInvDate).getFullYear()
        if (!isNaN(year) && year <= 2022) return false
      }

      const amt1 = Number(b.fdJumlah1 || 0)
      const amt2 = Number(b.fdJumlah2 || 0)
      if (amt1 <= 0 && amt2 <= 0) return false

      const isDraft = (b.fdGive2 ?? 0) !== 1 && (b.fdGive ?? 0) !== 1 && !b.fdCekDate
      return isDraft
    })
  }, [billingsData])

  // Extract unique authors (billing creators) with count
  const availableAuthors = useMemo(() => {
    const map = new Map<string, number>()
    activeDraftBillings.forEach((b: Billing) => {
      const author = b.employee?.fdEmpName?.trim() || 'UNASSIGNED'
      map.set(author, (map.get(author) || 0) + 1)
    })
    return Array.from(map.entries()).map(([author, count]) => ({ author, count }))
  }, [activeDraftBillings])

  // Filter by mode (Udara = 1, Laut = 2) AND author AND search, sorted by oldest invoice date first
  const filteredBillings = useMemo(() => {
    let list = activeDraftBillings.filter((b: Billing) => {
      if (modeFilter !== 'all' && b.fdListType !== modeFilter) return false
      if (authorFilter !== 'all') {
        const author = b.employee?.fdEmpName?.trim() || 'UNASSIGNED'
        if (author !== authorFilter) return false
      }
      return true
    })

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((b: Billing) => {
        const invNo = (b.fdInvNo || '').toLowerCase()
        const custCode = (b.fdCustCode || '').toLowerCase()
        const custName = (b.customer?.fdCustName || '').toLowerCase()
        const markingCode = (b.fdMarkingCode || '').toLowerCase()
        const markingNo = (b.fdMarkingNo || '').toLowerCase()
        const author = (b.employee?.fdEmpName || '').toLowerCase()
        const consignee = (b.fdConsignee || '').toLowerCase()
        return (
          invNo.includes(q) ||
          custCode.includes(q) ||
          custName.includes(q) ||
          markingCode.includes(q) ||
          markingNo.includes(q) ||
          author.includes(q) ||
          consignee.includes(q)
        )
      })
    }

    return list.sort((a: Billing, b: Billing) => {
      const timeA = a.fdInvDate ? new Date(a.fdInvDate).getTime() : 0
      const timeB = b.fdInvDate ? new Date(b.fdInvDate).getTime() : 0
      return timeA - timeB
    })
  }, [activeDraftBillings, modeFilter, authorFilter, search])

  const safeHighlightedIndex = Math.min(
    highlightedIndex,
    Math.max(0, filteredBillings.length - 1)
  )
  const highlightedBilling = filteredBillings[safeHighlightedIndex] || null

  const listContainerRef = useRef<HTMLDivElement>(null)

  // Otomatis scroll item yang sedang terpilih / disorot ke dalam view
  useEffect(() => {
    if (!isOpen) return
    const el = listContainerRef.current?.querySelector(`[data-index="${safeHighlightedIndex}"]`)
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [safeHighlightedIndex, isOpen])

  // Eksekusi pemilihan faktur atomik bebas looping
  const handleSelectAndClose = (invNo: string) => {
    if (isProcessingActionRef.current) return
    isProcessingActionRef.current = true
    isManuallyStoppedRef.current = true
    if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
    resetTranscript()
    stopVoiceListening()
    onClose()
    onSelectInvoice(invNo)
  }

  // Pemrosesan transkrip suara & eksekusi perintah pilih / navigasi / pencarian
  useEffect(() => {
    if (!isOpen || !isOpenRef.current || isProcessingActionRef.current) return
    const raw = (voiceTranscript || voiceInterim || '').trim()
    if (!raw) return

    const lower = raw.toLowerCase().trim()

    // 1. Perintah Tutup Drawer
    if (/^(tutup|batal|cancel|kembali)$/i.test(lower)) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopVoiceListening()
      resetTranscript()
      onClose()
      return
    }

    // 2. Perintah Pilih Faktur Terpilih (Murni)
    // Kata "buka" dieliminasi 100% untuk menghindari konflik dengan navigasi tab halaman detail
    const isPureSelectCmd =
      /^(pilih|enter|masuk|tampilkan|oke|ok|ya|proses|pilih\s+ini|proses\s+ini|faktur\s+ini|invoice\s+ini|bill\s+ini|oke\s+pilih|ya\s+pilih)$/i.test(
        lower
      )

    if (isPureSelectCmd) {
      if (highlightedBilling && !isProcessingActionRef.current) {
        handleSelectAndClose(highlightedBilling.fdInvNo)
        return
      }
    }

    // 2b. Perintah Pilih Komposit (misal: "pilih 010751", "santoso pilih", "010751 enter")
    const hasSelectActionWord = /\b(pilih|enter|masuk|tampilkan)\b/i.test(lower)
    if (hasSelectActionWord) {
      const stripped = lower.replace(/\b(pilih|enter|masuk|tampilkan|faktur|invoice|bill|tolong|coba|ya|oke|ok)\b/gi, ' ').trim()
      if (stripped) {
        const cleanTarget = normalizeInvoiceVoiceTranscript(stripped).toLowerCase()
        const matched = activeDraftBillings.find((b: Billing) => {
          const invNo = (b.fdInvNo || '').toLowerCase()
          const custCode = (b.fdCustCode || '').toLowerCase()
          const custName = (b.customer?.fdCustName || '').toLowerCase()
          const markingCode = (b.fdMarkingCode || '').toLowerCase()
          return (
            invNo.includes(cleanTarget) ||
            custCode.includes(cleanTarget) ||
            custName.includes(cleanTarget) ||
            markingCode.includes(cleanTarget)
          )
        })
        if (matched && !isProcessingActionRef.current) {
          handleSelectAndClose(matched.fdInvNo)
          return
        }
      }
    }

    // 3. Perintah Navigasi (Ke Bawah / Ke Atas)
    if (/^(bawah|turun|next|berikutnya|nomor\s+dua|ke\s+bawah)$/i.test(lower)) {
      setHighlightedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredBillings.length - 1)))
      return
    }
    if (/^(atas|naik|prev|sebelumnya|nomor\s+satu|ke\s+atas)$/i.test(lower)) {
      setHighlightedIndex((prev) => Math.max(prev - 1, 0))
      return
    }

    // 4. Jika transkrip adalah perintah aksi / navigasi / kata "buka" mandiri, jangan set ke input pencarian
    // "buka" ditangkap di sini agar tidak memicu pencarian kata "buka" di daftar invoice
    if (
      isPureSelectCmd ||
      hasSelectActionWord ||
      /^(tutup|batal|cancel|kembali|bawah|turun|atas|naik|next|prev|buka|buka\s+drawer|buka\s+invoice|buka\s+faktur)$/i.test(lower)
    ) {
      return
    }

    // 5. Query Pencarian Invoice / Customer
    // Bersihkan kata awalan "buka", "cari", atau "tolong" jika terucap di awal pencarian
    const cleanRaw = raw.replace(/\b(?:buka|cari|tolong|coba)\b/gi, ' ').trim()
    const clean = normalizeInvoiceVoiceTranscript(cleanRaw)
    if (clean && clean !== search) {
      setSearch(clean)
      setHighlightedIndex(0) // Otomatis pilih item teratas
    }
  }, [
    isOpen,
    voiceTranscript,
    voiceInterim,
    highlightedBilling,
    filteredBillings.length,
    activeDraftBillings,
    search,
    resetTranscript,
    stopVoiceListening,
    onSelectInvoice,
    onClose,
  ])

  // Shortcut keyboard Alt+V, Enter, ArrowUp, ArrowDown
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const isAltV = e.altKey && (e.key?.toLowerCase() === 'v' || e.code === 'KeyV')
      if (isAltV) {
        e.preventDefault()
        e.stopPropagation() // Cegah pembukaan VoiceAssistantModal global di AppLayout
        if (isVoiceListening) {
          isManuallyStoppedRef.current = true
          stopVoiceListening()
        } else {
          isManuallyStoppedRef.current = false
          inputRef.current?.focus()
          startVoiceListening()
        }
        return
      }

      if (e.key === 'Enter') {
        if (highlightedBilling && !isProcessingActionRef.current) {
          e.preventDefault()
          handleSelectAndClose(highlightedBilling.fdInvNo)
        }
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredBillings.length - 1)))
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => Math.max(prev - 1, 0))
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [
    isOpen,
    isVoiceListening,
    highlightedBilling,
    filteredBillings.length,
    startVoiceListening,
    stopVoiceListening,
    onSelectInvoice,
    onClose,
  ])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[110] flex justify-end bg-slate-950/50 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Body */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-[var(--color-surface)] h-full shadow-2xl border-l border-[var(--color-border)] flex flex-col z-10 animate-slideInRight">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                {t('billing.validation.selectInvoiceTitle')}
              </h2>
              <p className="text-xs text-[var(--color-secondary)]">
                {t('billing.validation.selectInvoiceSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search, Mode Filter & Author Filter */}
        <div className="p-3 sm:p-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setHighlightedIndex(0)
              }}
              placeholder={
                isVoiceListening
                  ? '🎙️ Mendengarkan ucapan... (Sebutkan faktur lalu "Pilih" / "Enter")'
                  : t('billing.validation.searchDrawerPlaceholder')
              }
              className={cn(
                "w-full pl-9 pr-24 py-2 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all",
                isVoiceListening && "border-sky-500 ring-2 ring-sky-500/25 bg-sky-500/5 text-sky-900 dark:text-sky-200 placeholder:text-sky-500 font-medium"
              )}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setHighlightedIndex(0)
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {isVoiceSupported && canUseVoice && (
                <button
                  type="button"
                  onClick={() => {
                    if (isVoiceListening) {
                      isManuallyStoppedRef.current = true
                      stopVoiceListening()
                    } else {
                      isManuallyStoppedRef.current = false
                      inputRef.current?.focus()
                      startVoiceListening()
                    }
                  }}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1",
                    isVoiceListening
                      ? "text-sky-600 dark:text-sky-400 bg-sky-500/20 border border-sky-500/30 animate-pulse"
                      : "text-[var(--color-secondary)] hover:text-sky-600 dark:hover:text-sky-400 hover:bg-[var(--color-neutral)] border border-transparent"
                  )}
                  title={isVoiceListening ? "Sedang mendengarkan ucapan... (Klik / Alt+V untuk jeda)" : "Aktifkan pencarian suara (Alt+V)"}
                >
                  <Mic className={cn("w-3.5 h-3.5", isVoiceListening && "text-sky-500 animate-pulse")} />
                  <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)] font-mono font-bold">
                    Alt+V
                  </kbd>
                </button>
              )}
            </div>
          </div>

          {/* Banner Status Suara Interaktif */}
          {isVoiceListening && !voiceError && (
            <div className="flex items-center justify-between text-[11px] px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/25 text-sky-700 dark:text-sky-300 animate-fadeIn">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span className="truncate">
                  Suara aktif: sebutkan nomor/nama, lalu katakan <strong>"Pilih"</strong> atau <strong>"Enter"</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTestMic}
                  disabled={hardwareTest.isRunning}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-800 dark:text-sky-200 border border-sky-500/40 cursor-pointer flex items-center gap-1 font-semibold"
                >
                  {hardwareTest.isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : '🔍 Cek Mic'}
                </button>
                <span className="text-[10px] font-mono opacity-80">Alt+V</span>
              </div>
            </div>
          )}

          {/* Banner Notifikasi Error Audio */}
          {voiceError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] flex flex-col gap-1.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {voiceError === 'not-allowed'
                      ? 'Izin mikrofon diblokir oleh browser'
                      : voiceError === 'no-speech'
                      ? 'Suara tidak terdeteksi (Volume mic terlalu kecil)'
                      : voiceError === 'audio-capture'
                      ? 'Perangkat mic tidak terdeteksi atau sedang dipakai'
                      : voiceError === 'network'
                      ? 'Kendala koneksi ke server speech Google'
                      : `Kendala audio (${voiceError})`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleTestMic}
                  disabled={hardwareTest.isRunning}
                  className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-bold border border-rose-500/40 cursor-pointer flex items-center gap-1 transition-all"
                >
                  {hardwareTest.isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : '🔍 Test Mic'}
                </button>
              </div>
              <p className="text-[10px] opacity-90 leading-tight">
                {voiceError === 'not-allowed'
                  ? 'Klik ikon gembok/setelan di kiri URL browser dan ubah Microphone ke Izinkan (Allow).'
                  : voiceError === 'no-speech'
                  ? 'Volume mikrofon Anda terlalu kecil (< 15%). Naikkan volume di Windows Sound Settings (mmsys.cpl) ke 90-100% atau bicara lebih dekat ke mic.'
                  : voiceError === 'audio-capture'
                  ? 'Pastikan mic tidak dipakai aplikasi lain (misal Sound Recorder). Atau periksa setelan Windows Privacy.'
                  : 'Anda dapat langsung mengetik nomor invoice / customer di kolom pencarian di atas.'}
              </p>
            </div>
          )}

          {/* Hasil Diagnostik Hardware Mic */}
          {hardwareTest.result && (
            <div className={cn(
              "p-2.5 rounded-lg border text-[11px] flex items-center justify-between gap-2 animate-fadeIn",
              hardwareTest.result.signalStrength === 'GOOD'
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
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

          {/* Mode Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <button
              onClick={() => setModeFilter('all')}
              className={`px-3 py-1 rounded-full border text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                modeFilter === 'all'
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)] shadow-2xs'
                  : 'bg-[var(--color-surface)] text-[var(--color-secondary)] border-[var(--color-border)] hover:bg-[var(--color-neutral)]'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>{t('billing.validation.filterAllCount', { count: activeDraftBillings.length })}</span>
            </button>

            <button
              onClick={() => setModeFilter(1)}
              className={`px-3 py-1 rounded-full border text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                modeFilter === 1
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-[var(--color-surface)] text-amber-700 dark:text-amber-400 border-[var(--color-border)] hover:bg-amber-50 dark:hover:bg-amber-950/30'
              }`}
            >
              <Plane className="w-3 h-3" />
              <span>{t('billing.validation.filterAir')}</span>
            </button>

            <button
              onClick={() => setModeFilter(2)}
              className={`px-3 py-1 rounded-full border text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                modeFilter === 2
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-[var(--color-surface)] text-blue-700 dark:text-blue-400 border-[var(--color-border)] hover:bg-blue-50 dark:hover:bg-blue-950/30'
              }`}
            >
              <Ship className="w-3 h-3" />
              <span>{t('billing.validation.filterSea')}</span>
            </button>
          </div>

          {/* Author / Created By Filter Pills */}
          {availableAuthors.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-[var(--color-border)]/50">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] flex items-center gap-1">
                <User className="w-3 h-3 text-[var(--color-primary)]" />
                {t('billing.validation.filterAuthorLabel')}
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  onClick={() => setAuthorFilter('all')}
                  className={`px-2.5 py-0.5 rounded-md border text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    authorFilter === 'all'
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]'
                      : 'bg-[var(--color-surface)] text-[var(--color-secondary)] border-[var(--color-border)] hover:bg-[var(--color-neutral)]'
                  }`}
                >
                  {t('billing.validation.filterAuthorAll')}
                </button>

                {availableAuthors.map(({ author, count }) => (
                  <button
                    key={author}
                    onClick={() => setAuthorFilter(authorFilter === author ? 'all' : author)}
                    className={`px-2.5 py-0.5 rounded-md border text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                      authorFilter === author
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-[var(--color-surface)] text-[var(--color-primary)] border-[var(--color-border)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                  >
                    <span>{author}</span>
                    <span className="opacity-75">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* List Content */}
        <div ref={listContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {isLoading ? (
            <div className="space-y-2.5 animate-fadeIn">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-32 rounded skeleton-shimmer" />
                    <div className="h-4 w-12 rounded-full skeleton-shimmer" />
                  </div>
                  <div className="h-4 w-44 rounded skeleton-shimmer" />
                  <div className="flex justify-between items-center pt-1 border-t border-[var(--color-border)]/50">
                    <div className="h-3 w-20 rounded skeleton-shimmer" />
                    <div className="h-3.5 w-24 rounded skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-4 text-center text-xs text-red-600 bg-red-50 rounded-lg">
              {t('billing.validation.errorDrawer')}
            </div>
          ) : filteredBillings.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-7 h-7" />}
              title={t('billing.validation.emptyDrawerTitle')}
              description={search ? t('billing.validation.emptyDrawerSearch', { search }) : t('billing.validation.emptyDrawerNoData')}
            />
          ) : (
            filteredBillings.map((b: Billing, idx: number) => {
              const isSelected = b.fdInvNo === currentInvNo
              const isHighlighted = idx === safeHighlightedIndex
              const isAir = b.fdListType === 1

              return (
                <div
                  key={b.fdInvNo}
                  data-index={idx}
                  onClick={() => {
                    if (isSelected) {
                      onClose()
                      return
                    }
                    handleSelectAndClose(b.fdInvNo)
                  }}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer group relative",
                    isHighlighted
                      ? "border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/30 shadow-md"
                      : isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]/30 shadow-xs"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                  )}
                >
                  {/* Badge Terpilih Otomatis via Suara / Navigasi */}
                  {isHighlighted && (
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 font-bold rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
                        <span>🎯 Terpilih</span>
                        <span className="opacity-90 font-normal">· Katakan "Pilih" atau Tekan Enter ↵</span>
                      </span>
                      <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-bold">
                        Hasil #{idx + 1}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[var(--color-primary)] font-mono group-hover:text-blue-600 transition-colors">
                          {b.fdInvNo}
                        </span>
                        {isSelected && (
                          <Badge variant="success" className="text-[9px] px-1.5 py-0 font-semibold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                            {t('billing.validation.currentlyOpen')}
                          </Badge>
                        )}
                        <Badge
                          variant={isAir ? 'warning' : 'info'}
                          className="text-[9px] px-1.5 py-0 uppercase font-semibold"
                        >
                          {isAir ? t('billing.validation.filterAir').toUpperCase() : t('billing.validation.filterSea').toUpperCase()}
                        </Badge>
                      </div>

                      <p className="mt-1 text-xs font-semibold text-[var(--color-primary)] line-clamp-1">
                        {b.customer?.fdCustName || b.fdCustCode || '—'}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  </div>

                  <div className="mt-2 pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-2 text-[11px] text-[var(--color-secondary)]">
                    <div className="truncate max-w-[220px]">
                      {t('billing.validation.markingLabel')} <span className="font-medium text-[var(--color-primary)]">{b.fdMarkingNo || b.fdMarkingCode || '—'}</span>
                      {b.fdConsignee && (
                        <span className="text-[10px] text-[var(--color-secondary)] block truncate">
                          {t('billing.consignee')}: <span className="font-semibold text-[var(--color-primary)]">{b.fdConsignee}</span>
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-[var(--color-primary)] font-mono shrink-0">
                      <CurrencyValue value={b.fdJumlah1} currency={b.fdCurr1 || 'IDR'} />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
