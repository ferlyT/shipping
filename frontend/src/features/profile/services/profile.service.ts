import apiClient from '@/api/client'
import type { UserProfile, UpdateProfileInput, ChangePasswordInput } from '../types/profile.types'

export const profileApi = {
  async getProfile(): Promise<UserProfile> {
    const res = await apiClient.get('/profile')
    return res.data.data
  },

  async updateProfile(data: UpdateProfileInput): Promise<UserProfile> {
    const res = await apiClient.put('/profile', data)
    return res.data.data
  },

  async changePassword(data: ChangePasswordInput): Promise<{ message: string }> {
    const res = await apiClient.put('/profile/password', data)
    return res.data.data
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string; user: UserProfile }> {
    const formData = new FormData()
    formData.append('avatar', file)

    const res = await apiClient.post('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data.data
  },

  async deleteAvatar(): Promise<UserProfile> {
    const res = await apiClient.delete('/profile/avatar')
    return res.data.data
  },
}
