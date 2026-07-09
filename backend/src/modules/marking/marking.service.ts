import { prisma } from '../../config/database'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { logger } from '../../config/logger'

export async function getMarkings(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim() || ''
  const sortBy = query.sortBy || 'fdSysDate'
  const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc'
  const listType = query.listType // 1 for AIR, 2 for SEA
  const isClosed = query.isClosed
  const groupMode = query.groupMode
  const groupValue = query.groupValue

  try {
    const where: any = {}

    if (search) {
      where.OR = [
        { fdMarkingCode: { contains: search } },
        { fdBLNo: { contains: search } },
        { fdAWB: { contains: search } },
        { fdConsignee: { contains: search } },
        { fdContNo: { contains: search } },
      ]
    }

    if (listType !== undefined && listType !== '' && listType !== 'ALL') {
      where.fdListType = parseInt(listType, 10)
    }

    if (isClosed === 'true') {
      where.fdExitDate = { not: null }
    } else if (isClosed === 'false') {
      where.fdExitDate = null
    }

    if (groupMode && groupValue && groupValue !== 'Tidak diketahui') {
      if (groupMode === 'branch') {
        where.fdBranchCode = groupValue
      } else if (groupMode === 'year') {
        const year = parseInt(groupValue)
        where.fdLoadDate = {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
        }
      } else if (['load', 'etd', 'eta'].includes(groupMode)) {
        const [year, month] = groupValue.split('-')
        if (year && month) {
          const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
          const endDate = new Date(parseInt(year), parseInt(month), 1)
          const field = groupMode === 'load' ? 'fdLoadDate' : groupMode === 'etd' ? 'fdETD' : 'fdETA'
          where[field] = {
            gte: startDate,
            lt: endDate
          }
        }
      }
    } else if (groupMode && groupValue === 'Tidak diketahui') {
      if (groupMode === 'branch') {
        // Asumsi null atau kosong
        where.fdBranchCode = { in: ['', null] }
      } else {
        const field = groupMode === 'year' || groupMode === 'load' ? 'fdLoadDate' : groupMode === 'etd' ? 'fdETD' : 'fdETA'
        where[field] = null
      }
    }

    const [data, total] = await Promise.all([
      prisma.tbMarking.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortDir,
        },
      }),
      prisma.tbMarking.count({ where }),
    ])

    return {
      data,
      meta: {
        ...meta,
        total,
        totalPages: Math.ceil(total / take),
      },
    }
  } catch (error) {
    logger.error('Error fetching markings:', error)
    throw new Error('Gagal mengambil data marking')
  }
}

export async function getMarkingGroups(query: Record<string, string | undefined>) {
  const search = query.search?.trim() || ''
  const listType = query.listType
  const isClosed = query.isClosed
  const groupMode = query.groupMode

  if (!groupMode || groupMode === 'none') {
    return [{ groupValue: 'Semua batch', count: 0, totalPkgs: 0, totalWeight: 0 }]
  }

  try {
    const where: any = {}

    if (search) {
      where.OR = [
        { fdMarkingCode: { contains: search } },
        { fdBLNo: { contains: search } },
        { fdAWB: { contains: search } },
        { fdConsignee: { contains: search } },
        { fdContNo: { contains: search } },
      ]
    }

    if (listType !== undefined && listType !== '' && listType !== 'ALL') {
      where.fdListType = parseInt(listType, 10)
    }

    if (isClosed === 'true') {
      where.fdExitDate = { not: null }
    } else if (isClosed === 'false') {
      where.fdExitDate = null
    }

    const data = await prisma.tbMarking.findMany({
      where,
      select: {
        fdBranchCode: true,
        fdLoadDate: true,
        fdETD: true,
        fdETA: true,
        fdJmlPack: true,
        fdJmlBerat: true
      }
    })

    const groups: Record<string, { count: number, totalPkgs: number, totalWeight: number }> = {}

    data.forEach(row => {
      let key = "Tidak diketahui"
      if (groupMode === 'branch') {
        key = row.fdBranchCode ? row.fdBranchCode.trim() : "Tidak diketahui"
        if (key === '') key = "Tidak diketahui"
      } else if (groupMode === 'year') {
        key = row.fdLoadDate ? String(row.fdLoadDate.getFullYear()) : "Tidak diketahui"
      } else {
        const dateField = groupMode === 'load' ? row.fdLoadDate : groupMode === 'etd' ? row.fdETD : row.fdETA
        if (dateField) {
          const m = String(dateField.getMonth() + 1).padStart(2, '0')
          key = `${dateField.getFullYear()}-${m}`
        }
      }

      if (!groups[key]) groups[key] = { count: 0, totalPkgs: 0, totalWeight: 0 }
      groups[key].count += 1
      groups[key].totalPkgs += Number(row.fdJmlPack || 0)
      groups[key].totalWeight += Number(row.fdJmlBerat || 0)
    })

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Tidak diketahui") return 1
      if (b === "Tidak diketahui") return -1
      if (groupMode === "branch") return a.localeCompare(b)
      return b.localeCompare(a)
    })

    return sortedKeys.map(k => ({
      groupValue: k,
      ...groups[k]
    }))
  } catch (error) {
    logger.error('Error fetching marking groups:', error)
    throw new Error('Gagal mengambil data grup marking')
  }
}

