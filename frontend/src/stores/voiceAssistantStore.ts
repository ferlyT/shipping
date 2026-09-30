import { create } from 'zustand'
import type { SummaryModalTab } from '@/features/billing/components/validation-summary/types'

export interface VoiceAssistantContext {
  currentInvNo?: string
  isIssued?: boolean
  underchargedCount?: number
  onOpenSummary?: (tab?: SummaryModalTab) => void
  onCloseSummary?: () => void
  onTriggerIssue?: () => void
  onRefreshValidation?: () => void
}

interface VoiceAssistantState {
  isOpen: boolean
  context: VoiceAssistantContext | null
  suppressionCount: number
  isSuppressed: boolean
  suppressVoice: () => () => void
  openAssistant: () => void
  closeAssistant: () => void
  toggleAssistant: () => void
  registerContext: (ctx: VoiceAssistantContext) => void
  unregisterContext: () => void
}

export const useVoiceAssistantStore = create<VoiceAssistantState>((set) => ({
  isOpen: false,
  context: null,
  suppressionCount: 0,
  isSuppressed: false,
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
    if (useVoiceAssistantStore.getState().isSuppressed) return
    set({ isOpen: true })
  },
  closeAssistant: () => set({ isOpen: false }),
  toggleAssistant: () => {
    if (useVoiceAssistantStore.getState().isSuppressed) return
    set((state) => ({ isOpen: !state.isOpen }))
  },
  registerContext: (ctx) => set({ context: ctx }),
  unregisterContext: () => set({ context: null }),
}))
