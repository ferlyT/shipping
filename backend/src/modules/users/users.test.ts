import { describe, it, expect } from 'bun:test'
import {
  UpdateUserStatusSchema,
  UpdateUserRoleSchema,
  UpdateUserEmployeeSchema,
} from './users.types'

describe('Users Module', () => {
  describe('UpdateUserStatusSchema', () => {
    it('accepts boolean isActive true and false', () => {
      expect(UpdateUserStatusSchema.safeParse({ isActive: true }).success).toBe(true)
      expect(UpdateUserStatusSchema.safeParse({ isActive: false }).success).toBe(true)
    })

    it('rejects non-boolean values or missing fields', () => {
      expect(UpdateUserStatusSchema.safeParse({ isActive: 'true' }).success).toBe(false)
      expect(UpdateUserStatusSchema.safeParse({ isActive: 1 }).success).toBe(false)
      expect(UpdateUserStatusSchema.safeParse({ isActive: null }).success).toBe(false)
      expect(UpdateUserStatusSchema.safeParse({}).success).toBe(false)
    })
  })

  describe('UpdateUserRoleSchema', () => {
    it('accepts valid non-empty role string', () => {
      const parsed = UpdateUserRoleSchema.safeParse({ role: 'admin' })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.role).toBe('admin')
      }
    })

    it('rejects empty role or missing role', () => {
      const emptyResult = UpdateUserRoleSchema.safeParse({ role: '' })
      expect(emptyResult.success).toBe(false)
      if (!emptyResult.success) {
        expect(emptyResult.error.issues[0]?.message).toBe('Role wajib diisi')
      }

      expect(UpdateUserRoleSchema.safeParse({}).success).toBe(false)
      expect(UpdateUserRoleSchema.safeParse({ role: null }).success).toBe(false)
    })
  })

  describe('UpdateUserEmployeeSchema', () => {
    it('accepts valid fdEmpCode string', () => {
      const parsed = UpdateUserEmployeeSchema.safeParse({ fdEmpCode: 'EMP001' })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.fdEmpCode).toBe('EMP001')
      }
    })

    it('accepts null or omitted fdEmpCode to unlink employee', () => {
      expect(UpdateUserEmployeeSchema.safeParse({ fdEmpCode: null }).success).toBe(true)
      expect(UpdateUserEmployeeSchema.safeParse({}).success).toBe(true)
    })

    it('rejects non-string values', () => {
      expect(UpdateUserEmployeeSchema.safeParse({ fdEmpCode: 12345 }).success).toBe(false)
      expect(UpdateUserEmployeeSchema.safeParse({ fdEmpCode: true }).success).toBe(false)
    })
  })
})
