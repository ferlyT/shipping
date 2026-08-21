import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { parsePriceListWorkbook } from './price-list.parser'
import { logger } from '../../config/logger'
import { lookupCustomerPriceList } from '../customer-price-list/customer-price-list.service'

async function safeRunRaw<T = any>(queryFn: () => Promise<T>, description: string): Promise<T> {
  try {
    return await queryFn()
  } catch (err) {
    logger.error(`Error executing ${description}:`, err)
    return [] as unknown as T
  }
}

export async function ingestPriceListFile(
  buffer: Buffer,
  fileName: string,
  effectiveDate: Date,
  uploadedBy?: string,
) {
  const parsed = await parsePriceListWorkbook(buffer)

  const upload = await prisma.tbPriceListUpload.create({
    data: {
      fileName,
      uploadedBy: uploadedBy ?? null,
      priceDate: parsed.priceDate,
      effectiveDate,
      status: parsed.status,
      warnings: JSON.stringify(parsed.warnings),
      rawSnapshot: JSON.stringify(parsed.rawSnapshot),
      items: {
        create: parsed.items.map((it) => ({
          sheetType: it.sheetType,
          mode: it.mode,
          branch: it.branch,
          transitTime: it.transitTime ?? null,
          category: it.category,
          price: new Prisma.Decimal(it.price),
        })),
      },
    },
    include: { items: false },
  })

  // Mark older uploads for the same effectiveDate as superseded
  await prisma.tbPriceListUpload.updateMany({
    where: {
      effectiveDate: upload.effectiveDate,
      id: { not: upload.id },
      isSuperseded: false,
    },
    data: { isSuperseded: true },
  })

  return {
    uploadId: upload.id,
    status: upload.status,
    effectiveDate: upload.effectiveDate,
    priceDate: upload.priceDate,
    itemCount: parsed.items.length,
    warnings: parsed.warnings,
    hasOlderVersions: false,
  }
}

