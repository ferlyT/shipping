import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import { evaluatePriceCheck } from '../price-check/price-check.service'
import { evaluateM3Check, getM3CustPerMarkingDetails as m3CustPerMarkingService } from '../m3-check/m3-check.service'
import { safeRunRaw } from '../../utils/db'

export { safeRunRaw }

export async function getBillingM3Check(listCode: string) {
  return evaluateM3Check(listCode)
}

export async function getM3CustPerMarkingDetails(custCode: string, markingCode: string) {
  return m3CustPerMarkingService(custCode, markingCode)
}

export async function getBillingPartialDetails(query: Record<string, string | undefined>) {
  const markingCode = query.markingCode?.trim() || ''
  const customer = query.customer?.trim() || ''
  const custCode = query.custCode?.trim() || ''

  if (!markingCode) {
    return []
  }

  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        RTRIM(el.fdListCode) AS fdListCode,
        RTRIM(el.fdMarkingCode) AS fdMarkingCode,
        RTRIM(el.fdMarkingNo) AS fdMarkingNo,
        RTRIM(el.fdCustCode) AS fdCustCode,
        RTRIM(c.fdCustName) AS custName,
        COALESCE(RTRIM(emp1.fdEmpName), RTRIM(el.fdEmp1), '') AS fdEmp1,
        el.fdLoad AS fdLoad,
        RTRIM(el.fdTerima) AS fdTerima,
        COALESCE(RTRIM(b.fdInvNo), RTRIM(bd.fdInvNo), RTRIM(el.fdInvoiceNo), '') AS fdInvNo,
        el.fdJmlPack AS fdJmlPack,
        RTRIM(el.fdSatuan) AS fdSatuan,
        el.fdM3 AS fdM3,
        el.fdJmlBerat AS fdJmlBerat,
        RTRIM(el.fdDesc) AS fdDesc
      FROM tbEntryList el WITH (NOLOCK)
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
      LEFT JOIN tbEmployees emp1 WITH (NOLOCK) ON emp1.fdEmpCode = el.fdEmp1
      LEFT JOIN tbBilling b WITH (NOLOCK) ON b.fdListCode = el.fdListCode
      LEFT JOIN tbBillingDetail bd WITH (NOLOCK) ON bd.fdListCode = el.fdListCode
      WHERE RTRIM(el.fdMarkingCode) = ${markingCode}
        AND (
          (${customer} <> '' AND RTRIM(c.fdCustName) = ${customer})
          OR (${custCode} <> '' AND RTRIM(el.fdCustCode) = ${custCode})
          OR (${customer} = '' AND ${custCode} = '')
        )
      ORDER BY el.fdLoad ASC, el.fdListCode ASC
    `

    return rows.map((r) => ({
      listCode: r.fdListCode?.trim() || '',
      markingCode: r.fdMarkingCode?.trim() || '',
      markingNo: r.fdMarkingNo?.trim() || '',
      custCode: r.fdCustCode?.trim() || '',
      customer: r.custName?.trim() || customer,
      fdEmp1: r.fdEmp1?.trim() || '',
      fdLoad: r.fdLoad ? new Date(r.fdLoad).toISOString() : null,
      fdTerima: r.fdTerima?.trim() || '',
      invNo: r.fdInvNo?.trim() || '',
      jmlPack: Number(r.fdJmlPack || 0),
      satuan: r.fdSatuan?.trim() || 'COLY',
      m3: Number(r.fdM3 || 0),
      berat: Number(r.fdJmlBerat || 0),
      desc: r.fdDesc?.trim() || '',
    }))
  } catch (err) {
    logger.error(`[getBillingPartialDetails] Error fetching partial details for ${markingCode} / ${customer}:`, err)
    return []
  }
}

/**
 * Pengecekan harga mendalam untuk item Target Billing terhadap database (vwCustomersHarga, SP profile harga, tbCustomerPriceList)
 */
export async function getBillingTargetPriceCheck(query: Record<string, any>) {
  const listCodeParam = String(query.listCode || query.listNo || query.fdListCode || '').trim()
  const markingCode = String(query.markingCode || '').trim()
  const markingNo = String(query.markingNo || '').trim()
  const customer = String(query.customer || query.custName || '').trim()
  const custCode = String(query.custCode || '').trim()
  const branch = String(query.branch || '').trim()
  const sales = String(query.sales || '').trim()
  const type = String(query.type || '').trim()
  const comodity = String(query.comodity || '').trim()
  const mode = String(query.mode || '').toLowerCase().trim()
  const currentPrice = Number(query.harga || 0)

  if (!listCodeParam && !markingCode) {
    throw new Error('Parameter listCode atau markingCode wajib diisi')
  }

  return safeRunRaw(async () => {
    const result = await evaluatePriceCheck({
      listCode: listCodeParam,
      markingCode,
      markingNo,
      customer,
      custCode,
      branch,
      sales,
      type,
      comodity,
      mode,
      harga: currentPrice,
    })

    return {
      listCode: listCodeParam || '',
      markingCode,
      markingNo,
      customer,
      custCode,
      sales,
      isBroker: result.isBroker,
      matchedWith: result.matchedWith,
      appliedTierLabel: result.appliedTierLabel,
      branch,
      mode: result.mode || (mode ? mode.toUpperCase() : 'LAUT'),
      currentType: type || result.matchedCategory || '—',
      matchedCategory: result.matchedCategory,
      currentComodityText: comodity,
      tglAgen: null,
      effectiveDate: result.effectiveDate,
      priceSource: result.priceSource,
      priceSourceLabel: result.priceSourceLabel,
      priceCS: result.priceCS,
      priceMKT: result.priceMKT,
      currentPrice: result.currentPrice,
      dbPrice: result.dbPrice,
      difference: result.difference,
      status: result.status,
      statusLabel: result.statusLabel,
      statusDescription: result.statusDescription,
      matchedTariff: result.matchedTariff || null,
      profileHarga: result.profileTariff,
      customerTariffs: result.customerTariffs || [],
      customerPriceList: result.customerPriceList,
      masterPriceList: result.masterPriceList,
    }
  }, 'get_billing_target_price_check')
}

export async function getTransportValidationCheck(query: {
  invNo?: string
  custCode?: string
  markingCode?: string
  markingNo?: string
  listCode?: string
  amount?: string | number
}) {
  return safeRunRaw(async () => {
    const invNo = (query.invNo || '').trim()
    const custCode = (query.custCode || '').trim()
    const markingCode = (query.markingCode || '').trim()
    const markingNo = (query.markingNo || '').trim()
    const listCode = (query.listCode || '').trim()
    const amount = Number(query.amount || 0)

    if (!custCode && !markingCode && !listCode) {
      return {
        isValid: true,
        hasDuplicate: false,
        duplicates: [],
        expedisiList: [],
        message: 'Parameter custCode, markingCode, atau listCode wajib diisi.',
      }
    }

    // 1. Check duplicate transport bills in tbBilling
    const duplicates = await prisma.$queryRaw<any[]>`
      SELECT 
        RTRIM(b.fdInvNo) as fdInvNo,
        b.fdInvDate,
        RTRIM(b.fdCustCode) as fdCustCode,
        RTRIM(b.fdMarkingCode) as fdMarkingCode,
        RTRIM(b.fdMarkingNo) as fdMarkingNo,
        b.fdJumlah1,
        b.fdJumlah2,
        RTRIM(b.fdCurr1) as fdCurr1,
        RTRIM(e.fdEmpName) as fdEmpName
      FROM tbBilling b WITH (NOLOCK)
      LEFT JOIN tbEmployees e WITH (NOLOCK) ON RTRIM(b.fdEmpCode) = RTRIM(e.fdEmpCode)
      WHERE RTRIM(b.fdCustCode) = ${custCode}
        AND RTRIM(b.fdMarkingCode) = ${markingCode}
        AND RTRIM(b.fdInvNo) <> ${invNo}
        AND (
          b.fdJumlah1 = ${amount} 
          OR (b.fdJumlah2 IS NOT NULL AND b.fdJumlah2 = ${amount})
        )
      ORDER BY b.fdInvDate DESC
    `

    const hasDuplicate = Boolean(duplicates && duplicates.length > 0)

    // 2. Check tbExpIndo join tbExpedisi on fdListCode (with fallback via tbEntryList)
    let rawExpRows: any[] = []

    if (listCode && listCode.length >= 5) {
      rawExpRows = await prisma.$queryRaw<any[]>`
        SELECT 
          e.fdId,
          RTRIM(e.fdListCode) as fdListCode,
          RTRIM(e.fdExpID) as fdExpID,
          RTRIM(x.fdExpName) as fdExpName,
          RTRIM(e.fdResiExp) as fdResiExp,
          RTRIM(e.fdCurrExp) as fdCurrExp,
          e.fdTotalExp,
          e.fdPaid,
          e.fdCreatedDate,
          RTRIM(e.fdCreatedBy) as fdCreatedBy,
          el.fdJmlBerat,
          RTRIM(el.fdMarkingCode) as fdMarkingCode,
          RTRIM(el.fdMarkingNo) as fdMarkingNo
        FROM tbExpIndo e WITH (NOLOCK)
        LEFT JOIN tbExpedisi x WITH (NOLOCK) ON RTRIM(e.fdExpID) = RTRIM(x.fdExpID)
        LEFT JOIN tbEntryList el WITH (NOLOCK) ON RTRIM(e.fdListCode) = RTRIM(el.fdListCode)
        WHERE RTRIM(e.fdListCode) = ${listCode}
        ORDER BY e.fdCreatedDate DESC
      `
    }

    if (!rawExpRows || rawExpRows.length === 0) {
      const coreMarking = markingCode.split(';')[0].trim()

      rawExpRows = await prisma.$queryRaw<any[]>`
        SELECT TOP 10
          e.fdId,
          RTRIM(e.fdListCode) as fdListCode,
          RTRIM(e.fdExpID) as fdExpID,
          RTRIM(x.fdExpName) as fdExpName,
          RTRIM(e.fdResiExp) as fdResiExp,
          RTRIM(e.fdCurrExp) as fdCurrExp,
          e.fdTotalExp,
          e.fdPaid,
          e.fdCreatedDate,
          RTRIM(e.fdCreatedBy) as fdCreatedBy,
          el.fdJmlBerat,
          RTRIM(el.fdMarkingCode) as fdMarkingCode,
          RTRIM(el.fdMarkingNo) as fdMarkingNo
        FROM tbEntryList el WITH (NOLOCK)
        INNER JOIN tbExpIndo e WITH (NOLOCK) ON RTRIM(el.fdListCode) = RTRIM(e.fdListCode)
        LEFT JOIN tbExpedisi x WITH (NOLOCK) ON RTRIM(e.fdExpID) = RTRIM(x.fdExpID)
        WHERE RTRIM(el.fdCustCode) = ${custCode}
          AND (
            RTRIM(el.fdMarkingCode) = ${coreMarking}
            OR RTRIM(el.fdMarkingCode) = ${markingCode}
            OR ${markingCode} LIKE '%' + RTRIM(el.fdMarkingCode) + '%'
            OR RTRIM(el.fdMarkingCode) LIKE '%' + ${coreMarking} + '%'
          )
        ORDER BY e.fdCreatedDate DESC
      `
    }

    const expedisiList = (rawExpRows || []).map((exp) => ({
      fdId: exp.fdId,
      fdListCode: exp.fdListCode ? String(exp.fdListCode).trim() : null,
      fdExpID: exp.fdExpID ? String(exp.fdExpID).trim() : null,
      fdExpName: exp.fdExpName ? String(exp.fdExpName).trim() : null,
      fdResiExp: exp.fdResiExp ? String(exp.fdResiExp).trim() : null,
      fdCurrExp: exp.fdCurrExp ? String(exp.fdCurrExp).trim() : 'RP.',
      fdTotalExp: Number(exp.fdTotalExp || 0),
      fdPaid: exp.fdPaid !== null ? Number(exp.fdPaid) : null,
      fdCreatedDate: exp.fdCreatedDate ? new Date(exp.fdCreatedDate).toISOString() : null,
      fdCreatedBy: exp.fdCreatedBy ? String(exp.fdCreatedBy).trim() : null,
      fdJmlBerat: exp.fdJmlBerat !== null ? Number(exp.fdJmlBerat) : null,
      fdMarkingCode: exp.fdMarkingCode ? String(exp.fdMarkingCode).trim() : null,
      fdMarkingNo: exp.fdMarkingNo ? String(exp.fdMarkingNo).trim() : null,
    }))

    const matchingExpedisi = expedisiList.find((e) => Math.abs(e.fdTotalExp - amount) < 0.01)

    return {
      isValid: !hasDuplicate,
      hasDuplicate,
      duplicates: (duplicates || []).map((d) => ({
        fdInvNo: d.fdInvNo ? String(d.fdInvNo).trim() : '',
        fdInvDate: d.fdInvDate ? new Date(d.fdInvDate).toISOString() : null,
        fdCustCode: d.fdCustCode ? String(d.fdCustCode).trim() : '',
        fdMarkingCode: d.fdMarkingCode ? String(d.fdMarkingCode).trim() : '',
        fdMarkingNo: d.fdMarkingNo ? String(d.fdMarkingNo).trim() : '',
        fdJumlah1: Number(d.fdJumlah1 || 0),
        fdJumlah2: d.fdJumlah2 !== null ? Number(d.fdJumlah2) : null,
        fdCurr1: d.fdCurr1 ? String(d.fdCurr1).trim() : null,
        fdEmpName: d.fdEmpName ? String(d.fdEmpName).trim() : null,
      })),
      expedisiList,
      matchingExpedisi: matchingExpedisi || null,
      checkedAmount: amount,
      custCode,
      markingCode,
      markingNo,
      listCode,
    }
  }, 'get_transport_validation_check')
}
