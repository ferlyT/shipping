import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { parsePriceListWorkbook } from '../price-list/price-list.parser'
import { logger } from '../../config/logger'
import { normalizeMode, findCustomerMarkingOverrideUpload } from '../price-list/marking-matcher'

/**
 * Ingest file Excel price list customer ke DB.
 * Reuse parser yang sama dengan general price list.
 */
export async function ingestCustomerPriceListFile(
  buffer: Buffer,
  fdCustCode: string,
  fileName: string,
  effectiveDate: Date,
  uploadedBy?: string,
) {
  const parsed = await parsePriceListWorkbook(buffer)

  const upload = await prisma.tbCustomerPriceListUpload.create({
    data: {
      fdCustCode,
      fileName,
      uploadedBy: uploadedBy ?? null,
      priceDate: parsed.priceDate,
      effectiveDate,
      status: parsed.status,
      warnings: JSON.stringify(parsed.warnings),
      rawSnapshot: JSON.stringify(parsed.rawSnapshot),
      items: {
        create: parsed.items.map((it) => ({
          fdCustCode,
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

  // Mark uploads LAMA dengan effectiveDate yang sama sebagai superseded
  await prisma.tbCustomerPriceListUpload.updateMany({
    where: {
      fdCustCode,
      effectiveDate: upload.effectiveDate,
      id: { not: upload.id },
      isSuperseded: false,
    },
    data: { isSuperseded: true },
  })

  return {
    uploadId: upload.id,
    fdCustCode,
    status: upload.status,
    effectiveDate: upload.effectiveDate,
    priceDate: upload.priceDate,
    itemCount: parsed.items.length,
    warnings: parsed.warnings,
  }
}

/**
 * List semua customer yang punya price list (distinct fdCustCode + info upload terakhir).
 */
export async function listCustomersWithPriceList() {
  const rows = await prisma.tbCustomerPriceListUpload.findMany({
    where: { isSuperseded: false, status: { not: 'FAILED' } },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      fdCustCode: true,
      fileName: true,
      uploadedBy: true,
      uploadedAt: true,
      priceDate: true,
      effectiveDate: true,
      status: true,
      _count: { select: { items: true } },
    },
    distinct: ['fdCustCode'],
  })

  // Enrich dengan nama customer
  const custCodes = [...new Set(rows.map((r) => r.fdCustCode))]
  const customers = await prisma.tbCustomers.findMany({
    where: { fdCustCode: { in: custCodes } },
    select: { fdCustCode: true, fdCustName: true },
  })
  const custMap = new Map(customers.map((c) => [c.fdCustCode, c.fdCustName ?? '-']))

  return rows.map((r) => ({
    ...r,
    custName: custMap.get(r.fdCustCode) ?? '-',
    itemCount: r._count.items,
  }))
}

/**
 * List upload history per customer dengan pagination.
 */
export async function listCustomerUploads(fdCustCode: string, page = 1, pageSize = 20) {
  const [rows, total] = await Promise.all([
    prisma.tbCustomerPriceListUpload.findMany({
      where: { fdCustCode },
      orderBy: { uploadedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fdCustCode: true,
        fileName: true,
        uploadedBy: true,
        uploadedAt: true,
        priceDate: true,
        effectiveDate: true,
        status: true,
        isSuperseded: true,
        _count: { select: { items: true } },
        markings: {
          select: { id: true, markingCode: true, agentName: true, mode: true },
          orderBy: { markingCode: 'asc' },
        },
      },
    }),
    prisma.tbCustomerPriceListUpload.count({ where: { fdCustCode } }),
  ])
  return { rows, total, page, pageSize }
}

/**
 * Ambil item price list aktif per customer (upload terbaru non-superseded).
 */
export async function getActiveCustomerPriceList(fdCustCode: string) {
  const latestUpload = await prisma.tbCustomerPriceListUpload.findFirst({
    where: { fdCustCode, isSuperseded: false, status: { not: 'FAILED' } },
    include: { markings: true },
    orderBy: [{ effectiveDate: 'desc' }, { uploadedAt: 'desc' }],
  })
  if (!latestUpload) return null

  const items = await prisma.tbCustomerPriceListItem.findMany({
    where: { uploadId: latestUpload.id },
    orderBy: [{ mode: 'asc' }, { branch: 'asc' }, { category: 'asc' }],
  })

  return {
    uploadId: latestUpload.id,
    fdCustCode: latestUpload.fdCustCode,
    effectiveDate: latestUpload.effectiveDate,
    priceDate: latestUpload.priceDate,
    uploadedAt: latestUpload.uploadedAt,
    fileName: latestUpload.fileName,
    markings: latestUpload.markings?.map((m) => ({
      id: m.id,
      markingCode: m.markingCode,
      agentName: m.agentName,
      mode: m.mode,
    })) || [],
    items: items.map((it) => ({
      id: it.id,
      mode: it.mode,
      branch: it.branch,
      transitTime: it.transitTime,
      category: it.category,
      price: Number(it.price),
      markings: latestUpload.markings?.map((m) => ({
        id: m.id,
        markingCode: m.markingCode,
        agentName: m.agentName,
        mode: m.mode,
      })) || [],
    })),
  }
}

/**
 * Diff antara upload saat ini dan sebelumnya per customer.
 */
export async function getCustomerUploadDiff(id: number) {
  const current = await prisma.tbCustomerPriceListUpload.findUnique({
    where: { id },
    include: {
      items: true,
      markings: true,
    },
  })
  if (!current) return null

  const previous = await prisma.tbCustomerPriceListUpload.findFirst({
    where: {
      fdCustCode: current.fdCustCode,
      effectiveDate: { lt: current.effectiveDate },
      status: { not: 'FAILED' },
    },
    orderBy: { effectiveDate: 'desc' },
    include: { items: true },
  })

  const key = (it: { mode: string; branch: string; category: string }) =>
    `${it.mode}||${it.branch}||${it.category}`

  const prevMap = new Map<string, number>()
  previous?.items.forEach((it) => prevMap.set(key(it), Number(it.price)))

  // Fetch active commodity mapping aliases for this customer
  const mappings = await prisma.tbCommodityMapping.findMany({
    where: {
      OR: [
        { fdCustCode: current.fdCustCode },
        { fdCustCode: null },
      ],
    },
    select: {
      commodityName: true,
      targetCommodity: true,
      mode: true,
    },
  })

  const aliasMap = new Map<string, string[]>()
  for (const m of mappings) {
    const catKey = m.targetCommodity.trim().toUpperCase()
    const modeKey = m.mode ? (normalizeMode(m.mode) || m.mode.toUpperCase()) : 'ALL'
    const keyStr = `${catKey}_${modeKey}`
    const keyAll = `${catKey}_ALL`

    if (!aliasMap.has(keyStr)) aliasMap.set(keyStr, [])
    if (!aliasMap.get(keyStr)!.includes(m.commodityName.toUpperCase())) {
      aliasMap.get(keyStr)!.push(m.commodityName.toUpperCase())
    }
    if (modeKey !== 'ALL') {
      if (!aliasMap.has(keyAll)) aliasMap.set(keyAll, [])
      if (!aliasMap.get(keyAll)!.includes(m.commodityName.toUpperCase())) {
        aliasMap.get(keyAll)!.push(m.commodityName.toUpperCase())
      }
    }
  }

  const diff = current.items.map((it) => {
    const prevPrice = prevMap.get(key(it))
    const currPrice = Number(it.price)
    const catKey = it.category.trim().toUpperCase()
    const modeKey = normalizeMode(it.mode) || it.mode.toUpperCase()
    const specificAliases = aliasMap.get(`${catKey}_${modeKey}`) || []
    const genericAliases = aliasMap.get(`${catKey}_ALL`) || []
    const combinedAliases = Array.from(new Set([...specificAliases, ...genericAliases]))

    return {
      id: it.id,
      mode: it.mode,
      branch: it.branch,
      category: it.category,
      currentPrice: currPrice,
      previousPrice: prevPrice ?? null,
      delta: prevPrice !== undefined ? currPrice - prevPrice : null,
      deltaPct: prevPrice ? ((currPrice - prevPrice) / prevPrice) * 100 : null,
      aliases: combinedAliases,
      markings: current.markings?.map((m) => ({
        id: m.id,
        markingCode: m.markingCode,
        agentName: m.agentName,
        mode: m.mode,
      })) || [],
    }
  })

  return {
    fdCustCode: current.fdCustCode,
    currentUploadId: current.id,
    currentEffectiveDate: current.effectiveDate,
    previousUploadId: previous?.id ?? null,
    previousEffectiveDate: previous?.effectiveDate ?? null,
    markings: current.markings?.map((m) => ({
      id: m.id,
      markingCode: m.markingCode,
      agentName: m.agentName,
      mode: m.mode,
    })) || [],
    diff,
  }
}



export async function softDeleteCustomerUpload(id: number) {
  const current = await prisma.tbCustomerPriceListUpload.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!current) throw new Error('Upload customer price list tidak ditemukan')

  const now = new Date()

  // 1. Mark upload as DELETED & superseded
  const updated = await prisma.tbCustomerPriceListUpload.update({
    where: { id },
    data: {
      status: 'DELETED',
      isSuperseded: true,
    },
  })

  // 2. Soft-delete all its price items by setting endDate to now
  await prisma.tbCustomerPriceListItem.updateMany({
    where: { uploadId: id },
    data: {
      endDate: now,
    },
  })

  // 3. Soft-delete matching customer commodity mappings if any
  for (const it of current.items) {
    await prisma.tbCommodityMapping.updateMany({
      where: {
        fdCustCode: current.fdCustCode,
        targetCommodity: it.category,
        mode: it.mode,
        endDate: null,
      },
      data: {
        endDate: now,
      },
    })
  }

  // 4. Re-calculate superseded status for remaining active uploads of this customer
  const activeUploads = await prisma.tbCustomerPriceListUpload.findMany({
    where: {
      fdCustCode: current.fdCustCode,
      status: { notIn: ['FAILED', 'DELETED'] },
    },
    orderBy: [
      { effectiveDate: 'desc' },
      { uploadedAt: 'desc' },
    ],
  })

  if (activeUploads.length > 0) {
    await prisma.tbCustomerPriceListUpload.update({
      where: { id: activeUploads[0].id },
      data: { isSuperseded: false },
    })
  }

  return updated
}

export async function updateCustomerUploadEffectiveDate(id: number, newEffectiveDate: Date) {
  const current = await prisma.tbCustomerPriceListUpload.findUnique({
    where: { id },
  })
  if (!current) return null

  const updated = await prisma.tbCustomerPriceListUpload.update({
    where: { id },
    data: { effectiveDate: newEffectiveDate },
  })

  // Recalculate superseded status for uploads of this customer with the same effectiveDate
  const allForDate = await prisma.tbCustomerPriceListUpload.findMany({
    where: {
      fdCustCode: current.fdCustCode,
      effectiveDate: newEffectiveDate,
      status: { not: 'FAILED' },
    },
    orderBy: { uploadedAt: 'desc' },
  })

  if (allForDate.length > 1) {
    const latest = allForDate[0]
    const older = allForDate.slice(1)
    if (latest) {
      await prisma.tbCustomerPriceListUpload.update({
        where: { id: latest.id },
        data: { isSuperseded: false },
      })
    }
    for (const old of older) {
      await prisma.tbCustomerPriceListUpload.update({
        where: { id: old.id },
        data: { isSuperseded: true },
      })
    }
  } else if (allForDate.length === 1 && allForDate[0]) {
    await prisma.tbCustomerPriceListUpload.update({
      where: { id: allForDate[0].id },
      data: { isSuperseded: false },
    })
  }

  return updated
}

export async function getCustomerPriceListFilters(fdCustCode?: string) {

  const whereUpload: Prisma.TbCustomerPriceListUploadWhereInput = {
    isSuperseded: false,
    status: { not: 'FAILED' },
  }
  if (fdCustCode) {
    whereUpload.fdCustCode = fdCustCode
  }

  const uploads = await prisma.tbCustomerPriceListUpload.findMany({
    where: whereUpload,
    select: { id: true },
  })
  const uploadIds = uploads.map((u) => u.id)

  if (uploadIds.length === 0) return { modes: [], branches: [], categories: [] }

  const [modes, branches, categories] = await Promise.all([
    prisma.tbCustomerPriceListItem.findMany({
      where: { uploadId: { in: uploadIds } },
      distinct: ['mode'],
      select: { mode: true },
    }),
    prisma.tbCustomerPriceListItem.findMany({
      where: { uploadId: { in: uploadIds } },
      distinct: ['branch'],
      select: { branch: true },
    }),
    prisma.tbCustomerPriceListItem.findMany({
      where: { uploadId: { in: uploadIds } },
      distinct: ['category'],
      select: { category: true },
    }),
  ])

  return {
    modes: modes.map((m) => m.mode),
    branches: branches.map((b) => b.branch),
    categories: categories.map((c) => c.category),
  }
}

export { normalizeMode }

/**
 * Cari harga khusus customer pada tanggal tertentu dengan dukungan filter markingCode agen (Level 1 & Level 2) dan mode (Udara / Laut).
 */
export async function lookupCustomerPriceList(
  fdCustCode: string,
  targetDate: Date,
  filters?: { mode?: string; branch?: string; category?: string; markingCode?: string }
) {
  const cleanCustCode = fdCustCode ? fdCustCode.trim() : ''
  if (!cleanCustCode) {
    return {
      found: false,
      fdCustCode: '',
      targetDate,
      uploadInfo: null,
      items: [],
      isMarkingOverride: false,
    }
  }

  try {
    let upload: any = null
    let isMarkingOverride = false

    // 1. Pengecekan Level 1: Khusus Agen Marking Customer (TbCustomerPriceListUploadMarking)
    if (filters?.markingCode?.trim()) {
      const cleanMarking = filters.markingCode.trim()
      const overrideRes = await findCustomerMarkingOverrideUpload(cleanCustCode, cleanMarking, {
        mode: filters?.mode,
        branch: filters?.branch,
        targetDate,
      })

      if (overrideRes) {
        upload = overrideRes.upload
        isMarkingOverride = true
      }
    }

    // 2. Pengecekan Level 2: Master Customer Upload Default
    if (!upload) {
      upload = await prisma.tbCustomerPriceListUpload.findFirst({
        where: {
          fdCustCode: cleanCustCode,
          effectiveDate: { lte: targetDate },
          status: { not: 'FAILED' },
          isSuperseded: false,
        },
        include: { markings: true },
        orderBy: [
          { effectiveDate: 'desc' },
          { uploadedAt: 'desc' },
        ],
      })
    }

    if (!upload) {
      return {
        found: false,
        fdCustCode: cleanCustCode,
        targetDate,
        uploadInfo: null,
        items: [],
        isMarkingOverride: false,
      }
    }

    const baseWhere: Prisma.TbCustomerPriceListItemWhereInput = {
      uploadId: upload.id,
      fdCustCode: cleanCustCode,
      AND: [
        { OR: [{ effectiveDate: null }, { effectiveDate: { lte: targetDate } }] },
        { OR: [{ endDate: null }, { endDate: { gte: targetDate } }] },
      ],
    }

    if (filters?.mode) baseWhere.mode = filters.mode;
    if (filters?.branch) baseWhere.branch = filters.branch;
    if (filters?.category) {
      const catStr = filters.category;
      const categories = catStr.split(',').map((s) => s.trim()).filter(Boolean);
      if (categories.length === 1) {
        baseWhere.category = categories[0];
      } else if (categories.length > 1) {
        baseWhere.category = { in: categories } as any;
      }
    }

    const items = await prisma.tbCustomerPriceListItem.findMany({
      where: baseWhere,
      orderBy: [{ mode: 'asc' }, { branch: 'asc' }, { category: 'asc' }],
    })

    // Fetch active commodity mapping aliases for this customer
    const mappings = await prisma.tbCommodityMapping.findMany({
      where: {
        OR: [
          { fdCustCode: cleanCustCode },
          { fdCustCode: null },
        ],
      },
      select: {
        commodityName: true,
        targetCommodity: true,
        mode: true,
      },
    })

    const aliasMap = new Map<string, string[]>()
    for (const m of mappings) {
      const catKey = m.targetCommodity.trim().toUpperCase()
      const modeKey = m.mode ? (normalizeMode(m.mode) || m.mode.toUpperCase()) : 'ALL'
      const key = `${catKey}_${modeKey}`
      const keyAll = `${catKey}_ALL`

      if (!aliasMap.has(key)) aliasMap.set(key, [])
      if (!aliasMap.get(key)!.includes(m.commodityName.toUpperCase())) {
        aliasMap.get(key)!.push(m.commodityName.toUpperCase())
      }
      if (modeKey !== 'ALL') {
        if (!aliasMap.has(keyAll)) aliasMap.set(keyAll, [])
        if (!aliasMap.get(keyAll)!.includes(m.commodityName.toUpperCase())) {
          aliasMap.get(keyAll)!.push(m.commodityName.toUpperCase())
        }
      }
    }

    return {
      found: items.length > 0,
      fdCustCode: cleanCustCode,
      targetDate,
      uploadInfo: {
        uploadId: upload.id,
        fileName: upload.fileName,
        effectiveDate: upload.effectiveDate,
        priceDate: upload.priceDate,
        uploadedAt: upload.uploadedAt,
        markings: upload.markings?.map((m: any) => ({
          id: m.id,
          markingCode: m.markingCode,
          agentName: m.agentName,
          mode: m.mode,
        })) || [],
      },
      isMarkingOverride,
      items: items.map((it) => {
        const catKey = it.category.trim().toUpperCase()
        const modeKey = normalizeMode(it.mode) || it.mode.toUpperCase()
        const specificAliases = aliasMap.get(`${catKey}_${modeKey}`) || []
        const genericAliases = aliasMap.get(`${catKey}_ALL`) || []
        const combinedAliases = Array.from(new Set([...specificAliases, ...genericAliases]))

        return {
          id: it.id,
          sheetType: it.sheetType,
          mode: it.mode,
          branch: it.branch,
          transitTime: it.transitTime,
          category: it.category,
          price: Number(it.price),
          aliases: combinedAliases,
          markings: upload.markings?.map((m: any) => ({
            id: m.id,
            markingCode: m.markingCode,
            agentName: m.agentName,
            mode: m.mode,
          })) || [],
        }
      }),
    }

  } catch (err) {
    logger.error('Error executing lookupCustomerPriceList:', err)
    return {
      found: false,
      fdCustCode: cleanCustCode,
      targetDate,
      uploadInfo: null,
      items: [],
      isMarkingOverride: false,
    }
  }
}

export async function getCustomerUploadMarkings(uploadId: number) {
  return prisma.tbCustomerPriceListUploadMarking.findMany({
    where: { uploadId },
    orderBy: { markingCode: 'asc' },
  })
}

export async function setCustomerUploadMarkings(
  uploadId: number,
  markings: { markingCode: string; agentName?: string; mode?: string }[],
) {
  return prisma.$transaction(async (tx) => {
    await tx.tbCustomerPriceListUploadMarking.deleteMany({
      where: { uploadId },
    })

    if (markings.length > 0) {
      const validMarkings = markings
        .map((m) => ({
          uploadId,
          markingCode: m.markingCode.trim(),
          agentName: m.agentName?.trim() || null,
          mode: normalizeMode(m.mode),
        }))
        .filter((m) => m.markingCode.length > 0)

      const uniqueMap = new Map<string, typeof validMarkings[0]>()
      validMarkings.forEach((m) => uniqueMap.set(`${m.markingCode.toUpperCase()}||${m.mode || 'ALL'}`, m))
      const uniqueList = Array.from(uniqueMap.values())

      if (uniqueList.length > 0) {
        await tx.tbCustomerPriceListUploadMarking.createMany({
          data: uniqueList,
        })
      }
    }

    return tx.tbCustomerPriceListUploadMarking.findMany({
      where: { uploadId },
      orderBy: { markingCode: 'asc' },
    })
  })
}


export async function deleteCustomerUploadMarking(uploadId: number, markingCode: string) {
  return prisma.tbCustomerPriceListUploadMarking.deleteMany({
    where: {
      uploadId,
      markingCode: markingCode.trim(),
    },
  })
}

// ─── SPECIAL COMMODITY PRICE PER CUSTOMER (MANUAL ENTRY / OVERRIDE) ───────────

export interface CreateCustomerCommodityPriceInput {
  fdCustCode: string
  category: string
  mode: string // 'BY SEA' | 'BY AIR' | 'SEA' | 'AIR'
  branch: string // 'GZ' | 'YIWU' | etc.
  price: number
  effectiveDate: string | Date
  endDate?: string | Date | null
  notes?: string | null
  aliases?: string[]
  uploadedBy?: string
}

export async function createOrUpdateCustomerCommodityPrice(input: CreateCustomerCommodityPriceInput) {
  const cleanCustCode = input.fdCustCode.trim()
  const cleanCategory = input.category.trim().toUpperCase()
  const cleanBranch = input.branch.trim().toUpperCase()
  const cleanMode = normalizeMode(input.mode) || (input.mode.toUpperCase().includes('AIR') ? 'BY AIR' : 'BY SEA')
  const effDate = new Date(input.effectiveDate)
  const endDate = input.endDate ? new Date(input.endDate) : null

  // 1. Cari upload aktif untuk customer ini dengan effectiveDate yang sama, atau buat upload bertipe MANUAL_ENTRY
  let upload = await prisma.tbCustomerPriceListUpload.findFirst({
    where: {
      fdCustCode: cleanCustCode,
      effectiveDate: effDate,
      isSuperseded: false,
      status: { not: 'FAILED' },
    },
    orderBy: { uploadedAt: 'desc' },
  })

  if (!upload) {
    upload = await prisma.tbCustomerPriceListUpload.create({
      data: {
        fdCustCode: cleanCustCode,
        fileName: 'MANUAL_ENTRY',
        uploadedBy: input.uploadedBy || 'User Manual Entry',
        priceDate: effDate,
        effectiveDate: effDate,
        status: 'PARSED',
        warnings: JSON.stringify([]),
        rawSnapshot: JSON.stringify({ source: 'manual_entry' }),
      },
    })
  }

  // 2. Cari apakah item untuk mode, branch, category sudah ada di upload ini
  const existingItem = await prisma.tbCustomerPriceListItem.findFirst({
    where: {
      uploadId: upload.id,
      fdCustCode: cleanCustCode,
      mode: cleanMode,
      branch: cleanBranch,
      category: cleanCategory,
    },
  })

  let item
  if (existingItem) {
    item = await prisma.tbCustomerPriceListItem.update({
      where: { id: existingItem.id },
      data: {
        price: new Prisma.Decimal(input.price),
        effectiveDate: effDate,
        endDate: endDate,
        notes: input.notes || existingItem.notes,
      },
    })
  } else {
    item = await prisma.tbCustomerPriceListItem.create({
      data: {
        uploadId: upload.id,
        fdCustCode: cleanCustCode,
        sheetType: 'CS',
        mode: cleanMode,
        branch: cleanBranch,
        category: cleanCategory,
        price: new Prisma.Decimal(input.price),
        effectiveDate: effDate,
        endDate: endDate,
        notes: input.notes || null,
      },
    })
  }

  // 3. Daftarkan alias komoditas ke tbCommodityMapping jika disediakan
  if (input.aliases && input.aliases.length > 0) {
    for (const rawAlias of input.aliases) {
      const alias = rawAlias.trim().toUpperCase()
      if (!alias) continue

      const existingMapping = await prisma.tbCommodityMapping.findFirst({
        where: {
          commodityName: alias,
          fdCustCode: cleanCustCode,
          mode: cleanMode,
        },
      })

      if (existingMapping) {
        await prisma.tbCommodityMapping.update({
          where: { id: existingMapping.id },
          data: {
            targetCommodity: cleanCategory,
            effectiveDate: effDate,
            endDate: endDate,
            notes: input.notes || `Mapped to ${cleanCategory} for ${cleanCustCode}`,
          },
        })
      } else {
        await prisma.tbCommodityMapping.create({
          data: {
            commodityName: alias,
            targetCommodity: cleanCategory,
            fdCustCode: cleanCustCode,
            mode: cleanMode,
            effectiveDate: effDate,
            endDate: endDate,
            notes: input.notes || `Mapped to ${cleanCategory} for ${cleanCustCode}`,
            applyToNewUploads: true,
            createdBy: input.uploadedBy || 'User Manual Entry',
          },
        })
      }
    }
  }

  return item
}

export async function updateCustomerCommodityPriceItem(
  id: number,
  data: {
    price?: number
    category?: string
    mode?: string
    branch?: string
    effectiveDate?: string | Date
    endDate?: string | Date | null
    notes?: string | null
    aliases?: string[]
  }
) {
  const existing = await prisma.tbCustomerPriceListItem.findUnique({
    where: { id },
  })
  if (!existing) throw new Error('Item harga customer tidak ditemukan')

  const updateData: Prisma.TbCustomerPriceListItemUpdateInput = {}
  if (data.price !== undefined) updateData.price = new Prisma.Decimal(data.price)
  if (data.category) updateData.category = data.category.trim().toUpperCase()
  if (data.mode) updateData.mode = normalizeMode(data.mode) || data.mode
  if (data.branch) updateData.branch = data.branch.trim().toUpperCase()
  if (data.effectiveDate) updateData.effectiveDate = new Date(data.effectiveDate)
  if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null
  if (data.notes !== undefined) updateData.notes = data.notes

  const updated = await prisma.tbCustomerPriceListItem.update({
    where: { id },
    data: updateData,
  })

  // Sync aliases if provided
  if (data.aliases && data.aliases.length > 0) {
    const targetCategory = data.category?.trim().toUpperCase() || existing.category
    const targetMode = data.mode ? (normalizeMode(data.mode) || data.mode) : existing.mode
    for (const rawAlias of data.aliases) {
      const alias = rawAlias.trim().toUpperCase()
      if (!alias) continue
      const existingMapping = await prisma.tbCommodityMapping.findFirst({
        where: {
          commodityName: alias,
          fdCustCode: existing.fdCustCode,
          mode: targetMode,
        },
      })
      if (existingMapping) {
        await prisma.tbCommodityMapping.update({
          where: { id: existingMapping.id },
          data: {
            targetCommodity: targetCategory,
            endDate: data.endDate ? new Date(data.endDate) : null,
          },
        })
      } else {
        await prisma.tbCommodityMapping.create({
          data: {
            commodityName: alias,
            targetCommodity: targetCategory,
            fdCustCode: existing.fdCustCode,
            mode: targetMode,
            effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
            endDate: data.endDate ? new Date(data.endDate) : null,
            notes: data.notes || `Mapped to ${targetCategory}`,
            applyToNewUploads: true,
          },
        })
      }
    }
  }

  return updated
}

export async function deactivateCustomerCommodityPriceItem(id: number) {
  const existing = await prisma.tbCustomerPriceListItem.findUnique({
    where: { id },
  })
  if (!existing) throw new Error('Item harga customer tidak ditemukan')

  const now = new Date()
  const updated = await prisma.tbCustomerPriceListItem.update({
    where: { id },
    data: {
      endDate: now,
    },
  })

  // Soft-delete corresponding commodity mapping aliases
  await prisma.tbCommodityMapping.updateMany({
    where: {
      fdCustCode: existing.fdCustCode,
      targetCommodity: existing.category,
      mode: existing.mode,
      endDate: null,
    },
    data: {
      endDate: now,
    },
  })

  return updated
}

export async function deleteCustomerCommodityPriceItem(id: number, hardDelete: boolean = false) {
  const existing = await prisma.tbCustomerPriceListItem.findUnique({
    where: { id },
  })
  if (!existing) throw new Error('Item harga customer tidak ditemukan')

  if (hardDelete) {
    return prisma.tbCustomerPriceListItem.delete({
      where: { id },
    })
  }

  // Soft Delete: Expire effective period and corresponding commodity mapping
  return deactivateCustomerCommodityPriceItem(id)
}

export async function listCustomerCommodityPrices(params: {
  fdCustCode?: string
  search?: string
  mode?: string
  branch?: string
  status?: 'ALL' | 'ACTIVE' | 'EXPIRED'
  page?: number
  pageSize?: number
}) {
  const page = Math.max(1, Number(params.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize || 20)))
  const skip = (page - 1) * pageSize

  const where: Prisma.TbCustomerPriceListItemWhereInput = {}

  if (params.fdCustCode) {
    where.fdCustCode = params.fdCustCode.trim()
  }

  if (params.mode && params.mode !== 'ALL') {
    where.mode = normalizeMode(params.mode) || params.mode
  }

  if (params.branch && params.branch !== 'ALL') {
    where.branch = params.branch.trim()
  }

  if (params.search) {
    const s = params.search.trim()
    where.OR = [
      { category: { contains: s } },
      { fdCustCode: { contains: s } },
      { branch: { contains: s } },
      { notes: { contains: s } },
    ]
  }

  const now = new Date()
  if (params.status === 'ACTIVE') {
    where.AND = [
      { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      { upload: { isSuperseded: false, status: { not: 'FAILED' } } },
    ]
  } else if (params.status === 'EXPIRED') {
    where.OR = [
      { endDate: { lt: now } },
      { upload: { isSuperseded: true } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.tbCustomerPriceListItem.findMany({
      where,
      orderBy: [{ fdCustCode: 'asc' }, { category: 'asc' }, { mode: 'asc' }, { branch: 'asc' }],
      skip,
      take: pageSize,
      include: {
        upload: {
          select: {
            id: true,
            fileName: true,
            effectiveDate: true,
            priceDate: true,
            isSuperseded: true,
            uploadedAt: true,
          },
        },
      },
    }),
    prisma.tbCustomerPriceListItem.count({ where }),
  ])

  // Enrich with customer names and commodity mappings
  const custCodes = [...new Set(items.map((i) => i.fdCustCode))]
  const customers = await prisma.tbCustomers.findMany({
    where: { fdCustCode: { in: custCodes } },
    select: { fdCustCode: true, fdCustName: true },
  })
  const custMap = new Map(customers.map((c) => [c.fdCustCode, c.fdCustName ?? '-']))

  // Get active aliases from tbCommodityMapping for these customers
  const mappings = await prisma.tbCommodityMapping.findMany({
    where: {
      fdCustCode: { in: custCodes },
    },
    select: {
      commodityName: true,
      targetCommodity: true,
      fdCustCode: true,
      mode: true,
    },
  })

  const enrichedItems = items.map((it) => {
    const isExpired = (it.endDate && new Date(it.endDate) < now) || it.upload.isSuperseded
    const matchedAliases = mappings
      .filter(
        (m) =>
          m.fdCustCode === it.fdCustCode &&
          m.targetCommodity.toUpperCase() === it.category.toUpperCase() &&
          (!m.mode || m.mode === it.mode)
      )
      .map((m) => m.commodityName)

    return {
      id: it.id,
      uploadId: it.uploadId,
      fdCustCode: it.fdCustCode,
      custName: custMap.get(it.fdCustCode) ?? it.fdCustCode,
      category: it.category,
      mode: it.mode,
      branch: it.branch,
      price: Number(it.price),
      effectiveDate: it.effectiveDate || it.upload.effectiveDate,
      endDate: it.endDate,
      notes: it.notes,
      isExpired,
      aliases: matchedAliases,
      fileName: it.upload.fileName,
    }
  })

  return {
    data: enrichedItems,
    meta: {
      page,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}


