import apiClient from '@/api/client'

export const dashboardApi = {
  stats: () => apiClient.get('/dashboard/stats'),
}
