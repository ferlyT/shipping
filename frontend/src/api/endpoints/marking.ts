import apiClient from '../client'

export const markingApi = {
  list: (params: { page: number; limit: number; search?: string; sortBy?: string; sortDir?: string; listType?: string }) => {
    return apiClient.get('/marking', { params })
  },
  detail: (id: string) => {
    return apiClient.get(`/marking/${id}`)
  }
}
