import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

export type RegisterInput = z.infer<typeof registerSchema>
