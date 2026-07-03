import { Context } from 'hono'
import { getMarkings, getMarkingDetail, getMarkingGroups, getManifestByMarkingCode, getMarkingKPIs } from './marking.service'

export async function listMarkings(c: Context) {
  try {
    const query = c.req.query()
    const result = await getMarkings(query)
    
    return c.json({
      success: true,
      data: result.data,
      meta: result.meta,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: error.message || 'Terjadi kesalahan pada server',
      },
      500
    )
  }
}

export async function getMarkingDetailController(c: Context) {
  try {
    const fdMarkingCode = c.req.param('id')
    
    const marking = await getMarkingDetail(fdMarkingCode)
    
    return c.json({
      success: true,
      data: marking,
    })
  } catch (error: any) {
    if (error.message === 'Data marking tidak ditemukan') {
      return c.json(
        {
          success: false,
          message: error.message,
        },
        404
      )
    }
    
    return c.json(
      {
        success: false,
        message: error.message || 'Terjadi kesalahan pada server',
      },
      500
    )
  }
}

export async function getMarkingGroupsController(c: Context) {
  try {
    const query = c.req.query()
    const groups = await getMarkingGroups(query)
    
    return c.json({
      success: true,
      data: groups,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: error.message || 'Terjadi kesalahan pada server',
      },
      500
    )
  }
}

export async function getManifestController(c: Context) {
  try {
    const fdMarkingCode = c.req.param('id')
    const manifest = await getManifestByMarkingCode(fdMarkingCode)
    
    return c.json({
      success: true,
      data: manifest,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: error.message || 'Terjadi kesalahan saat mengambil manifest',
      },
      500
    )
  }
}

export async function getMarkingKPIsController(c: Context) {
  try {
    const query = c.req.query()
    const kpis = await getMarkingKPIs(query)
    
    return c.json({
      success: true,
      data: kpis,
    })
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: error.message || 'Terjadi kesalahan pada server',
      },
      500
    )
  }
}
