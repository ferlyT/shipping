import { useState, useRef, useEffect } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VoiceCommandStatus } from '@/stores/voiceAssistantStore'

interface ValidationVoiceHudProps {
  isSupported: boolean
  isListening: boolean
  isMuted: boolean
  transcript: string
  interimTranscript: string
  commandStatus: VoiceCommandStatus
  commandFeedback?: string
  onToggleMute: () => void
  onExecuteSimulatedCommand: (cmd: string) => void
  activeInvNo?: string
  isSea?: boolean
}

export function ValidationVoiceHud({
  isSupported,
  isListening,
  isMuted,
  transcript,
  interimTranscript,
  commandStatus,
  commandFeedback,
  onToggleMute,
  onExecuteSimulatedCommand,
  activeInvNo,
  isSea = true,
}: ValidationVoiceHudProps) {
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false)
  const cheatSheetRef = useRef<HTMLDivElement>(null)

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

  if (!isSupported) return null

  const liveText = `${transcript} ${interimTranscript}`.trim()
  const hasVoiceInput = Boolean(liveText)

  const handleChipClick = (cmd: string) => {
    setIsCheatSheetOpen(false)
    onExecuteSimulatedCommand(cmd)
  }

  return (
    <div className="fixed bottom-10 sm:bottom-14 md:bottom-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none select-none">
      
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
                  Bicara santai atau klik chip di bawah ini untuk eksekusi langsung
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

            {/* Grup 3: Aksi Operasional & Dialog */}
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

          </div>

          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] text-[var(--color-secondary)]">
            <span>Tekan <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border font-mono">Alt + V</kbd> untuk jeda mikrofon</span>
            {activeInvNo && <span className="font-mono">{activeInvNo}</span>}
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
            onClick={onToggleMute}
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
            {/* Visualizer Waveform Mini (Hanya aktif saat sedang mendengar ucapan) */}
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
export default ValidationVoiceHud
