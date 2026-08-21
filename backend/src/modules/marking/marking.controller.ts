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
} from './marking.service'

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
