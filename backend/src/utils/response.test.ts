import { describe, it, expect } from 'bun:test'
import { Hono } from 'hono'
import { successResponse, errorResponse } from './response'

describe('Backend Response Utilities', () => {
  it('formats standard success response with deep trim', async () => {
    const app = new Hono()
    app.get('/test', (c) => {
      return successResponse(c, {
        name: '  PT ABC Shipping  ',
        items: ['  Koli 1 ', '  Koli 2  '],
        nested: { code: ' 001 ' }
      })
    })

    const res = await app.request('/test')
    expect(res.status).toBe(200)
    const json: any = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe('PT ABC Shipping')
    expect(json.data.items).toEqual(['Koli 1', 'Koli 2'])
    expect(json.data.nested.code).toBe('001')
  })

  it('formats success response with message string', async () => {
    const app = new Hono()
    app.post('/test', (c) => {
      return successResponse(c, { id: 123 }, 'Data berhasil disimpan')
    })

    const res = await app.request('/test', { method: 'POST' })
    const json: any = await res.json()
    expect(json.success).toBe(true)
    expect(json.message).toBe('Data berhasil disimpan')
    expect(json.data.id).toBe(123)
  })

  it('formats success response with pagination meta', async () => {
    const app = new Hono()
    app.get('/test', (c) => {
      return successResponse(
        c,
        [{ id: 1 }, { id: 2 }],
        { page: 1, limit: 10, total: 2, totalPages: 1 }
      )
    })

    const res = await app.request('/test')
    const json: any = await res.json()
    expect(json.success).toBe(true)
    expect(json.meta.page).toBe(1)
    expect(json.meta.limit).toBe(10)
    expect(json.meta.total).toBe(2)
    expect(json.meta.totalPages).toBe(1)
  })

  it('formats error response with proper status code and details', async () => {
    const app = new Hono()
    app.get('/error', (c) => {
      return errorResponse(c, 'Data tidak ditemukan', 404, { code: 'NOT_FOUND' })
    })

    const res = await app.request('/error')
    expect(res.status).toBe(404)
    const json: any = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toBe('Data tidak ditemukan')
    expect(json.details.code).toBe('NOT_FOUND')
  })
})
