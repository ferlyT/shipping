import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '../services/profile.service'
import type { UpdateProfileInput, ChangePasswordInput } from '../types/profile.types'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { useTranslation } from '@/hooks/useTranslation'

export function useProfile() {
  const queryClient = useQueryClient()
  const { updateUser } = useAuthStore()
  const { t } = useTranslation()

  const profileQuery = useQuery({
    queryKey: ['user-profile'],
    queryFn: profileApi.getProfile,
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileInput) => profileApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      updateUser({
        fullName: updatedUser.fullName,
        avatarUrl: updatedUser.avatarUrl,
      })
      queryClient.setQueryData(['user-profile'], updatedUser)
      toast.success(t('profile.profileUpdated'))
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Gagal memperbarui profil')
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordInput) => profileApi.changePassword(data),
    onSuccess: () => {
      toast.success(t('profile.passwordChanged'))
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Gagal mengubah password')
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: (res) => {
      updateUser({
        avatarUrl: res.avatarUrl,
        fullName: res.user.fullName,
      })
      queryClient.setQueryData(['user-profile'], res.user)
      toast.success(t('profile.profileUpdated'))
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Gagal mengunggah foto profil')
    },
  })

  const deleteAvatarMutation = useMutation({
    mutationFn: profileApi.deleteAvatar,
    onSuccess: (updatedUser) => {
      updateUser({
        avatarUrl: null,
      })
      queryClient.setQueryData(['user-profile'], updatedUser)
      toast.success(t('profile.profileUpdated'))
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Gagal menghapus foto profil')
    },
  })

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    isFetching: profileQuery.isFetching,
    refetch: profileQuery.refetch,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    changePassword: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
    uploadAvatar: uploadAvatarMutation.mutateAsync,
    isUploadingAvatar: uploadAvatarMutation.isPending,
    deleteAvatar: deleteAvatarMutation.mutateAsync,
    isDeletingAvatar: deleteAvatarMutation.isPending,
  }
}
