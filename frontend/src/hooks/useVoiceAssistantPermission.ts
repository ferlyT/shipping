import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/lib/constants'

/**
 * Hook untuk memvalidasi hak akses role terhadap fitur Global ERP Voice Assistant.
 * Admin memiliki hak akses penuh (bypass).
 * Role lain harus memiliki izin explicit '/mshipping/voice-assistant' di tbRolePermissions.
 */
export function useVoiceAssistantPermission(): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  if (user.role?.toLowerCase() === 'admin') return true
  const perms = user.permissions || []
  return (
    perms.includes('/*') ||
    perms.includes(ROUTES.VOICE_ASSISTANT) ||
    perms.includes('/mshipping/voice-assistant')
  )
}
