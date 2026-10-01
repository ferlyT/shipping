import { describe, it, expect } from 'bun:test'
import {
  ROUTES,
  PAGE_SIZES,
  DEFAULT_PAGE_SIZE,
  DEBOUNCE_DELAY,
} from './constants'

describe('Frontend Constants', () => {
  describe('Static ROUTES paths', () => {
    it('defines authentication and dashboard routes', () => {
      expect(ROUTES.LOGIN).toBe('/mshipping/login')
      expect(ROUTES.REGISTER).toBe('/mshipping/register')
      expect(ROUTES.DASHBOARD).toBe('/mshipping/overview/dashboard')
    })

    it('defines logistics routes correctly', () => {
      expect(ROUTES.SHIPMENTS).toBe('/mshipping/logistics/shipments')
      expect(ROUTES.SHIPMENTS_LIST).toBe('/mshipping/logistics/shipments/list')
      expect(ROUTES.SHIPMENT_BATCHES).toBe('/mshipping/logistics/shipment-batches')
      expect(ROUTES.DELIVERY_ORDERS).toBe('/mshipping/logistics/delivery-orders')
      expect(ROUTES.DELIVERY_ORDERS_INVENTORY).toBe('/mshipping/logistics/delivery-orders/inventory')
      expect(ROUTES.INSPECTION_REPORTS).toBe('/mshipping/logistics/inspection-reports')
    })

    it('defines finance routes correctly', () => {
      expect(ROUTES.BILLING).toBe('/mshipping/finance/billing')
      expect(ROUTES.BILLING_TARGET).toBe('/mshipping/finance/billing/target')
      expect(ROUTES.BILLING_LIST).toBe('/mshipping/finance/billing/list')
      expect(ROUTES.BILLING_PAIRING_LOCAL_CHARGE).toBe('/mshipping/finance/billing/pairing-local-charge')
      expect(ROUTES.CASHIER).toBe('/mshipping/finance/cashier')
      expect(ROUTES.WALLET).toBe('/mshipping/finance/wallet')
      expect(ROUTES.PRICE_LIST).toBe('/mshipping/finance/price-list')
      expect(ROUTES.CUSTOMER_PRICE_LIST).toBe('/mshipping/finance/customer-price-list')
      expect(ROUTES.COMMODITY_MAPPING).toBe('/mshipping/finance/commodity-mapping')
    })

    it('defines master and admin routes correctly', () => {
      expect(ROUTES.CUSTOMERS).toBe('/mshipping/master/customers')
      expect(ROUTES.CUSTOMERS_TIER).toBe('/mshipping/master/customers/tier')
      expect(ROUTES.USERS).toBe('/mshipping/admin/users')
      expect(ROUTES.ROLES).toBe('/mshipping/admin/roles')
      expect(ROUTES.PROFILE).toBe('/mshipping/profile')
    })
  })

  describe('Dynamic ROUTES path generators', () => {
    it('generates shipment detail route', () => {
      expect(ROUTES.SHIPMENT_DETAIL('BATCH-101')).toBe('/mshipping/logistics/shipments/BATCH-101')
    })

    it('generates delivery print route with optional doc param', () => {
      expect(ROUTES.DELIVERY_PRINT('DO-123')).toBe('/mshipping/logistics/delivery-orders/DO-123/print')
      expect(ROUTES.DELIVERY_PRINT('DO-123', 'sj')).toBe('/mshipping/logistics/delivery-orders/DO-123/print?doc=sj')
      expect(ROUTES.DELIVERY_PRINT('DO-123', 'ukuran')).toBe('/mshipping/logistics/delivery-orders/DO-123/print?doc=ukuran')
      expect(ROUTES.DELIVERY_PRINT('DO-123', 'both')).toBe('/mshipping/logistics/delivery-orders/DO-123/print?doc=both')
    })

    it('generates billing detail and print routes', () => {
      expect(ROUTES.BILLING_DETAIL('INV-2024-001')).toBe('/mshipping/finance/billing/INV-2024-001')
      expect(ROUTES.BILLING_PRINT('INV-2024-001')).toBe('/mshipping/finance/billing/INV-2024-001/print')
      expect(ROUTES.BILLING_PRINT('INV-2024-001', 'pdf')).toBe('/mshipping/finance/billing/INV-2024-001/print?mode=pdf')
      expect(ROUTES.BILLING_PRINT('INV-2024-001', 'matrix')).toBe('/mshipping/finance/billing/INV-2024-001/print?mode=matrix')
    })

    it('generates cashier and price-list routes', () => {
      expect(ROUTES.CASHIER_DETAIL('CASH-99')).toBe('/mshipping/finance/cashier/CASH-99')
      expect(ROUTES.PRICE_LIST_DETAIL(42)).toBe('/mshipping/finance/price-list/uploads/42')
      expect(ROUTES.CUSTOMER_PRICE_LIST_DETAIL('CUST-88')).toBe('/mshipping/finance/customer-price-list/CUST-88')
    })
  })

  describe('Pagination and timing configuration', () => {
    it('provides standard page sizes and default limit', () => {
      expect(PAGE_SIZES).toEqual([10, 20, 50, 100])
      expect(DEFAULT_PAGE_SIZE).toBe(20)
    })

    it('specifies 400ms debounce delay for search inputs', () => {
      expect(DEBOUNCE_DELAY).toBe(400)
    })
  })
})
