import apiClient from '../client'

export const authApi = {
  login: (data: { username: string; password: string }) =>
    apiClient.post('/auth/login', data),
  
  me: () => apiClient.get('/auth/me'),
}
