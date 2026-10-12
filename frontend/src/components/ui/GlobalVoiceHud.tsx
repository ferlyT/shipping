import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic,
  MicOff,
  HelpCircle,
  X,
  CheckCircle2,
  Search,
  Layers,
  Sparkles,
  Send,
  Compass,
  Palette,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import { useVoiceAssistantStore } from '@/stores/voiceAssistantStore'
import { useVoiceRecognition } from '@/features/billing/hooks/useVoiceRecognition'
import { billingApi } from '@/features/billing/services/billing.service'
import { useThemeStore } from '@/stores/themeStore'
import { toast } from '@/stores/toastStore'
import type { Billing } from '@/features/billing/types/billing.types'

export function GlobalVoiceHud() {
  const navigate = useNavigate()
  const { setTheme, theme } = useThemeStore()

  const {
    context,
    isSuppressed,
    isMuted,
    toggleVoiceMute,
    commandStatus,
    setCommandStatus,
    commandFeedback,
    setVoiceTelemetry,
  } = useVoiceAssistantStore()

  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false)
  const cheatSheetRef = useRef<HTMLDivElement>(null)

  const isManuallyStoppedRef = useRef(false)
  const rearmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voiceCommandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isNavigatingRef = useRef(false)

  // Tutup cheat sheet jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cheatSheetRef.current && !cheatSheetRef.current.contains(event.target as Node)) {
        setIsCheatSheetOpen(false)
      }
    }
    if (isCheatSheetOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCheatSheetOpen])

  // Speech Recognition Hook terpusat
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
    continuous: true,
    interimResults: true,
    onEnd: () => {
      // Auto re-arm standby jika mikrofon tidak dimute dan tidak sedang disupresi oleh dialog modal
      if (!isSuppressed && !isManuallyStoppedRef.current && !useVoiceAssistantStore.getState().isMuted) {
        if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
        rearmTimerRef.current = setTimeout(() => {
          if (!isSuppressed && !isManuallyStoppedRef.current && !useVoiceAssistantStore.getState().isMuted) {
            startListening()
          }
        }, 200)
      }
    },
  })

  // Sinkronkan status telemetri suara ke voiceAssistantStore
  useEffect(() => {
    setVoiceTelemetry({
      isListening,
      isMuted,
      transcript,
      interimTranscript,
    })
  }, [isListening, isMuted, transcript, interimTranscript, setVoiceTelemetry])

  // Kendali start/stop mendengarkan berdasarkan mute dan supresi
  useEffect(() => {
    if (!isSupported) return

    if (!isMuted && !isSuppressed) {
      isManuallyStoppedRef.current = false
      const timer = setTimeout(() => {
        if (!isSuppressed && !useVoiceAssistantStore.getState().isMuted) {
          startListening()
        }
      }, 200)
      return () => {
        clearTimeout(timer)
        if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
        if (voiceCommandTimerRef.current) {
          clearTimeout(voiceCommandTimerRef.current)
          voiceCommandTimerRef.current = null
        }
      }
    } else {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      if (voiceCommandTimerRef.current) {
        clearTimeout(voiceCommandTimerRef.current)
        voiceCommandTimerRef.current = null
      }
      stopListening()
      resetTranscript()
    }
  }, [isSupported, isMuted, isSuppressed, startListening, stopListening, resetTranscript])

  // Handler toggle mute
  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted
    toggleVoiceMute()
    if (nextMuted) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      if (voiceCommandTimerRef.current) {
        clearTimeout(voiceCommandTimerRef.current)
        voiceCommandTimerRef.current = null
      }
      stopListening()
      resetTranscript()
    } else {
      isManuallyStoppedRef.current = false
      resetTranscript()
      startListening()
    }
  }, [isMuted, toggleVoiceMute, stopListening, resetTranscript, startListening])

  // Handler pencarian & resolusi nomor invoice langsung ke backend
  const handleOpenInvoiceByVoice = useCallback(
    async (target: string) => {
      if (!target || isNavigatingRef.current) return
      isNavigatingRef.current = true

      // Jeda pendengaran selama navigasi
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopListening()
      resetTranscript()

      const cleanTarget = target.trim().toUpperCase()
      const currentInv = (context?.currentInvNo || '').trim().toUpperCase()
      const currentPrefix = currentInv ? currentInv.split('-')[0]?.trim().toUpperCase() : ''

      const branchMatch = cleanTarget.match(/^(GZS|GZA|YWS|YWA|JKS|JKA|SUB|SG|HK|BKK|KR|SZ|SH)[-\s]?/i)
      const explicitBranch = branchMatch ? branchMatch[1].toUpperCase() : ''
      const targetBranch = explicitBranch || currentPrefix || ''

      const cleanDigits = cleanTarget.replace(/\D/g, '')
      const unpaddedDigits = cleanDigits.replace(/^0+/, '')
      const padded6Digits = cleanDigits.length <= 6 ? cleanDigits.padStart(6, '0') : cleanDigits

      // 1. Format faktur lengkap (e.g. GZS-011023-09-2026)
      const isCompleteInv = /^[A-Z]{2,4}-\d{3,}-\d{2}-\d{4}$/i.test(cleanTarget)
      if (isCompleteInv) {
        if (cleanTarget === currentInv) {
          toast.info(`Invoice ${cleanTarget} sedang dibuka saat ini`)
          isNavigatingRef.current = false
          return
        }
        setCommandStatus('executed', `Membuka invoice ${cleanTarget}`)
        toast.success(`Membuka invoice ${cleanTarget}...`)
        navigate(ROUTES.BILLING_VALIDATION_DETAIL(cleanTarget))
        setTimeout(() => {
          isNavigatingRef.current = false
        }, 800)
        return
      }

      // 2. Pencarian cerdas ke backend: Prioritas data bill yang BELUM ISSUED (draftOnly: true)
      try {
        const searchKeyword = unpaddedDigits || cleanTarget
        toast.info(`Mencari invoice belum issued "${searchKeyword}"...`)

        const evaluateMatch = (b: Billing) => {
          const invNo = (b.fdInvNo || '').trim().toUpperCase()
          const branch = invNo.split('-')[0]?.trim() || ''

          const parts = invNo.split('-')
          const seqPart = parts.length > 1 ? parts[1].trim() : parts[0].trim()
          const seqDigits = seqPart.replace(/\D/g, '')
          const unpaddedSeq = seqDigits.replace(/^0+/, '')

          let score = 0
          if (unpaddedDigits && (unpaddedSeq === unpaddedDigits || seqDigits === padded6Digits || seqDigits === cleanDigits)) {
            score += 100
          } else if (cleanDigits && seqDigits.includes(cleanDigits)) {
            score += 40
          }

          if (targetBranch && branch === targetBranch) {
            score += 50
          }
          if (Number(b.fdGive) !== 1) {
            score += 20
          }
          return { billing: b, score, invNo }
        }

        const draftRes = await billingApi.list({
          search: searchKeyword,
          draftOnly: 'true',
          hasAmount: 'true',
          noPagination: 'true',
          minYear: '2023',
        })

        let candidateList: Billing[] = draftRes?.data?.data || []

        if (candidateList.length === 0) {
          const fallbackRes = await billingApi.list({
            search: searchKeyword,
            hasAmount: 'true',
            noPagination: 'true',
            minYear: '2023',
          })
          candidateList = fallbackRes?.data?.data || []
        }

        if (candidateList.length === 0) {
          toast.warning(`Invoice dengan nomor "${searchKeyword}" tidak ditemukan`)
          setCommandStatus('unrecognized', `Invoice "${searchKeyword}" tidak ditemukan`)
          isNavigatingRef.current = false
          return
        }

        const scored = candidateList.map(evaluateMatch).sort((a, b) => b.score - a.score)
        const bestMatch = scored[0]

        if (!bestMatch || bestMatch.score < 30) {
          toast.warning(`Tidak ada invoice yang cocok dengan "${searchKeyword}"`)
          setCommandStatus('unrecognized', 'Tidak ada invoice yang cocok')
          isNavigatingRef.current = false
          return
        }

        const targetInv = bestMatch.invNo
        if (targetInv === currentInv) {
          toast.info(`Invoice ${targetInv} sedang dibuka saat ini`)
          isNavigatingRef.current = false
          return
        }

        const isTargetIssued = Number(bestMatch.billing.fdGive) === 1
        setCommandStatus('executed', `Membuka invoice ${targetInv}`)
        toast.success(
          `Membuka invoice ${targetInv}${isTargetIssued ? ' (Sudah Terbit)' : ''}...`
        )
        navigate(ROUTES.BILLING_VALIDATION_DETAIL(targetInv))
        setTimeout(() => {
          isNavigatingRef.current = false
        }, 800)
      } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || 'Gagal mencari invoice')
        setCommandStatus('unrecognized', 'Gagal mencari invoice')
        isNavigatingRef.current = false
      }
    },
    [context?.currentInvNo, navigate, setCommandStatus, stopListening, resetTranscript]
  )

  // Eksekutor Perintah Suara (NLP / Regex Matching)
  const executeVoiceCommand = useCallback(
    (rawText: string) => {
      const clean = rawText.trim()
      if (!clean) return
      const lower = clean.toLowerCase()

      // Reset feedback lama
      setCommandStatus('evaluating')

      // ─── A. JIKA BERADA DI HALAMAN VALIDASI DETAIL (CONTEXT TERDAFTAR) ───
      if (context) {
        // 1. Navigasi Tab Kartu Validasi
        if (/\b(tab\s*1|tab\s*satu|item|tarif|harga|finansial)\b/i.test(lower)) {
          context.onSwitchTab?.('pricing')
          setCommandStatus('executed', 'Beralih ke Tab 1 (Item & Tarif)')
          toast.success('Beralih ke Tab 1 (Item & Tarif)')
          return
        }
        if (/\b(tab\s*2|tab\s*dua|tab\s*m3|volume|kubikasi|timbangan?|fisik)\b/i.test(lower)) {
          context.onSwitchTab?.('m3')
          setCommandStatus('executed', 'Beralih ke Tab 2 (M³ & Timbangan)')
          toast.success('Beralih ke Tab 2 (M³ & Timbangan)')
          return
        }
        const isSea = context.isSea ?? true
        if (/\b(tab\s*3|tab\s*tiga)\b/i.test(lower)) {
          const target = isSea ? 'overweight' : 'freight'
          context.onSwitchTab?.(target)
          setCommandStatus('executed', `Beralih ke Tab 3 (${isSea ? 'Overweight' : 'Freight Charge'})`)
          toast.success(`Beralih ke Tab 3 (${isSea ? 'Overweight' : 'Freight Charge'})`)
          return
        }
        if (/\b(tab\s*4|tab\s*empat)\b/i.test(lower)) {
          const target = isSea ? 'freight' : 'transport'
          context.onSwitchTab?.(target)
          setCommandStatus('executed', `Beralih ke Tab 4 (${isSea ? 'Freight Charge' : 'Ekspedisi'})`)
          toast.success(`Beralih ke Tab 4 (${isSea ? 'Freight Charge' : 'Ekspedisi'})`)
          return
        }
        if (/\b(tab\s*5|tab\s*lima)\b/i.test(lower)) {
          context.onSwitchTab?.('transport')
          setCommandStatus('executed', 'Beralih ke Tab 5 (Ekspedisi)')
          toast.success('Beralih ke Tab 5 (Ekspedisi)')
          return
        }
        if (/\b(overweight|kelebihan\s*berat|lebih\s*berat)\b/i.test(lower)) {
          context.onSwitchTab?.('overweight')
          setCommandStatus('executed', 'Beralih ke Tab Overweight')
          toast.success('Beralih ke Tab Overweight')
          return
        }
        if (/\b(freight|uang\s*tambang|tambang)\b/i.test(lower)) {
          context.onSwitchTab?.('freight')
          setCommandStatus('executed', 'Beralih ke Tab Freight Charge')
          toast.success('Beralih ke Tab Freight Charge')
          return
        }
        if (/\b(ekspedisi|transport|ongkir|trucking|tbexpindo)\b/i.test(lower)) {
          context.onSwitchTab?.('transport')
          setCommandStatus('executed', 'Beralih ke Tab Ekspedisi')
          toast.success('Beralih ke Tab Ekspedisi')
          return
        }

        // 2. Aksi Operasional Validasi
        if (/\b(terbitkan|terbit|issue|keluarkan)\b/i.test(lower)) {
          if (context.isIssued) {
            toast.warning('Invoice ini sudah berstatus ISSUED (Diterbitkan)')
            setCommandStatus('unrecognized', 'Invoice sudah terbit')
          } else if (context.onTriggerIssue) {
            context.onTriggerIssue()
            setCommandStatus('executed', 'Membuka dialog Terbitkan Invoice')
          }
          return
        }
        if (/\b(cetak|print)\b/i.test(lower)) {
          if (context.onPrintInvoice) {
            context.onPrintInvoice()
            setCommandStatus('executed', 'Mencetak invoice...')
          }
          return
        }
        if (/\b(refresh|segarkan|reload|muat\s*ulang)\b/i.test(lower)) {
          if (context.onRefreshValidation) {
            context.onRefreshValidation()
            setCommandStatus('executed', 'Menyegarkan data validasi...')
            toast.success('Data validasi berhasil dimuat ulang')
          }
          return
        }
        if (/\b(summary|ringkasan|kesimpulan|audit\s*validasi)\b/i.test(lower)) {
          if (context.onOpenSummary) {
            context.onOpenSummary()
            setCommandStatus('executed', 'Membuka Ringkasan Validasi')
          }
          return
        }
        if (/\b(cari\s*invoice|pilih\s*invoice|drawer|daftar\s*faktur)\b/i.test(lower)) {
          if (context.onOpenDrawer) {
            context.onOpenDrawer()
            setCommandStatus('executed', 'Membuka daftar pencarian invoice')
          }
          return
        }
        if (/\b(buka\s*resi|lihat\s*resi|resi\s*koli|dimensi)\b/i.test(lower)) {
          if (context.onOpenModal) {
            context.onOpenModal('resi')
            setCommandStatus('executed', 'Membuka detail resi')
          }
          return
        }
        if (/\b(inspeksi|bap|berita\s*acara)\b/i.test(lower)) {
          if (context.onOpenModal) {
            context.onOpenModal('inspection')
            setCommandStatus('executed', 'Membuka riwayat inspeksi BAP')
          }
          return
        }
        if (/\b(riwayat|history|log\s*faktur)\b/i.test(lower)) {
          if (context.onOpenModal) {
            context.onOpenModal('history')
            setCommandStatus('executed', 'Membuka riwayat invoice')
          }
          return
        }
        if (/\b(tarif|harga\s*customer|pricelist|tarif\s*acuan|acuan)\b/i.test(lower)) {
          if (context.onOpenModal) {
            context.onOpenModal('tarif')
            setCommandStatus('executed', 'Membuka tarif acuan customer (tbCustomersHarga)')
          }
          return
        }
        if (/^(kembali|back|tutup)$/i.test(lower)) {
          if (context.onBack) {
            context.onBack()
          } else {
            navigate(ROUTES.BILLING_VALIDATION_LIST)
          }
          setCommandStatus('executed', 'Kembali ke daftar antrean')
          return
        }
      }

      // ─── B. PERINTAH BUKA INVOICE LANGSUNG (BERLAKU DI SELURUH ERP) ───
      // Contoh: "Buka invoice 011023", "Buka 011023", "Buka GZS 011023", "GZS 011023"
      const openInvoiceMatch =
        clean.match(/(?:buka(?:\s+invoice|\s+faktur|\s+no|\s+nomor)?\s+)([A-Z0-9\s\-]+)/i) ||
        clean.match(/^(?:invoice|faktur|bill)?\s*([A-Z]{2,4}[-\s]?\d{3,}(?:[-\s]\d{2}[-\s]\d{4})?)/i)

      if (openInvoiceMatch && openInvoiceMatch[1]) {
        const target = openInvoiceMatch[1].trim()
        if (target && !/^(dashboard|resi|pengantaran|billing|validasi|kasir|pricelist|bap)$/i.test(target)) {
          handleOpenInvoiceByVoice(target)
          return
        }
      }

      // ─── C. NAVIGASI HALAMAN ERP GLOBAL ───
      if (/\b(dashboard|overview|beranda|halaman\s*utama)\b/i.test(lower)) {
        navigate(ROUTES.DASHBOARD)
        setCommandStatus('executed', 'Membuka Dashboard')
        toast.success('Membuka Dashboard')
        return
      }
      if (/\b(shipments?|resi|daftar\s*resi|pengiriman)\b/i.test(lower)) {
        navigate(ROUTES.SHIPMENTS)
        setCommandStatus('executed', 'Membuka Halaman Resi')
        toast.success('Membuka Halaman Resi')
        return
      }
      if (/\b(surat\s*jalan|pengantaran|delivery\s*order|do)\b/i.test(lower)) {
        navigate(ROUTES.DELIVERY_ORDERS_LIST)
        setCommandStatus('executed', 'Membuka Surat Jalan')
        toast.success('Membuka Daftar Surat Jalan')
        return
      }
      if (/\b(monitoring\s*sj|sj\s*pending|monitoring\s*pengantaran)\b/i.test(lower)) {
        navigate(ROUTES.DELIVERY_ORDERS_MONITORING)
        setCommandStatus('executed', 'Membuka Monitoring SJ')
        toast.success('Membuka Monitoring Surat Jalan')
        return
      }
      if (/\b(antrean\s*validasi|validasi\s*bill|validasi\s*billing|list\s*validasi)\b/i.test(lower)) {
        navigate(ROUTES.BILLING_VALIDATION_LIST)
        setCommandStatus('executed', 'Membuka Antrean Validasi')
        toast.success('Membuka Antrean Validasi Billing')
        return
      }
      if (/\b(target\s*bill|target\s*penagihan)\b/i.test(lower)) {
        navigate(ROUTES.BILLING_TARGET)
        setCommandStatus('executed', 'Membuka Target Bill')
        toast.success('Membuka Target Penagihan')
        return
      }
      if (/\b(billing|daftar\s*faktur|daftar\s*invoice|tagihan)\b/i.test(lower)) {
        navigate(ROUTES.BILLING_LIST)
        setCommandStatus('executed', 'Membuka Daftar Billing')
        toast.success('Membuka Daftar Billing')
        return
      }
      if (/\b(kasir|pembayaran|cashier)\b/i.test(lower)) {
        navigate(ROUTES.CASHIER)
        setCommandStatus('executed', 'Membuka Menu Kasir')
        toast.success('Membuka Menu Kasir')
        return
      }
      if (/\b(pricelist\s*customer|tarif\s*customer|harga\s*customer)\b/i.test(lower)) {
        navigate(ROUTES.CUSTOMER_PRICE_LIST)
        setCommandStatus('executed', 'Membuka Tarif Customer')
        toast.success('Membuka Tarif Khusus Customer')
        return
      }
      if (/\b(pricelist|master\s*tarif|tarif\s*umum|daftar\s*harga)\b/i.test(lower)) {
        navigate(ROUTES.PRICE_LIST)
        setCommandStatus('executed', 'Membuka Master Price List')
        toast.success('Membuka Master Price List')
        return
      }
      if (/\b(bap|berita\s*acara|inspeksi\s*kargo)\b/i.test(lower)) {
        navigate(ROUTES.INSPECTION_REPORTS)
        setCommandStatus('executed', 'Membuka Berita Acara (BAP)')
        toast.success('Membuka Berita Acara (BAP)')
        return
      }
      if (/\b(kontainer|batch\s*marking|muatan\s*kontainer)\b/i.test(lower)) {
        navigate(ROUTES.SHIPMENT_BATCHES)
        setCommandStatus('executed', 'Membuka Batch Marking')
        toast.success('Membuka Batch Marking Kontainer')
        return
      }

      // ─── D. GANTI TEMA ───
      if (/\b(tema\s*gelap|dark\s*mode|mode\s*gelap|midnight)\b/i.test(lower)) {
        setTheme('midnight')
        setCommandStatus('executed', 'Tema Gelap Diaktifkan')
        toast.info('Tema diubah ke Midnight Dark Mode')
        return
      }
      if (/\b(tema\s*terang|light\s*mode|mode\s*terang|heritage)\b/i.test(lower)) {
        setTheme('heritage')
        setCommandStatus('executed', 'Tema Terang Diaktifkan')
        toast.info('Tema diubah ke Heritage Light Mode')
        return
      }
      if (/\b(ganti\s*tema|ubah\s*tema|switch\s*theme)\b/i.test(lower)) {
        const nextTheme = theme === 'midnight' ? 'heritage' : 'midnight'
        setTheme(nextTheme)
        setCommandStatus('executed', `Tema diubah ke ${nextTheme}`)
        toast.info(`Tema diubah ke ${nextTheme}`)
        return
      }

      // ─── E. JIKA BELUM COCOK: PENCARIAN DEFAULT ───
      if (/^\d{3,}/.test(clean) || /^[A-Z]{2,4}[-\s]?\d{3,}/i.test(clean)) {
        handleOpenInvoiceByVoice(clean)
        return
      }

      setCommandStatus('unrecognized', `Perintah "${clean}" tidak dikenali`)
    },
    [context, handleOpenInvoiceByVoice, navigate, setCommandStatus, setTheme, theme]
  )

  // Otomatisasi evaluasi ucapan suara saat hening (debounce 900ms)
  useEffect(() => {
    if (isMuted || isSuppressed) return

    const combined = `${transcript} ${interimTranscript}`.trim()
    if (!combined) return

    if (voiceCommandTimerRef.current) {
      clearTimeout(voiceCommandTimerRef.current)
    }

    voiceCommandTimerRef.current = setTimeout(() => {
      executeVoiceCommand(combined)
      resetTranscript()
      voiceCommandTimerRef.current = null
    }, 900)

    return () => {
      if (voiceCommandTimerRef.current) {
        clearTimeout(voiceCommandTimerRef.current)
        voiceCommandTimerRef.current = null
      }
    }
  }, [transcript, interimTranscript, isMuted, isSuppressed, executeVoiceCommand, resetTranscript])

  // Reset status feedback setelah 2.5 detik
  useEffect(() => {
    if (commandStatus === 'executed' || commandStatus === 'unrecognized') {
      const timer = setTimeout(() => {
        setCommandStatus('idle')
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [commandStatus, setCommandStatus])

  if (!isSupported) return null

  const liveText = `${transcript} ${interimTranscript}`.trim()
  const hasVoiceInput = Boolean(liveText)

  const handleChipClick = (cmd: string) => {
    setIsCheatSheetOpen(false)
    executeVoiceCommand(cmd)
  }

  const isSea = context?.isSea ?? true

  return (
    <div className="fixed bottom-5 sm:bottom-7 md:bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none select-none">
      
      {/* ── Cheat Sheet Popover ─────────────────────────────────────────────── */}
      {isCheatSheetOpen && (
        <div
          ref={cheatSheetRef}
          className="pointer-events-auto mb-3 w-[92vw] sm:w-[480px] max-w-[540px] bg-[var(--color-surface)]/95 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl p-4 shadow-2xl space-y-3.5 animate-fadeIn z-50 font-[var(--font-body)]"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-[var(--color-tertiary)]/15 text-[var(--color-tertiary)]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                  Panduan Perintah Suara Hands-Free
                </h4>
                <p className="text-[10px] text-[var(--color-secondary)]">
                  {context
                    ? 'Mode Validasi Invoice aktif · Bicara santai atau klik chip di bawah'
                    : 'Mode Global ERP aktif · Bicara santai atau klik chip di bawah'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCheatSheetOpen(false)}
              className="p-1 rounded-lg hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs max-h-[55vh] overflow-y-auto pr-1 no-scrollbar">
            
            {/* TAMPILAN POPULAR JIKA DI DETAIL VALIDASI (CONTEXT AKTIF) */}
            {context ? (
              <>
                {/* Grup 1: Buka & Cari Faktur */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
                    <Search className="w-3 h-3 text-sky-500" />
                    1. Buka & Cari Invoice
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleChipClick('Buka invoice 011023')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-emerald-500/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer font-mono"
                    >
                      "Buka [nomor]"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Cari invoice')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-sky-500/60 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
                    >
                      "Cari invoice" / "Pilih"
                    </button>
                  </div>
                </div>

                {/* Grup 2: Navigasi Tab Kartu Validasi */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-emerald-500" />
                    2. Navigasi Tab Kartu Validasi
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleChipClick('Tab 1')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-emerald-500/60 transition-colors cursor-pointer"
                    >
                      "Tab 1 (Item & Tarif)"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Tab M3')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-emerald-500/60 transition-colors cursor-pointer"
                    >
                      "Tab M3 / Timbangan"
                    </button>
                    {isSea ? (
                      <button
                        type="button"
                        onClick={() => handleChipClick('Tab Overweight')}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-emerald-500/60 transition-colors cursor-pointer"
                      >
                        "Tab Overweight"
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleChipClick('Tab Freight')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-emerald-500/60 transition-colors cursor-pointer"
                    >
                      "Tab Freight Charge"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Tab Ekspedisi')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-emerald-500/60 transition-colors cursor-pointer"
                    >
                      "Tab Ekspedisi"
                    </button>
                  </div>
                </div>

                {/* Grup 3: Aksi Operasional Validasi */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
                    <Send className="w-3 h-3 text-purple-500" />
                    3. Aksi Cepat Operasional
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleChipClick('Terbitkan')}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    >
                      "Terbitkan"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Refresh')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-cyan-500/60 transition-colors cursor-pointer"
                    >
                      "Refresh" / "Segarkan"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Cetak')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-purple-500/60 transition-colors cursor-pointer"
                    >
                      "Cetak" / "Print"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Inspeksi')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-blue-500/60 transition-colors cursor-pointer"
                    >
                      "Inspeksi"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Resi')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-blue-500/60 transition-colors cursor-pointer"
                    >
                      "Resi"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('History')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-purple-500/60 transition-colors cursor-pointer"
                    >
                      "History"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Kembali')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-rose-500/60 transition-colors cursor-pointer"
                    >
                      "Kembali"
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* TAMPILAN POPULAR DI HALAMAN UMUM ERP */
              <>
                {/* Grup 1: Navigasi ERP Global */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
                    <Compass className="w-3 h-3 text-sky-500" />
                    1. Navigasi Halaman ERP
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleChipClick('Buka dashboard')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-sky-500/60 hover:text-sky-600 transition-colors cursor-pointer"
                    >
                      "Dashboard"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Buka resi')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-sky-500/60 hover:text-sky-600 transition-colors cursor-pointer"
                    >
                      "Resi (Shipments)"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Buka pengantaran')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-sky-500/60 hover:text-sky-600 transition-colors cursor-pointer"
                    >
                      "Surat Jalan (DO)"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Buka billing')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-emerald-500/60 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      "Billing / Faktur"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Buka validasi billing')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-emerald-500/60 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      "Antrean Validasi"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Buka kasir')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-amber-500/60 hover:text-amber-600 transition-colors cursor-pointer"
                    >
                      "Kasir"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Buka tarif customer')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-purple-500/60 hover:text-purple-600 transition-colors cursor-pointer"
                    >
                      "Pricelist Customer"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Buka bap')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-blue-500/60 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      "Berita Acara (BAP)"
                    </button>
                  </div>
                </div>

                {/* Grup 2: Cari & Buka Invoice Langsung */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
                    <Search className="w-3 h-3 text-emerald-500" />
                    2. Cari & Buka Invoice
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleChipClick('Buka invoice 011023')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-emerald-500/60 hover:text-emerald-600 transition-colors cursor-pointer font-mono"
                    >
                      "Buka [nomor faktur]"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Buka validasi billing')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-emerald-500/60 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      "Cari invoice draft"
                    </button>
                  </div>
                </div>

                {/* Grup 3: Tampilan & Sistem */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
                    <Palette className="w-3 h-3 text-purple-500" />
                    3. Tema & Tampilan
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleChipClick('Tema gelap')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-purple-500/60 hover:text-purple-600 transition-colors cursor-pointer"
                    >
                      "Tema gelap"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChipClick('Tema terang')}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] hover:border-amber-500/60 hover:text-amber-600 transition-colors cursor-pointer"
                    >
                      "Tema terang"
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>

          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] text-[var(--color-secondary)]">
            <span>Tekan <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border font-mono">Alt + V</kbd> untuk toggle mikrofon</span>
            {context?.currentInvNo && <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{context.currentInvNo}</span>}
          </div>
        </div>
      )}

      {/* ── UNIFIED CAPSULE HUD ─────────────────────────────────────────────── */}
      <div className="pointer-events-auto flex items-center transition-all duration-300">
        <div
          className={cn(
            'flex items-center gap-2.5 px-3.5 py-1.5 sm:py-2 rounded-full border shadow-2xl backdrop-blur-xl transition-all duration-300',
            isMuted
              ? 'bg-[var(--color-surface)]/85 border-[var(--color-border)] text-[var(--color-secondary)]'
              : commandStatus === 'executed'
              ? 'bg-[var(--color-surface)]/95 border-sky-500/60 ring-4 ring-sky-500/15 text-[var(--color-primary)]'
              : hasVoiceInput
              ? 'bg-[var(--color-surface)]/95 border-emerald-500/70 ring-4 ring-emerald-500/20 text-[var(--color-primary)]'
              : 'bg-[var(--color-surface)]/90 border-[var(--color-border)]/90 text-[var(--color-primary)] hover:border-emerald-500/40'
          )}
        >
          {/* Tombol Mic / Mute */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={cn(
              'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0',
              isMuted
                ? 'bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                : isListening && hasVoiceInput
                ? 'bg-emerald-600 text-white animate-pulse'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            )}
            title={
              isMuted
                ? 'Mikrofon dijeda. Klik atau tekan Alt+V untuk aktifkan'
                : isListening
                ? 'Mikrofon aktif mendengarkan. Klik atau tekan Alt+V untuk jeda'
                : 'Mikrofon siap. Klik untuk aktifkan'
            }
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* Body Konten HUD (Status / Waveform / Transkrip) */}
          <div className="flex items-center gap-2 min-w-0 pr-1">
            {/* Visualizer Waveform Mini (Hanya aktif saat sedang mendengar ucapan dan tidak dimute) */}
            {!isMuted && hasVoiceInput && (
              <div className="flex items-center gap-0.5 h-5 px-0.5 shrink-0">
                <span className="w-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s] h-3.5" />
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s] h-5" />
                <span className="w-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.4s] h-4" />
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.2s] h-3" />
              </div>
            )}

            {/* Text Telemetry */}
            <div className="flex flex-col min-w-0">
              {isMuted ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-[var(--color-secondary)]">Mikrofon Jeda</span>
                  <span className="text-[10px] text-[var(--color-secondary)] hidden sm:inline">(Alt+V)</span>
                </div>
              ) : commandStatus === 'executed' ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 truncate max-w-[220px] sm:max-w-[320px]">
                    {commandFeedback || 'Perintah dijalankan'}
                  </span>
                </div>
              ) : commandStatus === 'unrecognized' ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 truncate max-w-[220px] sm:max-w-[320px]">
                    {commandFeedback || 'Perintah tidak dikenali'}
                  </span>
                </div>
              ) : hasVoiceInput ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 truncate max-w-[190px] sm:max-w-[300px]">
                    "{liveText}"
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-medium text-[var(--color-primary)]">Siap Mendengar</span>
                  <span className="text-[10px] text-[var(--color-secondary)] hidden sm:inline">· Ucapkan perintah</span>
                </div>
              )}
            </div>
          </div>

          {/* Tombol Help Cheat Sheet (?) */}
          <button
            type="button"
            onClick={() => setIsCheatSheetOpen(!isCheatSheetOpen)}
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all border shrink-0 cursor-pointer',
              isCheatSheetOpen
                ? 'bg-[var(--color-tertiary)] text-white border-[var(--color-tertiary)]'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] border-[var(--color-border)]'
            )}
            title="Buka daftar perintah suara cepat"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  )
}

export default GlobalVoiceHud