export async function listUploads(page = 1, pageSize = 20) {
  const [rows, total] = await Promise.all([
    prisma.tbPriceListUpload.findMany({
      orderBy: { uploadedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fileName: true,
        uploadedBy: true,
        uploadedAt: true,
        priceDate: true,
        effectiveDate: true,
        status: true,
        isSuperseded: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.tbPriceListUpload.count(),
  ])
  return { rows, total, page, pageSize }
}

export async function getUploadDiff(id: number) {
  const current = await prisma.tbPriceListUpload.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!current) return null

  // Find previous upload with effectiveDate strictly before this one
  const previous = await prisma.tbPriceListUpload.findFirst({
    where: {
      effectiveDate: { lt: current.effectiveDate },
      status: { not: 'FAILED' },
    },
    orderBy: { effectiveDate: 'desc' },
    include: { items: true },
  })

  const key = (it: { sheetType: string; mode: string; branch: string; category: string }) =>
    `${it.sheetType}||${it.mode}||${it.branch}||${it.category}`

  const prevMap = new Map<string, number>()
  previous?.items.forEach((it) => prevMap.set(key(it), Number(it.price)))

  const diff = current.items.map((it) => {
    const prevPrice = prevMap.get(key(it))
    const currPrice = Number(it.price)
    return {
      sheetType: it.sheetType,
      mode: it.mode,
      branch: it.branch,
      category: it.category,
      currentPrice: currPrice,
      previousPrice: prevPrice ?? null,
      delta: prevPrice !== undefined ? currPrice - prevPrice : null,
      deltaPct: prevPrice ? ((currPrice - prevPrice) / prevPrice) * 100 : null,
    }
  })

  return {
    currentUploadId: current.id,
    currentEffectiveDate: current.effectiveDate,
    previousUploadId: previous?.id ?? null,
    previousEffectiveDate: previous?.effectiveDate ?? null,
    diff,
  }
}

export async function getLatestUploadDiff() {
  const latest = await prisma.tbPriceListUpload.findFirst({
    where: { isSuperseded: false, status: { not: 'FAILED' } },
    orderBy: { effectiveDate: 'desc' },
  })
  if (!latest) return null
  return getUploadDiff(latest.id)
}

export async function getPriceTrend(filter: {
  sheetType?: string
  mode?: string
  branch?: string
  category?: string
  from?: Date
  to?: Date
}) {
  const items = await prisma.tbPriceListItem.findMany({
    where: {
      sheetType: filter.sheetType || undefined,
      mode: filter.mode || undefined,
      branch: filter.branch || undefined,
      category: filter.category || undefined,
      upload: {
        isSuperseded: false,
        uploadedAt: {
          gte: filter.from,
          lte: filter.to,
        },
      },
    },
    include: {
      upload: {
        select: { id: true, uploadedAt: true, priceDate: true, effectiveDate: true },
      },
    },
    orderBy: { upload: { effectiveDate: 'asc' } },
  })

  return items.map((it) => ({
    uploadId: it.upload.id,
    date: (it.upload.effectiveDate ?? it.upload.priceDate).toISOString().slice(0, 10),
    sheetType: it.sheetType,
    mode: it.mode,
    branch: it.branch,
    category: it.category,
    price: Number(it.price),
  }))
}

export async function getFilterOptions(params: {
  sheetType?: string | string[]
  mode?: string
}) {
  const sheetTypeFilter = params.sheetType
    ? { in: Array.isArray(params.sheetType) ? params.sheetType : [params.sheetType] }
    : undefined

  const activeUploadWhere = { upload: { isSuperseded: false } }

  const [sheetTypes, modes, branches, categories] = await Promise.all([
    prisma.tbPriceListItem.findMany({
      where: activeUploadWhere,
      distinct: ['sheetType'],
      select: { sheetType: true },
    }),
    prisma.tbPriceListItem.findMany({
      where: activeUploadWhere,
      distinct: ['mode'],
      select: { mode: true },
    }),
    prisma.tbPriceListItem.findMany({
      where: { ...activeUploadWhere, sheetType: sheetTypeFilter, mode: params.mode || undefined },
      distinct: ['branch'],
      select: { branch: true },
    }),
    prisma.tbPriceListItem.findMany({
      where: { ...activeUploadWhere, sheetType: sheetTypeFilter, mode: params.mode || undefined },
      distinct: ['category'],
      select: { category: true },
    }),
  ])

  return {
    sheetTypes: sheetTypes.map((s) => s.sheetType),
    modes: modes.map((m) => m.mode),
    branches: branches.map((b) => b.branch),
    categories: categories.map((c) => c.category),
  }
}

export async function lookupPriceList(
  targetDate: Date,
  filters?: { sheetType?: string; mode?: string; branch?: string; category?: string; markingCode?: string },
) {
  const upload = await prisma.tbPriceListUpload.findFirst({
    where: {
      effectiveDate: { lte: targetDate },
      status: { not: 'FAILED' },
      isSuperseded: false,
    },
    orderBy: [{ effectiveDate: 'desc' }, { uploadedAt: 'desc' }],
  })

  if (!upload) {
    return {
      found: false,
      targetDate,
      uploadInfo: null,
      items: [],
      appliedLevel: 'NONE',
    }
  }

  const baseWhereItem: Prisma.TbPriceListItemWhereInput = {
    uploadId: upload.id,
  }

  if (filters?.sheetType) baseWhereItem.sheetType = filters.sheetType;
  if (filters?.mode) baseWhereItem.mode = filters.mode;
  if (filters?.branch) baseWhereItem.branch = filters.branch;
  if (filters?.category) {
    const catStr = filters.category;
    const categories = catStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (categories.length === 1) {
      baseWhereItem.category = categories[0];
    } else if (categories.length > 1) {
      baseWhereItem.category = { in: categories } as any;
    }
  }

  let items: any[] = []
  let isMarkingOverride = false

  // 1. Jika ada filter markingCode, coba cari yang markingCode-nya cocok (Level 3)
  if (filters?.markingCode?.trim()) {
    const cleanMarking = filters.markingCode.trim()
    const markingItems = await prisma.tbPriceListItem.findMany({
      where: {
        ...baseWhereItem,
        markings: {
          some: {
            markingCode: { equals: cleanMarking },
          },
        },
      },
      include: {
        markings: true,
      },
      orderBy: [{ sheetType: 'asc' }, { mode: 'asc' }, { branch: 'asc' }, { category: 'asc' }],
    })

    if (markingItems.length > 0) {
      items = markingItems
      isMarkingOverride = true
    }
  }

  // 2. Jika tidak ada markingCode atau tidak ada item yang match dengan markingCode, ambil item standar (Level 4)
  if (items.length === 0) {
    items = await prisma.tbPriceListItem.findMany({
      where: baseWhereItem,
      include: {
        markings: true,
      },
      orderBy: [{ sheetType: 'asc' }, { mode: 'asc' }, { branch: 'asc' }, { category: 'asc' }],
    })
  }

  return {
    found: true,
    targetDate,
    uploadInfo: {
      uploadId: upload.id,
      fileName: upload.fileName,
      effectiveDate: upload.effectiveDate,
      priceDate: upload.priceDate,
      uploadedAt: upload.uploadedAt,
    },
    isMarkingOverride,
    items: items.map((it) => ({
      id: it.id,
      sheetType: it.sheetType,
      mode: it.mode,
      branch: it.branch,
      transitTime: it.transitTime,
      category: it.category,
      price: Number(it.price),
      markings: it.markings?.map((m: any) => ({
        id: m.id,
        markingCode: m.markingCode,
        agentName: m.agentName,
      })) || [],
    })),
  }
}

export async function getItemMarkings(itemId: number) {
  return prisma.tbPriceListItemMarking.findMany({
    where: { itemId },
    orderBy: { markingCode: 'asc' },
  })
}

export async function setItemMarkings(
  itemId: number,
  markings: { markingCode: string; agentName?: string }[],
) {
  // Replace all markings for this item in a transaction
  return prisma.$transaction(async (tx) => {
    await tx.tbPriceListItemMarking.deleteMany({
      where: { itemId },
    })

    if (markings.length > 0) {
      const validMarkings = markings
        .map((m) => ({
          itemId,
          markingCode: m.markingCode.trim(),
          agentName: m.agentName?.trim() || null,
        }))
        .filter((m) => m.markingCode.length > 0)

      // Deduplicate by markingCode
      const uniqueMap = new Map<string, typeof validMarkings[0]>()
      validMarkings.forEach((m) => uniqueMap.set(m.markingCode.toUpperCase(), m))
      const uniqueList = Array.from(uniqueMap.values())

      if (uniqueList.length > 0) {
        await tx.tbPriceListItemMarking.createMany({
          data: uniqueList,
        })
      }
    }

    return tx.tbPriceListItemMarking.findMany({
      where: { itemId },
      orderBy: { markingCode: 'asc' },
    })
  })
}

export async function deleteItemMarking(itemId: number, markingCode: string) {
  return prisma.tbPriceListItemMarking.deleteMany({
    where: {
      itemId,
      markingCode: markingCode.trim(),
    },
  })
}

export async function searchEntryList(q: string, limit = 20) {
  let cleanQ = q.trim()
  if (cleanQ.includes('—')) {
    cleanQ = (cleanQ.split('—')[0] || '').trim()
  } else if (cleanQ.includes(' - ')) {
    cleanQ = (cleanQ.split(' - ')[0] || '').trim()
  }

  // Filter out UI placeholder texts or excessively long strings
  if (/pilih|ketik|pengiriman|data pengiriman/i.test(cleanQ) || cleanQ.length > 50) {
    cleanQ = ''
  }

  const safeLimit = Math.min(Math.max(1, limit), 100)

  let rows: any[] = []

  if (!cleanQ) {
    rows = await safeRunRaw(
      () => prisma.$queryRaw<any[]>`
        SELECT TOP (${safeLimit})
          el.fdListCode,
          el.fdMarkingCode,
          el.fdMarkingNo,
          el.fdListType,
          el.fdTypeComodity,
          el.fdTglAgent,
          el.fdCustCode,
          el.fdTerima,
          c.fdCustName
        FROM tbEntryList el WITH (NOLOCK)
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
        ORDER BY el.fdListCode DESC
      `,
      'searchEntryList_empty',
    )
  } else {
    // 1. Fast Index Prefix Search First (instant <5ms query for entry codes & markings)
    const prefixPattern = `${cleanQ}%`
    rows = await safeRunRaw(
      () => prisma.$queryRaw<any[]>`
        SELECT TOP (${safeLimit})
          el.fdListCode,
          el.fdMarkingCode,
          el.fdMarkingNo,
          el.fdListType,
          el.fdTypeComodity,
          el.fdTglAgent,
          el.fdCustCode,
          el.fdTerima,
          c.fdCustName
        FROM tbEntryList el WITH (NOLOCK)
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
        WHERE
          el.fdListCode LIKE ${prefixPattern}
          OR el.fdMarkingCode LIKE ${prefixPattern}
        ORDER BY el.fdListCode DESC
      `,
      'searchEntryList_prefix',
    )

    // 2. Full Wildcard Search if prefix search returned 0 rows
    if (!Array.isArray(rows) || rows.length === 0) {
      const pattern = `%${cleanQ}%`
      rows = await safeRunRaw(
        () => prisma.$queryRaw<any[]>`
          SELECT TOP (${safeLimit})
            el.fdListCode,
            el.fdMarkingCode,
            el.fdMarkingNo,
            el.fdListType,
            el.fdTypeComodity,
            el.fdTglAgent,
            el.fdCustCode,
            el.fdTerima,
            c.fdCustName
          FROM tbEntryList el WITH (NOLOCK)
          LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
          WHERE
            el.fdListCode LIKE ${pattern}
            OR el.fdMarkingCode LIKE ${pattern}
            OR el.fdMarkingNo LIKE ${pattern}
            OR el.fdTerima LIKE ${pattern}
            OR c.fdCustName LIKE ${pattern}
          ORDER BY el.fdListCode DESC
        `,
        'searchEntryList_query',
      )

      // Fallback strategy: if exact string search returns no results, try tokenized search by first meaningful word/code
      if ((!Array.isArray(rows) || rows.length === 0) && cleanQ.length >= 2) {
        const tokens = cleanQ.split(/[\s\/\-_:]+/).filter((t) => t.length >= 2)
        if (tokens.length > 0) {
          const firstToken = `%${tokens[0]}%`
          rows = await safeRunRaw(
            () => prisma.$queryRaw<any[]>`
              SELECT TOP (${safeLimit})
                el.fdListCode,
                el.fdMarkingCode,
                el.fdMarkingNo,
                el.fdListType,
                el.fdTypeComodity,
                el.fdTglAgent,
                el.fdCustCode,
                el.fdTerima,
                c.fdCustName
              FROM tbEntryList el WITH (NOLOCK)
              LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
              WHERE
                el.fdListCode LIKE ${firstToken}
                OR el.fdMarkingCode LIKE ${firstToken}
                OR el.fdMarkingNo LIKE ${firstToken}
                OR el.fdTerima LIKE ${firstToken}
                OR c.fdCustName LIKE ${firstToken}
              ORDER BY el.fdListCode DESC
            `,
            'searchEntryList_token_fallback',
          )
        }
      }
    }
  }

  if (!Array.isArray(rows)) return []

  return rows.map((r) => ({
    fdListCode: r.fdListCode ? String(r.fdListCode).trim() : '',
    fdMarkingCode: r.fdMarkingCode ? String(r.fdMarkingCode).trim() : null,
    fdMarkingNo: r.fdMarkingNo ? String(r.fdMarkingNo).trim() : null,
    fdListType: r.fdListType !== null && r.fdListType !== undefined ? Number(r.fdListType) : null,
    fdTypeComodity: r.fdTypeComodity !== null && r.fdTypeComodity !== undefined ? Number(r.fdTypeComodity) : null,
    fdTglAgent: r.fdTglAgent ? new Date(r.fdTglAgent).toISOString() : null,
    fdCustCode: r.fdCustCode ? String(r.fdCustCode).trim() : null,
    fdTerima: r.fdTerima ? String(r.fdTerima).trim() : null,
    customer: r.fdCustCode
      ? {
          fdCustCode: String(r.fdCustCode).trim(),
          fdCustName: r.fdCustName ? String(r.fdCustName).trim() : null,
        }
      : null,
  }))
}

export async function lookupPriceByEntry(listCode: string) {
  const cleanListCode = listCode.trim()
  if (!cleanListCode) {
    return {
      found: false,
      fdListCode: '',
      fdMarkingCode: null,
      fdMarkingNo: null,
      fdListType: null,
      fdTypeComodity: null,
      fdTglAgent: null,
      expectedMode: null,
      expectedBranch: null,
      customer: null,
      comodityTypes: [],
      priceValidation: null,
    }
  }

  // 1. Fetch entry details + marking + branch + customer
  const entryRows = await safeRunRaw<any[]>(
    () => prisma.$queryRaw<any[]>`
      SELECT TOP 1
        el.fdListCode,
        el.fdListType,
        el.fdTypeComodity,
        el.fdTglAgent,
        el.fdMarkingCode,
        el.fdMarkingNo,
        el.fdCustCode,
        el.fdTerima,
        m.fdBranchCode,
        cb.fdBranchName,
        c.fdCustName
      FROM tbEntryList el WITH (NOLOCK)
      LEFT JOIN tbMarking m WITH (NOLOCK) ON m.fdMarkingCode = el.fdMarkingCode
      LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = m.fdBranchCode
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
      WHERE el.fdListCode = ${cleanListCode}
         OR el.fdMarkingCode = ${cleanListCode}
         OR el.fdMarkingNo = ${cleanListCode}
         OR el.fdTerima = ${cleanListCode}
    `,
    'lookupPriceByEntry_fetchEntry',
  )

  const entry = Array.isArray(entryRows) && entryRows.length > 0 ? entryRows[0] : null

  if (!entry) {
    return {
      found: false,
      fdListCode: cleanListCode,
      fdMarkingCode: null,
      fdMarkingNo: null,
      fdListType: null,
      fdTypeComodity: null,
      fdTglAgent: null,
      expectedMode: null,
      expectedBranch: null,
      customer: null,
      comodityTypes: [],
      priceValidation: null,
    }
  }

  const fdListType = entry.fdListType !== null && entry.fdListType !== undefined ? Number(entry.fdListType) : null
  const fdTypeComodity = entry.fdTypeComodity !== null && entry.fdTypeComodity !== undefined ? Number(entry.fdTypeComodity) : null
  const agentDate = entry.fdTglAgent ? new Date(entry.fdTglAgent) : null

  let expectedMode: string | null = null
  if (fdListType === 1) expectedMode = 'BY AIR'
  else if (fdListType === 2) expectedMode = 'BY SEA'

  let expectedBranch: string | null = null
  const branchName = entry.fdBranchName ? String(entry.fdBranchName).trim() : ''
  const branchCode = entry.fdBranchCode ? String(entry.fdBranchCode).trim() : ''
  const bCombined = `${branchName} ${branchCode}`.toUpperCase()

  if (bCombined.includes('GZ') || bCombined.includes('GUANGZHOU')) expectedBranch = 'GZ'
  else if (bCombined.includes('HK') || bCombined.includes('HONGKONG')) expectedBranch = 'HK'
  else if (bCombined.includes('SG') || bCombined.includes('SINGAPORE')) expectedBranch = 'SG'
  else if (bCombined.includes('SH') || bCombined.includes('SHANGHAI')) expectedBranch = 'SH'
  else if (bCombined.includes('YW') || bCombined.includes('YIWU')) expectedBranch = 'YW'
  else if (branchCode) expectedBranch = branchCode.toUpperCase()

  // 2. Fetch all commodity types from tbTypeComodity
  const comodityRows = await safeRunRaw<any[]>(
    () => prisma.$queryRaw<any[]>`
      SELECT fdID, fdTypeComodity, fdComodityName, fdListType
      FROM tbTypeComodity WITH (NOLOCK)
    `,
    'lookupPriceByEntry_comodityTypes',
  )

  const comodityTypes = Array.isArray(comodityRows)
    ? comodityRows.map((c) => ({
        fdID: Number(c.fdID || 0),
        fdTypeComodity: c.fdTypeComodity !== null && c.fdTypeComodity !== undefined ? Number(c.fdTypeComodity) : null,
        fdComodityName: c.fdComodityName ? String(c.fdComodityName).trim() : '',
        fdListType: c.fdListType !== null && c.fdListType !== undefined ? Number(c.fdListType) : null,
      }))
    : []

  // 3. Fetch effective price list items using 4-tier Priority Hierarchy:
  // Level 1: Customer Price List + Matching Agent Marking Code
  // Level 2: Customer Price List Standard (No Marking)
  // Level 3: General Price List + Matching Agent Marking Code
  // Level 4: General Price List Standard (No Marking)
  const targetDate = agentDate || new Date()
  const markingCode = entry.fdMarkingCode ? String(entry.fdMarkingCode).trim() : undefined
  const custCode = entry.fdCustCode ? String(entry.fdCustCode).trim() : undefined

  let priceValidation: any = null
  let appliedRule: 'CUSTOMER_MARKING' | 'CUSTOMER_DEFAULT' | 'GENERAL_MARKING' | 'GENERAL_DEFAULT' | 'NONE' = 'NONE'

  // Step A: Coba cari di Customer Price List terlebih dahulu (Level 1 & 2)
  if (custCode) {
    const custLookup = await lookupCustomerPriceList(custCode, targetDate, {
      mode: expectedMode || undefined,
      branch: expectedBranch || undefined,
      markingCode,
    })

    if (custLookup.found && custLookup.items.length > 0) {
      appliedRule = custLookup.isMarkingOverride ? 'CUSTOMER_MARKING' : 'CUSTOMER_DEFAULT'
      priceValidation = {
        source: 'CUSTOMER',
        uploadInfo: custLookup.uploadInfo,
        effectiveDate: custLookup.uploadInfo?.effectiveDate
          ? new Date(custLookup.uploadInfo.effectiveDate).toISOString()
          : null,
        isMarkingOverride: custLookup.isMarkingOverride,
        appliedRule,
        items: custLookup.items,
      }
    }
  }

  // Step B: Jika tidak ditemukan di Customer Price List, fallback ke General Price List (Level 3 & 4)
  if (!priceValidation) {
    const generalLookup = await lookupPriceList(targetDate, {
      mode: expectedMode || undefined,
      branch: expectedBranch || undefined,
      markingCode,
    })

    if (generalLookup.found && generalLookup.items.length > 0) {
      appliedRule = generalLookup.isMarkingOverride ? 'GENERAL_MARKING' : 'GENERAL_DEFAULT'
      priceValidation = {
        source: 'GENERAL',
        uploadInfo: generalLookup.uploadInfo,
        effectiveDate: generalLookup.uploadInfo?.effectiveDate
          ? new Date(generalLookup.uploadInfo.effectiveDate).toISOString()
          : null,
        isMarkingOverride: generalLookup.isMarkingOverride,
        appliedRule,
        items: generalLookup.items,
      }
    }
  }

  return {
    found: true,
    fdListCode: String(entry.fdListCode).trim(),
    fdMarkingCode: entry.fdMarkingCode ? String(entry.fdMarkingCode).trim() : null,
    fdMarkingNo: entry.fdMarkingNo ? String(entry.fdMarkingNo).trim() : null,
    fdListType,
    fdTypeComodity,
    fdTglAgent: agentDate ? agentDate.toISOString() : null,
    expectedMode,
    expectedBranch,
    customer: entry.fdCustCode
      ? {
          fdCustCode: String(entry.fdCustCode).trim(),
          fdCustName: entry.fdCustName ? String(entry.fdCustName).trim() : null,
        }
      : null,
    comodityTypes,
    appliedRule,
    priceValidation,
  }
}



