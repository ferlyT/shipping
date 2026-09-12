import { create } from 'zustand'
import * as Linking from 'expo-linking'
import Constants from 'expo-constants'
import { updateService } from '../services/updateService'
import type { AppVersionData } from '../types/update'
import { useToastStore } from './toastStore'

export const CURRENT_APP_VERSION = Constants.expoConfig?.version || '1.0.0'

interface UpdateState {
  currentVersion: string
  isChecking: boolean
  isModalVisible: boolean
  updateInfo: AppVersionData | null
  hasUpdate: boolean
  lastChecked: Date | null

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

  checkUpdate: async (isManual = false) => {
    set({ isChecking: true })
    const { currentVersion } = get()
    const { showToast } = useToastStore.getState()

    try {
      const data = await updateService.getLatestVersion()
      const isNewer = updateService.isNewer(currentVersion, data.version)

      set({
        updateInfo: data,
        hasUpdate: isNewer,
        lastChecked: new Date(),
        isModalVisible: isNewer,
      })

      if (isManual) {
        if (!isNewer) {
          showToast(`Aplikasi sudah dalam versi terbaru (v${currentVersion})`, 'success')
        }
      }

      return isNewer
    } catch (error: any) {
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
    // Jika update wajib (forceUpdate), cegah penutupan dialog
    if (updateInfo?.forceUpdate) {
      return
    }
    set({ isModalVisible: false })
  },

  startDownload: async () => {
    const { updateInfo } = get()
    const { showToast } = useToastStore.getState()
    if (!updateInfo?.downloadUrl) return

    try {
      showToast('Membuka unduhan file APK...', 'info')
      await Linking.openURL(updateInfo.downloadUrl)
    } catch (err) {
      showToast('Tidak dapat membuka tautan unduhan.', 'error')
    }
  },

  openWebDownload: async () => {
    const { updateInfo } = get()
    const { showToast } = useToastStore.getState()
    const targetUrl = updateInfo?.webDownloadUrl || 'http://36.93.22.142/mshipping/download/'

    try {
      await Linking.openURL(targetUrl)
    } catch (err) {
      showToast('Tidak dapat membuka tautan web.', 'error')
    }
  },
}))
