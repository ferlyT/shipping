import apiClient from '@/api/client'

export const authApi = {
  login: (data: { username: string; password: string }) =>
    apiClient.post('/auth/login', data),
  
  register: (data: { username: string; fullName: string; password: string }) =>
    apiClient.post('/auth/register', data),
  
  me: () => apiClient.get('/auth/me'),
}
