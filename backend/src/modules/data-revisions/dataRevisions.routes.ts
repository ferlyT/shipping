import { Hono } from 'hono'
import { authMiddleware, requirePermission } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import { validateBody } from '../../middleware/requestValidator'
import {
  CreateDataRevisionSchema,
  UpdateDataRevisionSchema,
  DataRevisionQuerySchema,
} from './dataRevisions.schema'
import {
  getNextFormNumber,
  getDataRevisionsList,
  getDataRevisionDetail,
  createDataRevision,
  updateDataRevision,
  deleteDataRevision,
  executeCancelData,
  revertCancelData,
  uploadLampiran,
  uploadLampiranBase64,
  deleteLampiran,
  exportDataRevisionsExcel,
  lookupListCode,
  cropLampiran,
  cropBase64Image,
} from './dataRevisions.service'

export const dataRevisionsRoutes = new Hono()

// Proteksi rute dengan auth middleware dan role permission
dataRevisionsRoutes.use(
  '/*',
  authMiddleware,
  requirePermission(['/mshipping/data-revisions', '/mshipping/logistics/data-revisions'])
)

// GET /lookup-listcode - Pencarian cepat fdListCode dari tbEntryList
dataRevisionsRoutes.get('/lookup-listcode', async (c) => {
  try {
    const q = c.req.query('q') || c.req.query('search') || ''
    const limit = Number(c.req.query('limit')) || 20
    const rows = await lookupListCode(q, limit)
    return successResponse(c, rows)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mencari fdListCode', 500)
  }
})

// GET /next-number - Nomor form berikutnya
dataRevisionsRoutes.get('/next-number', async (c) => {
  try {
    const nextNumber = await getNextFormNumber()
    return successResponse(c, { nextNumber })
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal generate nomor form', 500)
  }
})

