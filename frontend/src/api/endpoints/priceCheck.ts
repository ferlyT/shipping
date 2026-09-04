import apiClient from '@/api/client'

export const priceCheckApi = {
  /**
   * Evaluasi kesesuaian harga transaksi dengan payload JSON
   */
  evaluate: (params: {
    listCode?: string
    markingCode?: string
    markingNo?: string
    customer?: string
    custCode?: string
    branch?: string
    sales?: string
    type?: string
    comodity?: string
    mode?: string
    harga?: number
  }) => apiClient.post('/price-check/evaluate', params),

  /**
   * Evaluasi cepat kesesuaian harga berdasarkan listCode
   */
  byEntry: (listCode: string) =>
    apiClient.get(`/price-check/entry/${encodeURIComponent(listCode)}`),
}
