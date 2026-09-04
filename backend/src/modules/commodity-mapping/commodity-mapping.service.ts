import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { safeRunRaw } from '../../utils/db'
import { logger } from '../../config/logger'
import type {
  CreateCommodityMappingInput,
  UpdateCommodityMappingInput,
  CommodityMappingQuery,
  ResolvedCommodityResult,
  ApplyMappingsToUploadInput,
} from './commodity-mapping.types'

export * from './commodity-mapping.types'

/**
 * Normalizes string for case/space-insensitive lookup
 */
export function normalizeKey(val: string): string {
  return (val || '').trim().toUpperCase().replace(/\s+/g, ' ')
}

/**
 * List Commodity Mappings with pagination & filters
 */
export async function getCommodityMappings(query: CommodityMappingQuery) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim()
  const scope = query.scope || 'all'
  const custCode = query.custCode?.trim()
  const mode = query.mode?.trim()
  const activeOnly = query.activeOnly === 'true'

  const whereConditions: Prisma.TbCommodityMappingWhereInput[] = []

  if (search) {
    whereConditions.push({
      OR: [
        { commodityName: { contains: search } },
        { targetCommodity: { contains: search } },
        { fdCustCode: { contains: search } },
        { notes: { contains: search } },
      ],
    })
  }

  if (scope === 'global') {
    whereConditions.push({ fdCustCode: null })
  } else if (scope === 'customer') {
    if (custCode) {
      whereConditions.push({ fdCustCode: custCode })
    } else {
      whereConditions.push({ fdCustCode: { not: null } })
    }
  } else if (custCode) {
    whereConditions.push({
      OR: [{ fdCustCode: custCode }, { fdCustCode: null }],
    })
  }

  if (mode && mode !== 'ALL') {
    whereConditions.push({
      OR: [{ mode: { contains: mode } }, { mode: null }],
    })
  }

  if (activeOnly) {
    const now = new Date()
    whereConditions.push({
      effectiveDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    })
  }

  const where: Prisma.TbCommodityMappingWhereInput =
    whereConditions.length > 0 ? { AND: whereConditions } : {}

  const [data, total] = await Promise.all([
    prisma.tbCommodityMapping.findMany({
      where,
      skip,
      take,
      orderBy: [{ fdCustCode: 'asc' }, { effectiveDate: 'desc' }, { commodityName: 'asc' }],
    }),
    prisma.tbCommodityMapping.count({ where }),
  ])

  // Enrich customer names & upload file names
  const custCodes = Array.from(
    new Set(data.map((d) => d.fdCustCode?.trim()).filter(Boolean) as string[])
  )
  const uploadIds = Array.from(
    new Set(data.map((d) => d.priceListUploadId).filter(Boolean) as number[])
  )

  const [customers, uploads] = await Promise.all([
    custCodes.length > 0
      ? prisma.tbCustomers.findMany({
          where: { fdCustCode: { in: custCodes } },
          select: { fdCustCode: true, fdCustName: true },
        })
      : [],
    uploadIds.length > 0
      ? prisma.tbPriceListUpload.findMany({
          where: { id: { in: uploadIds } },
          select: { id: true, fileName: true },
        })
      : [],
  ])

  const custMap = new Map(customers.map((c) => [c.fdCustCode.trim(), c.fdCustName?.trim() || '']))
  const uploadMap = new Map(uploads.map((u) => [u.id, u.fileName]))

  const enrichedData = data.map((d) => {
    const cCode = d.fdCustCode?.trim() || null
    return {
      id: d.id,
      commodityName: d.commodityName.trim(),
      targetCommodity: d.targetCommodity.trim(),
      fdTypeComodity: d.fdTypeComodity,
      fdCustCode: cCode,
      custName: cCode ? custMap.get(cCode) || null : null,
      priceListUploadId: d.priceListUploadId,
      priceListFileName: d.priceListUploadId ? uploadMap.get(d.priceListUploadId) || null : null,
      effectiveDate: d.effectiveDate.toISOString(),
      endDate: d.endDate ? d.endDate.toISOString() : null,
      mode: d.mode,
      applyToNewUploads: d.applyToNewUploads,
      notes: d.notes,
      createdBy: d.createdBy,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }
  })

  return { data: enrichedData, meta: meta(total) }
}

/**
 * Get Commodity Mapping by ID
 */
