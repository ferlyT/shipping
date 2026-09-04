import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import type { PrediksiExitItem } from './marking.types'

export async function computeExitPrediction(where: any): Promise<{
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
      const avgDelayDays = (sampleSize >= MIN_SAMPLE ? avgByConsignee[consignee] : globalAvgDelay) ?? globalAvgDelay

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

export async function getMarkingExitHistory(query: Record<string, string | undefined>) {
  const search = query.search?.trim() || ''
  const listType = query.listType // 1 for AIR, 2 for SEA
  const month = query.month // 'YYYY-MM'

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

    let rangeStart: Date
    let rangeEnd: Date
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, mon] = month.split('-').map(Number)
      rangeStart = new Date(year!, mon! - 1, 1)
      rangeEnd = new Date(year!, mon!, 1)
    } else {
      const now = new Date()
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1)
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    }

    where.fdExitDate = {
      gte: rangeStart,
      lt: rangeEnd,
    }

    const batches = await prisma.tbMarking.findMany({
      where,
      select: {
        fdMarkingCode: true,
        fdConsignee: true,
        fdExitDate: true,
        fdGudang: true,
        fdListType: true,
        fdKet: true,
      },
      orderBy: { fdExitDate: 'asc' },
    })

    const history: Record<string, { count: number; items: typeof batches }> = {}
    let airCount = 0
    let seaCount = 0

    for (const batch of batches) {
      if (batch.fdListType === 1) airCount++
      if (batch.fdListType === 2) seaCount++

      if (!batch.fdExitDate) continue
      const d = batch.fdExitDate
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      if (!history[key]) {
        history[key] = { count: 0, items: [] }
      }
      history[key].count += 1
      history[key].items.push(batch)
    }

    return {
      historyMap: history,
      totalCount: batches.length,
      airCount,
      seaCount,
    }
  } catch (error) {
    logger.error('Error fetching marking exit history:', error)
    throw new Error('Gagal mengambil data history exit marking')
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

    const currentYear = today.getFullYear()
    const lastYear = currentYear - 1

    const startThisYear = new Date(`${currentYear}-01-01T00:00:00.000Z`)
    const startNextYear = new Date(`${currentYear + 1}-01-01T00:00:00.000Z`)
    const startLastYear = new Date(`${lastYear}-01-01T00:00:00.000Z`)
    const startEndLastYear = new Date(`${lastYear + 1}-01-01T00:00:00.000Z`)

    const endLastYearYtd = new Date(today)
    endLastYearYtd.setFullYear(lastYear)

    const whereThisYear = {
      ...where,
      AND: [
        ...(where.AND || []),
        {
          OR: [
            { fdLoadDate: { gte: startThisYear, lt: startNextYear } },
            { fdLoadDate: null, fdSysDate: { gte: startThisYear, lt: startNextYear } },
          ],
        },
      ],
    }

    const whereLastYearYtd = {
      ...where,
      AND: [
        ...(where.AND || []),
        {
          OR: [
            { fdLoadDate: { gte: startLastYear, lte: endLastYearYtd } },
            { fdLoadDate: null, fdSysDate: { gte: startLastYear, lte: endLastYearYtd } },
          ],
        },
      ],
    }

    const whereLastYearTotal = {
      ...where,
      AND: [
        ...(where.AND || []),
        {
          OR: [
            { fdLoadDate: { gte: startLastYear, lt: startEndLastYear } },
            { fdLoadDate: null, fdSysDate: { gte: startLastYear, lt: startEndLastYear } },
          ],
        },
      ],
    }

    const [
      totalBatches,
      totalBatchesAir,
      totalBatchesSea,
      thisYearBatches,
      thisYearBatchesAir,
      thisYearBatchesSea,
      lastYearBatchesYtd,
      lastYearBatchesTotal,
      activeBatches,
      activeBatchesAir,
      activeBatchesSea,
      etaNotExitBatches,
      batchesWithTransitTime,
      etaNotExitList,
      prediksiExit,
      exitTodayList,
      exitYesterdayList
    ] = await Promise.all([
      prisma.tbMarking.count({ where }),
      prisma.tbMarking.count({ where: { ...where, fdListType: 1 } }),
      prisma.tbMarking.count({ where: { ...where, fdListType: 2 } }),
      prisma.tbMarking.count({ where: whereThisYear }),
      prisma.tbMarking.count({ where: { ...whereThisYear, fdListType: 1 } }),
      prisma.tbMarking.count({ where: { ...whereThisYear, fdListType: 2 } }),
      prisma.tbMarking.count({ where: whereLastYearYtd }),
      prisma.tbMarking.count({ where: whereLastYearTotal }),
      prisma.tbMarking.count({ where: { ...where, fdExitDate: null } }),
      prisma.tbMarking.count({ where: { ...where, fdExitDate: null, fdListType: 1 } }),
      prisma.tbMarking.count({ where: { ...where, fdExitDate: null, fdListType: 2 } }),
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
          fdETA: true,
          fdListType: true
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
    const expectedExitTomorrowAir = expectedExitTomorrowList.filter(b => b.fdListType === 1).length
    const expectedExitTomorrowSea = expectedExitTomorrowList.filter(b => b.fdListType === 2).length

    const etaNotExitBatchesAir = etaNotExitList.filter(b => b.fdListType === 1).length
    const etaNotExitBatchesSea = etaNotExitList.filter(b => b.fdListType === 2).length

    const exitTodayAir = exitTodayList.filter(b => b.fdListType === 1).length
    const exitTodaySea = exitTodayList.filter(b => b.fdListType === 2).length

    const exitYesterdayAir = exitYesterdayList.filter(b => b.fdListType === 1).length
    const exitYesterdaySea = exitYesterdayList.filter(b => b.fdListType === 2).length

    const prediksiAttentionList = prediksiExit.prediksiExitList.filter(p => p.category === 'terlambat' || p.category === 'segera')
    const prediksiAttentionAir = prediksiAttentionList.filter(p => p.fdListType === 1).length
    const prediksiAttentionSea = prediksiAttentionList.filter(p => p.fdListType === 2).length

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

    let totalTransitDaysAir = 0
    let validTransitCountAir = 0
    let missedTargetBatchesAir = 0

    let totalTransitDaysSea = 0
    let validTransitCountSea = 0
    let missedTargetBatchesSea = 0
    
    const missedTargetMap: Record<string, { count: number, codes: { code: string, transit: number, target: number }[] }> = {}

    for (const batch of batchesWithTransitTime) {
      if (batch.fdETD && batch.fdETA) {
        const diffTime = Math.abs(batch.fdETA.getTime() - batch.fdETD.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        totalTransitDays += diffDays
        validTransitCount++

        if (batch.fdListType === 1) {
          totalTransitDaysAir += diffDays
          validTransitCountAir++
        } else if (batch.fdListType === 2) {
          totalTransitDaysSea += diffDays
          validTransitCountSea++
        }

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
          if (batch.fdListType === 1) missedTargetBatchesAir++
          if (batch.fdListType === 2) missedTargetBatchesSea++
          
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

    const avgTransitDays = validTransitCount > 0 ? Math.round((totalTransitDays / validTransitCount) * 10) / 10 : null
    const avgTransitDaysAir = validTransitCountAir > 0 ? Math.round((totalTransitDaysAir / validTransitCountAir) * 10) / 10 : null
    const avgTransitDaysSea = validTransitCountSea > 0 ? Math.round((totalTransitDaysSea / validTransitCountSea) * 10) / 10 : null

    // Calculate YTD Growth (compared to same period last year)
    let growthYtd: number | null = null
    if (lastYearBatchesYtd > 0) {
      growthYtd = Math.round(((thisYearBatches - lastYearBatchesYtd) / lastYearBatchesYtd) * 1000) / 10
    }

    return {
      totalBatches,
      totalBatchesAir,
      totalBatchesSea,
      thisYearBatches,
      thisYearBatchesAir,
      thisYearBatchesSea,
      lastYearBatchesYtd,
      lastYearBatchesTotal,
      growthYtd,
      activeBatches,
      activeBatchesAir,
      activeBatchesSea,
      etaNotExitBatches,
      etaNotExitBatchesAir,
      etaNotExitBatchesSea,
      etaNotExitSummary: etaNotExitSummaryArray,
      averageTransitDays: avgTransitDays,
      averageTransitDaysAir: avgTransitDaysAir,
      averageTransitDaysSea: avgTransitDaysSea,
      missedTargetCount: missedTargetBatches,
      missedTargetCountAir: missedTargetBatchesAir,
      missedTargetCountSea: missedTargetBatchesSea,
      missedTargetSummary: missedTargetSummaryArray,
      prediksiTerlambatCount: prediksiExit.prediksiTerlambatCount,
      prediksiSegeraCount: prediksiExit.prediksiSegeraCount,
      prediksiDekatCount: prediksiExit.prediksiDekatCount,
      prediksiAttentionAir,
      prediksiAttentionSea,
      prediksiExitList: prediksiExit.prediksiExitList,
      exitTodayCount: exitTodayList.length,
      exitTodayAir,
      exitTodaySea,
      exitYesterdayCount: exitYesterdayList.length,
      exitYesterdayAir,
      exitYesterdaySea,
      expectedExitTomorrowCount,
      expectedExitTomorrowAir,
      expectedExitTomorrowSea,
      expectedExitTomorrowList,
    }
  } catch (error) {
    logger.error('Error fetching marking KPIs:', error)
    throw new Error('Gagal mengambil data KPI marking')
  }
}
