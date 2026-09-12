import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  type BillReportConfig,
  DEFAULT_BILL_REPORT_CONFIG,
} from '../types/report-designer.types'
import { billingApi } from '../services/billing.service'

interface ReportDesignerState {
  config: BillReportConfig
  isLoadingBackend: boolean
  isSavingBackend: boolean
  lastSyncedAt: string | null
  updatedBy: string | null
  updateConfig: (patch: Partial<BillReportConfig>) => void
  resetToDefault: () => void
  importConfig: (jsonString: string) => boolean
  exportConfig: () => string
  loadFromBackend: () => Promise<void>
  saveToBackend: () => Promise<boolean>
}

export const useReportDesignerStore = create<ReportDesignerState>()(
  persist(
    (set, get) => ({
      config: { ...DEFAULT_BILL_REPORT_CONFIG },
      isLoadingBackend: false,
      isSavingBackend: false,
      lastSyncedAt: null,
      updatedBy: null,

      updateConfig: (patch) => {
        set((state) => ({
          config: {
            ...state.config,
            ...patch,
          },
        }))
      },

      resetToDefault: () => {
        set({ config: { ...DEFAULT_BILL_REPORT_CONFIG } })
      },

      importConfig: (jsonString: string) => {
        try {
          const parsed = JSON.parse(jsonString)
          if (typeof parsed === 'object' && parsed !== null) {
            set((state) => ({
              config: {
                ...state.config,
                ...parsed,
              },
            }))
            return true
          }
        } catch (e) {
          console.error('Failed to parse import config JSON', e)
        }
        return false
      },

      exportConfig: () => {
        return JSON.stringify(get().config, null, 2)
      },

      loadFromBackend: async () => {
        set({ isLoadingBackend: true })
        try {
          const res = await billingApi.getReportTemplate()
          const data = res.data?.data
          if (data && data.config) {
            set({
              config: {
                ...DEFAULT_BILL_REPORT_CONFIG,
                ...data.config,
              },
              updatedBy: data.updatedBy || null,
              lastSyncedAt: data.updatedAt || new Date().toISOString(),
            })
          }
        } catch (err) {
          console.warn('Gagal memuat template dari backend, menggunakan cache lokal:', err)
        } finally {
          set({ isLoadingBackend: false })
        }
      },

      saveToBackend: async () => {
        set({ isSavingBackend: true })
        try {
          const currentConfig = get().config
          const res = await billingApi.saveReportTemplate(currentConfig)
          const data = res.data?.data
          if (data) {
            set({
              updatedBy: data.updatedBy || null,
              lastSyncedAt: data.updatedAt || new Date().toISOString(),
            })
          }
          return true
        } catch (err) {
          console.error('Gagal menyimpan template ke backend:', err)
          return false
        } finally {
          set({ isSavingBackend: false })
        }
      },
    }),
    {
      name: 'shipping_bill_template_v2',
      partialize: (state) => ({
        config: state.config,
        lastSyncedAt: state.lastSyncedAt,
        updatedBy: state.updatedBy,
      }),
    }
  )
)

