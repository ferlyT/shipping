import { create } from 'zustand'
import * as Linking from 'expo-linking'
import Constants from 'expo-constants'
import { APP_VERSION } from '../config/version'
import { updateService } from '../services/updateService'
import type { AppVersionData } from '../types/update'
import { useToastStore } from './toastStore'

export const CURRENT_APP_VERSION = APP_VERSION || Constants.expoConfig?.version || '1.0.5'

interface UpdateState {
  currentVersion: string
  isChecking: boolean
  isModalVisible: boolean
  updateInfo: AppVersionData | null
  hasUpdate: boolean
  lastChecked: Date | null
  dismissedVersion: string | null

  checkUpdate: (isManual?: boolean) => Promise<boolean>
  openModal: () => void
  dismissModal: () => void
  startDownload: () => Promise<void>
  openWebDownload: () => Promise<void>
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  currentVersion: CURRENT_APP_VERSION,
  isChecking: false,
  isModalVisible: false,
  updateInfo: null,
  hasUpdate: false,
  lastChecked: null,
  dismissedVersion: null,

  checkUpdate: async (isManual = false) => {
    set({ isChecking: true })
    const { currentVersion, dismissedVersion } = get()
    const { showToast } = useToastStore.getState()

    try {
      const data = await updateService.getLatestVersion()
      const isNewer = updateService.isNewer(currentVersion, data.version)
      const shouldShowModal = isNewer && (isManual || data.forceUpdate || dismissedVersion !== data.version)

      set({
        updateInfo: data,
        hasUpdate: isNewer,
        lastChecked: new Date(),
        isModalVisible: shouldShowModal,
      })

      if (isManual) {
        if (!isNewer) {
          showToast(`Aplikasi sudah dalam versi terbaru (v${currentVersion})`, 'success')
        }
      }

      return isNewer
    } catch {
      if (isManual) {
        showToast('Gagal memeriksa pembaruan. Pastikan server terhubung.', 'error')
      }
      return false
    } finally {
      set({ isChecking: false })
    }
  },

  openModal: () => {
    const { updateInfo } = get()
    if (updateInfo) {
      set({ isModalVisible: true })
    }
  },

  dismissModal: () => {
    const { updateInfo } = get()
    if (updateInfo?.forceUpdate) {
      return
    }
    set({
      isModalVisible: false,
      dismissedVersion: updateInfo?.version || null,
    })
  },

  startDownload: async () => {
    const { updateInfo } = get()
    const { showToast } = useToastStore.getState()
    if (!updateInfo?.downloadUrl) return

    try {
      showToast('Mengunduh pembaruan APK... Cek notifikasi HP Anda.', 'info')
      await Linking.openURL(updateInfo.downloadUrl)
    } catch {
      showToast('Tidak dapat membuka tautan unduhan.', 'error')
    }
  },

  openWebDownload: async () => {
    const { updateInfo } = get()
    const { showToast } = useToastStore.getState()
    const targetUrl = updateInfo?.webDownloadUrl || 'http://36.93.22.142/mshipping/download/'

    try {
      await Linking.openURL(targetUrl)
    } catch {
      showToast('Tidak dapat membuka tautan web.', 'error')
    }
  },
}))
