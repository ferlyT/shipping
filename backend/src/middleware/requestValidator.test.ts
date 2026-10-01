import { describe, it, expect } from 'bun:test'
import { Hono } from 'hono'
import { z } from 'zod'
import { validateBody, validateQuery } from './requestValidator'

describe('requestValidator Middleware', () => {
  const userSchema = z.object({
    username: z.string().min(3, 'Username minimal 3 karakter'),
    email: z.string().email('Format email tidak valid'),
    age: z.number().min(18, 'Usia minimal 18 tahun').optional(),
  })

  const querySchema = z.object({
    limit: z.string().regex(/^\d+$/, 'Limit harus angka').optional(),
    role: z.enum(['ADMIN', 'USER', 'STAFF']).optional(),
  })

  const app = new Hono()

  app.post('/test-body', validateBody(userSchema), (c) => {
    const data = c.req.valid('json')
    return c.json({ success: true, data })
  })

  app.get('/test-query', validateQuery(querySchema), (c) => {
    const query = c.req.valid('query')
    return c.json({ success: true, query })
  })

  describe('validateBody', () => {
    it('allows valid payload to pass through', async () => {
      const res = await app.request('/test-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'john_doe', email: 'john@example.com', age: 25 }),
      })

      expect(res.status).toBe(200)
      const json: any = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.username).toBe('john_doe')
    })

    it('rejects payload with invalid email and returns 422 with formatted details', async () => {
      const res = await app.request('/test-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'john_doe', email: 'not-an-email' }),
      })

      expect(res.status).toBe(422)
      const json: any = await res.json()
      expect(json.success).toBe(false)
      expect(json.message).toBe('Format email tidak valid')
      expect(json.details).toBeDefined()
      expect(Array.isArray(json.details)).toBe(true)
    })

    it('rejects short username and returns 422', async () => {
      const res = await app.request('/test-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'ab', email: 'valid@example.com' }),
      })

      expect(res.status).toBe(422)
      const json: any = await res.json()
      expect(json.success).toBe(false)
      expect(json.message).toBe('Username minimal 3 karakter')
    })
  })

  describe('validateQuery', () => {
    it('allows valid query parameters', async () => {
      const res = await app.request('/test-query?limit=50&role=ADMIN')
      expect(res.status).toBe(200)
      const json: any = await res.json()
      expect(json.success).toBe(true)
      expect(json.query.limit).toBe('50')
      expect(json.query.role).toBe('ADMIN')
    })

    it('rejects invalid query enum and returns 400', async () => {
      const res = await app.request('/test-query?role=SUPERMAN')
      expect(res.status).toBe(400)
      const json: any = await res.json()
      expect(json.success).toBe(false)
      expect(json.message).toContain('ADMIN')
    })
  })
})
