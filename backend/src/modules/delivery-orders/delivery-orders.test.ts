import { describe, expect, it } from 'bun:test'
import {
  CreateCustomerDestinationSchema,
  ConfirmDeliverySchema,
} from './deliveryOrders.types'

describe('Delivery Orders Validation Schemas', () => {
  describe('CreateCustomerDestinationSchema', () => {
    it('accepts valid customer destination data', () => {
      const payload = {
        fdCustCode: 'CUST-3001',
        fdContact: 'Budi Santoso',
        fdHP: '08123456789',
        fdAddr: 'Jl. Margomulyo Indah Blok A-1, Surabaya',
        fdCity: 'Surabaya',
      }
      const result = CreateCustomerDestinationSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects missing address or customer code', () => {
      const payload = {
        fdCustCode: '',
        fdAddr: '',
      }
      const result = CreateCustomerDestinationSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('ConfirmDeliverySchema', () => {
    it('accepts valid delivery confirmation data', () => {
      const payload = {
        sjNos: ['SJ-2601001', 'SJ-2601002'],
        fdSndDate: '2026-10-01',
        fdCarID: 'B 1234 CD',
        fdSupir: 'Joko Widodo',
        fdTelpSupir: '081999888777',
      }
      const result = ConfirmDeliverySchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('accepts delivery confirmation with expedition data', () => {
      const payload = {
        sjNos: ['SJ-2601003'],
        fdSndDate: '2026-10-01',
        fdCarID: 'EXPEDISI',
        fdSupir: 'JNE Trucking',
        expedition: {
          fdExpID: 'EXP-01',
          fdResiExp: 'JNE99887766',
          fdCurrExp: 'RP.',
          fdTotalExp: 150000,
          fdPaid: 1,
        },
      }
      const result = ConfirmDeliverySchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects empty sjNos array or missing supir', () => {
      const payload = {
        sjNos: [],
        fdSndDate: '2026-10-01',
        fdCarID: 'B 1234 CD',
        fdSupir: '',
      }
      const result = ConfirmDeliverySchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })
})
