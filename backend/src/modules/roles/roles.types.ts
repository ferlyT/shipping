import { z } from 'zod'

export const ROLE_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,50}$/

export function isValidRoleName(role?: string | null): boolean {
  if (!role) return false
  return ROLE_NAME_PATTERN.test(role.trim())
}

export const UpdateRolePermissionsSchema = z.object({
  permissions: z.array(
    z.object({
      path: z.string().min(1, 'Path izin tidak boleh kosong'),
      canView: z.boolean(),
      isDefault: z.boolean().optional().default(false),
    })
  ).min(1, 'Daftar permissions tidak boleh kosong'),
})

export type UpdateRolePermissionsInput = z.infer<typeof UpdateRolePermissionsSchema>
