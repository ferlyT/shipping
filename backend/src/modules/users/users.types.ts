import { z } from 'zod'

export const UpdateUserStatusSchema = z.object({
  isActive: z.boolean(),
})

export const UpdateUserRoleSchema = z.object({
  role: z.string().min(1, 'Role wajib diisi'),
})

export const UpdateUserEmployeeSchema = z.object({
  fdEmpCode: z.string().nullable().optional(),
})

export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusSchema>
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>
export type UpdateUserEmployeeInput = z.infer<typeof UpdateUserEmployeeSchema>
