import { create } from 'zustand'
import type { SummaryModalTab } from '@/features/billing/components/validation-summary/types'

export interface VoiceAssistantContext {
  currentInvNo?: string
  isIssued?: boolean
  underchargedCount?: number
  isSea?: boolean
  onOpenSummary?: (tab?: SummaryModalTab) => void
  onCloseSummary?: () => void
  onTriggerIssue?: () => void
  onRefreshValidation?: () => void
  onSwitchTab?: (tabKey: string) => void
  onNavigateInvoice?: (target: string) => void
  onOpenDrawer?: () => void
  onPrintInvoice?: () => void
  onOpenModal?: (modalName: 'summary' | 'issue' | 'resi' | 'history' | 'audit' | 'inspection' | 'tarif') => void
  onBack?: () => void
}

export type VoiceDisplayMode = 'modal' | 'hud'
export type VoiceCommandStatus = 'idle' | 'listening' | 'evaluating' | 'executed' | 'unrecognized'

interface VoiceAssistantState {
  isOpen: boolean
  displayMode: VoiceDisplayMode
  context: VoiceAssistantContext | null
  suppressionCount: number
  isSuppressed: boolean
  isListening: boolean
  isMuted: boolean
  transcript: string
  interimTranscript: string
  commandStatus: VoiceCommandStatus
  commandFeedback: string

  suppressVoice: () => () => void
  openAssistant: () => void
  closeAssistant: () => void
  toggleAssistant: () => void
  setDisplayMode: (mode: VoiceDisplayMode) => void
  registerContext: (ctx: VoiceAssistantContext) => void
  unregisterContext: () => void
  setVoiceTelemetry: (data: Partial<Pick<VoiceAssistantState, 'isListening' | 'isMuted' | 'transcript' | 'interimTranscript'>>) => void
  setCommandStatus: (status: VoiceCommandStatus, feedback?: string) => void
  toggleVoiceMute: () => void
  setVoiceMuted: (muted: boolean) => void
}

export const useVoiceAssistantStore = create<VoiceAssistantState>((set, get) => ({
  isOpen: false,
  displayMode: 'hud',
  context: null,
  suppressionCount: 0,
  isSuppressed: false,
  isListening: false,
  isMuted: true,
  transcript: '',
  interimTranscript: '',
  commandStatus: 'idle',
  commandFeedback: '',

  suppressVoice: () => {
    set((state) => {
      const nextCount = state.suppressionCount + 1
      return { suppressionCount: nextCount, isSuppressed: true, isOpen: false }
    })
    return () => {
      set((state) => {
        const nextCount = Math.max(0, state.suppressionCount - 1)
        return { suppressionCount: nextCount, isSuppressed: nextCount > 0 }
      })
    }
  },

  openAssistant: () => {
    const { isSuppressed, displayMode } = get()
    // Jika sedang dalam HUD mode, openAssistant men-toggle mute/unmute HUD
    if (displayMode === 'hud') {
      set({ isMuted: false })
      return
    }
    if (isSuppressed) return
    set({ isOpen: true })
  },

  closeAssistant: () => set({ isOpen: false }),

  toggleAssistant: () => {
    const { isSuppressed, displayMode, isMuted } = get()
    if (displayMode === 'hud') {
      set({ isMuted: !isMuted })
      return
    }
    if (isSuppressed) return
    set((state) => ({ isOpen: !state.isOpen }))
  },

  setDisplayMode: (mode) => set({ displayMode: mode }),

  registerContext: (ctx) => set({ context: ctx }),
  unregisterContext: () => set({ context: null }),

  setVoiceTelemetry: (data) => set((state) => ({ ...state, ...data })),

  setCommandStatus: (status, feedback = '') => set({ commandStatus: status, commandFeedback: feedback }),

  toggleVoiceMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setVoiceMuted: (muted) => set({ isMuted: muted }),
}))
