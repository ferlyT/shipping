import { Context } from 'hono'
import { successResponse, errorResponse } from '../../utils/response'
import {
  getMarkings,
  getMarkingDetail,
  getMarkingGroups,
  getManifestByMarkingCode,
  searchManifestSuggestions,
  getMarkingKPIs,
  getMarkingExitHistory,
  getMarkingSuggestions,
  getMarkingSizeAudit,
  getMarkingBoxDimensions,
  getMarkingBatchAllDimensions,
  updateMarkingExitDate,
} from './marking.service'
import { recognizeContainerFromImage } from './container-ocr.service'
import { UpdateMarkingExitDateSchema } from './marking.types'

export async function getMarkingSizeAuditController(c: Context) {
  try {
    const code = c.req.param('code') || ''
    const sort = Number(c.req.query('sort')) === 2 ? 2 : 1
    const data = await getMarkingSizeAudit(code, sort)
    return successResponse(c, data)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal memuat data ukuran marking', 500)
  }
}

export async function getMarkingBoxDimensionsController(c: Context) {
  try {
    const listCode = c.req.param('listCode') || ''
    const data = await getMarkingBoxDimensions(listCode)
    return successResponse(c, data)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal memuat rincian dimensi koli', 500)
  }
}

export async function getMarkingBatchAllDimensionsController(c: Context) {
  try {
    const code = c.req.param('code') || ''
    const data = await getMarkingBatchAllDimensions(code)
    return successResponse(c, data)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal memuat semua dimensi koli batch', 500)
  }
}



export async function getMarkingSuggestionsController(c: Context) {
  try {
    const q = c.req.query('q') || ''
    const suggestions = await getMarkingSuggestions(q)
    return successResponse(c, suggestions)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Terjadi kesalahan pada server', 500)
  }
}

export async function listMarkings(c: Context) {
  try {
    const query = c.req.query()
    const result = await getMarkings(query)
    return successResponse(c, result.data, result.meta as any)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Terjadi kesalahan pada server', 500)
  }
}

export async function getMarkingDetailController(c: Context) {
  try {
    const fdMarkingCode = c.req.param('id') || ''
    const marking = await getMarkingDetail(fdMarkingCode)
    return successResponse(c, marking)
  } catch (error: any) {
    const status = error.message === 'Data marking tidak ditemukan' ? 404 : 500
    return errorResponse(c, error.message || 'Terjadi kesalahan pada server', status)
  }
}

export async function getMarkingGroupsController(c: Context) {
  try {
    const query = c.req.query()
    const groups = await getMarkingGroups(query)
    return successResponse(c, groups)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Terjadi kesalahan pada server', 500)
  }
}

export async function getManifestController(c: Context) {
  try {
    const fdMarkingCode = c.req.param('id') || ''
    const manifest = await getManifestByMarkingCode(fdMarkingCode)
    return successResponse(c, manifest)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Terjadi kesalahan saat mengambil manifest', 500)
  }
}

export async function getManifestSuggestionsController(c: Context) {
  try {
    const fdMarkingCode = c.req.param('id') || ''
    const q = c.req.query('q') || ''
    const suggestions = await searchManifestSuggestions(fdMarkingCode, q)
    return successResponse(c, suggestions)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Terjadi kesalahan saat mengambil suggestions', 500)
  }
}

export async function getMarkingKPIsController(c: Context) {
  try {
    const query = c.req.query()
    const kpis = await getMarkingKPIs(query)
    return successResponse(c, kpis)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Terjadi kesalahan pada server', 500)
  }
}

export async function getMarkingExitHistoryController(c: Context) {
  try {
    const query = c.req.query()
    const history = await getMarkingExitHistory(query)
    return successResponse(c, history)
  } catch (error: any) {
    return errorResponse(c, error.message || 'Terjadi kesalahan pada server', 500)
  }
}

export async function updateMarkingExitDateController(c: Context) {
  try {
    const fdMarkingCode = c.req.param('id') || ''
    const user = c.get('user')
    const body = await c.req.json()
    const parsed = UpdateMarkingExitDateSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(c, parsed.error.issues[0]?.message || 'Input tidak valid', 400)
    }

    const result = await updateMarkingExitDate(fdMarkingCode, parsed.data, user || {})
    return successResponse(c, result, 'Tanggal exit berhasil diperbarui')
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal memperbarui tanggal exit', 400)
  }
}

export async function ocrContainerController(c: Context) {
  try {
    let imageBuffer: Buffer | null = null

    const contentType = c.req.header('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await c.req.json()
      const rawImage = body.image || body.imageBase64 || body.photoBase64 || ''
      if (!rawImage) {
        return errorResponse(c, 'Field "image" base64 wajib disertakan', 400)
      }
      const cleanBase64 = rawImage.includes(',') ? rawImage.split(',')[1] : rawImage
      imageBuffer = Buffer.from(cleanBase64, 'base64')
    } else if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody()
      const file = body['image'] || body['file']
      if (file instanceof Blob) {
        const arrayBuffer = await file.arrayBuffer()
        imageBuffer = Buffer.from(arrayBuffer)
      } else if (typeof file === 'string') {
        const cleanBase64 = file.includes(',') ? (file.split(',')[1] || '') : file
        imageBuffer = Buffer.from(cleanBase64, 'base64')
      }
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return errorResponse(c, 'Data gambar tidak valid atau kosong', 400)
    }

    const result = await recognizeContainerFromImage(imageBuffer)
    return successResponse(c, result, 'Deteksi nomor kontainer berhasil')
  } catch (error: any) {
    return errorResponse(c, error.message || 'Gagal mendeteksi nomor kontainer dari gambar', 500)
  }
}

