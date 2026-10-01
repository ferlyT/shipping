import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import { validateBody } from '../../middleware/requestValidator'
import {
  getInspectionReports,
  getInspectionReportById,
  createInspectionReport,
  updateInspectionReport,
  deleteInspectionReport,
  lookupInspectionMarking,
  getInspectionReportStats,
} from './inspectionReports.service'
import {
  uploadBapPhoto,
  getBapPhotos,
  deleteBapPhoto,
} from './inspectionPhotos.service'
import {
  CreateInspectionReportSchema,
  UpdateInspectionReportSchema,
  UploadBapPhotoSchema,
} from './inspectionReports.types'

export const inspectionReportsRoutes = new Hono()

// All routes require authenticated user
inspectionReportsRoutes.use('/*', authMiddleware)

// GET / - List reports (paginated, filtered, searched)
inspectionReportsRoutes.get('/', async (c) => {
  try {
    const query = c.req.query()
    const result = await getInspectionReports(query)
    return successResponse(c, result.data, result.meta)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengambil data Berita Acara Pemeriksaan', 500)
  }
})

// GET /stats - Aggregated KPIs, trend, and customer breakdown
inspectionReportsRoutes.get('/stats', async (c) => {
  try {
    const stats = await getInspectionReportStats()
    return successResponse(c, stats)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengambil statistik BAP', 500)
  }
})

// GET /lookup - Autocomplete marking code / customer
inspectionReportsRoutes.get('/lookup', async (c) => {
  try {
    const search = c.req.query('search') || c.req.query('q') || ''
    const listType = c.req.query('listType') ? Number(c.req.query('listType')) : undefined
    const page = Number(c.req.query('page')) || 1
    const limit = Number(c.req.query('limit')) || 20
    const result = await lookupInspectionMarking(search, page, limit, listType)
    return successResponse(c, result)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mencari marking', 500)
  }
})

// GET /:id - Detail report
inspectionReportsRoutes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return errorResponse(c, 'ID tidak valid', 400)
  }

  try {
    const report = await getInspectionReportById(id)
    if (!report) {
      return errorResponse(c, 'Data Berita Acara Pemeriksaan tidak ditemukan', 404)
    }
    return successResponse(c, report)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengambil detail BAP', 500)
  }
})

// POST / - Create report
inspectionReportsRoutes.post('/', validateBody(CreateInspectionReportSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const username = user?.username || user?.fullName || 'system'

  try {
    const newReport = await createInspectionReport(body, username)
    return successResponse(c, newReport, undefined, 201)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal membuat Berita Acara Pemeriksaan', 400)
  }
})

// PUT /:id - Update report
inspectionReportsRoutes.put('/:id', validateBody(UpdateInspectionReportSchema), async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return errorResponse(c, 'ID tidak valid', 400)
  }

  const body = c.req.valid('json')

  try {
    const updated = await updateInspectionReport(id, body)
    return successResponse(c, updated)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal memperbarui Berita Acara Pemeriksaan', 400)
  }
})

// DELETE /:id - Delete report (soft delete)
inspectionReportsRoutes.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return errorResponse(c, 'ID tidak valid', 400)
  }

  try {
    const result = await deleteInspectionReport(id)
    return successResponse(c, result)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal menghapus Berita Acara Pemeriksaan', 400)
  }
})

// POST /:id/photos - Upload photo
inspectionReportsRoutes.post('/:id/photos', validateBody(UploadBapPhotoSchema), async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return errorResponse(c, 'ID tidak valid', 400)
  }

  const body = c.req.valid('json')
  const user = c.get('user')
  const username = user?.username || user?.fullName || 'system'

  try {
    const photo = await uploadBapPhoto(id, body.photoBase64, body.caption, username)
    return successResponse(c, photo, undefined, 201)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengunggah foto', 400)
  }
})

// GET /:id/photos - Get photos
inspectionReportsRoutes.get('/:id/photos', async (c) => {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return errorResponse(c, 'ID tidak valid', 400)
  }

  try {
    const photos = await getBapPhotos(id)
    return successResponse(c, photos)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mengambil foto BAP', 500)
  }
})

// DELETE /:id/photos/:photoId - Delete photo
inspectionReportsRoutes.delete('/:id/photos/:photoId', async (c) => {
  const id = Number(c.req.param('id'))
  const photoId = Number(c.req.param('photoId'))
  if (isNaN(id) || isNaN(photoId)) {
    return errorResponse(c, 'ID tidak valid', 400)
  }

  try {
    const result = await deleteBapPhoto(photoId, id)
    return successResponse(c, result)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal menghapus foto BAP', 400)
  }
})
