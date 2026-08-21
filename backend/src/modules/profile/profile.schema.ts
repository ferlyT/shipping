import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter').max(200, 'Nama lengkap maksimal 200 karakter'),
  avatarUrl: z.string().nullable().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter').max(100, 'Password baru maksimal 100 karakter'),
  confirmPassword: z.string().min(1, 'Konfirmasi password baru wajib diisi'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Password baru dan konfirmasi password tidak cocok',
  path: ['confirmPassword'],
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
