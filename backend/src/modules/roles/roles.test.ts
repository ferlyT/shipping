import { describe, it, expect } from 'bun:test'
import { isValidRoleName, UpdateRolePermissionsSchema, ROLE_NAME_PATTERN } from './roles.types'

describe('Roles Module', () => {
  describe('isValidRoleName helper & regex pattern', () => {
    it('accepts standard alphanumeric role names', () => {
      expect(isValidRoleName('admin')).toBe(true)
      expect(isValidRoleName('finance')).toBe(true)
      expect(isValidRoleName('sales1')).toBe(true)
      expect(isValidRoleName('CashierManager')).toBe(true)
    })

    it('accepts roles with hyphens and underscores', () => {
      expect(isValidRoleName('super-admin')).toBe(true)
      expect(isValidRoleName('ops_lead')).toBe(true)
      expect(isValidRoleName('branch_manager-surabaya')).toBe(true)
    })

    it('rejects null, undefined, or empty strings', () => {
      expect(isValidRoleName(null)).toBe(false)
      expect(isValidRoleName(undefined)).toBe(false)
      expect(isValidRoleName('')).toBe(false)
      expect(isValidRoleName('   ')).toBe(false)
    })

    it('rejects roles with spaces or special characters', () => {
      expect(isValidRoleName('super admin')).toBe(false)
      expect(isValidRoleName('admin@shipping')).toBe(false)
      expect(isValidRoleName('finance/ops')).toBe(false)
      expect(isValidRoleName('manager#1')).toBe(false)
      expect(isValidRoleName('<script>')).toBe(false)
    })

    it('rejects role names exceeding 50 characters', () => {
      const longRole = 'a'.repeat(51)
      expect(isValidRoleName(longRole)).toBe(false)

      const validFifty = 'a'.repeat(50)
      expect(isValidRoleName(validFifty)).toBe(true)
    })
  })

  describe('UpdateRolePermissionsSchema validation', () => {
    it('validates a valid permissions list', () => {
      const validPayload = {
        permissions: [
          { path: '/finance/invoices', canView: true },
          { path: '/finance/payroll', canView: false },
        ],
      }
      const result = UpdateRolePermissionsSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.permissions).toHaveLength(2)
        expect(result.data.permissions[0]!.path).toBe('/finance/invoices')
        expect(result.data.permissions[0]!.canView).toBe(true)
      }
    })

    it('fails when permissions array is empty', () => {
      const emptyPayload = { permissions: [] }
      const result = UpdateRolePermissionsSchema.safeParse(emptyPayload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Daftar permissions tidak boleh kosong')
      }
    })

    it('fails when path is empty string', () => {
      const invalidPathPayload = {
        permissions: [{ path: '', canView: true }],
      }
      const result = UpdateRolePermissionsSchema.safeParse(invalidPathPayload)
      expect(result.success).toBe(false)
    })

    it('fails when canView is not a boolean', () => {
      const invalidTypePayload = {
        permissions: [{ path: '/reports', canView: 'true' as any }],
      }
      const result = UpdateRolePermissionsSchema.safeParse(invalidTypePayload)
      expect(result.success).toBe(false)
    })
  })
})
