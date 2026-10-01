import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
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

  if (!markingCode && !custCode && !customer) {
    return []
  }

  try {
    const rows = await prisma.$queryRaw<any[]>`
      WITH TargetSJ AS (
        SELECT DISTINCT 
          RTRIM(el.fdTerima) AS fdTerima, 
          RTRIM(el.fdCustCode) AS custCode
        FROM tbEntryList el WITH (NOLOCK)
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
        WHERE el.fdTerima IS NOT NULL AND RTRIM(el.fdTerima) <> ''
          AND (
            (${markingCode} <> '' AND RTRIM(el.fdMarkingCode) = ${markingCode})
            OR (${markingCode} = '')
          )
          AND (
            (${customer} <> '' AND RTRIM(c.fdCustName) = ${customer})
            OR (${custCode} <> '' AND RTRIM(el.fdCustCode) = ${custCode})
            OR (${customer} = '' AND ${custCode} = '')
          )
          AND el.fdLoad >= DATEADD(MONTH, -6, GETDATE())
      ),
      PartialSJ AS (
        SELECT 
          ts.fdTerima,
          ts.custCode,
          COUNT(DISTINCT RTRIM(el2.fdMarkingCode)) AS countMarking
        FROM TargetSJ ts
        INNER JOIN tbEntryList el2 WITH (NOLOCK) 
          ON RTRIM(el2.fdTerima) = ts.fdTerima
         AND (RTRIM(el2.fdCustCode) = ts.custCode OR ts.custCode = '' OR el2.fdCustCode IS NULL)
        WHERE el2.fdLoad >= DATEADD(MONTH, -6, GETDATE())
        GROUP BY ts.fdTerima, ts.custCode
        HAVING COUNT(DISTINCT RTRIM(el2.fdMarkingCode)) > 1
      )
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
      INNER JOIN PartialSJ ps 
        ON RTRIM(el.fdTerima) = ps.fdTerima
       AND (RTRIM(el.fdCustCode) = ps.custCode OR ps.custCode = '' OR el.fdCustCode IS NULL)
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
      LEFT JOIN tbEmployees emp1 WITH (NOLOCK) ON emp1.fdEmpCode = el.fdEmp1
      LEFT JOIN tbBilling b WITH (NOLOCK) ON b.fdListCode = el.fdListCode
      LEFT JOIN tbBillingDetail bd WITH (NOLOCK) ON bd.fdListCode = el.fdListCode
      WHERE el.fdLoad >= DATEADD(MONTH, -6, GETDATE())
      ORDER BY el.fdTerima ASC, el.fdLoad ASC, el.fdMarkingCode ASC, el.fdListCode ASC
    `

    // Fallback jika tidak ada data dari PartialSJ (misal bukan multi-marking tapi user ingin cek marking saat ini)
    if (rows.length === 0 && markingCode) {
      const fallbackRows = await prisma.$queryRaw<any[]>`
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
          AND el.fdLoad >= DATEADD(MONTH, -6, GETDATE())
        ORDER BY el.fdLoad ASC, el.fdListCode ASC
      `
      return fallbackRows.map((r) => ({
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
    }

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

/**
 * Validasi Billing Type 2: Compare M3 vs KG
 *
 * Untuk setiap entri (customer) dalam listCode, hitung:
 *   - Nilai M3 = fdM3 × price_m3 (diambil dari detail billing dengan fdListCode='M3')
 *   - Nilai KG = fdJmlBerat × price_kg (diambil dari detail billing dengan fdListCode='KG')
 * Kemudian bandingkan dengan tagihan aktual (fdTotal di detail billing untuk customer tersebut).
 * Hasilnya menunjukkan apakah basis tagihan yang dipakai sudah benar.
 */
export async function getType2ComparisonCheck(query: {
  invNo?: string
  listCode?: string
  markingCode?: string
}) {
  return safeRunRaw(async () => {
    const invNo = (query.invNo || '').trim()
    const listCode = (query.listCode || '').trim()
    const markingCode = (query.markingCode || '').trim()

    if (!invNo && !listCode) {
      throw new Error('Parameter invNo atau listCode wajib diisi')
    }

    // 1. Ambil data billing untuk mendapatkan context
    let billingData: any = null
    if (invNo) {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT TOP 1
          RTRIM(b.fdInvNo) as fdInvNo,
          RTRIM(b.fdListCode) as fdListCode,
          b.fdListType,
          b.fdJumlah1,
          RTRIM(b.fdMarkingCode) as fdMarkingCode,
          RTRIM(b.fdMarkingNo) as fdMarkingNo,
          RTRIM(b.fdCustCode) as fdCustCode,
          RTRIM(c.fdCustName) as fdCustName
        FROM tbBilling b WITH (NOLOCK)
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON RTRIM(b.fdCustCode) = RTRIM(c.fdCustCode)
        WHERE RTRIM(b.fdInvNo) = ${invNo}
      `
      billingData = rows[0] || null
    }

    const resolvedListCode = listCode || billingData?.fdListCode?.trim() || ''
    const resolvedMarkingCode = markingCode || billingData?.fdMarkingCode?.trim() || ''

    if (!resolvedListCode) {
      throw new Error('Tidak dapat menentukan listCode dari invoice')
    }

    // 2. Ambil detail billing: cari harga M3 dan KG
    const detailRows = await prisma.$queryRaw<any[]>`
      SELECT
        RTRIM(bd.fdListCode) as fdListCode,
        RTRIM(bd.fdItemName) as fdItemName,
        CAST(bd.fdQty as float) as fdQty,
        CAST(bd.fdItemPrice as float) as fdItemPrice,
        CAST(bd.fdTotal as float) as fdTotal
      FROM tbBillingDetail bd WITH (NOLOCK)
      WHERE RTRIM(bd.fdInvNo) = ${invNo}
      ORDER BY bd.fdID
    `

    // Ekstrak harga M3 dan KG dari detail billing (abaikan item tambahan seperti Tax Return, Admin, dsb)
    let priceM3 = 0
    let priceKG = 0
    let totalBilledM3 = 0  // Total tagihan item M3
    let totalBilledKG = 0  // Total tagihan item KG
    let totalBilledAuxiliary = 0 // Total tagihan item tambahan (tax return, admin, ekspedisi lokal, dsb)
    let totalBilled = 0    // Grand total tagihan

    for (const d of detailRows) {
      const lc = (d.fdListCode || '').trim().toUpperCase()
      const itemName = (d.fdItemName || '').trim().toUpperCase()
      const price = Number(d.fdItemPrice || 0)
      const total = Number(d.fdTotal || 0)
      totalBilled += total

      const isTaxReturn = itemName.includes('TAX RETURN') || itemName.includes('TAXRETURN')
      const isAuxiliary = isTaxReturn || itemName.includes('ADMIN') || itemName.includes('SURCHARGE') || itemName.includes('PACKING') || itemName.includes('DISCOUNT')

      if (isAuxiliary) {
        totalBilledAuxiliary += total
      } else if (lc === 'M3') {
        if (priceM3 === 0 || price > 0) {
          priceM3 = price
        }
        totalBilledM3 += total
      } else if (lc === 'KG') {
        if (priceKG === 0 || price > 0) {
          priceKG = price
        }
        totalBilledKG += total
      } else {
        totalBilledAuxiliary += total
      }
    }

    // Fallback: Jika priceM3 atau priceKG bernilai 0 (karena invoice hanya menagih salah satu unit),
    // ambil harga acuan dari profil harga master customer
    if ((priceM3 === 0 || priceKG === 0) && resolvedListCode) {
      try {
        const profileRows = await prisma.$queryRaw<any[]>`
          EXEC dbo.get_profile_harga_dari_listcode @fdListCode = ${resolvedListCode}
        `
        if (profileRows && profileRows.length > 0) {
          const p = profileRows[0]
          if (priceM3 === 0 && Number(p.Harga || 0) > 0) {
            priceM3 = Number(p.Harga)
          }
          if (priceKG === 0 && Number(p.Kg || 0) > 0) {
            priceKG = Number(p.Kg)
          }
          if (priceKG === 0 && priceM3 > 0 && Number(p.Rasio || 0) > 0) {
            priceKG = Math.round(priceM3 / Number(p.Rasio))
          }
          if (priceM3 === 0 && priceKG > 0 && Number(p.Rasio || 0) > 0) {
            priceM3 = Math.round(priceKG * Number(p.Rasio))
          }
        }
      } catch (err) {
        logger.warn({
          event: 'type2_profile_fallback_failed',
          listCode: resolvedListCode,
          error: String(err),
        })
      }
    }

    const isGabungan = Boolean(billingData?.fdMarkingNo && billingData.fdMarkingNo.includes(';'))

    // 3. Ambil data entry list, komplain, delivery (SJ), gudang, dan evaluasi M3 check secara paralel
    const [entryRows, komplainRows, deliveryRows, gudangRows, m3CheckRes] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT
          RTRIM(el.fdListCode) as fdListCode,
          RTRIM(el.fdCustCode) as fdCustCode,
          RTRIM(c.fdCustName) as fdCustName,
          RTRIM(el.fdMarkingCode) as fdMarkingCode,
          RTRIM(el.fdMarkingNo) as fdMarkingNo,
          RTRIM(el.fdTerima) as fdTerima,
          CAST(COALESCE(el.fdJmlPack, 0) as float) as fdJmlPack,
          RTRIM(el.fdSatuan) as fdSatuan,
          CAST(COALESCE(el.fdJmlBerat, 0) as float) as fdJmlBerat,
          CAST(COALESCE(el.fdM3, 0) as float) as fdM3
        FROM tbEntryList el WITH (NOLOCK)
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON RTRIM(el.fdCustCode) = RTRIM(c.fdCustCode)
        WHERE RTRIM(el.fdListCode) = ${resolvedListCode}
        ORDER BY el.fdCustCode
      `,
      prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(fdListCode) as fdListCode,
          CAST(COALESCE(fdJmlBeratKomplain, 0) as float) as fdJmlBeratKomplain,
          CAST(COALESCE(fdM3Komplain, 0) as float) as fdM3Komplain
        FROM tbEntryListKomplain WITH (NOLOCK)
        WHERE RTRIM(fdListCode) = ${resolvedListCode}
      `,
      prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(fdListCode) as fdListCode,
          RTRIM(fdCustCode) as fdCustCode,
          SUM(CAST(COALESCE(fdJmlBeratSJ, 0) as float)) as totalBeratSJ
        FROM tbDelivery WITH (NOLOCK)
        WHERE RTRIM(fdListCode) = ${resolvedListCode}
        GROUP BY RTRIM(fdListCode), RTRIM(fdCustCode)
      `,
      prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(fdListCode) as fdListCode,
          CAST(COALESCE(fdJmlBerat, 0) as float) as fdJmlBeratGudang,
          CAST(COALESCE(fdM3Gudang, 0) as float) as fdM3Gudang
        FROM tbEntryListGudang WITH (NOLOCK)
        WHERE RTRIM(fdListCode) = ${resolvedListCode}
      `,
      evaluateM3Check(resolvedListCode).catch(() => null),
    ])

    const komplainM3 = Number(m3CheckRes?.m3Komplain?.values?.[0] || komplainRows?.[0]?.fdM3Komplain || 0)
    const gudangM3 = Number(m3CheckRes?.m3Gudang?.values?.[0] || gudangRows?.[0]?.fdM3Gudang || 0)
    const plM3 = Number(m3CheckRes?.m3PackingList?.values?.[0] || entryRows?.[0]?.fdM3 || 0)

    const komplainMarkingM3 = Number(m3CheckRes?.m3KomplainPerMarking?.values?.[0] || 0)
    const gudangMarkingM3 = Number(m3CheckRes?.m3CustPerMarking?.values?.[0] || 0)
    const plMarkingM3 = Number(m3CheckRes?.m3PLPerMarking?.values?.[0] || 0)

    const komplainBerat = Number(komplainRows?.[0]?.fdJmlBeratKomplain || 0)
    const gudangBerat = Number(gudangRows?.[0]?.fdJmlBeratGudang || 0)
    const totalBeratPerMarking = Number(m3CheckRes?.totalBeratPerMarking || 0)
    const totalJmlBeratSJ = Number(m3CheckRes?.totalJmlBeratSJ || 0)

    // Ambil min charge dari profil harga (via m3CheckRes)
    const minChargeM3 = Number(m3CheckRes?.minChargeM3 || 0)   // minimal volume M3 yang ditagih (misal 0.1)
    const minChargeKg = Number(m3CheckRes?.minChargeKg || 0)   // minimal berat KG yang ditagih (misal 3 / 70)
    // Hitung rasio: utamakan rasio dari profil harga jika tersedia (misal 700), fallback ke priceM3 / priceKG
    const profileRasio = Number(m3CheckRes?.profileHarga?.rasio || 0)
    const rasio = profileRasio > 0 ? profileRasio : ((priceM3 > 0 && priceKG > 0) ? (priceM3 / priceKG) : 0)
    // minKgEquiv = ekuivalen KG dari minChargeM3 (misal 0.1 M3 × 700 = 70 KG)
    const minKgEquiv = minChargeM3 > 0 && rasio > 0 ? Math.round(minChargeM3 * rasio * 100) / 100 : minChargeKg

    const deliveryMap = new Map<string, number>()
    let totalDeliverySJ = 0
    for (const d of deliveryRows || []) {
      const c = (d.fdCustCode || '').trim()
      const w = Number(d.totalBeratSJ || 0)
      deliveryMap.set(c, (deliveryMap.get(c) || 0) + w)
      totalDeliverySJ += w
    }

    // 4. Hitung perbandingan M3 vs KG per entri customer dengan hirarki:
    // Hirarki M3: M3 Komplain -> M3 Gudang -> M3 PL (Apabila Bill Gabung: M3 per Marking)
    // Hirarki KG: Berat Komplain -> Berat SJ / Gudang -> Berat List (Apabila Bill Gabung: Berat per Marking)
    const items = entryRows.map((entry) => {
      let m3 = 0
      let m3Source: 'Komplain' | 'Gudang' | 'PL' | 'Komplain (Marking)' | 'Gudang (Marking)' | 'PL (Marking)' | 'List' = 'List'

      if (isGabungan) {
        if (komplainMarkingM3 > 0) {
          m3 = komplainMarkingM3
          m3Source = 'Komplain (Marking)'
        } else if (gudangMarkingM3 > 0) {
          m3 = gudangMarkingM3
          m3Source = 'Gudang (Marking)'
        } else if (plMarkingM3 > 0) {
          m3 = plMarkingM3
          m3Source = 'PL (Marking)'
        } else if (komplainM3 > 0) {
          m3 = komplainM3
          m3Source = 'Komplain'
        } else if (gudangM3 > 0) {
          m3 = gudangM3
          m3Source = 'Gudang'
        } else if (plM3 > 0) {
          m3 = plM3
          m3Source = 'PL'
        } else {
          m3 = Number(entry.fdM3 || 0)
          m3Source = 'List'
        }
      } else {
        if (komplainM3 > 0) {
          m3 = komplainM3
          m3Source = 'Komplain'
        } else if (gudangM3 > 0) {
          m3 = gudangM3
          m3Source = 'Gudang'
        } else if (plM3 > 0) {
          m3 = plM3
          m3Source = 'PL'
        } else {
          m3 = Number(entry.fdM3 || 0)
          m3Source = 'List'
        }
      }

      const beratList = Number(entry.fdJmlBerat || 0)
      const custCode = entry.fdCustCode || ''
      const beratSJ = deliveryMap.get(custCode) ?? (entryRows.length === 1 ? totalDeliverySJ : 0)

      let kg = 0
      let kgSource: 'Komplain' | 'SJ' | 'Gudang' | 'List' | 'Marking' = 'List'

      if (isGabungan) {
        if (komplainBerat > 0) {
          kg = komplainBerat
          kgSource = 'Komplain'
        } else if (Number(m3CheckRes?.relatedBillsSummary?.sumBerat || 0) > 0) {
          kg = Number(m3CheckRes!.relatedBillsSummary!.sumBerat)
          kgSource = 'Marking'
        } else if (totalBeratPerMarking > 0) {
          kg = totalBeratPerMarking
          kgSource = 'Marking'
        } else if (totalJmlBeratSJ > 0) {
          kg = totalJmlBeratSJ
          kgSource = 'SJ'
        } else if (totalDeliverySJ > 0) {
          kg = totalDeliverySJ
          kgSource = 'SJ'
        } else if (gudangBerat > 0) {
          kg = gudangBerat
          kgSource = 'Gudang'
        } else {
          kg = beratList
          kgSource = 'List'
        }
      } else {
        if (komplainBerat > 0) {
          kg = komplainBerat
          kgSource = 'Komplain'
        } else if (beratSJ > 0) {
          kg = beratSJ
          kgSource = 'SJ'
        } else if (gudangBerat > 0) {
          kg = gudangBerat
          kgSource = 'Gudang'
        } else {
          kg = beratList
          kgSource = 'List'
        }
      }

      const nilaiM3 = m3 * priceM3
      const nilaiKG = kg * priceKG

      // Terapkan min charge: hitung nilai efektif menggunakan volume/berat minimal
      // Aturan: pilih mana yang lebih besar antara (nilaiM3 vs minChargeM3*priceM3) dan (nilaiKG vs minKgEquiv*priceKG)
      const nilaiMinChargeM3 = minChargeM3 > 0 && priceM3 > 0 ? minChargeM3 * priceM3 : 0
      const nilaiMinChargeKg = minKgEquiv > 0 && priceKG > 0 ? minKgEquiv * priceKG : 0
      const nilaiM3Efektif = nilaiMinChargeM3 > 0 ? Math.max(nilaiM3, nilaiMinChargeM3) : nilaiM3
      const nilaiKGEfektif = nilaiMinChargeKg > 0 ? Math.max(nilaiKG, nilaiMinChargeKg) : nilaiKG

      const winner = nilaiM3Efektif >= nilaiKGEfektif ? 'M3' : 'KG'
      const nilaiTagihan = winner === 'M3' ? nilaiM3Efektif : nilaiKGEfektif
      const selisihM3vsKG = nilaiM3 - nilaiKG

      return {
        fdListCode: entry.fdListCode,
        fdCustCode: entry.fdCustCode,
        fdCustName: entry.fdCustName || entry.fdCustCode || '—',
        fdMarkingNo: entry.fdMarkingNo || '',
        fdTerima: entry.fdTerima || '',
        fdJmlPack: Number(entry.fdJmlPack || 0),
        fdSatuan: entry.fdSatuan || 'COLY',
        m3,
        m3Source,
        kg,
        kgSource,
        beratList,
        beratSJ,
        beratGudang: gudangBerat,
        beratKomplain: komplainBerat,
        priceM3,
        priceKG,
        nilaiM3: Math.round(nilaiM3),
        nilaiKG: Math.round(nilaiKG),
        nilaiM3Efektif: Math.round(nilaiM3Efektif),
        nilaiKGEfektif: Math.round(nilaiKGEfektif),
        nilaiTagihan: Math.round(nilaiTagihan),
        winner,
        selisihM3vsKG: Math.round(selisihM3vsKG),
        selisihAbs: Math.abs(Math.round(selisihM3vsKG)),
        isM3Higher: nilaiM3 >= nilaiKG,
        isM3EfektifHigher: nilaiM3Efektif >= nilaiKGEfektif,
        minChargeApplied: (minChargeM3 > 0 && m3 < minChargeM3) || (minKgEquiv > 0 && kg < minKgEquiv),
      }
    })

    // 5. Hitung aggregate
    const totalM3 = items.reduce((s, i) => s + i.m3, 0)
    const totalKG = items.reduce((s, i) => s + i.kg, 0)
    const totalNilaiM3 = items.reduce((s, i) => s + i.nilaiM3, 0)
    const totalNilaiKG = items.reduce((s, i) => s + i.nilaiKG, 0)
    // Nilai ideal menggunakan efektif (sudah memperhitungkan min charge)
    const totalNilaiM3Efektif = items.reduce((s, i) => s + i.nilaiM3Efektif, 0)
    const totalNilaiKGEfektif = items.reduce((s, i) => s + i.nilaiKGEfektif, 0)
    const overallWinner = totalNilaiM3Efektif >= totalNilaiKGEfektif ? 'M3' : 'KG'
    const totalFreightIdeal = overallWinner === 'M3' ? totalNilaiM3Efektif : totalNilaiKGEfektif
    const totalNilaiTagihanIdeal = totalFreightIdeal + totalBilledAuxiliary
    const selisihVsAktual = totalBilled - totalNilaiTagihanIdeal

    // 6. Tentukan status validasi
    let validationStatus: 'VALID' | 'OVERCHARGE' | 'UNDERCHARGE' | 'EQUAL' = 'VALID'
    const threshold = 10 // tolerance Rp 10
    if (Math.abs(selisihVsAktual) <= threshold) {
      validationStatus = 'EQUAL'
    } else if (selisihVsAktual > threshold) {
      validationStatus = 'OVERCHARGE'
    } else {
      validationStatus = 'UNDERCHARGE'
    }

    logger.info({
      event: 'type2_compare_check',
      invNo,
      listCode: resolvedListCode,
      totalBilled,
      totalNilaiM3,
      totalNilaiKG,
      totalNilaiM3Efektif,
      totalNilaiKGEfektif,
      totalFreightIdeal,
      totalBilledAuxiliary,
      minChargeM3,
      minKgEquiv,
      overallWinner,
      validationStatus,
    })

    return {
      invNo,
      listCode: resolvedListCode,
      markingCode: resolvedMarkingCode,
      markingNo: billingData?.fdMarkingNo?.trim() || '',
      priceM3,
      priceKG,
      totalM3: Math.round(totalM3 * 10000) / 10000,
      totalKG: Math.round(totalKG * 100) / 100,
      m3Source: items[0]?.m3Source || 'List',
      isGabungan,
      totalNilaiM3,
      totalNilaiKG,
      totalNilaiM3Efektif,
      totalNilaiKGEfektif,
      minChargeM3,
      minKgEquiv,
      minChargeApplied: items.some((i) => i.minChargeApplied),
      overallWinner,
      totalFreightIdeal,
      totalBilledAuxiliary,
      totalNilaiTagihanIdeal,
      totalBilled,
      selisihVsAktual,
      validationStatus,
      items,
    }
  }, 'get_type2_comparison_check')
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
      LEFT JOIN tbEmployees e WITH (NOLOCK) ON b.fdEmpCode = e.fdEmpCode
      WHERE b.fdCustCode = CAST(${custCode} AS CHAR(7))
        AND b.fdMarkingCode = CAST(${markingCode} AS CHAR(30))
        AND b.fdInvNo <> CAST(${invNo} AS CHAR(20))
        AND (
          b.fdJumlah1 = ${amount} 
          OR (b.fdJumlah2 IS NOT NULL AND b.fdJumlah2 = ${amount})
        )
      ORDER BY b.fdInvDate DESC
    `

    const hasDuplicate = Boolean(duplicates && duplicates.length > 0)

    // 2. Check tbExpIndo join tbExpedisi on fdListCode (with fallback via tbEntryList)
    let rawExpRows: any[] = []
    const listCodes = (query.listCode || '')
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 4)

    if (listCodes.length === 1) {
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
        LEFT JOIN tbExpedisi x WITH (NOLOCK) ON e.fdExpID = x.fdExpID
        LEFT JOIN tbEntryList el WITH (NOLOCK) ON el.fdListCode = CAST(e.fdListCode AS CHAR(7))
        WHERE e.fdListCode = CAST(${listCodes[0]} AS CHAR(7))
        ORDER BY e.fdCreatedDate DESC
      `
    } else if (listCodes.length > 1) {
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
        LEFT JOIN tbExpedisi x WITH (NOLOCK) ON e.fdExpID = x.fdExpID
        LEFT JOIN tbEntryList el WITH (NOLOCK) ON el.fdListCode = CAST(e.fdListCode AS CHAR(7))
        WHERE e.fdListCode IN (${Prisma.join(listCodes)})
        ORDER BY e.fdCreatedDate DESC
      `
    }

    if (!rawExpRows || rawExpRows.length === 0) {
      const coreMarking = markingCode ? markingCode.split(';')[0]?.trim() || '' : ''

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
        INNER JOIN tbExpIndo e WITH (NOLOCK) ON el.fdListCode = CAST(e.fdListCode AS CHAR(7))
        LEFT JOIN tbExpedisi x WITH (NOLOCK) ON e.fdExpID = x.fdExpID
        WHERE el.fdCustCode = CAST(${custCode} AS CHAR(7))
          AND (
            el.fdMarkingCode = CAST(${coreMarking} AS VARCHAR(30))
            OR el.fdMarkingCode = CAST(${markingCode} AS VARCHAR(30))
            OR ${markingCode} LIKE '%' + RTRIM(el.fdMarkingCode) + '%'
            OR el.fdMarkingCode LIKE '%' + ${coreMarking} + '%'
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

    const matchingExpedisi = expedisiList.find(
      (e) => Number(e.fdTotalExp || 0) > 0 && Math.abs(Number(e.fdTotalExp || 0) - amount) < 0.01
    )

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
