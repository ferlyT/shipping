import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { logger } from '../../config/logger'
import { safeRunRaw } from '../../utils/db'
import { lookupCustomerPriceList } from '../customer-price-list/customer-price-list.service'
import {
  normalizeMode,
  findGeneralMarkingOverrideUpload,
  findCustomerMarkingOverrideUpload,
  isMarkingGreaterOrEqual,
} from './marking-matcher'
import type { PriceLookupResponse } from './price-list.types'

export { normalizeMode, isMarkingGreaterOrEqual }

export async function lookupPriceList(
  targetDate: Date,
  filters?: { sheetType?: string; mode?: string; branch?: string; category?: string; markingCode?: string },
) {
  try {
    let upload: any = null
    let isMarkingOverride = false
    let matchedMarkingCode: string | undefined = undefined

    // 1. Pengecekan Level 3: Khusus Agen Marking Umum (marking >= overrideMarking)
    if (filters?.markingCode?.trim()) {
      const overrideRes = await findGeneralMarkingOverrideUpload(filters.markingCode.trim(), {
        mode: filters?.mode,
        branch: filters?.branch,
        targetDate,
      })

      if (overrideRes) {
        upload = overrideRes.upload
        isMarkingOverride = true
        matchedMarkingCode = overrideRes.matchedMarking
      }
    }

    // 2. Pengecekan Level 4: Tarif Standar Master Umum (TbPriceListUpload)
    if (!upload) {
      upload = await prisma.tbPriceListUpload.findFirst({
        where: {
          effectiveDate: { lte: targetDate },
          status: { not: 'FAILED' },
          isSuperseded: false,
        },
        include: { markings: true },
        orderBy: [{ effectiveDate: 'desc' }, { uploadedAt: 'desc' }],
      })
    }

    if (!upload) {
      return {
        found: false,
        targetDate,
        uploadInfo: null,
        items: [],
        isMarkingOverride: false,
        appliedRule: 'NONE' as const,
      }
    }

    const baseWhereItem: Prisma.TbPriceListItemWhereInput = {
      uploadId: upload.id,
    }

    if (filters?.sheetType) baseWhereItem.sheetType = filters.sheetType
    if (filters?.mode) baseWhereItem.mode = filters.mode
    if (filters?.branch) baseWhereItem.branch = filters.branch
    if (filters?.category) {
      const catStr = filters.category
      const categories = catStr.split(',').map((s) => s.trim()).filter(Boolean)
      if (categories.length === 1) {
        baseWhereItem.category = categories[0]
      } else if (categories.length > 1) {
        baseWhereItem.category = { in: categories } as any
      }
    }

    const items = await prisma.tbPriceListItem.findMany({
      where: baseWhereItem,
      orderBy: [{ sheetType: 'asc' }, { mode: 'asc' }, { branch: 'asc' }, { category: 'asc' }],
    })

    const appliedRule = isMarkingOverride ? 'GENERAL_MARKING' : 'GENERAL_DEFAULT'

    return {
      found: items.length > 0,
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
      matchedMarkingCode,
      appliedRule,
      items: items.map((it) => ({
        id: it.id,
        sheetType: it.sheetType,
        mode: it.mode,
        branch: it.branch,
        transitTime: it.transitTime,
        category: it.category,
        price: Number(it.price),
        markings: upload.markings?.map((m: any) => ({
          id: m.id,
          markingCode: m.markingCode,
          agentName: m.agentName,
          mode: m.mode,
        })) || [],
      })),
    }
  } catch (err) {
    logger.error('Error executing lookupPriceList:', err)
    return {
      found: false,
      targetDate,
      uploadInfo: null,
      items: [],
      isMarkingOverride: false,
      appliedRule: 'NONE' as const,
    }
  }
}

