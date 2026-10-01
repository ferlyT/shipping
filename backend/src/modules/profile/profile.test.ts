import { describe, it, expect } from 'bun:test'
import { updateProfileSchema, changePasswordSchema } from './profile.schema'

describe('Profile Module Validation Schemas', () => {
  describe('updateProfileSchema', () => {
    it('accepts valid profile updates with or without avatar', () => {
      const withAvatar = updateProfileSchema.safeParse({
        fullName: 'Jane Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      })
      expect(withAvatar.success).toBe(true)

      const withoutAvatar = updateProfileSchema.safeParse({
        fullName: 'Jane Doe',
        avatarUrl: null,
      })
      expect(withoutAvatar.success).toBe(true)
    })

    it('rejects fullName shorter than 2 characters or longer than 200', () => {
      const tooShort = updateProfileSchema.safeParse({ fullName: 'A' })
      expect(tooShort.success).toBe(false)
      if (!tooShort.success) {
        expect(tooShort.error.issues[0]?.message).toBe('Nama lengkap minimal 2 karakter')
      }

      const tooLong = updateProfileSchema.safeParse({ fullName: 'A'.repeat(201) })
      expect(tooLong.success).toBe(false)
      if (!tooLong.success) {
        expect(tooLong.error.issues[0]?.message).toBe('Nama lengkap maksimal 200 karakter')
      }
    })
  })

  describe('changePasswordSchema', () => {
    it('accepts matching current and new password', () => {
      const valid = changePasswordSchema.safeParse({
        currentPassword: 'currentsecret',
        newPassword: 'newsecretpass',
        confirmPassword: 'newsecretpass',
      })
      expect(valid.success).toBe(true)
    })

    it('rejects mismatched new and confirm passwords', () => {
      const mismatch = changePasswordSchema.safeParse({
        currentPassword: 'currentsecret',
        newPassword: 'newsecretpass',
        confirmPassword: 'completelydifferent',
      })
      expect(mismatch.success).toBe(false)
      if (!mismatch.success) {
        expect(mismatch.error.issues[0]?.message).toBe('Password baru dan konfirmasi password tidak cocok')
      }
    })

    it('rejects new password shorter than 6 characters', () => {
      const tooShort = changePasswordSchema.safeParse({
        currentPassword: 'currentsecret',
        newPassword: '12345',
        confirmPassword: '12345',
      })
      expect(tooShort.success).toBe(false)
      if (!tooShort.success) {
        expect(tooShort.error.issues[0]?.message).toBe('Password baru minimal 6 karakter')
      }
    })

    it('rejects missing current password', () => {
      const missingCurrent = changePasswordSchema.safeParse({
        currentPassword: '',
        newPassword: 'newsecretpass',
        confirmPassword: 'newsecretpass',
      })
      expect(missingCurrent.success).toBe(false)
    })
  })
})