export async function getMarkingDetail(fdMarkingCode: string) {
  try {
    const marking = await prisma.tbMarking.findUnique({
      where: { fdMarkingCode },
    })

    if (!marking) {
      throw new Error('Data marking tidak ditemukan')
    }

    return marking
  } catch (error) {
    logger.error(`Error fetching marking detail for ${fdMarkingCode}:`, error)
    throw error
  }
}

export async function getManifestByMarkingCode(fdMarkingCode: string) {
  try {
    const manifest = await prisma.vwShipment.findMany({
      where: { fdMarkingCode },
      orderBy: { fdListCode: 'asc' }
    })
    return manifest
  } catch (error) {
    logger.error(`Error fetching manifest for ${fdMarkingCode}:`, error)
    throw new Error('Gagal mengambil data manifest')
  }
}

interface PrediksiExitItem {
  fdMarkingCode: string
  fdConsignee: string | null
  fdBranchCode: string | null
  fdListType: number | null
  fdETA: Date
  predictedExitDate: Date
  daysUntil: number
  avgDelayDays: number
  sampleSize: number
  category: 'terlambat' | 'segera' | 'dekat' | 'normal'
  fdGudang?: string | null
  fdKet?: string | null
}

async function computeExitPrediction(where: any): Promise<{
  prediksiTerlambatCount: number
  prediksiSegeraCount: number
  prediksiDekatCount: number
  prediksiExitList: PrediksiExitItem[]
}> {
  const today = new Date()

  const [closedBatches, openBatches] = await Promise.all([
    prisma.tbMarking.findMany({
      where: { ...where, fdExitDate: { not: null }, fdETA: { not: null } },
      select: { fdConsignee: true, fdETA: true, fdExitDate: true },
    }),
    prisma.tbMarking.findMany({
      where: { ...where, fdExitDate: null, fdETA: { not: null } },
      select: {
        fdMarkingCode: true,
        fdConsignee: true,
        fdBranchCode: true,
        fdListType: true,
        fdETA: true,
        fdGudang: true,
        fdKet: true,
      },
    }),
  ])

  const delayByConsignee: Record<string, number[]> = {}
  for (const b of closedBatches) {
    if (!b.fdETA || !b.fdExitDate) continue
    const consignee = b.fdConsignee?.trim() || 'Unknown'
    const delay = Math.round((b.fdExitDate.getTime() - b.fdETA.getTime()) / (1000 * 60 * 60 * 24))
    if (!delayByConsignee[consignee]) delayByConsignee[consignee] = []
    delayByConsignee[consignee].push(delay)
  }

  const avgByConsignee: Record<string, number> = {}
  Object.entries(delayByConsignee).forEach(([k, arr]) => {
    avgByConsignee[k] = arr.reduce((a, b) => a + b, 0) / arr.length
  })

  const allDelays = closedBatches
    .filter((b) => b.fdETA && b.fdExitDate)
    .map((b) => Math.round((b.fdExitDate!.getTime() - b.fdETA!.getTime()) / (1000 * 60 * 60 * 24)))
  const globalAvgDelay = allDelays.length > 0 ? allDelays.reduce((a, b) => a + b, 0) / allDelays.length : 0

  const MIN_SAMPLE = 2

  const prediksiExitList: PrediksiExitItem[] = openBatches
    .filter((b) => b.fdETA)
    .map((b) => {
      const consignee = b.fdConsignee?.trim() || 'Unknown'
      const sampleSize = delayByConsignee[consignee]?.length || 0
      const avgDelayDays = sampleSize >= MIN_SAMPLE ? avgByConsignee[consignee] : globalAvgDelay

      const predictedExitDate = new Date(b.fdETA!)
      predictedExitDate.setDate(predictedExitDate.getDate() + Math.round(avgDelayDays))

      const daysUntil = Math.round((predictedExitDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const category: PrediksiExitItem['category'] =
        daysUntil < 0 ? 'terlambat' : daysUntil <= 3 ? 'segera' : daysUntil <= 7 ? 'dekat' : 'normal'

      return {
        fdMarkingCode: b.fdMarkingCode.trim(),
        fdConsignee: b.fdConsignee,
        fdBranchCode: b.fdBranchCode,
        fdListType: b.fdListType,
        fdETA: b.fdETA!,
        predictedExitDate,
        daysUntil,
        avgDelayDays: Math.round(avgDelayDays * 10) / 10,
        sampleSize,
        category,
        fdGudang: b.fdGudang,
        fdKet: b.fdKet
      }
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)

  return {
    prediksiTerlambatCount: prediksiExitList.filter((p) => p.category === 'terlambat').length,
    prediksiSegeraCount: prediksiExitList.filter((p) => p.category === 'segera').length,
    prediksiDekatCount: prediksiExitList.filter((p) => p.category === 'dekat').length,
    prediksiExitList: prediksiExitList.slice(0, 200),
  }
}

export async function getMarkingKPIs(query: Record<string, string | undefined>) {
  const search = query.search?.trim() || ''
  const listType = query.listType // 1 for AIR, 2 for SEA

  try {
    const where: any = {}

    if (search) {
      where.OR = [
        { fdMarkingCode: { contains: search } },
        { fdBLNo: { contains: search } },
        { fdAWB: { contains: search } },
        { fdConsignee: { contains: search } },
        { fdContNo: { contains: search } },
      ]
    }

    if (listType !== undefined && listType !== '' && listType !== 'ALL') {
      where.fdListType = parseInt(listType, 10)
    }

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const dayAfterTomorrowStart = new Date(tomorrowStart)
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1)

    const [
      totalBatches,
      activeBatches,
      etaNotExitBatches,
      batchesWithTransitTime,
      etaNotExitList,
      prediksiExit,
      exitTodayList,
      exitYesterdayList
    ] = await Promise.all([
      prisma.tbMarking.count({ where }),
      prisma.tbMarking.count({ where: { ...where, fdExitDate: null } }),
      prisma.tbMarking.count({
        where: {
          ...where,
          fdExitDate: null,
          fdETA: { lt: today }
        }
      }),
      prisma.tbMarking.findMany({
        where: {
          ...where,
          fdETD: { not: null },
          fdETA: { not: null }
        },
        select: {
          fdMarkingCode: true,
          fdListType: true,
          fdETD: true,
          fdETA: true,
          fdConsignee: true
        }
      }),
      prisma.tbMarking.findMany({
        where: {
          ...where,
          fdExitDate: null,
          fdETA: { lt: today }
        },
        select: {
          fdConsignee: true,
          fdMarkingCode: true,
          fdETA: true
        }
      }),
      computeExitPrediction(where),
      prisma.tbMarking.findMany({
        where: {
          ...where,
          fdExitDate: {
            gte: todayStart,
            lt: tomorrowStart
          }
        },
        select: { fdMarkingCode: true, fdConsignee: true, fdExitDate: true, fdGudang: true, fdListType: true, fdKet: true }
      }),
      prisma.tbMarking.findMany({
        where: {
          ...where,
          fdExitDate: {
            gte: yesterdayStart,
            lt: todayStart
          }
        },
        select: { fdMarkingCode: true, fdConsignee: true, fdExitDate: true, fdGudang: true, fdListType: true, fdKet: true }
      })
    ])

    const expectedExitTomorrowList = prediksiExit.prediksiExitList.filter(p => {
      const pDate = new Date(p.predictedExitDate)
      return pDate >= tomorrowStart && pDate < dayAfterTomorrowStart
    })
    const expectedExitTomorrowCount = expectedExitTomorrowList.length

    // Compute ETA Not Exit Consignee Summary
    const etaNotExitSummary: Record<string, { count: number, codes: { code: string, aging: number }[] }> = {}
    for (const batch of etaNotExitList) {
      const consignee = batch.fdConsignee?.trim() || 'Unknown'
      const code = batch.fdMarkingCode.trim()
      let aging = 0
      if (batch.fdETA) {
        aging = Math.max(0, Math.floor((today.getTime() - batch.fdETA.getTime()) / (1000 * 60 * 60 * 24)))
      }
      
      if (!etaNotExitSummary[consignee]) {
        etaNotExitSummary[consignee] = { count: 0, codes: [] }
      }
      etaNotExitSummary[consignee].count += 1
      etaNotExitSummary[consignee].codes.push({ code, aging })
    }
    const etaNotExitSummaryArray = Object.entries(etaNotExitSummary)
      .map(([name, data]) => ({ name, count: data.count, codes: data.codes.sort((a,b) => b.aging - a.aging) }))
      .sort((a, b) => b.count - a.count)

    // Calculate Average Transit Time and Missed Targets
    let totalTransitDays = 0
    let validTransitCount = 0
    let missedTargetBatches = 0
    
    const missedTargetMap: Record<string, { count: number, codes: { code: string, transit: number, target: number }[] }> = {}

    for (const batch of batchesWithTransitTime) {
      if (batch.fdETD && batch.fdETA) {
        const diffTime = Math.abs(batch.fdETA.getTime() - batch.fdETD.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        totalTransitDays += diffDays
        validTransitCount++

        // Check if missed target
        let maxTarget = 0
        const code = batch.fdMarkingCode.trim().toUpperCase()
        if (batch.fdListType === 1) { // AIR
          if (code.includes('SG')) maxTarget = 5
          else if (code.includes('HK')) maxTarget = 7
          else if (code.includes('GZ')) maxTarget = 10
        } else { // SEA
          if (code.includes('SG')) maxTarget = 20
          else if (code.includes('HK') || code.includes('GZ') || code.includes('SH')) maxTarget = 30
          else if (code.includes('YW')) maxTarget = 40
        }

        if (maxTarget > 0 && diffDays > maxTarget) {
          missedTargetBatches++
          
          const consignee = batch.fdConsignee?.trim() || 'Unknown'
          if (!missedTargetMap[consignee]) {
            missedTargetMap[consignee] = { count: 0, codes: [] }
          }
          missedTargetMap[consignee].count += 1
          missedTargetMap[consignee].codes.push({ code: batch.fdMarkingCode.trim(), transit: diffDays, target: maxTarget })
        }
      }
    }
    
    const missedTargetSummaryArray = Object.entries(missedTargetMap)
      .map(([name, data]) => ({ name, count: data.count, codes: data.codes.sort((a,b) => b.transit - a.transit) }))
      .sort((a, b) => b.count - a.count)

    const avgTransitTime = validTransitCount > 0 ? Math.round(totalTransitDays / validTransitCount) : 0

    return {
      totalBatches,
      activeBatches,
      delayedBatches: etaNotExitBatches, // keep backwards compatibility if needed
      etaNotExitBatches,
      etaNotExitSummary: etaNotExitSummaryArray,
      missedTargetBatches,
      missedTargetSummary: missedTargetSummaryArray,
      avgTransitTime,
      prediksiTerlambatCount: prediksiExit.prediksiTerlambatCount,
      prediksiSegeraCount: prediksiExit.prediksiSegeraCount,
      prediksiDekatCount: prediksiExit.prediksiDekatCount,
      prediksiExitList: prediksiExit.prediksiExitList,
      exitTodayCount: exitTodayList.length,
      exitYesterdayCount: exitYesterdayList.length,
      expectedExitTomorrowCount,
      exitTodayList,
      exitYesterdayList,
      expectedExitTomorrowList
    }
  } catch (error) {
    logger.error('Error fetching marking KPIs:', error)
    throw new Error('Gagal mengambil data KPI marking')
  }
}
