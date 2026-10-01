import { describe, it, expect } from 'bun:test'
import { parsePagination, buildPagination } from './pagination'

describe('Pagination Utilities', () => {
  describe('parsePagination', () => {
    it('parses valid numeric query strings', () => {
      const result = parsePagination({ page: '3', limit: '25' })
      expect(result).toEqual({ page: 3, limit: 25 })
    })

    it('defaults to page 1 and limit 20 when parameters are omitted', () => {
      const result = parsePagination({})
      expect(result).toEqual({ page: 1, limit: 20 })
    })

    it('clamps negative or invalid page numbers to 1', () => {
      expect(parsePagination({ page: '-5' }).page).toBe(1)
      expect(parsePagination({ page: '0' }).page).toBe(1)
      expect(parsePagination({ page: 'invalid' }).page).toBe(1)
    })

    it('clamps limit between 1 and 100', () => {
      expect(parsePagination({ limit: '0' }).limit).toBe(1)
      expect(parsePagination({ limit: '-10' }).limit).toBe(1)
      expect(parsePagination({ limit: '500' }).limit).toBe(100)
    })
  })

  describe('buildPagination', () => {
    it('calculates skip and take accurately', () => {
      const result = buildPagination({ page: 1, limit: 20 })
      expect(result.skip).toBe(0)
      expect(result.take).toBe(20)

      const page3 = buildPagination({ page: 3, limit: 15 })
      expect(page3.skip).toBe(30)
      expect(page3.take).toBe(15)
    })

    it('generates correct pagination meta object', () => {
      const { meta } = buildPagination({ page: 2, limit: 10 })
      const paginationInfo = meta(45)

      expect(paginationInfo).toEqual({
        page: 2,
        limit: 10,
        total: 45,
        totalPages: 5,
      })
    })

    it('handles zero total items gracefully', () => {
      const { meta } = buildPagination({ page: 1, limit: 20 })
      const paginationInfo = meta(0)

      expect(paginationInfo.totalPages).toBe(0)
      expect(paginationInfo.total).toBe(0)
    })
  })
})
