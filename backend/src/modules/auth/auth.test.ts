import { describe, it, expect } from 'bun:test'
import { loginSchema, registerSchema } from './auth.schema'

describe('Auth Module Validation Schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const result = loginSchema.safeParse({
        username: 'admin',
        password: 'securepassword',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.username).toBe('admin')
        expect(result.data.password).toBe('securepassword')
      }
    })

    it('rejects empty username or password', () => {
      expect(loginSchema.safeParse({ username: '', password: '123' }).success).toBe(false)
      expect(loginSchema.safeParse({ username: 'admin', password: '' }).success).toBe(false)
      expect(loginSchema.safeParse({}).success).toBe(false)
    })
  })

  describe('registerSchema', () => {
    it('accepts valid registration data', () => {
      const result = registerSchema.safeParse({
        username: 'newuser',
        fullName: 'New User Account',
        password: 'password123',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.username).toBe('newuser')
        expect(result.data.fullName).toBe('New User Account')
      }
    })

    it('rejects username shorter than 3 characters', () => {
      const result = registerSchema.safeParse({
        username: 'ab',
        fullName: 'Valid Name',
        password: 'password123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Username minimal 3 karakter')
      }
    })

    it('rejects empty fullName', () => {
      const result = registerSchema.safeParse({
        username: 'validuser',
        fullName: '',
        password: 'password123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Nama lengkap wajib diisi')
      }
    })

    it('rejects password shorter than 6 characters', () => {
      const result = registerSchema.safeParse({
        username: 'validuser',
        fullName: 'Valid Name',
        password: '12345',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Password minimal 6 karakter')
      }
    })
  })
})
