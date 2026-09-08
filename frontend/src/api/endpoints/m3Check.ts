import apiClient from '@/api/client'

export const m3CheckApi = {
  /**
   * Evaluasi M3 check mendalam berdasarkan listCode, no invoice, atau markingCode
   */
  evaluate: (identifier: string) =>
    apiClient.get(`/m3-check/${encodeURIComponent(identifier)}`),

  /**
   * Ambil rincian M3 Customer per Marking (dbo.get_qr_tbm3_perMarking_plus_rasio)
   */
  custMarkingDetails: (custCode: string, markingCode: string) =>
    apiClient.get('/m3-check/cust-marking-details', { params: { custCode, markingCode } }),
}
