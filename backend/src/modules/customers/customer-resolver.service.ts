import { prisma } from '../../config/database'
import { logger } from '../../config/logger'

export interface MasterCustomerProfile {
  fdCustCode: string
  fdCustName: string
  fdSalesNM: string | null
  fdBroker: number | null
  fdBlocked: number | null
  fdContact: string | null
  fdCityName: string | null
}

/**
 * Mengambil master profile resmi customer dari tbCustomers (Single Source of Truth).
 * DILARANG mengandalkan nama dari tbCustomersHarga, tbEntryList, atau view legacy.
 */
export async function getMasterCustomer(custCode?: string | null): Promise<MasterCustomerProfile | null> {
  if (!custCode) return null
  const cleanCode = custCode.trim()
  if (!cleanCode) return null

  try {
    const row = await prisma.tbCustomers.findUnique({
      where: { fdCustCode: cleanCode },
      select: {
        fdCustCode: true,
        fdCustName: true,
        fdSalesNM: true,
        fdBroker: true,
        fdBlocked: true,
        fdContact: true,
        fdCityName: true,
      },
    })

    if (!row) return null

    return {
      fdCustCode: row.fdCustCode.trim(),
      fdCustName: (row.fdCustName || '').trim(),
      fdSalesNM: row.fdSalesNM ? row.fdSalesNM.trim() : null,
      fdBroker: row.fdBroker,
      fdBlocked: row.fdBlocked,
      fdContact: row.fdContact ? row.fdContact.trim() : null,
      fdCityName: row.fdCityName ? row.fdCityName.trim() : null,
    }
  } catch (err) {
    logger.warn('Gagal mengambil master customer via getMasterCustomer:', { custCode, error: err })
    return null
  }
}

/**
 * Mengambil master profile customer dalam jumlah banyak (batch) secara efisien.
 */
export async function getMasterCustomersBatch(custCodes: string[]): Promise<Map<string, MasterCustomerProfile>> {
  const map = new Map<string, MasterCustomerProfile>()
  const cleanCodes = Array.from(new Set(custCodes.map((c) => (c || '').trim()).filter(Boolean)))
  if (cleanCodes.length === 0) return map

  try {
    const rows = await prisma.tbCustomers.findMany({
      where: {
        fdCustCode: { in: cleanCodes },
      },
      select: {
        fdCustCode: true,
        fdCustName: true,
        fdSalesNM: true,
        fdBroker: true,
        fdBlocked: true,
        fdContact: true,
        fdCityName: true,
      },
    })

    for (const row of rows) {
      const code = row.fdCustCode.trim()
      map.set(code, {
        fdCustCode: code,
        fdCustName: (row.fdCustName || '').trim(),
        fdSalesNM: row.fdSalesNM ? row.fdSalesNM.trim() : null,
        fdBroker: row.fdBroker,
        fdBlocked: row.fdBlocked,
        fdContact: row.fdContact ? row.fdContact.trim() : null,
        fdCityName: row.fdCityName ? row.fdCityName.trim() : null,
      })
    }
  } catch (err) {
    logger.warn('Gagal mengambil batch master customer:', { count: cleanCodes.length, error: err })
  }

  return map
}

/**
 * Helper untuk menimpa (override) kolom nama customer di kumpulan baris data
 * dengan nama resmi dari tbCustomers (SSOT enforcement).
 */
export async function enrichWithMasterCustomer<T extends Record<string, any>>(
  rows: T[],
  custCodeKey: keyof T = 'fdCustCode',
  targetNameKey: keyof T = 'fdCustName'
): Promise<T[]> {
  if (!rows || rows.length === 0) return rows

  const codes = rows.map((r) => String(r[custCodeKey] || '').trim()).filter(Boolean)
  if (codes.length === 0) return rows

  const masterMap = await getMasterCustomersBatch(codes)

  return rows.map((row) => {
    const code = String(row[custCodeKey] || '').trim()
    const master = masterMap.get(code)
    if (master && master.fdCustName) {
      return {
        ...row,
        [targetNameKey]: master.fdCustName,
      }
    }
    return row
  })
}