export async function searchEntryList(q: string, limit = 20) {
  let cleanQ = q.trim()
  if (cleanQ.includes('—')) {
    cleanQ = (cleanQ.split('—')[0] || '').trim()
  } else if (cleanQ.includes(' - ')) {
    cleanQ = (cleanQ.split(' - ')[0] || '').trim()
  }

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
          el.fdComodity,
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
    // 1. Fast Index Prefix Search First (<5ms)
    const prefixPattern = `${cleanQ}%`
    rows = await safeRunRaw(
      () => prisma.$queryRaw<any[]>`
        SELECT TOP (${safeLimit})
          el.fdListCode,
          el.fdMarkingCode,
          el.fdMarkingNo,
          el.fdListType,
          el.fdTypeComodity,
          el.fdComodity,
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
            el.fdComodity,
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

      // Fallback tokenized search
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
                el.fdComodity,
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
    fdComodity: r.fdComodity ? String(r.fdComodity).trim() : null,
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

export async function lookupPriceByEntry(listCode: string): Promise<PriceLookupResponse> {
  const cleanListCode = listCode.trim()
  if (!cleanListCode) {
    return {
      found: false,
      fdListCode: '',
      fdMarkingCode: null,
      fdMarkingNo: null,
      fdListType: null,
      fdTypeComodity: null,
      fdComodity: null,
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
        el.fdComodity,
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

  // 3. Pengecekan Hierarki Tarif & Marking Override (>= Starting Marking)
  const targetDate = agentDate || new Date()
  const markingCode = entry.fdMarkingCode ? String(entry.fdMarkingCode).trim() : undefined
  const custCode = entry.fdCustCode ? String(entry.fdCustCode).trim() : undefined

  let priceValidation: any = null
  let appliedRule: 'CUSTOMER_MARKING' | 'CUSTOMER_DEFAULT' | 'GENERAL_MARKING' | 'GENERAL_DEFAULT' | 'NONE' = 'NONE'

  // Step 1: Pengecekan apakah kode marking >= marking override
  let generalOverrideRes: { upload: any; matchedMarking: string } | null = null
  let custOverrideRes: { upload: any; matchedMarking: string } | null = null

  if (markingCode) {
    if (custCode) {
      custOverrideRes = await findCustomerMarkingOverrideUpload(custCode, markingCode, {
        mode: expectedMode || undefined,
        branch: expectedBranch || undefined,
        targetDate,
      })
    }
    generalOverrideRes = await findGeneralMarkingOverrideUpload(markingCode, {
      mode: expectedMode || undefined,
      branch: expectedBranch || undefined,
      targetDate,
    })
  }

  // Kasus 1: Ada marking override khusus Customer (Level 1: CUSTOMER_MARKING)
  if (custCode && custOverrideRes) {
    const custLookup = await lookupCustomerPriceList(custCode, custOverrideRes.upload.effectiveDate || targetDate, {
      mode: expectedMode || undefined,
      branch: expectedBranch || undefined,
      markingCode,
    })

    if (custLookup.found && custLookup.items.length > 0) {
      appliedRule = 'CUSTOMER_MARKING'
      priceValidation = {
        source: 'CUSTOMER',
        uploadInfo: custLookup.uploadInfo,
        effectiveDate: custLookup.uploadInfo?.effectiveDate
          ? new Date(custLookup.uploadInfo.effectiveDate).toISOString()
          : null,
        isMarkingOverride: true,
        appliedRule,
        items: custLookup.items,
      }
    }
  }

  // Kasus 2: Ada marking override pada Master Price List (Level 3: GENERAL_MARKING)
  // Aturan:
  // 1. Apabila kode marking >= dari marking override maka gunakan price list yang ada marking overridenya.
  // 2. Apabila customer tersebut punya data price list maka sambungkan data tanggal berlakunya.
  // 3. Apabila tidak, gunakan fdBroker untuk menentukan pakai harga CS atau MKT.
  if (!priceValidation && generalOverrideRes) {
    const overrideEffectiveDate = generalOverrideRes.upload.effectiveDate || targetDate

    // Jika customer memiliki data price list, sambungkan data tanggal berlakunya
    if (custCode) {
      const custLookup = await lookupCustomerPriceList(custCode, overrideEffectiveDate, {
        mode: expectedMode || undefined,
        branch: expectedBranch || undefined,
        markingCode,
      })

      if (custLookup.found && custLookup.items.length > 0) {
        appliedRule = 'CUSTOMER_DEFAULT'
        priceValidation = {
          source: 'CUSTOMER',
          uploadInfo: custLookup.uploadInfo,
          effectiveDate: custLookup.uploadInfo?.effectiveDate
            ? new Date(custLookup.uploadInfo.effectiveDate).toISOString()
            : null,
          isMarkingOverride: false,
          appliedRule,
          items: custLookup.items,
        }
      }
    }

    // Jika customer TIDAK punya data price list khusus, gunakan price list override (Master)
    if (!priceValidation) {
      const generalLookup = await lookupPriceList(overrideEffectiveDate, {
        mode: expectedMode || undefined,
        branch: expectedBranch || undefined,
        markingCode,
      })

      if (generalLookup.found && generalLookup.items.length > 0) {
        appliedRule = 'GENERAL_MARKING'
        priceValidation = {
          source: 'GENERAL',
          uploadInfo: generalLookup.uploadInfo,
          effectiveDate: generalLookup.uploadInfo?.effectiveDate
            ? new Date(generalLookup.uploadInfo.effectiveDate).toISOString()
            : null,
          isMarkingOverride: true,
          appliedRule,
          items: generalLookup.items,
        }
      }
    }
  }

  // Kasus 3: Fallback jika tidak ada marking override yang cocok (< marking override)
  if (!priceValidation) {
    // Step A: Customer Price List Default
    if (custCode) {
      const custLookup = await lookupCustomerPriceList(custCode, targetDate, {
        mode: expectedMode || undefined,
        branch: expectedBranch || undefined,
        markingCode,
      })

      if (custLookup.found && custLookup.items.length > 0) {
        appliedRule = 'CUSTOMER_DEFAULT'
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

    // Step B: General Price List Default
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
  }

  return {
    found: true,
    fdListCode: String(entry.fdListCode).trim(),
    fdMarkingCode: entry.fdMarkingCode ? String(entry.fdMarkingCode).trim() : null,
    fdMarkingNo: entry.fdMarkingNo ? String(entry.fdMarkingNo).trim() : null,
    fdListType,
    fdTypeComodity,
    fdComodity: entry.fdComodity ? String(entry.fdComodity).trim() : null,
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
