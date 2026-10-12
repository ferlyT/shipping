import apiClient from '@/api/client'
import type {
  DataRevision,
  DataRevisionsQuery,
  LookupListCodeItem,
} from '../types/dataRevisions.types'

export const mobileDataRevisionsApi = {
  // Ambil daftar form
  getList: async (query?: DataRevisionsQuery) => {
    const res = await apiClient.get('/data-revisions', { params: query })
    return res.data
  },

  // Detail 1 form
  getDetail: async (id: number): Promise<{ success: boolean; data: DataRevision }> => {
    const res = await apiClient.get(`/data-revisions/${id}`)
    return res.data
  },

  // Ambil preview nomor form berikutnya
  getNextNumber: async (): Promise<{ success: boolean; data: { nextNumber: string; nextNomorForm?: string } }> => {
    const res = await apiClient.get('/data-revisions/next-number')
    return res.data
  },

  // Lookup fdListCode dari tbEntryList
  lookupListCode: async (q?: string): Promise<{ success: boolean; data: LookupListCodeItem[] }> => {
    const res = await apiClient.get('/data-revisions/lookup-listcode', {
      params: { q: q || '', limit: 30 },
    })
    return res.data
  },

  // Buat form baru
  create: async (payload: {
    fdNomorForm: string
    fdTipeData: string
    fdAksi: string
    fdTanggal: string
    fdDibuatOleh?: string | null
    fdStuffing?: string | null
    fdBilling?: string | null
    fdAR?: string | null
    fdDiketahui?: string | null
    fdCatatan?: string | null
    details: any[]
  }): Promise<{ success: boolean; data: DataRevision }> => {
    const res = await apiClient.post('/data-revisions', payload)
    return res.data
  },

  // Perbarui form existing
  update: async (
    id: number,
    payload: {
      fdNomorForm?: string
      fdTipeData?: string
      fdAksi?: string
      fdTanggal?: string
      fdDibuatOleh?: string | null
      fdStuffing?: string | null
      fdBilling?: string | null
      fdAR?: string | null
      fdDiketahui?: string | null
      fdCatatan?: string | null
      details?: any[]
    }
  ): Promise<{ success: boolean; data: DataRevision }> => {
    const res = await apiClient.put(`/data-revisions/${id}`, payload)
    return res.data
  },

  // Hapus form (soft delete)
  delete: async (id: number): Promise<{ success: boolean }> => {
    const res = await apiClient.delete(`/data-revisions/${id}`)
    return res.data
  },

  // Eksekusi pembatalan data inputan (fdCancel = 1)
  executeCancel: async (id: number): Promise<{ success: boolean; data: DataRevision }> => {
    const res = await apiClient.post(`/data-revisions/${id}/execute-cancel`)
    return res.data
  },

  // Upload lampiran foto (Base64 JSON dengan fallback multipart)
  uploadLampiran: async (id: number, fileUri: string, fileName?: string, keterangan?: string) => {
    const name = fileName || `lampiran-${Date.now()}.jpg`

    try {
      // 1. Jika sudah berupa data URL base64
      if (fileUri.startsWith('data:image')) {
        const res = await apiClient.post(`/data-revisions/${id}/lampiran`, {
          photoBase64: fileUri,
          fileName: name,
          keterangan,
        })
        return res.data
      }

      // 2. Baca file lokal sebagai Base64 via expo-file-system (100% reliable di React Native)
      const FileSystem = await import('expo-file-system')
      const base64Data = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const res = await apiClient.post(`/data-revisions/${id}/lampiran`, {
        photoBase64: `data:image/jpeg;base64,${base64Data}`,
        fileName: name,
        keterangan,
      })
      return res.data
    } catch {
      // 3. Fallback ke FormData jika FileSystem gagal
      const formData = new FormData()
      // @ts-ignore
      formData.append('file', {
        uri: fileUri,
        name,
        type: 'image/jpeg',
      })

      if (keterangan) {
        formData.append('keterangan', keterangan)
      }

      const res = await apiClient.post(`/data-revisions/${id}/lampiran`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return res.data
    }
  },

  // Hapus lampiran foto
  deleteLampiran: async (lampiranId: number): Promise<{ success: boolean }> => {
    const res = await apiClient.delete(`/data-revisions/lampiran/${lampiranId}`)
    return res.data
  },

  // Crop & Rotate lampiran existing via Server Sharp Engine
  cropLampiran: async (
    lampiranId: number,
    options: {
      rotate?: number
      crop?: { x: number; y: number; width: number; height: number }
      isRatio?: boolean
    }
  ): Promise<{ success: boolean; data: any }> => {
    const res = await apiClient.post(`/data-revisions/lampiran/${lampiranId}/crop`, options)
    return res.data
  },

  // Crop & Rotate base64 image (preview sebelum submit)
  cropBase64: async (
    photoBase64: string,
    options: {
      rotate?: number
      crop?: { x: number; y: number; width: number; height: number }
      isRatio?: boolean
    }
  ): Promise<{ success: boolean; data: { photoBase64: string } }> => {
    const res = await apiClient.post(`/data-revisions/crop-base64`, {
      photoBase64,
      ...options,
    })
    return res.data
  },
}