export async function getCommodityMappingById(id: number) {
  const item = await prisma.tbCommodityMapping.findUnique({
    where: { id },
  })
  if (!item) return null

  let custName: string | null = null
  if (item.fdCustCode?.trim()) {
    const cust = await prisma.tbCustomers.findUnique({
      where: { fdCustCode: item.fdCustCode.trim() },
      select: { fdCustName: true },
    })
    custName = cust?.fdCustName?.trim() || null
  }

  let priceListFileName: string | null = null
  if (item.priceListUploadId) {
    const up = await prisma.tbPriceListUpload.findUnique({
      where: { id: item.priceListUploadId },
      select: { fileName: true },
    })
    priceListFileName = up?.fileName || null
  }

  return {
    ...item,
    custName,
    priceListFileName,
    effectiveDate: item.effectiveDate.toISOString(),
    endDate: item.endDate ? item.endDate.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

/**
 * Create a new Commodity Mapping
 */
export async function createCommodityMapping(input: CreateCommodityMappingInput) {
  const cleanName = input.commodityName.trim()
  const cleanTarget = input.targetCommodity.trim()
  const cleanCust = input.fdCustCode?.trim() || null
  const effectiveDate = input.effectiveDate ? new Date(input.effectiveDate) : new Date()
  const endDate = input.endDate ? new Date(input.endDate) : null

  // If fdTypeComodity is not provided, try to find matching fdTypeComodity from tbTypeComodity
  let resolvedTypeId = input.fdTypeComodity ?? null
  if (resolvedTypeId === null && cleanTarget) {
    const typeRow = await prisma.tbTypeComodity.findFirst({
      where: {
        fdComodityName: { contains: cleanTarget },
      },
      select: { fdTypeComodity: true },
    })
    if (typeRow?.fdTypeComodity !== null && typeRow?.fdTypeComodity !== undefined) {
      resolvedTypeId = typeRow.fdTypeComodity
    }
  }

  const created = await prisma.tbCommodityMapping.create({
    data: {
      commodityName: cleanName,
      targetCommodity: cleanTarget,
      fdTypeComodity: resolvedTypeId,
      fdCustCode: cleanCust,
      priceListUploadId: input.priceListUploadId ?? null,
      effectiveDate,
      endDate,
      mode: input.mode?.trim() || null,
      applyToNewUploads: input.applyToNewUploads ?? true,
      notes: input.notes?.trim() || null,
      createdBy: input.createdBy ?? null,
    },
  })

  return getCommodityMappingById(created.id)
}

/**
 * Update an existing Commodity Mapping
 */
export async function updateCommodityMapping(id: number, input: UpdateCommodityMappingInput) {
  const existing = await prisma.tbCommodityMapping.findUnique({
    where: { id },
  })
  if (!existing) {
    throw new Error(`Pemetaan komoditas dengan ID ${id} tidak ditemukan`)
  }

  const scopeOption = input.scopeChangeOption || 'specific_effective_date'
  const newEffectiveDate = input.effectiveDate ? new Date(input.effectiveDate) : existing.effectiveDate

  // If creating a versioned effective date update without mutating history
  if (scopeOption === 'specific_effective_date' && input.effectiveDate && new Date(input.effectiveDate) > existing.effectiveDate) {
    // End the existing rule at the new effective date
    await prisma.tbCommodityMapping.update({
      where: { id },
      data: { endDate: new Date(input.effectiveDate) },
    })

    // Create a new active record starting from new effective date
    const created = await prisma.tbCommodityMapping.create({
      data: {
        commodityName: input.commodityName?.trim() || existing.commodityName,
        targetCommodity: input.targetCommodity?.trim() || existing.targetCommodity,
        fdTypeComodity: input.fdTypeComodity !== undefined ? input.fdTypeComodity : existing.fdTypeComodity,
        fdCustCode: input.fdCustCode !== undefined ? (input.fdCustCode?.trim() || null) : existing.fdCustCode,
        priceListUploadId: input.priceListUploadId !== undefined ? input.priceListUploadId : existing.priceListUploadId,
        effectiveDate: new Date(input.effectiveDate),
        endDate: input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : null,
        mode: input.mode !== undefined ? input.mode : existing.mode,
        applyToNewUploads: input.applyToNewUploads !== undefined ? input.applyToNewUploads : existing.applyToNewUploads,
        notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
        createdBy: existing.createdBy,
      },
    })
    return getCommodityMappingById(created.id)
  }

  // Otherwise update in-place
  const updated = await prisma.tbCommodityMapping.update({
    where: { id },
    data: {
      commodityName: input.commodityName ? input.commodityName.trim() : undefined,
      targetCommodity: input.targetCommodity ? input.targetCommodity.trim() : undefined,
      fdTypeComodity: input.fdTypeComodity !== undefined ? input.fdTypeComodity : undefined,
      fdCustCode: input.fdCustCode !== undefined ? (input.fdCustCode?.trim() || null) : undefined,
      priceListUploadId: input.priceListUploadId !== undefined ? input.priceListUploadId : undefined,
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : undefined,
      endDate: input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : undefined,
      mode: input.mode !== undefined ? input.mode : undefined,
      applyToNewUploads: input.applyToNewUploads !== undefined ? input.applyToNewUploads : undefined,
      notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
    },
  })

  return getCommodityMappingById(updated.id)
}

/**
 * Delete a Commodity Mapping
 */
export async function deleteCommodityMapping(id: number) {
  return prisma.tbCommodityMapping.delete({
    where: { id },
  })
}

const INDO_SYNONYMS: Record<string, string[]> = {
  baterai: ['battery', 'baterai', 'batre'],
  batre: ['battery', 'baterai', 'batre'],
  sepatu: ['shoes', 'shoe', 'footwear', 'sepatu'],
  baju: ['garment', 'clothes', 'clothing', 'shirt', 't-shirt', 'apparel', 'baju'],
  pakaian: ['garment', 'clothes', 'clothing', 'apparel', 'pakaian'],
  tas: ['bag', 'bags', 'backpack', 'handbag', 'tas'],
  lampu: ['lamp', 'light', 'led', 'lampu'],
  baut: ['screw', 'bolt', 'fastener', 'baut'],
  kabel: ['cable', 'wire', 'kabel'],
  mainan: ['toy', 'toys', 'mainan'],
  kacamata: ['glasses', 'sunglasses', 'spectacles', 'kacamata'],
  jam: ['watch', 'clock', 'jam'],
  kain: ['fabric', 'textile', 'kain'],
}

function getSearchTerms(q: string): string[] {
  const lower = q.trim().toLowerCase()
  if (INDO_SYNONYMS[lower]) {
    return INDO_SYNONYMS[lower]
  }
  return [q.trim()]
}

/**
 * Auto-complete suggestions for commodity names from tbEntryList
 * Uses intelligent ranking: Exact Match -> Whole-word Match -> Starts-with -> Frequency / Usage count
 */
export async function getCommoditySuggestions(q: string, limit = 20): Promise<string[]> {
  const cleanQ = (q || '').trim()
  const safeLimit = Math.min(Math.max(1, limit), 50)

  if (!cleanQ) {
    // Return top frequently used commodities overall
    const rows = await safeRunRaw<any[]>(async () => {
      return prisma.$queryRaw<any[]>`
        SELECT TOP (${safeLimit}) RTRIM(fdComodity) AS comodity, COUNT(*) AS freq
        FROM tbEntryList WITH (NOLOCK)
        WHERE fdComodity IS NOT NULL AND RTRIM(fdComodity) <> ''
          AND fdComodity NOT LIKE '%,%,%,%'
          AND fdComodity NOT LIKE '(%'
        GROUP BY RTRIM(fdComodity)
        ORDER BY COUNT(*) DESC, RTRIM(fdComodity) ASC
      `
    }, 'getCommoditySuggestions_top')
    return (rows || []).map((r) => r.comodity?.trim()).filter(Boolean)
  }

  const terms = getSearchTerms(cleanQ)
  const primaryTerm = (terms[0] || cleanQ).replace(/'/g, "''")
  const orConditions = terms
    .map((t) => `fdComodity LIKE '%${t.replace(/'/g, "''")}%'`)
    .join(' OR ')

  const sql = `
    SELECT TOP (${safeLimit})
      RTRIM(fdComodity) AS comodity,
      COUNT(*) AS freq,
      CASE
        WHEN UPPER(RTRIM(fdComodity)) = UPPER('${primaryTerm}') THEN 1
        WHEN UPPER(RTRIM(fdComodity)) LIKE UPPER('${primaryTerm} %') OR UPPER(RTRIM(fdComodity)) LIKE UPPER('${primaryTerm}-%') THEN 2
        WHEN UPPER(RTRIM(fdComodity)) LIKE UPPER('% ${primaryTerm}') OR UPPER(RTRIM(fdComodity)) LIKE UPPER('%-${primaryTerm}') THEN 3
        WHEN UPPER(RTRIM(fdComodity)) LIKE UPPER('% ${primaryTerm} %') OR UPPER(RTRIM(fdComodity)) LIKE UPPER('%, ${primaryTerm}%') THEN 4
        WHEN UPPER(RTRIM(fdComodity)) LIKE UPPER('${primaryTerm}%') THEN 5
        ELSE 6
      END AS rank
    FROM tbEntryList WITH (NOLOCK)
    WHERE (${orConditions})
      AND RTRIM(fdComodity) <> ''
      AND fdComodity NOT LIKE '%,%,%,%'
      AND fdComodity NOT LIKE '(%'
    GROUP BY RTRIM(fdComodity)
    ORDER BY
      CASE
        WHEN UPPER(RTRIM(fdComodity)) = UPPER('${primaryTerm}') THEN 1
        WHEN UPPER(RTRIM(fdComodity)) LIKE UPPER('${primaryTerm} %') OR UPPER(RTRIM(fdComodity)) LIKE UPPER('${primaryTerm}-%') THEN 2
        WHEN UPPER(RTRIM(fdComodity)) LIKE UPPER('% ${primaryTerm}') OR UPPER(RTRIM(fdComodity)) LIKE UPPER('%-${primaryTerm}') THEN 3
        WHEN UPPER(RTRIM(fdComodity)) LIKE UPPER('% ${primaryTerm} %') OR UPPER(RTRIM(fdComodity)) LIKE UPPER('%, ${primaryTerm}%') THEN 4
        WHEN UPPER(RTRIM(fdComodity)) LIKE UPPER('${primaryTerm}%') THEN 5
        ELSE 6
      END ASC,
      COUNT(*) DESC,
      LEN(RTRIM(fdComodity)) ASC,
      RTRIM(fdComodity) ASC
  `

  const rows = await safeRunRaw<any[]>(async () => {
    return prisma.$queryRawUnsafe<any[]>(sql)
  }, 'getCommoditySuggestions_search')

  return (rows || []).map((r) => r.comodity?.trim()).filter(Boolean)
}

/**
 * Dynamic resolution engine: Resolves an input commodity string to its mapped target
 * with Customer Priority -> Global Priority -> Fallback.
 */
export async function resolveMappedCommodity(
  commodityName: string,
  custCode?: string | null,
  targetDate: Date = new Date(),
  mode?: string | null
): Promise<ResolvedCommodityResult> {
  const rawTarget = (commodityName || '').trim()
  if (!rawTarget) {
    return {
      isMapped: false,
      sourceScope: 'NONE',
      originalCommodity: '',
      targetCommodity: '',
      fdTypeComodity: null,
    }
  }

  const cleanCust = custCode?.trim() || null
  const targetMode = mode?.trim() || null

  // 1. Level 1: Customer-specific active mapping
  if (cleanCust) {
    const custMapping = await prisma.tbCommodityMapping.findFirst({
      where: {
        fdCustCode: cleanCust,
        commodityName: { equals: rawTarget },
        effectiveDate: { lte: targetDate },
        OR: [{ endDate: null }, { endDate: { gte: targetDate } }],
        ...(targetMode ? { OR: [{ mode: null }, { mode: { contains: targetMode } }] } : {}),
      },
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    })

    if (custMapping) {
      return {
        isMapped: true,
        sourceScope: 'CUSTOMER',
        originalCommodity: rawTarget,
        targetCommodity: custMapping.targetCommodity.trim(),
        fdTypeComodity: custMapping.fdTypeComodity,
        mappingId: custMapping.id,
        effectiveDate: custMapping.effectiveDate.toISOString(),
        notes: custMapping.notes || undefined,
      }
    }
  }

  // 2. Level 2: Global active mapping
  const globalMapping = await prisma.tbCommodityMapping.findFirst({
    where: {
      fdCustCode: null,
      commodityName: { equals: rawTarget },
      effectiveDate: { lte: targetDate },
      OR: [{ endDate: null }, { endDate: { gte: targetDate } }],
      ...(targetMode ? { OR: [{ mode: null }, { mode: { contains: targetMode } }] } : {}),
    },
    orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
  })

  if (globalMapping) {
    return {
      isMapped: true,
      sourceScope: 'GLOBAL',
      originalCommodity: rawTarget,
      targetCommodity: globalMapping.targetCommodity.trim(),
      fdTypeComodity: globalMapping.fdTypeComodity,
      mappingId: globalMapping.id,
      effectiveDate: globalMapping.effectiveDate.toISOString(),
      notes: globalMapping.notes || undefined,
    }
  }

  // 3. Level 3: Aturan sistem otomatis untuk komoditas baterai murni -> SEMI GARMENT (Laut)
  const { isGenuineBattery } = await import('../billing/billing-category.matcher')
  const isSea = !targetMode || targetMode.toUpperCase().includes('SEA') || targetMode.toUpperCase().includes('LAUT')
  if (isSea && isGenuineBattery(rawTarget)) {
    return {
      isMapped: true,
      sourceScope: 'SYSTEM_RULE',
      originalCommodity: rawTarget,
      targetCommodity: 'SEMI GARMENT',
      fdTypeComodity: 7,
      notes: 'Pemetaan otomatis barang baterai ke SEMI GARMENT',
    }
  }

  return {
    isMapped: false,
    sourceScope: 'NONE',
    originalCommodity: rawTarget,
    targetCommodity: rawTarget,
    fdTypeComodity: null,
  }
}

/**
 * Apply existing active mappings to a newly uploaded Price List
 */
export async function applyMappingsToNewUpload(input: ApplyMappingsToUploadInput) {
  const uploadId = input.uploadId
  const effectiveDate = new Date(input.effectiveDate)
  const isCust = Boolean(input.isCustomerUpload)
  const custCode = input.fdCustCode?.trim() || null

  const whereClause: Prisma.TbCommodityMappingWhereInput = {
    applyToNewUploads: true,
    OR: [{ endDate: null }, { endDate: { gte: effectiveDate } }],
  }

  if (isCust && custCode) {
    whereClause.OR = [{ fdCustCode: custCode }, { fdCustCode: null }]
  } else if (!isCust) {
    whereClause.fdCustCode = null
  }

  if (input.selectedMappingIds && input.selectedMappingIds.length > 0) {
    whereClause.id = { in: input.selectedMappingIds }
  }

  const eligibleMappings = await prisma.tbCommodityMapping.findMany({
    where: whereClause,
  })

  logger.info(
    `[applyMappingsToNewUpload] Upload ID ${uploadId} applied ${eligibleMappings.length} mappings starting from ${effectiveDate.toISOString()}`
  )

  return {
    uploadId,
    effectiveDate: effectiveDate.toISOString(),
    appliedCount: eligibleMappings.length,
    mappings: eligibleMappings.map((m) => ({
      id: m.id,
      commodityName: m.commodityName,
      targetCommodity: m.targetCommodity,
      scope: m.fdCustCode ? 'CUSTOMER' : 'GLOBAL',
    })),
  }
}

/**
 * Get Price List Options from database for Global or Customer scope
 */
export async function getPriceListOptions(
  scope: 'global' | 'customer' = 'global',
  custCode?: string
) {
  if (scope === 'customer' && custCode) {
    const uploads = await prisma.tbCustomerPriceListUpload.findMany({
      where: {
        fdCustCode: custCode.trim(),
        status: { not: 'FAILED' },
      },
      orderBy: [{ effectiveDate: 'desc' }, { uploadedAt: 'desc' }],
      take: 30,
      select: {
        id: true,
        fileName: true,
        effectiveDate: true,
        priceDate: true,
        uploadedAt: true,
        status: true,
        fdCustCode: true,
      },
    })
    return uploads.map((u) => ({
      id: u.id,
      fileName: u.fileName,
      effectiveDate: u.effectiveDate.toISOString(),
      priceDate: u.priceDate ? u.priceDate.toISOString() : null,
      uploadedAt: u.uploadedAt.toISOString(),
      status: u.status,
      scope: 'CUSTOMER' as const,
      fdCustCode: u.fdCustCode.trim(),
    }))
  }

  // Global Price Lists
  const uploads = await prisma.tbPriceListUpload.findMany({
    where: {
      status: { not: 'FAILED' },
    },
    orderBy: [{ effectiveDate: 'desc' }, { uploadedAt: 'desc' }],
    take: 30,
    select: {
      id: true,
      fileName: true,
      effectiveDate: true,
      priceDate: true,
      uploadedAt: true,
      status: true,
    },
  })

  return uploads.map((u) => ({
    id: u.id,
    fileName: u.fileName,
    effectiveDate: u.effectiveDate.toISOString(),
    priceDate: u.priceDate ? u.priceDate.toISOString() : null,
    uploadedAt: u.uploadedAt.toISOString(),
    status: u.status,
    scope: 'GLOBAL' as const,
    fdCustCode: null,
  }))
}

