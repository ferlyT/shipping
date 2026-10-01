import { describe, it, expect } from 'bun:test'
import {
  CreateInspectionReportSchema,
  UpdateInspectionReportSchema,
  UploadBapPhotoSchema,
} from './inspectionReports.types'
import {
  escapeXml,
  formatDateWIB,
} from './imageWatermark.service'

describe('Inspection Reports Module', () => {
  describe('CreateInspectionReportSchema', () => {
    it('accepts valid full payload', () => {
      const payload = {
        fdReportDate: '2026-03-24T10:00:00.000Z',
        fdListType: 1,
        fdListCode: 'LC-998877',
        fdMarkingCode: 'MARK-01',
        fdMarkingNo: 'NO. 123',
        fdNamaCustomer: 'PT Maju Bersama',
        fdTerima: 'Gudang Jakarta',
        fdKeterangan: 'Kondisi kardus penyok saat diterima',
        fdStatus: '1',
      }
      const result = CreateInspectionReportSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('accepts valid minimal payload', () => {
      const payload = {
        fdReportDate: '2026-03-24',
        fdNamaCustomer: 'Budi Santoso',
      }
      const result = CreateInspectionReportSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects missing or empty fdReportDate', () => {
      const payload = {
        fdReportDate: '',
        fdNamaCustomer: 'PT Maju Bersama',
      }
      const result = CreateInspectionReportSchema.safeParse(payload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Tanggal laporan wajib diisi')
      }
    })

    it('rejects missing fdNamaCustomer', () => {
      const payload = {
        fdReportDate: '2026-03-24',
        fdNamaCustomer: '',
      }
      const result = CreateInspectionReportSchema.safeParse(payload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Nama customer wajib diisi')
      }
    })
  })

  describe('UpdateInspectionReportSchema', () => {
    it('accepts partial updates', () => {
      const payload = {
        fdKeterangan: 'Sudah diperbaiki kemasannya',
        fdStatus: '2',
      }
      const result = UpdateInspectionReportSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('accepts empty object for partial updates', () => {
      const result = UpdateInspectionReportSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('UploadBapPhotoSchema', () => {
    it('accepts valid photo payload', () => {
      const payload = {
        photoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        caption: 'Foto tampak samping kardus',
      }
      const result = UploadBapPhotoSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects empty photoBase64', () => {
      const payload = {
        photoBase64: '',
      }
      const result = UploadBapPhotoSchema.safeParse(payload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('photoBase64')
      }
    })
  })

  describe('escapeXml helper', () => {
    it('escapes XML special characters safely', () => {
      const input = 'Marking & Sons <Cargo> "Box" \'Fragile\''
      const escaped = escapeXml(input)
      expect(escaped).toBe('Marking &amp; Sons &lt;Cargo&gt; &quot;Box&quot; &apos;Fragile&apos;')
    })

    it('leaves standard text untouched', () => {
      expect(escapeXml('Standard Cargo 123')).toBe('Standard Cargo 123')
    })
  })

  describe('formatDateWIB helper', () => {
    it('converts UTC time to WIB (+7 hours) with Indonesian month abbreviations', () => {
      // 2026-05-10T03:30:15Z + 7h = 2026-05-10 10:30:15 WIB (Mei)
      const date = new Date(Date.UTC(2026, 4, 10, 3, 30, 15))
      const formatted = formatDateWIB(date)
      expect(formatted).toBe('10 Mei 2026, 10:30:15 WIB')
    })

    it('handles day rollover into next day correctly in WIB', () => {
      // 2026-07-31T20:00:00Z + 7h = 2026-08-01 03:00:00 WIB (Agu)
      const date = new Date(Date.UTC(2026, 6, 31, 20, 0, 0))
      const formatted = formatDateWIB(date)
      expect(formatted).toBe('01 Agu 2026, 03:00:00 WIB')
    })
  })
})
