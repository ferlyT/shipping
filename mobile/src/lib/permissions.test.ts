import { describe, expect, it } from 'bun:test'
import {
  isAdmin,
  hasPermission,
  canViewConsignee,
  hasTabAccess,
  canViewBillingValidation,
  canManageInspectionReports,
  canManageDataRevisions,
  canManageBatchExitDate,
  canManageBillingAttachments,
  canDeleteBillingAttachment,
} from './permissions'
import type { User } from '@/stores/authStore'

describe('mobile permissions helper', () => {
  const adminUser: User = {
    id: 'u-admin',
    username: 'admin',
    fullName: 'System Administrator',
    role: 'admin',
    permissions: [],
  }

  const superadminUser: User = {
    id: 'u-super',
    username: 'superadmin',
    fullName: 'Super Admin',
    role: 'superadmin',
    permissions: [],
  }

  const staffUser: User = {
    id: 'u-staff',
    username: 'staff',
    fullName: 'Operations Staff',
    role: 'staff',
    permissions: [
      '/mshipping/logistics/shipments',
      '/mshipping/finance/billing',
    ],
  }

  const guestUser: User = {
    id: 'u-guest',
    username: 'guest',
    fullName: 'Guest User',
    role: 'viewer',
    permissions: [],
  }

  describe('isAdmin', () => {
    it('returns true for admin role', () => {
      expect(isAdmin(adminUser)).toBe(true)
    })

    it('returns true for superadmin role', () => {
      expect(isAdmin(superadminUser)).toBe(true)
    })

    it('returns true if permissions include wildcard /*', () => {
      const wildcardUser: User = { ...guestUser, permissions: ['/*'] }
      expect(isAdmin(wildcardUser)).toBe(true)
    })

    it('returns false for regular users or null/undefined', () => {
      expect(isAdmin(staffUser)).toBe(false)
      expect(isAdmin(guestUser)).toBe(false)
      expect(isAdmin(null)).toBe(false)
      expect(isAdmin(undefined)).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('always returns true for admins', () => {
      expect(hasPermission(adminUser, '/any/random/path')).toBe(true)
      expect(hasPermission(superadminUser, '/any/random/path')).toBe(true)
    })

    it('returns false for null or undefined user', () => {
      expect(hasPermission(null, '/mshipping/logistics')).toBe(false)
      expect(hasPermission(undefined, '/mshipping/logistics')).toBe(false)
    })

    it('returns false when user has empty permissions', () => {
      expect(hasPermission(guestUser, '/mshipping/logistics')).toBe(false)
    })

    it('matches exact permissions', () => {
      expect(hasPermission(staffUser, '/mshipping/logistics/shipments')).toBe(true)
      expect(hasPermission(staffUser, '/mshipping/master/customers')).toBe(false)
    })

    it('matches prefix or subpath permissions', () => {
      const subpathUser: User = {
        ...guestUser,
        permissions: ['/mshipping/logistics'],
      }
      expect(hasPermission(subpathUser, '/mshipping/logistics/shipments')).toBe(true)
      expect(hasPermission(staffUser, '/mshipping/logistics')).toBe(false)
    })
  })

  describe('canViewConsignee', () => {
    it('allows admin unconditionally', () => {
      expect(canViewConsignee(adminUser)).toBe(true)
    })

    it('allows users with billing.view_consignee permission', () => {
      const permittedUser: User = { ...staffUser, permissions: ['billing.view_consignee'] }
      expect(canViewConsignee(permittedUser)).toBe(true)
    })

    it('allows users with full path /mshipping/finance/billing/view_consignee', () => {
      const permittedUser: User = { ...staffUser, permissions: ['/mshipping/finance/billing/view_consignee'] }
      expect(canViewConsignee(permittedUser)).toBe(true)
    })

    it('denies users without consignee permission or unauthenticated', () => {
      expect(canViewConsignee(staffUser)).toBe(false)
      expect(canViewConsignee(guestUser)).toBe(false)
      expect(canViewConsignee(null)).toBe(false)
    })
  })

  describe('hasTabAccess', () => {
    it('returns false for null/undefined user', () => {
      expect(hasTabAccess(null, 'logistics')).toBe(false)
      expect(hasTabAccess(undefined, 'finance')).toBe(false)
    })

    it('allows admins access to all tabs', () => {
      expect(hasTabAccess(adminUser, 'overview')).toBe(true)
      expect(hasTabAccess(adminUser, 'logistics')).toBe(true)
      expect(hasTabAccess(adminUser, 'finance')).toBe(true)
      expect(hasTabAccess(adminUser, 'master')).toBe(true)
      expect(hasTabAccess(adminUser, 'profile')).toBe(true)
    })

    it('allows overview and profile tabs for all logged in users', () => {
      expect(hasTabAccess(guestUser, 'overview')).toBe(true)
      expect(hasTabAccess(guestUser, 'profile')).toBe(true)
    })

    it('evaluates logistics tab based on permissions', () => {
      expect(hasTabAccess(staffUser, 'logistics')).toBe(true)
      expect(hasTabAccess(guestUser, 'logistics')).toBe(false)
    })

    it('evaluates finance tab based on permissions', () => {
      expect(hasTabAccess(staffUser, 'finance')).toBe(true)
      expect(hasTabAccess(guestUser, 'finance')).toBe(false)
    })

    it('evaluates master tab based on permissions', () => {
      expect(hasTabAccess(staffUser, 'master')).toBe(false)
      const masterUser: User = { ...guestUser, permissions: ['/mshipping/master/customers'] }
      expect(hasTabAccess(masterUser, 'master')).toBe(true)
    })
  })

  describe('canViewBillingValidation', () => {
    it('allows admin unconditionally', () => {
      expect(canViewBillingValidation(adminUser)).toBe(true)
    })

    it('allows user with validation permissions', () => {
      const valUser: User = { ...guestUser, permissions: ['/mshipping/finance/billing/validation'] }
      expect(canViewBillingValidation(valUser)).toBe(true)
    })

    it('denies user without validation permission or unauthenticated', () => {
      expect(canViewBillingValidation(staffUser)).toBe(false)
      expect(canViewBillingValidation(null)).toBe(false)
    })
  })

  describe('canManageInspectionReports', () => {
    it('allows admin unconditionally', () => {
      expect(canManageInspectionReports(adminUser)).toBe(true)
    })

    it('allows user with inspection permissions', () => {
      const inspUser: User = { ...guestUser, permissions: ['/mshipping/logistics/inspection'] }
      expect(canManageInspectionReports(inspUser)).toBe(true)
    })

    it('denies user who only has shipments permission (granular isolation)', () => {
      expect(canManageInspectionReports(staffUser)).toBe(false)
    })

    it('denies user without inspection permissions or unauthenticated', () => {
      expect(canManageInspectionReports(guestUser)).toBe(false)
      expect(canManageInspectionReports(null)).toBe(false)
    })
  })

  describe('canManageDataRevisions', () => {
    it('allows admin unconditionally', () => {
      expect(canManageDataRevisions(adminUser)).toBe(true)
    })

    it('allows user with data revisions permission', () => {
      const revUser: User = { ...guestUser, permissions: ['/mshipping/logistics/data-revisions'] }
      expect(canManageDataRevisions(revUser)).toBe(true)
    })

    it('denies user who only has shipments permission', () => {
      expect(canManageDataRevisions(staffUser)).toBe(false)
    })

    it('denies unauthenticated user', () => {
      expect(canManageDataRevisions(null)).toBe(false)
    })
  })

  describe('canManageBatchExitDate', () => {
    it('allows admin unconditionally', () => {
      expect(canManageBatchExitDate(adminUser)).toBe(true)
    })

    it('allows user with batch marking permission', () => {
      const batchUser: User = { ...guestUser, permissions: ['/mshipping/logistics/batches'] }
      expect(canManageBatchExitDate(batchUser)).toBe(true)
    })

    it('denies user who only has shipments permission', () => {
      expect(canManageBatchExitDate(staffUser)).toBe(false)
    })

    it('denies unauthenticated user', () => {
      expect(canManageBatchExitDate(null)).toBe(false)
    })
  })

  describe('canManageBillingAttachments & canDeleteBillingAttachment', () => {
    it('allows admin unconditionally', () => {
      expect(canManageBillingAttachments(adminUser)).toBe(true)
      expect(canDeleteBillingAttachment(adminUser)).toBe(true)
    })

    it('allows upload for user with billing attachments permission', () => {
      const uploadUser: User = { ...guestUser, permissions: ['/mshipping/finance/billing/attachments'] }
      expect(canManageBillingAttachments(uploadUser)).toBe(true)
      expect(canDeleteBillingAttachment(uploadUser)).toBe(false)
    })

    it('allows delete only for user with attachments delete permission', () => {
      const deleteUser: User = { ...guestUser, permissions: ['/mshipping/finance/billing/attachments/delete'] }
      expect(canDeleteBillingAttachment(deleteUser)).toBe(true)
    })

    it('denies unauthenticated user', () => {
      expect(canManageBillingAttachments(null)).toBe(false)
      expect(canDeleteBillingAttachment(null)).toBe(false)
    })
  })
})