// GET /export/excel - Ekspor Excel
dataRevisionsRoutes.get('/export/excel', async (c) => {
  try {
    const buffer = await exportDataRevisionsExcel()
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="data-revisions-${Date.now()}.xlsx"`,
      },
    })
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengekspor data ke Excel', 500)
  }
})

// GET / - List form data revisi & analytics stats
dataRevisionsRoutes.get('/', async (c) => {
  try {
    const query = c.req.query()
    const parsed = DataRevisionQuerySchema.parse(query)
    const result = await getDataRevisionsList(parsed)
    return successResponse(c, result.data, {
      ...result.pagination,
      stats: result.stats,
    })
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengambil daftar Form Revisi Data', 500)
  }
})

// GET /:id - Detail 1 form
dataRevisionsRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return errorResponse(c, 'ID tidak valid', 400)

  try {
    const detail = await getDataRevisionDetail(id)
    if (!detail) return errorResponse(c, 'Form Revisi Data tidak ditemukan', 404)
    return successResponse(c, detail)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengambil detail form', 500)
  }
})

// POST / - Buat form baru
dataRevisionsRoutes.post('/', validateBody(CreateDataRevisionSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const username = user?.username || user?.fullName || 'system'

  try {
    const created = await createDataRevision(body as any, username)
    return successResponse(c, created, undefined, 201)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal membuat Form Revisi Data', 400)
  }
})

// PUT /:id - Update form
dataRevisionsRoutes.put('/:id', validateBody(UpdateDataRevisionSchema), async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return errorResponse(c, 'ID tidak valid', 400)

  const body = c.req.valid('json')
  const user = c.get('user')
  const username = user?.username || user?.fullName || 'system'

  try {
    const updated = await updateDataRevision(id, body, username)
    if (!updated) return errorResponse(c, 'Form Revisi Data tidak ditemukan', 404)
    return successResponse(c, updated)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal memperbarui Form Revisi Data', 400)
  }
})

// DELETE /:id - Soft-delete form
dataRevisionsRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return errorResponse(c, 'ID tidak valid', 400)

  const user = c.get('user')
  const username = user?.username || user?.fullName || 'system'

  try {
    const ok = await deleteDataRevision(id, username)
    if (!ok) return errorResponse(c, 'Form Revisi Data tidak ditemukan', 404)
    return successResponse(c, { success: true })
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal menghapus form', 500)
  }
})

// POST /:id/execute-cancel - Eksekusi fdCancel = 1 di tbEntryList
dataRevisionsRoutes.post('/:id/execute-cancel', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return errorResponse(c, 'ID tidak valid', 400)

  const user = c.get('user')
  const username = user?.username || user?.fullName || 'system'

  try {
    const result = await executeCancelData(id, username)
    return successResponse(c, result)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengeksekusi pembatalan data inputan', 400)
  }
})

// POST /:id/revert-cancel - Revert fdCancel = 0 di tbEntryList
dataRevisionsRoutes.post('/:id/revert-cancel', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return errorResponse(c, 'ID tidak valid', 400)

  const user = c.get('user')
  const username = user?.username || user?.fullName || 'system'

  try {
    const result = await revertCancelData(id, username)
    return successResponse(c, result)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengembalikan pembatalan data inputan', 400)
  }
})

// POST /:id/lampiran - Upload lampiran (mendukung multipart Form-Data dan JSON Base64)
dataRevisionsRoutes.post('/:id/lampiran', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return errorResponse(c, 'ID tidak valid', 400)

  const user = c.get('user')
  const username = user?.username || user?.fullName || 'system'
  const contentType = c.req.header('content-type') || ''

  try {
    // 1. Cek apakah payload berupa JSON (base64 dari mobile app)
    if (contentType.includes('application/json')) {
      const jsonBody = await c.req.json()
      const photoBase64 = jsonBody.photoBase64 || jsonBody.base64 || jsonBody.file
      const fileName = jsonBody.fileName || jsonBody.name
      const keterangan = jsonBody.keterangan as string | undefined

      if (!photoBase64 || typeof photoBase64 !== 'string') {
        return errorResponse(c, 'String base64 foto (photoBase64) wajib diisi', 400)
      }

      const lampiran = await uploadLampiranBase64(id, photoBase64, fileName, username, keterangan)
      return successResponse(c, lampiran, undefined, 201)
    }

    // 2. Cek apakah payload berupa multipart Form-Data
    const body = await c.req.parseBody()
    const file = body['file'] as unknown as File
    const keterangan = body['keterangan'] as string | undefined

    // Jika body form data ternyata membawa base64 string
    if (typeof body['photoBase64'] === 'string') {
      const lampiran = await uploadLampiranBase64(
        id,
        body['photoBase64'],
        (body['fileName'] as string) || undefined,
        username,
        keterangan
      )
      return successResponse(c, lampiran, undefined, 201)
    }

    if (!file || typeof file === 'string') {
      return errorResponse(c, 'File lampiran wajib diunggah', 400)
    }

    const lampiran = await uploadLampiran(id, file, username, keterangan)
    return successResponse(c, lampiran, undefined, 201)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengunggah lampiran', 400)
  }
})

// DELETE /lampiran/:lampiranId - Hapus lampiran
dataRevisionsRoutes.delete('/lampiran/:lampiranId', async (c) => {
  const lampiranId = Number(c.req.param('lampiranId'))
  if (isNaN(lampiranId)) return errorResponse(c, 'ID lampiran tidak valid', 400)

  try {
    await deleteLampiran(lampiranId)
    return successResponse(c, { success: true })
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal menghapus lampiran', 400)
  }
})

// POST /lampiran/:lampiranId/crop - Crop & Rotate foto lampiran fisik existing
dataRevisionsRoutes.post('/lampiran/:lampiranId/crop', async (c) => {
  const lampiranId = Number(c.req.param('lampiranId'))
  if (isNaN(lampiranId)) return errorResponse(c, 'ID lampiran tidak valid', 400)

  const user = c.get('user')
  const username = user?.username || user?.fullName || 'system'

  try {
    const body = await c.req.json()
    const { rotate, crop, isRatio } = body
    const updated = await cropLampiran(lampiranId, { rotate, crop, isRatio }, username)
    return successResponse(c, updated)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal memotong (crop) gambar lampiran', 400)
  }
})

// POST /crop-base64 - Crop & Rotate gambar Base64 (preview sebelum upload)
dataRevisionsRoutes.post('/crop-base64', async (c) => {
  try {
    const body = await c.req.json()
    const { photoBase64, rotate, crop, isRatio } = body

    if (!photoBase64 || typeof photoBase64 !== 'string') {
      return errorResponse(c, 'String photoBase64 wajib diisi', 400)
    }

    const croppedBase64 = await cropBase64Image(photoBase64, { rotate, crop, isRatio })
    return successResponse(c, { photoBase64: croppedBase64 })
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal memotong (crop) gambar base64', 400)
  }
})
