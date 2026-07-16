import apiClient from '../client'

export const dashboardApi = {
  stats: () => apiClient.get('/dashboard/stats'),
}
