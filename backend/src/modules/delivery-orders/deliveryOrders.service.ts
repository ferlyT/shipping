import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { logger } from '../../config/logger'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { suggestionCache } from '../../utils/cache'
import { getBlockedFinanceStatusMap } from '../shipments/shipments-status.resolver'

import type {
  DeliveryOrderKPIResponse,
  PeriodMetrics,
  MonthlyTrendItem,
  MetricComparison,
  DeliveryOrderDetailResponse,
  DeliveryMasterDataResponse,
  UpdateDeliveryOrderDto,
  PrintDeliveryOrderDto,
  CreateDeliveryOrderDto,
  CustomerDestination,
  CreateCustomerDestinationDto,
  OrderDeliveryItem,
  DeliveryMonitoringResponse,
  ConfirmDeliveryDto,
} from './deliveryOrders.types'

// Re-export types
export * from './deliveryOrders.types'

const MIN_LOAD_DATE = new Date('2019-01-01T00:00:00.000Z')

export async function getDeliveryOrders(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim()
  const listCode = query.listCode?.trim()

  const where: Prisma.TbDeliveryWhereInput = {
    fdSJDate: { gte: MIN_LOAD_DATE },
  }

  if (listCode) {
    where.fdListCode = listCode
  }

  if (search) {
    const matchedCusts = await prisma.tbCustomers.findMany({
      where: {
        OR: [
          { fdCustName: { contains: search } },
          { fdCustCode: { contains: search } },
        ],
      },
      select: { fdCustCode: true },
      take: 50,
    }).catch(() => [] as { fdCustCode: string }[])

    const matchedCustCodes = matchedCusts.map((c) => c.fdCustCode)

    where.AND = [
      { fdSJDate: { gte: MIN_LOAD_DATE } },
      {
        OR: [
          { fdSJNo: { contains: search } },
          { fdDescr: { contains: search } },
          { fdCustCode: { contains: search } },
          ...(matchedCustCodes.length > 0 ? [{ fdCustCode: { in: matchedCustCodes } }] : []),
          { fdCustNameSJ: { contains: search } },
          { fdSupir: { contains: search } },
          { fdCarID: { contains: search } },
        ],
      },
    ]
  }

  if (query.sent === '1' || query.sent === '0') {
    where.fdSent = Number(query.sent)
  }
  if (query.branch?.trim()) {
    where.fdSJNo = { startsWith: `${query.branch.trim()}-` }
  }
  if (query.listType === '1' || query.listType === '2') {
    where.fdListType = Number(query.listType)
  }
  if (query.printed === '1') {
    where.fdPrintDate = { not: null }
  } else if (query.printed === '0') {
    where.fdPrintDate = null
  }
  if (query.ar === '1' || query.give === '1') {
    where.fdGive = 1
  } else if (query.ar === '0' || query.give === '0') {
    where.fdGive = 0
  }

  const [data, total] = await Promise.all([
    prisma.tbDelivery.findMany({
      where,
      skip,
      take,
      orderBy: { fdSJDate: 'desc' },
      select: {
        fdSJNo: true,
        fdSJDate: true,
        fdCustCode: true,
        fdCustNameSJ: true,
        fdDescr: true,
        fdListCode: true,
        fdSupir: true,
        fdCarID: true,
        fdJmlPackSJ: true,
        fdSatuan: true,
        fdJmlBeratSJ: true,
        fdEstimasi: true,
        fdSent: true,
        fdLoad: true,
        fdSndDate: true,
        fdPrint: true,
        fdPrintDate: true,
        fdGive: true,
        fdGiveDate: true,
        entryList: {
          select: {
            fdMarkingCode: true,
            fdMarkingNo: true,
          },
        },
      },
    }),
    prisma.tbDelivery.count({ where }),
  ])

  // Single source of truth: enrich with master tbCustomers.fdCustName
  const custCodes = [...new Set(data.map((d) => d.fdCustCode).filter(Boolean))] as string[]
  let custMap = new Map<string, string>()
  if (custCodes.length > 0) {
    const custs = await prisma.tbCustomers.findMany({
      where: { fdCustCode: { in: custCodes } },
      select: { fdCustCode: true, fdCustName: true },
    }).catch(() => [] as { fdCustCode: string; fdCustName: string | null }[])
    custMap = new Map(custs.map((c) => [c.fdCustCode, c.fdCustName?.trim() || '']))
  }

  const enrichedData = data.map((d) => {
    const masterName = d.fdCustCode ? custMap.get(d.fdCustCode) : undefined
    const finalCustName = masterName || d.fdCustNameSJ?.trim() || 'Customer'
    return {
      ...d,
      fdCustName: finalCustName,
      fdCustNameSJ: finalCustName,
      fdSatuan: d.fdSatuan ? d.fdSatuan.trim() : null,
      fdMarkingCode: d.entryList?.fdMarkingCode ? d.entryList.fdMarkingCode.trim() : null,
      fdMarkingNo: d.entryList?.fdMarkingNo ? d.entryList.fdMarkingNo.trim() : null,
    }
  })

  return { data: enrichedData, meta: meta(total) }
}

export async function getDeliveryMasterData(): Promise<DeliveryMasterDataResponse> {
  const [vehicles, units, paymentTypes, expeditions] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT RTRIM(fdCarID) AS fdCarID, RTRIM(fdSupir) AS fdSupir, RTRIM(fdNotel) AS fdNotel, ISNULL(fdStatus, 1) AS fdStatus
      FROM tbKendaraan WITH (NOLOCK)
      WHERE ISNULL(fdStatus, 1) = 1
      ORDER BY fdCarID ASC
    `.catch(() => []),
    prisma.$queryRaw<any[]>`
      SELECT RTRIM(fdUnitCode) AS fdUnitCode, RTRIM(fdUnitName) AS fdUnitName
      FROM tbSatuan WITH (NOLOCK)
      ORDER BY fdUnitCode ASC
    `.catch(() => []),
    prisma.$queryRaw<any[]>`
      SELECT fdID, RTRIM(fdJenisPembayaran) AS fdJenisPembayaran
      FROM tbJenisPembayaran WITH (NOLOCK)
      ORDER BY fdID ASC
    `.catch(() => []),
    prisma.$queryRaw<any[]>`
      SELECT RTRIM(fdExpID) AS fdExpID, RTRIM(fdExpName) AS fdExpName, RTRIM(fdExpAddr1) AS fdExpAddr1, RTRIM(fdTelp) AS fdTelp
      FROM tbExpedisi WITH (NOLOCK)
      ORDER BY fdExpName ASC
    `.catch(() => []),
  ])

  return {
    vehicles: vehicles.map((v) => ({
      fdCarID: String(v.fdCarID || '').trim(),
      fdSupir: String(v.fdSupir || '').trim(),
      fdNotel: String(v.fdNotel || '').trim(),
      fdStatus: Number(v.fdStatus || 1),
    })),
    units: units.map((u) => ({
      fdUnitCode: String(u.fdUnitCode || '').trim(),
      fdUnitName: String(u.fdUnitName || '').trim(),
    })),
    paymentTypes: paymentTypes.map((p) => ({
      fdID: Number(p.fdID),
      fdJenisPembayaran: String(p.fdJenisPembayaran || '').trim(),
    })),
    expeditions: expeditions.map((e) => ({
      fdExpID: String(e.fdExpID || '').trim(),
      fdExpName: String(e.fdExpName || '').trim(),
      fdExpAddr1: String(e.fdExpAddr1 || '').trim(),
      fdTelp: String(e.fdTelp || '').trim(),
    })),
  }
}

export async function getDeliveryOrderById(id: string): Promise<DeliveryOrderDetailResponse | null> {
  const delivery = await prisma.tbDelivery.findUnique({
    where: { fdSJNo: id },
  })
  if (!delivery) return null

  const listCode = delivery.fdListCode ? String(delivery.fdListCode).trim() : null
  const custCode = delivery.fdCustCode ? String(delivery.fdCustCode).trim() : null
  const expId = delivery.fdExpID ? String(delivery.fdExpID).trim() : null

  // Run parallel lookup queries
  const [
    custMaster,
    entryListRows,
    m3PackingListRows,
    m3GudangRows,
    m3BillRows,
    orderDeliveryRows,
    expeditionRows,
    dimensionRows,
    financeBlockedMap,
  ] = await Promise.all([
    // 1. Single source of truth customer
    custCode
      ? prisma.tbCustomers.findUnique({
          where: { fdCustCode: custCode },
          select: {
            fdCustCode: true,
            fdCustName: true,
            fdContact: true,
            fdAddr1: true,
            fdAddr2: true,
            fdCityName: true,
            fdTelp: true,
            fdHP: true,
            fdBlocked: true,
            fdBroker: true,
            fdDiscontinued: true,
            fdKeterangan: true,
          },
        }).catch(() => null)
      : null,

    // 2. EntryList (Manifest / Gudang)
    listCode
      ? prisma.$queryRaw<any[]>`
          SELECT el.fdListCode, el.fdListDate, el.fdBranchCode, b.fdBranchName,
                 el.fdContainerNo, el.fdCNo, el.fdMarkingCode, el.fdMarkingNo,
                 el.fdJmlPack, el.fdSatuan, el.fdJmlBerat, el.fdM3,
                 el.fdJmlPack2, el.fdSatuan2, el.fdJmlBerat2,
                 el.fdLokasi, el.fdTgl_IN, el.fdTime_IN, el.fdDesc,
                 el.fdDeliveryNote, el.fdTerima, el.fdPrintUkuran,
                 el.fdInvoiceNo, el.fdComodity
          FROM tbEntryList el WITH (NOLOCK)
          LEFT JOIN tbCabang b WITH (NOLOCK) ON b.fdBranchCode = el.fdBranchCode
          WHERE el.fdListCode = ${listCode}
        `.catch(() => [])
      : [],

    // 3. M3 Packing List
    listCode
      ? prisma.$queryRaw<any[]>`
          SELECT TOP 1 fdM3 FROM tbM3_packingList WITH (NOLOCK) WHERE fdListCode = ${listCode}
        `.catch(() => [])
      : [],

    // 4. M3 Gudang (Laut -> fdM3, Udara -> fdVFC)
    listCode
      ? prisma.$queryRaw<any[]>`
          SELECT TOP 1 fdM3, fdVFC FROM tbM3List_rev1 WITH (NOLOCK) WHERE fdListCode = ${listCode}
        `.catch(() => [])
      : [],

    // 5. M3 Bill (Invoice Tagihan)
    listCode
      ? prisma.$queryRaw<any[]>`
          SELECT TOP 1 fdM3Bill FROM qr_m3_bill WITH (NOLOCK) WHERE fdListCode = ${listCode}
        `.catch(() => [])
      : [],

    // 6. Permintaan Pengiriman CS (qr_OrderDelivey)
    listCode
      ? prisma.$queryRaw<any[]>`
          SELECT TOP 1 * FROM qr_OrderDelivey WITH (NOLOCK) WHERE fdListCode = ${listCode}
        `.catch(() => [])
      : [],

    // 7. Ekspedisi Terpilih
    expId
      ? prisma.$queryRaw<any[]>`
          SELECT TOP 1 RTRIM(fdExpID) AS fdExpID, RTRIM(fdExpName) AS fdExpName,
                 RTRIM(fdExpAddr1) AS fdExpAddr1, RTRIM(fdTelp) AS fdTelp
          FROM tbExpedisi WITH (NOLOCK)
          WHERE fdExpID = ${expId}
        `.catch(() => [])
      : [],

    // 8. Rincian Dimensi Fisik Koli
    listCode
      ? prisma.tbEntryListDetail.findMany({
          where: { fdListCode: listCode },
          orderBy: { fdListDCode: 'asc' },
          select: {
            fdListCode: true,
            fdListDCode: true,
            fdDescr: true,
            fdPjg: true,
            fdLbr: true,
            fdTng: true,
            fdQty: true,
            fdLoad: true,
          },
        }).catch(() => [])
      : [],

    // 9. Blocked Finance (tbEntryList_Bloked_Finance -> fdBlocked = 1)
    listCode ? getBlockedFinanceStatusMap([listCode]) : Promise.resolve(new Map()),
  ])

  const entryListRaw = entryListRows[0] || null
  const markingCode = entryListRaw?.fdMarkingCode ? String(entryListRaw.fdMarkingCode).trim() : null
  const financeBlockedInfo = listCode ? (financeBlockedMap as Map<string, any>).get(listCode) : null

  // 9. Cek Barang Amfibi
  let isAmfibi = false
  if (markingCode) {
    const amfibiRows = await prisma.$queryRaw<any[]>`
      SELECT TOP 1 t.fdMarkingCode
      FROM tbMarkingTransit t WITH (NOLOCK)
      LEFT JOIN tbMarking m WITH (NOLOCK) ON m.fdMarkingCode = t.fdMarkingCode
      WHERE t.fdMarkingTransit = ${markingCode} AND m.fdListType = 1
    `.catch(() => [])
    if (amfibiRows.length > 0) {
      isAmfibi = true
    }
  }

  // Calculate trio M3
  const isLaut = (delivery.fdListType ?? entryListRaw?.fdListType) === 2
  const m3PL = Number(m3PackingListRows[0]?.fdM3 ?? entryListRaw?.fdM3 ?? 0)
  const m3Gudang = isLaut
    ? Number(m3GudangRows[0]?.fdM3 ?? 0)
    : Number(m3GudangRows[0]?.fdVFC ?? 0)
  const m3Bill = Number(m3BillRows[0]?.fdM3Bill ?? 0)

  // Map CS Order
  const odRaw = orderDeliveryRows[0] || null
  let orderDeliveryMapped = null
  if (odRaw) {
    const paymentCode = odRaw.fdJenisPembayaran !== null ? Number(odRaw.fdJenisPembayaran) : null
    let paymentLabel: string | null = null
    if (paymentCode === 1) paymentLabel = 'COD'
    else if (paymentCode === 2) paymentLabel = 'TRANSFER'
    else if (paymentCode === 3) paymentLabel = 'DITUNDA KIRIM DAHULU'

    orderDeliveryMapped = {
      fdTglKirim: odRaw.fdTglKirim ? new Date(odRaw.fdTglKirim).toISOString() : null,
      fdNamaPemberiOrder: odRaw.fdNamaPemberiOrder ? String(odRaw.fdNamaPemberiOrder).trim() : null,
      fdKeterangan: odRaw.fdKeterangan ? String(odRaw.fdKeterangan).trim() : null,
      fdJenisPembayaran: paymentCode,
      fdJenisPembayaranLabel: paymentLabel,
      fdTglTransfer: odRaw.fdTglTransfer ? new Date(odRaw.fdTglTransfer).toISOString() : null,
      fdAlamatKirim: odRaw.fdAlamatKirim ? String(odRaw.fdAlamatKirim).trim() : null,
      fdExpID: odRaw.fdExpID ? String(odRaw.fdExpID).trim() : null,
      fdExpName: odRaw.fdExpName ? String(odRaw.fdExpName).trim() : null,
      fdExpAddr: odRaw.fdExpAddr1 ? String(odRaw.fdExpAddr1).trim() : null,
      fdEksBayar: odRaw.fdEksBayar !== null ? Number(odRaw.fdEksBayar) : null,
    }
  }

  // Map expedition
  const expRaw = expeditionRows[0] || null
  const expeditionMapped = expRaw
    ? {
        fdExpID: String(expRaw.fdExpID || '').trim(),
        fdExpName: String(expRaw.fdExpName || '').trim(),
        fdExpAddr1: expRaw.fdExpAddr1 ? String(expRaw.fdExpAddr1).trim() : null,
        fdTelp: expRaw.fdTelp ? String(expRaw.fdTelp).trim() : null,
        fdExp3: delivery.fdExp3 ?? null,
      }
    : null

  // Map Dimensions
  const dimensionsMapped = (dimensionRows || []).map((d) => {
    const pjg = Number(d.fdPjg || 0)
    const lbr = Number(d.fdLbr || 0)
    const tng = Number(d.fdTng || 0)
    const qty = Number(d.fdQty || 1)
    const m3Total = Number((((pjg * lbr * tng) / 1000000) * qty).toFixed(4))
    return {
      fdListCode: String(d.fdListCode).trim(),
      fdListDCode: String(d.fdListDCode).trim(),
      fdDescr: d.fdDescr ? String(d.fdDescr).trim() : null,
      fdPjg: pjg,
      fdLbr: lbr,
      fdTng: tng,
      fdQty: qty,
      fdLoad: d.fdLoad,
      m3Total,
    }
  })

  // Prioritize actual recipient on Surat Jalan (tbDelivery.fdCustNameSJ) or entryList, then fallback to master
  const effectiveCustName = delivery.fdCustNameSJ?.trim() || custMaster?.fdCustName?.trim() || 'Customer'

  return {
    delivery: {
      fdSJNo: delivery.fdSJNo.trim(),
      fdSJDate: delivery.fdSJDate ? delivery.fdSJDate.toISOString() : null,
      fdCarID: delivery.fdCarID ? delivery.fdCarID.trim() : null,
      fdCustCode: delivery.fdCustCode ? delivery.fdCustCode.trim() : null,
      fdDescr: delivery.fdDescr ? delivery.fdDescr.trim() : null,
      fdListCode: delivery.fdListCode ? delivery.fdListCode.trim() : null,
      fdListType: delivery.fdListType,
      fdPrint: delivery.fdPrint,
      fdSent: delivery.fdSent,
      fdSndDate: delivery.fdSndDate ? delivery.fdSndDate.toISOString() : null,
      fdLoad: delivery.fdLoad ? delivery.fdLoad.toISOString() : null,
      fdJmlPackSJ: delivery.fdJmlPackSJ ? Number(delivery.fdJmlPackSJ) : null,
      fdJmlBeratSJ: delivery.fdJmlBeratSJ ? Number(delivery.fdJmlBeratSJ) : null,
      fdPrintDate: delivery.fdPrintDate ? delivery.fdPrintDate.toISOString() : null,
      fdKembali: delivery.fdKembali ? delivery.fdKembali.toISOString() : null,
      fdUpdate: delivery.fdUpdate ? delivery.fdUpdate.trim() : null,
      fdCreated: delivery.fdCreated ? delivery.fdCreated.trim() : null,
      fdPrintBy: delivery.fdPrintBy ? delivery.fdPrintBy.trim() : null,
      fdTerima: delivery.fdTerima ? delivery.fdTerima.trim() : null,
      fdGive: delivery.fdGive,
      fdGiveDate: delivery.fdGiveDate ? delivery.fdGiveDate.toISOString() : null,
      fdAddr: delivery.fdAddr ? delivery.fdAddr.trim() : null,
      fdSupir: delivery.fdSupir ? delivery.fdSupir.trim() : null,
      fdEstimasi: delivery.fdEstimasi ? delivery.fdEstimasi.toISOString() : null,
      fdCustNameSJ: effectiveCustName,
      fdTelp: delivery.fdTelp ? delivery.fdTelp.trim() : null,
      fdTelpSupir: delivery.fdTelpSupir ? delivery.fdTelpSupir.trim() : null,
      fdSatuan: delivery.fdSatuan ? delivery.fdSatuan.trim() : null,
      fdContact: delivery.fdContact ? delivery.fdContact.trim() : null,
      fdCity: delivery.fdCity ? delivery.fdCity.trim() : null,
      fdHp: delivery.fdHp ? delivery.fdHp.trim() : null,
      fdEmail: delivery.fdEmail ? delivery.fdEmail.trim() : null,
      fdExpID: delivery.fdExpID ? delivery.fdExpID.trim() : null,
      fdExp3: delivery.fdExp3,
      fdKondisiBarang: delivery.fdKondisiBarang,
    },
    customer: custMaster
      ? {
          fdCustCode: custMaster.fdCustCode.trim(),
          fdCustName: (custMaster.fdCustName || '').trim(),
          fdContact: custMaster.fdContact ? custMaster.fdContact.trim() : null,
          fdAddr1: custMaster.fdAddr1 ? custMaster.fdAddr1.trim() : null,
          fdAddr2: custMaster.fdAddr2 ? custMaster.fdAddr2.trim() : null,
          fdCityName: custMaster.fdCityName ? custMaster.fdCityName.trim() : null,
          fdTelp: custMaster.fdTelp ? custMaster.fdTelp.trim() : null,
          fdHP: custMaster.fdHP ? custMaster.fdHP.trim() : null,
          fdBlocked: Number(custMaster.fdBlocked || 0),
          fdBlockedStatusName:
            Number(custMaster.fdBlocked) === 1
              ? 'OK'
              : Number(custMaster.fdBlocked) === 2
              ? 'COD'
              : Number(custMaster.fdBlocked) === 3
              ? 'WARNING'
              : Number(custMaster.fdBlocked) === 4
              ? 'BLOCKED'
              : Number(custMaster.fdBlocked) === 5
              ? 'URGENT'
              : 'NO STATUS',
          fdBroker: Number(custMaster.fdBroker || 0),
          fdDiscontinued: Number(custMaster.fdDiscontinued || 0),
          fdKeterangan: custMaster.fdKeterangan ? custMaster.fdKeterangan.trim() : null,
        }
      : null,
    entryList: entryListRaw
      ? {
          fdListCode: String(entryListRaw.fdListCode).trim(),
          fdListDate: entryListRaw.fdListDate ? new Date(entryListRaw.fdListDate).toISOString() : null,
          fdBranchCode: entryListRaw.fdBranchCode ? String(entryListRaw.fdBranchCode).trim() : null,
          fdBranchName: entryListRaw.fdBranchName ? String(entryListRaw.fdBranchName).trim() : null,
          fdContainerNo: entryListRaw.fdContainerNo ? String(entryListRaw.fdContainerNo).trim() : null,
          fdCNo: entryListRaw.fdCNo ? String(entryListRaw.fdCNo).trim() : null,
          fdMarkingCode: entryListRaw.fdMarkingCode ? String(entryListRaw.fdMarkingCode).trim() : null,
          fdMarkingNo: entryListRaw.fdMarkingNo ? String(entryListRaw.fdMarkingNo).trim() : null,
          fdJmlPack: entryListRaw.fdJmlPack !== null ? Number(entryListRaw.fdJmlPack) : null,
          fdSatuan: entryListRaw.fdSatuan ? String(entryListRaw.fdSatuan).trim() : null,
          fdJmlBerat: entryListRaw.fdJmlBerat !== null ? Number(entryListRaw.fdJmlBerat) : null,
          fdJmlPack2: entryListRaw.fdJmlPack2 !== null ? Number(entryListRaw.fdJmlPack2) : null,
          fdSatuan2: entryListRaw.fdSatuan2 ? String(entryListRaw.fdSatuan2).trim() : null,
          fdJmlBerat2: entryListRaw.fdJmlBerat2 !== null ? Number(entryListRaw.fdJmlBerat2) : null,
          fdLokasi: entryListRaw.fdLokasi ? String(entryListRaw.fdLokasi).trim() : null,
          fdTgl_IN: entryListRaw.fdTgl_IN ? new Date(entryListRaw.fdTgl_IN).toISOString() : null,
          fdTime_IN: entryListRaw.fdTime_IN ? String(entryListRaw.fdTime_IN).trim() : null,
          fdDesc: entryListRaw.fdDesc ? String(entryListRaw.fdDesc).trim() : null,
          fdDeliveryNote: entryListRaw.fdDeliveryNote ? String(entryListRaw.fdDeliveryNote).trim() : null,
          fdTerima: entryListRaw.fdTerima ? String(entryListRaw.fdTerima).trim() : null,
          fdPrintUkuran: entryListRaw.fdPrintUkuran !== null ? Number(entryListRaw.fdPrintUkuran) : null,
          fdInvoiceNo: entryListRaw.fdInvoiceNo ? String(entryListRaw.fdInvoiceNo).trim() : null,
          fdComodity: entryListRaw.fdComodity ? String(entryListRaw.fdComodity).trim() : null,
        }
      : null,
    m3Comparison: {
      m3PackingList: m3PL,
      m3Gudang,
      m3Bill,
    },
    orderDelivery: orderDeliveryMapped,
    expedition: expeditionMapped,
    dimensions: dimensionsMapped,
    isAmfibi,
    amfibiMarking: isAmfibi ? markingCode : null,
    financeBlocked: financeBlockedInfo && financeBlockedInfo.isBlocked
      ? {
          isBlocked: true,
          blockedBy: financeBlockedInfo.blockedBy,
          blockedReason: financeBlockedInfo.blockedReason,
        }
      : null,
  }
}

export async function updateDeliveryOrder(
  id: string,
  data: UpdateDeliveryOrderDto,
  user: { username?: string; name?: string }
) {
  // Validate mandatory fields like FoxPro
  if (!data.fdEstimasi || !data.fdEstimasi.trim()) {
    throw new Error('Tanggal estimasi pengiriman wajib diisi!')
  }
  if (!data.fdCarID || !data.fdCarID.trim()) {
    throw new Error('Nomor kendaraan (Plat Mobil) wajib diisi!')
  }

  const existing = await prisma.tbDelivery.findUnique({
    where: { fdSJNo: id },
  })
  if (!existing) {
    throw new Error('Surat Jalan tidak ditemukan!')
  }

  const updated = await prisma.tbDelivery.update({
    where: { fdSJNo: id },
    data: {
      fdEstimasi: data.fdEstimasi ? new Date(data.fdEstimasi) : existing.fdEstimasi,
      fdCarID: data.fdCarID.trim(),
      fdSupir: data.fdSupir !== undefined ? (data.fdSupir ? data.fdSupir.trim() : null) : existing.fdSupir,
      fdTelpSupir: data.fdTelpSupir !== undefined ? (data.fdTelpSupir ? data.fdTelpSupir.trim() : null) : existing.fdTelpSupir,
      fdSndDate: data.fdSndDate ? new Date(data.fdSndDate) : (data.fdSndDate === null ? null : existing.fdSndDate),
      fdCustNameSJ: data.fdCustNameSJ !== undefined ? (data.fdCustNameSJ ? data.fdCustNameSJ.trim() : null) : existing.fdCustNameSJ,
      fdContact: data.fdContact !== undefined ? (data.fdContact ? data.fdContact.trim() : null) : existing.fdContact,
      fdAddr: data.fdAddr !== undefined ? (data.fdAddr ? data.fdAddr.trim() : null) : existing.fdAddr,
      fdCity: data.fdCity !== undefined ? (data.fdCity ? data.fdCity.trim() : null) : existing.fdCity,
      fdTelp: data.fdTelp !== undefined ? (data.fdTelp ? data.fdTelp.trim() : null) : existing.fdTelp,
      fdHp: data.fdHp !== undefined ? (data.fdHp ? data.fdHp.trim() : null) : existing.fdHp,
      fdEmail: data.fdEmail !== undefined ? (data.fdEmail ? data.fdEmail.trim() : null) : existing.fdEmail,
      fdDescr: data.fdDescr !== undefined ? (data.fdDescr ? data.fdDescr.trim() : null) : existing.fdDescr,
      fdJmlPackSJ: data.fdJmlPackSJ !== undefined && data.fdJmlPackSJ !== null ? new Prisma.Decimal(data.fdJmlPackSJ) : existing.fdJmlPackSJ,
      fdSatuan: data.fdSatuan !== undefined ? (data.fdSatuan ? data.fdSatuan.trim() : null) : existing.fdSatuan,
      fdJmlBeratSJ: data.fdJmlBeratSJ !== undefined && data.fdJmlBeratSJ !== null ? new Prisma.Decimal(data.fdJmlBeratSJ) : existing.fdJmlBeratSJ,
      fdKondisiBarang: data.fdKondisiBarang !== undefined && data.fdKondisiBarang !== null ? Number(data.fdKondisiBarang) : existing.fdKondisiBarang,
      fdExpID: data.fdExpID !== undefined ? (data.fdExpID ? data.fdExpID.trim() : null) : existing.fdExpID,
      fdExp3: data.fdExp3 !== undefined && data.fdExp3 !== null ? Number(data.fdExp3) : existing.fdExp3,
      fdKembali: data.fdKembali ? new Date(data.fdKembali) : (data.fdKembali === null ? null : existing.fdKembali),
      fdTerima: data.fdTerima !== undefined ? (data.fdTerima ? data.fdTerima.trim() : null) : existing.fdTerima,
      fdGive: data.fdGive !== undefined && data.fdGive !== null ? Number(data.fdGive) : existing.fdGive,
      fdGiveDate: data.fdGiveDate ? new Date(data.fdGiveDate) : (data.fdGiveDate === null ? null : existing.fdGiveDate),
      fdUpdate: (user.username || user.name || 'SYSTEM').slice(0, 25),
    },
  })

  return updated
}

export async function deleteDeliveryOrder(id: string, user: { role?: string; username?: string }) {
  const existing = await prisma.tbDelivery.findUnique({
    where: { fdSJNo: id },
  })
  if (!existing) {
    throw new Error('Surat Jalan tidak ditemukan!')
  }

  // FoxPro check: if already printed, protect or require confirmation
  if (existing.fdPrint === 1 || existing.fdPrintDate) {
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Surat Jalan sudah pernah dicetak. Hanya Admin yang dapat menghapus!')
    }
  }

  await prisma.tbDelivery.delete({
    where: { fdSJNo: id },
  })

  return { success: true, fdSJNo: id }
}

export async function recordDeliveryPrint(
  id: string,
  options: PrintDeliveryOrderDto,
  user: { username?: string; name?: string }
) {
  const existing = await prisma.tbDelivery.findUnique({
    where: { fdSJNo: id },
  })
  if (!existing) {
    throw new Error('Surat Jalan tidak ditemukan!')
  }

  const printTime = new Date()
  const printBy = (user.username || user.name || 'SYSTEM').slice(0, 25)

  await prisma.tbDelivery.update({
    where: { fdSJNo: id },
    data: {
      fdPrint: 1,
      fdPrintDate: printTime,
      fdPrintBy: printBy,
    },
  })

  // If check1 (cetakUkuran) is selected, update tbEntryList.fdPrintUkuran = 1
  if (options.cetakUkuran && existing.fdListCode) {
    await prisma.$executeRaw`
      UPDATE tbEntryList SET fdPrintUkuran = 1 WHERE fdListCode = ${existing.fdListCode.trim()}
    `.catch(() => null)
  }

  return {
    success: true,
    fdSJNo: id,
    fdPrint: 1,
    fdPrintDate: printTime.toISOString(),
    fdPrintBy: printBy,
  }
}

export async function createDeliveryOrder(
  data: CreateDeliveryOrderDto,
  user: { username?: string; name?: string }
) {
  // Validate mandatory fields like FoxPro
  if (!data.fdListCode || !data.fdListCode.trim()) {
    throw new Error('Kode List Kargo (fdListCode) wajib diisi!')
  }
  if (!data.fdCarID || !data.fdCarID.trim()) {
    throw new Error('Nomor Kendaraan (Plat Mobil) wajib diisi!')
  }
  if (!data.fdEstimasi || !data.fdEstimasi.trim()) {
    throw new Error('Tanggal Estimasi Kirim wajib diisi!')
  }
  if (!data.fdJmlPackSJ || Number(data.fdJmlPackSJ) <= 0) {
    throw new Error('Jumlah Koli yang dikirim harus lebih besar dari 0!')
  }

  // Lookup entryList to get default values if missing
  const entryListRows = await prisma.$queryRaw<any[]>`
    SELECT el.*, b.fdBranchName
    FROM tbEntryList el WITH (NOLOCK)
    LEFT JOIN tbCabang b WITH (NOLOCK) ON b.fdBranchCode = el.fdBranchCode
    WHERE el.fdListCode = ${data.fdListCode.trim()}
  `.catch(() => [])
  const el = entryListRows[0] || null

  const branchCode = (data.fdBranchCode || el?.fdBranchCode || 'GZ').trim().toUpperCase()

  // Generate next counter atomically from tbMasterCounter (fdCode = 'A')
  const nextCounterResult = await prisma.$transaction(async (tx) => {
    const counterRows = await tx.$queryRaw<any[]>`
      SELECT fdSJCounter FROM tbMasterCounter WITH (UPDLOCK, ROWLOCK) WHERE fdCode = 'A'
    `
    const currentCounter = Number(counterRows[0]?.fdSJCounter || 0)
    const nextCounter = currentCounter + 1
    await tx.$executeRaw`
      UPDATE tbMasterCounter SET fdSJCounter = ${nextCounter} WHERE fdCode = 'A'
    `
    return nextCounter
  })

  const padNum = String(nextCounterResult).padStart(6, '0')
  const newSJNo = `${branchCode}-${padNum}`

  const now = new Date()
  const estimasiDate = new Date(data.fdEstimasi)
  const createdBy = (user?.name || user?.username || 'SYSTEM').slice(0, 25)

  await prisma.tbDelivery.create({
    data: {
      fdSJNo: newSJNo,
      fdSJDate: now,
      fdCarID: data.fdCarID.trim().slice(0, 10),
      fdCustCode: data.fdCustCode
        ? data.fdCustCode.trim().slice(0, 7)
        : (el?.fdCustCode ? String(el.fdCustCode).trim().slice(0, 7) : null),
      fdDescr: data.fdDescr
        ? data.fdDescr.trim().slice(0, 250)
        : (el?.fdDeliveryNote ? String(el.fdDeliveryNote).trim().slice(0, 250) : ''),
      fdListCode: data.fdListCode.trim().slice(0, 7),
      fdListType: data.fdListType ?? el?.fdListType ?? 2,
      fdPrint: 0,
      fdSent: 0,
      fdJmlPackSJ: Number(data.fdJmlPackSJ),
      fdJmlBeratSJ: data.fdJmlBeratSJ !== undefined && data.fdJmlBeratSJ !== null
        ? Number(data.fdJmlBeratSJ)
        : (el?.fdJmlBerat ? Number(el.fdJmlBerat) : 0),
      fdCustNameSJ: data.fdCustNameSJ
        ? data.fdCustNameSJ.trim().slice(0, 50)
        : (el?.fdCustName ? String(el.fdCustName).trim().slice(0, 50) : 'Customer'),
      fdSupir: data.fdSupir ? data.fdSupir.trim().slice(0, 35) : null,
      fdTelpSupir: data.fdTelpSupir ? data.fdTelpSupir.trim().slice(0, 50) : null,
      fdEstimasi: estimasiDate,
      fdAddr: data.fdAddr ? data.fdAddr.trim().slice(0, 80) : null,
      fdCity: data.fdCity ? data.fdCity.trim().slice(0, 100) : null,
      fdContact: data.fdContact ? data.fdContact.trim().slice(0, 50) : null,
      fdHp: data.fdHp ? data.fdHp.trim().slice(0, 50) : null,
      fdTelp: data.fdTelp ? data.fdTelp.trim().slice(0, 50) : null,
      fdSatuan: data.fdSatuan
        ? data.fdSatuan.trim().slice(0, 5)
        : (el?.fdSatuan ? String(el.fdSatuan).trim().slice(0, 5) : 'COLY'),
      fdTerima: el?.fdTerima ? String(el.fdTerima).trim().slice(0, 35) : null,
      fdKondisiBarang: data.fdKondisiBarang ?? 1,
      fdCreated: createdBy,
      fdLoad: now,
    },
  })

  // Mark fdSJCreated = 1 on tbEntryList if sisa will be 0
  if (data.fdListCode) {
    await prisma.$executeRaw`
      UPDATE tbEntryList SET fdSJCreated = 1 WHERE fdListCode = ${data.fdListCode.trim()}
    `.catch(() => null)
  }

  return {
    success: true,
    fdSJNo: newSJNo,
    message: `Surat Jalan ${newSJNo} berhasil diterbitkan`,
  }
}


const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
]

export async function getDeliveryOrdersKPIs(query: Record<string, string | undefined>): Promise<DeliveryOrderKPIResponse> {
  const now = new Date()
  const targetYear = query.year && !isNaN(Number(query.year)) ? Number(query.year) : now.getFullYear()
  const targetMonth = query.month && !isNaN(Number(query.month)) ? Math.min(12, Math.max(1, Number(query.month))) : now.getMonth() + 1
  const search = query.search?.trim()

  // 1. Current Period (Bulan Berjalan / Target)
  const currYear = targetYear
  const currMonth = targetMonth
  const startOfCurr = new Date(currYear, currMonth - 1, 1)
  const endOfCurr = new Date(currYear, currMonth, 1)

  // 2. Previous Month (Bulan Sebelumnya / MoM)
  const prevYear = currMonth === 1 ? currYear - 1 : currYear
  const prevMonth = currMonth === 1 ? 12 : currMonth - 1
  const startOfPrev = new Date(prevYear, prevMonth - 1, 1)
  const endOfPrev = new Date(prevYear, prevMonth, 1)

  // 3. Same Month Last Year (Bulan yang Sama Tahun Lalu / YoY)
  const lastYear = currYear - 1
  const lastYearMonth = currMonth
  const startOfLastYear = new Date(lastYear, lastYearMonth - 1, 1)
  const endOfLastYear = new Date(lastYear, lastYearMonth, 1)

  // 4. Trend 12 Months Range: from 11 months before target start to target end
  const startOf12Months = new Date(currYear, currMonth - 12, 1)

  // Helper to query single period metrics using raw SQL with NOLOCK
  const fetchPeriodMetrics = async (
    start: Date,
    end: Date,
    yr: number,
    mo: number
  ): Promise<PeriodMetrics> => {
    let searchSql = Prisma.empty
    if (search) {
      searchSql = Prisma.sql`AND (
        fdSJNo LIKE ${'%' + search + '%'} 
        OR fdDescr LIKE ${'%' + search + '%'} 
        OR fdCustCode LIKE ${'%' + search + '%'} 
        OR fdCustNameSJ LIKE ${'%' + search + '%'} 
        OR fdSupir LIKE ${'%' + search + '%'} 
        OR fdCarID LIKE ${'%' + search + '%'}
      )`
    }

    try {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT 
          COUNT(*) AS totalSJ,
          ISNULL(SUM(fdJmlPackSJ), 0) AS totalPackages,
          ISNULL(SUM(fdJmlBeratSJ), 0) AS totalWeight,
          SUM(CASE WHEN fdSent = 1 THEN 1 ELSE 0 END) AS deliveredSJ,
          SUM(CASE WHEN fdSent = 0 OR fdSent IS NULL THEN 1 ELSE 0 END) AS onDeliverySJ,
          SUM(CASE WHEN fdListType = 2 THEN 1 ELSE 0 END) AS seaSJ,
          SUM(CASE WHEN fdListType = 1 THEN 1 ELSE 0 END) AS airSJ
        FROM tbDelivery WITH (NOLOCK)
        WHERE fdSJDate >= ${start} AND fdSJDate < ${end}
        ${searchSql}
      `
      const r = rows[0] || {}
      return {
        year: yr,
        month: mo,
        monthName: `${MONTH_NAMES[mo - 1]} ${yr}`,
        totalSJ: Number(r.totalSJ || 0),
        totalPackages: Number(r.totalPackages || 0),
        totalWeight: Number(Number(r.totalWeight || 0).toFixed(2)),
        deliveredSJ: Number(r.deliveredSJ || 0),
        onDeliverySJ: Number(r.onDeliverySJ || 0),
        seaSJ: Number(r.seaSJ || 0),
        airSJ: Number(r.airSJ || 0),
      }
    } catch {
      return {
        year: yr,
        month: mo,
        monthName: `${MONTH_NAMES[mo - 1]} ${yr}`,
        totalSJ: 0,
        totalPackages: 0,
        totalWeight: 0,
        deliveredSJ: 0,
        onDeliverySJ: 0,
        seaSJ: 0,
        airSJ: 0,
      }
    }
  }

  // Helper to query 12 months trends
  const fetchMonthlyTrends = async (): Promise<MonthlyTrendItem[]> => {
    let searchSql = Prisma.empty
    if (search) {
      searchSql = Prisma.sql`AND (
        fdSJNo LIKE ${'%' + search + '%'} 
        OR fdDescr LIKE ${'%' + search + '%'} 
        OR fdCustCode LIKE ${'%' + search + '%'} 
        OR fdCustNameSJ LIKE ${'%' + search + '%'} 
        OR fdSupir LIKE ${'%' + search + '%'} 
        OR fdCarID LIKE ${'%' + search + '%'}
      )`
    }

    try {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT 
          YEAR(fdSJDate) AS yr,
          MONTH(fdSJDate) AS mo,
          COUNT(*) AS totalSJ,
          ISNULL(SUM(fdJmlPackSJ), 0) AS totalPackages,
          ISNULL(SUM(fdJmlBeratSJ), 0) AS totalWeight,
          SUM(CASE WHEN fdSent = 1 THEN 1 ELSE 0 END) AS deliveredSJ,
          SUM(CASE WHEN fdSent = 0 OR fdSent IS NULL THEN 1 ELSE 0 END) AS onDeliverySJ
        FROM tbDelivery WITH (NOLOCK)
        WHERE fdSJDate >= ${startOf12Months} AND fdSJDate < ${endOfCurr}
        ${searchSql}
        GROUP BY YEAR(fdSJDate), MONTH(fdSJDate)
        ORDER BY yr ASC, mo ASC
      `

      const result: MonthlyTrendItem[] = []
      const rowMap = new Map<string, any>()
      for (const r of rows) {
        rowMap.set(`${r.yr}-${String(r.mo).padStart(2, '0')}`, r)
      }

      for (let i = 11; i >= 0; i--) {
        const d = new Date(currYear, currMonth - 1 - i, 1)
        const y = d.getFullYear()
        const m = d.getMonth() + 1
        const key = `${y}-${String(m).padStart(2, '0')}`
        const r = rowMap.get(key)
        result.push({
          monthKey: key,
          name: `${MONTH_SHORT_NAMES[m - 1]} '${String(y).slice(-2)}`,
          year: y,
          month: m,
          totalSJ: Number(r?.totalSJ || 0),
          packages: Number(r?.totalPackages || 0),
          weight: Number(Number(r?.totalWeight || 0).toFixed(2)),
          delivered: Number(r?.deliveredSJ || 0),
          onDelivery: Number(r?.onDeliverySJ || 0),
        })
      }
      return result
    } catch {
      return []
    }
  }

  // Execute all queries in parallel
  const [currentMetrics, prevMetrics, lastYearMetrics, trends] = await Promise.all([
    fetchPeriodMetrics(startOfCurr, endOfCurr, currYear, currMonth),
    fetchPeriodMetrics(startOfPrev, endOfPrev, prevYear, prevMonth),
    fetchPeriodMetrics(startOfLastYear, endOfLastYear, lastYear, lastYearMonth),
    fetchMonthlyTrends(),
  ])

  // Comparison helper
  const calcComp = (curr: number, prev: number, lastYr: number): MetricComparison => {
    const momDiff = Number((curr - prev).toFixed(2))
    const momPercent = prev > 0 ? Number((((curr - prev) / prev) * 100).toFixed(1)) : 0
    const yoyDiff = Number((curr - lastYr).toFixed(2))
    const yoyPercent = lastYr > 0 ? Number((((curr - lastYr) / lastYr) * 100).toFixed(1)) : 0
    return {
      current: curr,
      prev: prev,
      momDiff,
      momPercent,
      lastYear: lastYr,
      yoyDiff,
      yoyPercent,
    }
  }

  return {
    // Legacy backward-compatible fields
    totalSJ: currentMetrics.totalSJ,
    totalPackages: currentMetrics.totalPackages,
    totalWeight: currentMetrics.totalWeight,
    sjBulanIni: currentMetrics.totalSJ,
    onDelivery: currentMetrics.onDeliverySJ,

    // Enhanced MoM & YoY Comparison structures
    currentMonth: currentMetrics,
    prevMonth: prevMetrics,
    lastYearSameMonth: lastYearMetrics,

    comparisons: {
      totalSJ: calcComp(currentMetrics.totalSJ, prevMetrics.totalSJ, lastYearMetrics.totalSJ),
      totalPackages: calcComp(currentMetrics.totalPackages, prevMetrics.totalPackages, lastYearMetrics.totalPackages),
      totalWeight: calcComp(currentMetrics.totalWeight, prevMetrics.totalWeight, lastYearMetrics.totalWeight),
      deliveredSJ: calcComp(currentMetrics.deliveredSJ, prevMetrics.deliveredSJ, lastYearMetrics.deliveredSJ),
      onDeliverySJ: calcComp(currentMetrics.onDeliverySJ, prevMetrics.onDeliverySJ, lastYearMetrics.onDeliverySJ),
    },

    monthlyTrends: trends,
  }
}

export async function getDeliveryGroupedByListCode(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim()
  const markingCode = query.markingCode?.trim()
  const branch = query.branch?.trim()
  const listType = query.listType === '2' ? 2 : 1
  const gudangStatus = query.gudangStatus?.trim()

  let searchCondition = Prisma.sql`WHERE el.fdListType = ${listType} AND tm.fdExitDate IS NOT NULL AND (ISNULL(tm.fdLoadDate, tm.fdSysDate) >= ${MIN_LOAD_DATE})`
  if (markingCode) {
    searchCondition = Prisma.sql`${searchCondition} AND el.fdMarkingCode = ${markingCode}`
  }
  if (branch) {
    searchCondition = Prisma.sql`${searchCondition} AND tm.fdBranchCode = ${branch}`
  }
  if (gudangStatus === '1') {
    searchCondition = Prisma.sql`${searchCondition} AND g.fdStatus = 1`
  } else if (gudangStatus === '0') {
    searchCondition = Prisma.sql`${searchCondition} AND (g.fdStatus = 0 OR g.fdStatus IS NULL)`
  }
  if (search) {
    searchCondition = Prisma.sql`${searchCondition} AND (
      el.fdListCode LIKE ${'%' + search + '%'} 
      OR el.fdMarkingCode LIKE ${'%' + search + '%'} 
      OR c.fdCustName LIKE ${'%' + search + '%'}
      OR el.fdTerima LIKE ${'%' + search + '%'}
      OR el.fdComodity LIKE ${'%' + search + '%'}
    )`
  }

  let havingClause = Prisma.empty
  if (query.sent === '0' || query.sent === '1') {
    const sentNum = query.sent === '1' ? 1 : 0
    havingClause = Prisma.sql`HAVING ISNULL(MAX(d.fdSent), 0) = ${sentNum}`
  }

  const [data, totalResult] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        el.fdListCode                         AS listCode,
        el.fdMarkingCode                      AS markingCode,
        el.fdCustCode                         AS custCode,
        el.fdSatuan                           AS satuan,
        el.fdJmlPAck                          AS totalQty,
        COALESCE(c.fdCustName, el.fdCustName) AS customerName,
        RTRIM(el.fdTerima)                    AS resiNo,
        RTRIM(el.fdComodity)                  AS comodity,
        el.fdTypeComodity                     AS typeComodityId,
        RTRIM(tc.fdComodityName)              AS typeComodityName,
        CASE
          WHEN el.gudangStatus = 1 AND el.gudangBerat IS NOT NULL AND el.gudangBerat > 0 THEN el.gudangBerat
          ELSE el.fdJmlBerat
        END AS totalWeight,
        el.fdBranchCode                       AS branchCode,
        el.fdBranchName                       AS branchName,
        ISNULL(SUM(d.fdJmlPackSJ), 0)         AS totalTerkirim,
        (el.fdJmlPAck - ISNULL(SUM(d.fdJmlPackSJ), 0)) AS sisa,
        ISNULL(MAX(d.fdSent), 0)              AS isSent,
        el.gudangStatus                       AS gudangStatus,
        CASE 
          WHEN el.gudangStatus = 1 THEN 
            CASE 
              WHEN el.gudangM3 IS NOT NULL AND el.gudangM3 > 0 THEN el.gudangM3
              WHEN eld.detailM3 IS NOT NULL AND eld.detailM3 > 0 THEN eld.detailM3
              ELSE ISNULL(el.fdM3, 0)
            END
          ELSE ISNULL(el.fdM3, 0)
        END AS m3,
        CASE 
          WHEN el.gudangStatus = 1 AND ((el.gudangM3 IS NOT NULL AND el.gudangM3 > 0) OR (eld.detailM3 IS NOT NULL AND eld.detailM3 > 0)) THEN 'Gudang'
          ELSE 'tbEntryList'
        END AS m3Source
      FROM (
        SELECT 
          el.fdListCode, 
          el.fdMarkingCode, 
          el.fdJmlPAck, 
          c.fdCustName, 
          el.fdCustCode,
          RTRIM(el.fdSatuan) AS fdSatuan,
          el.fdTerima, 
          el.fdComodity, 
          el.fdTypeComodity,
          el.fdListType,
          el.fdJmlBerat,
          el.fdM3,
          ISNULL(g.fdStatus, 0) AS gudangStatus,
          g.fdM3Gudang AS gudangM3,
          g.fdJmlBerat AS gudangBerat,
          tm.fdBranchCode AS fdBranchCode, 
          cb.fdBranchName AS fdBranchName
        FROM tbEntryList el WITH (NOLOCK)
        JOIN tbMarking tm WITH (NOLOCK) ON tm.fdMarkingCode = el.fdMarkingCode
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
        LEFT JOIN tbEntryListGudang g WITH (NOLOCK) ON g.fdListCode = el.fdListCode
        LEFT JOIN tbDelivery d WITH (NOLOCK) ON d.fdListCode = el.fdListCode
        LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = tm.fdBranchCode
        ${searchCondition}
        GROUP BY 
          el.fdListCode, el.fdMarkingCode, el.fdJmlPAck, c.fdCustName, el.fdCustCode, el.fdSatuan, el.fdTerima, 
          el.fdComodity, el.fdTypeComodity, el.fdListType, el.fdJmlBerat, el.fdM3,
          g.fdStatus, g.fdM3Gudang, g.fdJmlBerat,
          tm.fdBranchCode, cb.fdBranchName
        ${havingClause}
        ORDER BY el.fdListCode DESC
        OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY
      ) el
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
      LEFT JOIN tbDelivery d WITH (NOLOCK) ON d.fdListCode = el.fdListCode
      LEFT JOIN tbTypeComodity tc WITH (NOLOCK) 
        ON tc.fdTypeComodity = el.fdTypeComodity AND tc.fdListType = el.fdListType
      OUTER APPLY (
        SELECT 
          ROUND(SUM(CAST(det.fdPjg AS FLOAT) * CAST(det.fdLbr AS FLOAT) * CAST(det.fdTng AS FLOAT) * CAST(det.fdQty AS FLOAT)) / 1000000.0, 4) AS detailM3
        FROM tbEntryListDetail det WITH (NOLOCK)
        WHERE det.fdListCode = el.fdListCode
      ) eld
      GROUP BY 
        el.fdListCode, el.fdMarkingCode, el.fdCustCode, el.fdSatuan, el.fdJmlPAck, c.fdCustName, el.fdCustName, el.fdTerima, 
        el.fdComodity, el.fdTypeComodity, tc.fdComodityName, el.fdJmlBerat, el.fdM3,
        el.gudangStatus, el.gudangM3, el.gudangBerat,
        el.fdBranchCode, el.fdBranchName, eld.detailM3
      ORDER BY el.fdListCode DESC
    `,
    prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT el.fdListCode
        FROM tbEntryList el WITH (NOLOCK)
        JOIN tbMarking tm WITH (NOLOCK) ON tm.fdMarkingCode = el.fdMarkingCode
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
        LEFT JOIN tbEntryListGudang g WITH (NOLOCK) ON g.fdListCode = el.fdListCode
        LEFT JOIN tbDelivery d WITH (NOLOCK) ON d.fdListCode = el.fdListCode
        ${searchCondition}
        GROUP BY el.fdListCode
        ${havingClause}
      ) as t
    `,
  ])

  const total = Number((totalResult as any[])[0]?.count || 0)

  // Fix BigInt and format numbers before returning JSON
  const serializedData = (data as any[]).map((row) => {
    const newRow: any = { ...row }
    for (const key in newRow) {
      if (typeof newRow[key] === 'bigint') {
        newRow[key] = Number(newRow[key])
      }
    }
    if (newRow.custCode) {
      newRow.custCode = String(newRow.custCode).trim()
    }
    if (newRow.satuan) {
      newRow.satuan = String(newRow.satuan).trim()
    }
    if (newRow.totalWeight !== undefined && newRow.totalWeight !== null) {
      newRow.totalWeight = Number(newRow.totalWeight)
    }
    if (newRow.gudangStatus !== undefined && newRow.gudangStatus !== null) {
      newRow.gudangStatus = Number(newRow.gudangStatus)
    }
    if (newRow.m3 !== undefined && newRow.m3 !== null) {
      newRow.m3 = Number(Number(newRow.m3).toFixed(4))
    }
    return newRow
  })

  return { data: serializedData, meta: meta(total) }
}

export async function getDeliveryMarkingCodeGroups(query: Record<string, string | undefined>) {
  const search = query.search?.trim()
  const listType = query.listType === '2' ? 2 : 1
  const gudangStatus = query.gudangStatus?.trim()

  let searchCondition = Prisma.sql`WHERE el.fdListType = ${listType} AND tm.fdExitDate IS NOT NULL AND (ISNULL(tm.fdLoadDate, tm.fdSysDate) >= ${MIN_LOAD_DATE})`
  if (gudangStatus === '1') {
    searchCondition = Prisma.sql`${searchCondition} AND g.fdStatus = 1`
  } else if (gudangStatus === '0') {
    searchCondition = Prisma.sql`${searchCondition} AND (g.fdStatus = 0 OR g.fdStatus IS NULL)`
  }
  if (search) {
    searchCondition = Prisma.sql`${searchCondition} AND (el.fdListCode LIKE ${'%' + search + '%'} OR el.fdMarkingCode LIKE ${'%' + search + '%'} OR c.fdCustName LIKE ${'%' + search + '%'})`
  }

  let havingClause = Prisma.empty
  if (query.sent === '0' || query.sent === '1') {
    const sentNum = query.sent === '1' ? 1 : 0
    havingClause = Prisma.sql`HAVING ISNULL(MAX(d.fdSent), 0) = ${sentNum}`
  }

  const groups = await prisma.$queryRaw`
    SELECT t.markingCode AS markingCode, COUNT(*) AS total
    FROM (
      SELECT el.fdMarkingCode AS markingCode, el.fdListCode
      FROM tbEntryList el WITH (NOLOCK)
      JOIN tbMarking tm WITH (NOLOCK) ON tm.fdMarkingCode = el.fdMarkingCode
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
      LEFT JOIN tbEntryListGudang g WITH (NOLOCK) ON g.fdListCode = el.fdListCode
      LEFT JOIN tbDelivery d WITH (NOLOCK) ON d.fdListCode = el.fdListCode
      ${searchCondition}
      GROUP BY el.fdMarkingCode, el.fdListCode
      ${havingClause}
    ) t
    GROUP BY t.markingCode
    ORDER BY t.markingCode ASC
  `

  const data = (groups as any[]).map((row) => ({
    markingCode: row.markingCode,
    total: typeof row.total === 'bigint' ? Number(row.total) : row.total,
  }))

  return { data }
}

export async function getDeliveryBranchGroups(query: Record<string, string | undefined>) {
  const search = query.search?.trim()
  const listType = query.listType === '2' ? 2 : 1
  const gudangStatus = query.gudangStatus?.trim()

  let searchCondition = Prisma.sql`WHERE el.fdListType = ${listType} AND tm.fdExitDate IS NOT NULL AND (ISNULL(tm.fdLoadDate, tm.fdSysDate) >= ${MIN_LOAD_DATE})`
  if (gudangStatus === '1') {
    searchCondition = Prisma.sql`${searchCondition} AND g.fdStatus = 1`
  } else if (gudangStatus === '0') {
    searchCondition = Prisma.sql`${searchCondition} AND (g.fdStatus = 0 OR g.fdStatus IS NULL)`
  }
  if (search) {
    searchCondition = Prisma.sql`${searchCondition} AND (el.fdListCode LIKE ${'%' + search + '%'} OR el.fdMarkingCode LIKE ${'%' + search + '%'} OR c.fdCustName LIKE ${'%' + search + '%'})`
  }

  let havingClause = Prisma.empty
  if (query.sent === '0' || query.sent === '1') {
    const sentNum = query.sent === '1' ? 1 : 0
    havingClause = Prisma.sql`HAVING ISNULL(MAX(d.fdSent), 0) = ${sentNum}`
  }

  const groups = await prisma.$queryRaw`
    SELECT t.branchCode AS branchCode, MAX(t.branchName) AS branchName, COUNT(*) AS total
    FROM (
      SELECT el.fdListCode, tm.fdBranchCode AS branchCode, cb.fdBranchName AS branchName
      FROM tbEntryList el WITH (NOLOCK)
      JOIN tbMarking tm WITH (NOLOCK) ON tm.fdMarkingCode = el.fdMarkingCode
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
      LEFT JOIN tbEntryListGudang g WITH (NOLOCK) ON g.fdListCode = el.fdListCode
      LEFT JOIN tbDelivery d WITH (NOLOCK) ON d.fdListCode = el.fdListCode
      LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = tm.fdBranchCode
      ${searchCondition}
      GROUP BY el.fdListCode, tm.fdBranchCode, cb.fdBranchName
      ${havingClause}
    ) t
    GROUP BY t.branchCode
    ORDER BY t.branchCode ASC
  `

  const data = (groups as any[]).map((row) => ({
    branchCode: row.branchCode,
    branchName: row.branchName,
    total: typeof row.total === 'bigint' ? Number(row.total) : row.total,
  }))

  return { data }
}

export interface DeliveryOrderSuggestion {
  type: 'sj' | 'customer' | 'supir' | 'car'
  title: string
  subtitle: string
  value: string
}

export async function getDeliveryOrderSuggestions(keyword: string): Promise<DeliveryOrderSuggestion[]> {
  const cleanQ = (keyword || '').trim()
  if (!cleanQ || cleanQ.length < 2) return []

  const cacheKey = `do:${cleanQ.toLowerCase()}`
  const cached = suggestionCache.get<DeliveryOrderSuggestion[]>(cacheKey)
  if (cached) return cached

  const prefixLike = `${cleanQ}%`
  const searchLike = `%${cleanQ}%`

  try {
    // Stage 1: Fast parallel lookup:
    // - tbCustomers matching keyword (Single Source of Truth)
    // - tbDelivery prefix match on fdSJNo (PK) bounded by fdSJDate >= '2023-01-01'
    const [custRows, stage1Rows] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT TOP 5 RTRIM(fdCustCode) AS fdCustCode, RTRIM(fdCustName) AS fdCustName
        FROM tbCustomers WITH (NOLOCK)
        WHERE fdCustName LIKE ${searchLike} AND ISNULL(fdDiscontinued, 0) <> 1
        ORDER BY fdCustName ASC
      `.catch(() => [] as any[]),
      prisma.$queryRaw<any[]>`
        SELECT TOP 15 
          RTRIM(ISNULL(fdSJNo, '')) AS fdSJNo,
          RTRIM(ISNULL(fdCustNameSJ, '')) AS fdCustNameSJ,
          RTRIM(ISNULL(fdSupir, '')) AS fdSupir,
          RTRIM(ISNULL(fdCarID, '')) AS fdCarID
        FROM tbDelivery WITH (NOLOCK)
        WHERE fdSJDate >= '2023-01-01'
          AND fdSJNo LIKE ${prefixLike}
        ORDER BY fdSJDate DESC
      `.catch(() => [] as any[]),
    ])

    let rows: any[] = stage1Rows || []

    // Stage 2: If fewer than 5 rows, search across all relevant fields bounded by fdSJDate >= '2023-01-01'
    if (rows.length < 5) {
      const fallbackRows: any[] = (await prisma.$queryRaw<any[]>`
        SELECT TOP 15 
          RTRIM(ISNULL(fdSJNo, '')) AS fdSJNo,
          RTRIM(ISNULL(fdCustNameSJ, '')) AS fdCustNameSJ,
          RTRIM(ISNULL(fdSupir, '')) AS fdSupir,
          RTRIM(ISNULL(fdCarID, '')) AS fdCarID
        FROM tbDelivery WITH (NOLOCK)
        WHERE fdSJDate >= '2023-01-01'
          AND (
            fdSJNo LIKE ${searchLike} 
            OR fdCustNameSJ LIKE ${searchLike} 
            OR fdSupir LIKE ${searchLike} 
            OR fdCarID LIKE ${searchLike}
          )
        ORDER BY fdSJDate DESC
      `.catch(() => [] as any[])) || []

      const existingSJNos = new Set((rows || []).map((r: any) => r.fdSJNo))
      for (const r of fallbackRows) {
        if (!existingSJNos.has(r.fdSJNo)) {
          rows.push(r)
        }
      }
    }

    const suggestions: DeliveryOrderSuggestion[] = []
    const seen = new Set<string>()
    const qLower = cleanQ.toLowerCase()

    for (const c of custRows || []) {
      if (c.fdCustName && !seen.has(`c:${c.fdCustName}`)) {
        seen.add(`c:${c.fdCustName}`)
        suggestions.push({
          type: 'customer',
          title: c.fdCustName,
          subtitle: `Customer (${c.fdCustCode || '—'})`,
          value: c.fdCustName,
        })
      }
    }

    for (const row of rows) {
      if (row.fdSJNo && row.fdSJNo.toLowerCase().includes(qLower) && !seen.has(`sj:${row.fdSJNo}`)) {
        seen.add(`sj:${row.fdSJNo}`)
        suggestions.push({
          type: 'sj',
          title: row.fdSJNo,
          subtitle: row.fdCustNameSJ ? `Customer: ${row.fdCustNameSJ}` : 'Nomor Surat Jalan',
          value: row.fdSJNo,
        })
      }
      if (row.fdCustNameSJ && row.fdCustNameSJ.toLowerCase().includes(qLower) && !seen.has(`c:${row.fdCustNameSJ}`)) {
        seen.add(`c:${row.fdCustNameSJ}`)
        suggestions.push({
          type: 'customer',
          title: row.fdCustNameSJ,
          subtitle: 'Penerima / Customer',
          value: row.fdCustNameSJ,
        })
      }
      if (row.fdSupir && row.fdSupir.toLowerCase().includes(qLower) && !seen.has(`s:${row.fdSupir}`)) {
        seen.add(`s:${row.fdSupir}`)
        suggestions.push({
          type: 'supir',
          title: row.fdSupir,
          subtitle: row.fdCarID ? `Plat: ${row.fdCarID}` : 'Nama Pengemudi / Supir',
          value: row.fdSupir,
        })
      }
      if (row.fdCarID && row.fdCarID.toLowerCase().includes(qLower) && !seen.has(`car:${row.fdCarID}`)) {
        seen.add(`car:${row.fdCarID}`)
        suggestions.push({
          type: 'car',
          title: row.fdCarID,
          subtitle: row.fdSupir ? `Supir: ${row.fdSupir}` : 'Plat Nomor Kendaraan',
          value: row.fdCarID,
        })
      }
      if (suggestions.length >= 10) break
    }

    const result = suggestions.slice(0, 10)
    suggestionCache.set(cacheKey, result)
    return result
  } catch {
    return []
  }
}

/**
 * Mengambil daftar alamat tujuan pengiriman customer dari tbCustomerPengiriman
 * berdasarkan key fdCustCode.
 */
export async function getCustomerDestinations(custCode: string): Promise<CustomerDestination[]> {
  if (!custCode || !custCode.trim()) return []
  const cleanCustCode = custCode.trim()

  const list = await prisma.$queryRaw<any[]>`
    SELECT 
      RTRIM(fdCustCode) AS fdCustCode,
      RTRIM(fdID) AS fdID,
      RTRIM(fdContact) AS fdContact,
      RTRIM(fdHP) AS fdHP,
      RTRIM(fdTelp) AS fdTelp,
      RTRIM(fdEmail) AS fdEmail,
      RTRIM(fdAddr) AS fdAddr,
      RTRIM(fdCity) AS fdCity,
      ISNULL(fdAktif, 0) AS fdAktif
    FROM tbCustomerPengiriman WITH (NOLOCK)
    WHERE fdCustCode = ${cleanCustCode}
    ORDER BY ISNULL(fdAktif, 0) DESC, fdID ASC
  `.catch(() => [])

  return (list || []).map((item) => ({
    fdCustCode: item.fdCustCode ? String(item.fdCustCode).trim() : cleanCustCode,
    fdID: item.fdID ? String(item.fdID).trim() : '01',
    fdContact: item.fdContact ? String(item.fdContact).trim() : null,
    fdHP: item.fdHP ? String(item.fdHP).trim() : null,
    fdTelp: item.fdTelp ? String(item.fdTelp).trim() : null,
    fdEmail: item.fdEmail ? String(item.fdEmail).trim() : null,
    fdAddr: item.fdAddr ? String(item.fdAddr).trim() : null,
    fdCity: item.fdCity ? String(item.fdCity).trim() : null,
    fdAktif: Number(item.fdAktif ?? 1),
  }))
}

/**
 * Menambahkan alamat tujuan pengiriman baru ke tbCustomerPengiriman
 * Auto-generate fdID 2-digit ('01', '02', ...)
 */
export async function createCustomerDestination(
  data: CreateCustomerDestinationDto,
  user: { username?: string; name?: string }
): Promise<CustomerDestination> {
  if (!data.fdCustCode || !data.fdCustCode.trim()) {
    throw new Error('Kode Customer (fdCustCode) wajib diisi!')
  }
  if (!data.fdAddr || !data.fdAddr.trim()) {
    throw new Error('Alamat Pengiriman (fdAddr) wajib diisi!')
  }

  const cleanCustCode = data.fdCustCode.trim()

  // Generate next fdID atomically
  const maxRes = await prisma.$queryRaw<any[]>`
    SELECT MAX(CAST(fdID AS INT)) AS maxId
    FROM tbCustomerPengiriman WITH (UPDLOCK, HOLDLOCK)
    WHERE fdCustCode = ${cleanCustCode} AND ISNUMERIC(fdID) = 1
  `.catch(() => [])

  const currentMax = Number(maxRes[0]?.maxId || 0)
  const nextId = String(currentMax + 1).padStart(2, '0')

  const now = new Date()
  const username = (user?.name || user?.username || 'SYSTEM').slice(0, 20)

  await prisma.$executeRaw`
    INSERT INTO tbCustomerPengiriman (
      fdCustCode, fdID, fdContact, fdHP, fdTelp, fdEmail, fdAddr, fdCity, fdAktif,
      fdCreatedBy, fdCreatedDate, fdUpdateBy, fdUpdateDate
    ) VALUES (
      ${cleanCustCode},
      ${nextId},
      ${data.fdContact ? data.fdContact.trim().slice(0, 100) : ''},
      ${data.fdHP ? data.fdHP.trim().slice(0, 25) : ''},
      ${data.fdTelp ? data.fdTelp.trim().slice(0, 25) : ''},
      ${data.fdEmail ? data.fdEmail.trim().slice(0, 50) : ''},
      ${data.fdAddr.trim().slice(0, 255)},
      ${data.fdCity ? data.fdCity.trim().slice(0, 100) : ''},
      1,
      ${username},
      ${now},
      ${username},
      ${now}
    )
  `

  return {
    fdCustCode: cleanCustCode,
    fdID: nextId,
    fdContact: data.fdContact?.trim() || null,
    fdHP: data.fdHP?.trim() || null,
    fdTelp: data.fdTelp?.trim() || null,
    fdEmail: data.fdEmail?.trim() || null,
    fdAddr: data.fdAddr.trim(),
    fdCity: data.fdCity?.trim() || null,
    fdAktif: 1,
  }
}

/**
 * Mengambil data Instruksi Khusus Pelanggan (Permintaan Pengiriman CS)
 * dari view qr_OrderDelivey berdasarkan fdListCode.
 */
export async function getOrderDeliveryByListCode(listCode: string): Promise<OrderDeliveryItem | null> {
  if (!listCode || !listCode.trim()) return null
  const cleanListCode = listCode.trim()

  const rows = await prisma.$queryRaw<any[]>`
    SELECT TOP 1 * FROM qr_OrderDelivey WITH (NOLOCK) WHERE fdListCode = ${cleanListCode}
  `.catch(() => [])

  const odRaw = rows[0] || null
  if (!odRaw) return null

  const hasContent = Boolean(
    odRaw.fdTglKirim ||
    (odRaw.fdNamaPemberiOrder && String(odRaw.fdNamaPemberiOrder).trim()) ||
    (odRaw.fdKeterangan && String(odRaw.fdKeterangan).trim()) ||
    (odRaw.fdAlamatKirim && String(odRaw.fdAlamatKirim).trim()) ||
    odRaw.fdJenisPembayaran !== null ||
    (odRaw.fdExpID && String(odRaw.fdExpID).trim()) ||
    (odRaw.fdExpName && String(odRaw.fdExpName).trim()) ||
    (odRaw.fdContact && String(odRaw.fdContact).trim()) ||
    (odRaw.fdCity && String(odRaw.fdCity).trim()) ||
    (odRaw.fdTelp && String(odRaw.fdTelp).trim()) ||
    (odRaw.fdMobile && String(odRaw.fdMobile).trim())
  )

  if (!hasContent) return null

  const paymentCode = odRaw.fdJenisPembayaran !== null ? Number(odRaw.fdJenisPembayaran) : null
  let paymentLabel: string | null = null
  if (paymentCode === 1) paymentLabel = 'COD'
  else if (paymentCode === 2) paymentLabel = 'TRANSFER'
  else if (paymentCode === 3) paymentLabel = 'DITUNDA KIRIM DAHULU'

  return {
    fdTglKirim: odRaw.fdTglKirim ? new Date(odRaw.fdTglKirim).toISOString() : null,
    fdNamaPemberiOrder: odRaw.fdNamaPemberiOrder ? String(odRaw.fdNamaPemberiOrder).trim() : null,
    fdKeterangan: odRaw.fdKeterangan ? String(odRaw.fdKeterangan).trim() : null,
    fdJenisPembayaran: paymentCode,
    fdJenisPembayaranLabel: paymentLabel,
    fdTglTransfer: odRaw.fdTglTransfer ? new Date(odRaw.fdTglTransfer).toISOString() : null,
    fdAlamatKirim: odRaw.fdAlamatKirim ? String(odRaw.fdAlamatKirim).trim() : null,
    fdExpID: odRaw.fdExpID ? String(odRaw.fdExpID).trim() : null,
    fdExpName: odRaw.fdExpName ? String(odRaw.fdExpName).trim() : null,
    fdExpAddr: odRaw.fdExpAddr1 ? String(odRaw.fdExpAddr1).trim() : null,
    fdEksBayar: odRaw.fdEksBayar !== null ? Number(odRaw.fdEksBayar) : null,
    fdContact: odRaw.fdContact ? String(odRaw.fdContact).trim() : null,
    fdCity: odRaw.fdCity ? String(odRaw.fdCity).trim() : null,
    fdTelp: odRaw.fdTelp ? String(odRaw.fdTelp).trim() : null,
    fdMobile: odRaw.fdMobile ? String(odRaw.fdMobile).trim() : null,
  }
}

/**
 * Mengambil data monitoring surat jalan yang belum terkirim (fdSent = 0 atau NULL).
 * Menghitung aging, status overdue, dan metrik KPI.
 */
export async function getDeliveryMonitoring(
  query: Record<string, string | undefined>
): Promise<DeliveryMonitoringResponse> {
  const page = Math.max(1, Number(query.page || 1))
  const limit = Math.max(1, Math.min(500, Number(query.limit || 50)))
  const skip = (page - 1) * limit

  // Default: dari awal tahun 2026 jika tidak dispesifikasikan
  const startDate = query.startDate?.trim() || '2026-01-01'
  const endDate = query.endDate?.trim() || ''

  const search = query.search?.trim() || ''
  const aging = query.aging?.trim() || 'all' // all, today, 1-2, 3-5, 6-7, >7
  const status = query.status?.trim() || 'all' // all, overdue, ontime
  const listType = query.listType?.trim() || 'all' // all, 1, 2
  const branch = query.branch?.trim() || ''
  const sortBy = query.sortBy?.trim() || 'fdSJDate'
  const sortOrder = query.sortOrder?.trim()?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

  // Build SQL filters
  const conditions: string[] = ['(d.fdSent = 0 OR d.fdSent IS NULL)']

  if (startDate) {
    const cleanStart = startDate.replace(/[^0-9-]/g, '')
    if (cleanStart) conditions.push(`d.fdSJDate >= '${cleanStart}'`)
  }

  if (endDate) {
    const cleanEnd = endDate.replace(/[^0-9-]/g, '')
    if (cleanEnd) conditions.push(`d.fdSJDate <= '${cleanEnd} 23:59:59'`)
  }

  if (listType === '1' || listType === '2') {
    conditions.push(`d.fdListType = ${listType}`)
  }

  if (branch) {
    const cleanBranch = branch.replace(/[^a-zA-Z0-9]/g, '')
    if (cleanBranch) {
      conditions.push(`(d.fdSJNo LIKE '${cleanBranch}-%' OR d.fdBranchCode = '${cleanBranch}')`)
    }
  }

  if (status === 'overdue') {
    conditions.push(`d.fdEstimasi < CAST(GETDATE() AS DATE)`)
  } else if (status === 'ontime') {
    conditions.push(`(d.fdEstimasi IS NULL OR d.fdEstimasi >= CAST(GETDATE() AS DATE))`)
  }

  if (aging === 'today') {
    conditions.push(`DATEDIFF(day, d.fdSJDate, GETDATE()) <= 0`)
  } else if (aging === '1-2') {
    conditions.push(`DATEDIFF(day, d.fdSJDate, GETDATE()) BETWEEN 1 AND 2`)
  } else if (aging === '3-5') {
    conditions.push(`DATEDIFF(day, d.fdSJDate, GETDATE()) BETWEEN 3 AND 5`)
  } else if (aging === '6-7') {
    conditions.push(`DATEDIFF(day, d.fdSJDate, GETDATE()) BETWEEN 6 AND 7`)
  } else if (aging === '>7') {
    conditions.push(`DATEDIFF(day, d.fdSJDate, GETDATE()) > 7`)
  }

  if (search) {
    const cleanSearch = search.replace(/'/g, "''")
    conditions.push(`(
      d.fdSJNo LIKE '%${cleanSearch}%' OR 
      d.fdCustNameSJ LIKE '%${cleanSearch}%' OR 
      c.fdCustName LIKE '%${cleanSearch}%' OR 
      d.fdCustCode LIKE '%${cleanSearch}%' OR 
      d.fdListCode LIKE '%${cleanSearch}%' OR 
      e.fdMarkingCode LIKE '%${cleanSearch}%' OR 
      e.fdMarkingNo LIKE '%${cleanSearch}%' OR 
      d.fdSupir LIKE '%${cleanSearch}%' OR 
      d.fdCarID LIKE '%${cleanSearch}%' OR
      d.fdDescr LIKE '%${cleanSearch}%'
    )`)
  }

  const whereClause = conditions.join(' AND ')

  // Valid sort column mapping
  let orderColumn = 'd.fdSJDate'
  if (sortBy === 'agingDays') orderColumn = 'DATEDIFF(day, d.fdSJDate, GETDATE())'
  else if (sortBy === 'fdEstimasi') orderColumn = 'd.fdEstimasi'
  else if (sortBy === 'fdSJNo') orderColumn = 'd.fdSJNo'
  else if (sortBy === 'fdCustName') orderColumn = 'ISNULL(c.fdCustName, d.fdCustNameSJ)'
  else if (sortBy === 'fdSupir') orderColumn = 'd.fdSupir'
  else if (sortBy === 'fdJmlPackSJ') orderColumn = 'd.fdJmlPackSJ'
  else if (sortBy === 'fdJmlBeratSJ') orderColumn = 'd.fdJmlBeratSJ'

  // KPI query (dihitung berbasis rentang tanggal dasar dan cabang agar distributor ringkasan selalu utuh)
  const baseKpiConditions: string[] = ['(d.fdSent = 0 OR d.fdSent IS NULL)']
  if (startDate) {
    const cleanStart = startDate.replace(/[^0-9-]/g, '')
    if (cleanStart) baseKpiConditions.push(`d.fdSJDate >= '${cleanStart}'`)
  }
  if (endDate) {
    const cleanEnd = endDate.replace(/[^0-9-]/g, '')
    if (cleanEnd) baseKpiConditions.push(`d.fdSJDate <= '${cleanEnd} 23:59:59'`)
  }
  if (branch) {
    const cleanBranch = branch.replace(/[^a-zA-Z0-9]/g, '')
    if (cleanBranch) baseKpiConditions.push(`(d.fdSJNo LIKE '${cleanBranch}-%' OR d.fdBranchCode = '${cleanBranch}')`)
  }
  const baseKpiWhere = baseKpiConditions.join(' AND ')

  const kpiSql = `
    SELECT 
      COUNT(*) as totalPending,
      SUM(CASE WHEN d.fdEstimasi < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) as overdueCount,
      SUM(CASE WHEN DATEDIFF(day, d.fdSJDate, GETDATE()) <= 0 THEN 1 ELSE 0 END) as todayCount,
      SUM(CASE WHEN DATEDIFF(day, d.fdSJDate, GETDATE()) BETWEEN 1 AND 2 THEN 1 ELSE 0 END) as aging1to2Count,
      SUM(CASE WHEN DATEDIFF(day, d.fdSJDate, GETDATE()) BETWEEN 3 AND 5 THEN 1 ELSE 0 END) as aging3to5Count,
      SUM(CASE WHEN DATEDIFF(day, d.fdSJDate, GETDATE()) BETWEEN 6 AND 7 THEN 1 ELSE 0 END) as aging6to7Count,
      SUM(CASE WHEN DATEDIFF(day, d.fdSJDate, GETDATE()) > 7 THEN 1 ELSE 0 END) as agingOver7Count,
      SUM(CASE WHEN d.fdListType = 1 THEN 1 ELSE 0 END) as airCount,
      SUM(CASE WHEN d.fdListType = 2 THEN 1 ELSE 0 END) as seaCount,
      SUM(ISNULL(d.fdJmlPackSJ, 0)) as totalPackages,
      SUM(ISNULL(d.fdJmlBeratSJ, 0)) as totalWeight
    FROM tbDelivery d WITH (NOLOCK)
    WHERE ${baseKpiWhere}
  `

  const countSql = `
    SELECT COUNT(*) as filteredTotal
    FROM tbDelivery d WITH (NOLOCK)
    LEFT JOIN tbCustomers c WITH (NOLOCK) ON d.fdCustCode = c.fdCustCode
    LEFT JOIN tbEntryList e WITH (NOLOCK) ON d.fdListCode = e.fdListCode
    WHERE ${whereClause}
  `

  const dataSql = `
    SELECT 
      d.fdSJNo,
      d.fdSJDate,
      d.fdEstimasi,
      d.fdSent,
      d.fdSndDate,
      RTRIM(d.fdCarID) AS fdCarID,
      RTRIM(d.fdSupir) AS fdSupir,
      RTRIM(d.fdTelpSupir) AS fdTelpSupir,
      RTRIM(d.fdCustCode) AS fdCustCode,
      RTRIM(ISNULL(c.fdCustName, d.fdCustNameSJ)) AS fdCustName,
      RTRIM(d.fdCustNameSJ) AS fdCustNameSJ,
      RTRIM(d.fdListCode) AS fdListCode,
      d.fdListType,
      ISNULL(d.fdJmlPackSJ, 0) AS fdJmlPackSJ,
      RTRIM(d.fdSatuan) AS fdSatuan,
      ISNULL(d.fdJmlBeratSJ, 0) AS fdJmlBeratSJ,
      RTRIM(d.fdDescr) AS fdDescr,
      d.fdPrint,
      d.fdPrintDate,
      d.fdGive,
      d.fdGiveDate,
      RTRIM(d.fdAddr) AS fdAddr,
      RTRIM(d.fdCity) AS fdCity,
      RTRIM(d.fdContact) AS fdContact,
      RTRIM(d.fdHp) AS fdHp,
      RTRIM(d.fdTelp) AS fdTelp,
      RTRIM(e.fdMarkingCode) AS fdMarkingCode,
      RTRIM(e.fdMarkingNo) AS fdMarkingNo,
      ISNULL(e.fdM3, 0) AS fdM3,
      DATEDIFF(day, d.fdSJDate, GETDATE()) AS agingDays,
      CASE WHEN d.fdEstimasi < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END AS isOverdue,
      CASE WHEN d.fdEstimasi < CAST(GETDATE() AS DATE) THEN DATEDIFF(day, d.fdEstimasi, GETDATE()) ELSE 0 END AS overdueDays
    FROM tbDelivery d WITH (NOLOCK)
    LEFT JOIN tbCustomers c WITH (NOLOCK) ON d.fdCustCode = c.fdCustCode
    LEFT JOIN tbEntryList e WITH (NOLOCK) ON d.fdListCode = e.fdListCode
    WHERE ${whereClause}
    ORDER BY ${orderColumn} ${sortOrder}, d.fdSJNo DESC
    OFFSET ${skip} ROWS FETCH NEXT ${limit} ROWS ONLY
  `

  const [kpiRows, countRows, rows] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(kpiSql).catch(() => [{}]),
    prisma.$queryRawUnsafe<any[]>(countSql).catch(() => [{ filteredTotal: 0 }]),
    prisma.$queryRawUnsafe<any[]>(dataSql).catch(() => []),
  ])

  const k = kpiRows[0] || {}
  const total = Number(countRows[0]?.filteredTotal || 0)
  const totalPages = Math.ceil(total / limit) || 1

  return {
    data: rows.map((r: any) => ({
      fdSJNo: String(r.fdSJNo || '').trim(),
      fdSJDate: r.fdSJDate ? new Date(r.fdSJDate).toISOString() : null,
      fdEstimasi: r.fdEstimasi ? new Date(r.fdEstimasi).toISOString() : null,
      fdSent: Number(r.fdSent || 0),
      fdSndDate: r.fdSndDate ? new Date(r.fdSndDate).toISOString() : null,
      fdCarID: String(r.fdCarID || '').trim(),
      fdSupir: String(r.fdSupir || '').trim(),
      fdTelpSupir: String(r.fdTelpSupir || '').trim(),
      fdCustCode: String(r.fdCustCode || '').trim(),
      fdCustName: String(r.fdCustName || r.fdCustNameSJ || '').trim(),
      fdCustNameSJ: String(r.fdCustNameSJ || '').trim(),
      fdListCode: String(r.fdListCode || '').trim(),
      fdListType: r.fdListType !== null ? Number(r.fdListType) : null,
      fdJmlPackSJ: Number(r.fdJmlPackSJ || 0),
      fdSatuan: String(r.fdSatuan || '').trim(),
      fdJmlBeratSJ: Number(r.fdJmlBeratSJ || 0),
      fdDescr: String(r.fdDescr || '').trim(),
      fdPrint: Number(r.fdPrint || 0),
      fdPrintDate: r.fdPrintDate ? new Date(r.fdPrintDate).toISOString() : null,
      fdGive: Number(r.fdGive || 0),
      fdGiveDate: r.fdGiveDate ? new Date(r.fdGiveDate).toISOString() : null,
      fdAddr: String(r.fdAddr || '').trim(),
      fdCity: String(r.fdCity || '').trim(),
      fdContact: String(r.fdContact || '').trim(),
      fdHp: String(r.fdHp || '').trim(),
      fdTelp: String(r.fdTelp || '').trim(),
      fdMarkingCode: String(r.fdMarkingCode || '').trim(),
      fdMarkingNo: String(r.fdMarkingNo || '').trim(),
      fdM3: Number(r.fdM3 || 0),
      agingDays: Number(r.agingDays || 0),
      isOverdue: Boolean(r.isOverdue),
      overdueDays: Number(r.overdueDays || 0),
    })),
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    kpis: {
      totalPending: Number(k.totalPending || 0),
      overdueCount: Number(k.overdueCount || 0),
      todayCount: Number(k.todayCount || 0),
      aging1to2Count: Number(k.aging1to2Count || 0),
      aging3to5Count: Number(k.aging3to5Count || 0),
      aging6to7Count: Number(k.aging6to7Count || 0),
      agingOver7Count: Number(k.agingOver7Count || 0),
      airCount: Number(k.airCount || 0),
      seaCount: Number(k.seaCount || 0),
      totalPackages: Number(k.totalPackages || 0),
      totalWeight: Number(k.totalWeight || 0),
    },
  }
}

/**
 * Konfirmasi pengiriman Surat Jalan (fdSent = 1).
 * Mengadopsi form FoxPro frm_delivery_view_edit_2023.scx ("Isi Tanggal Konfirmasi").
 * Mendukung single maupun batch update (beberapa SJ sekaligus dengan driver & armada yang sama).
 */
export async function confirmDelivery(dto: ConfirmDeliveryDto, user: any) {
  if (!dto.sjNos || !Array.isArray(dto.sjNos) || dto.sjNos.length === 0) {
    throw new Error('Pilih setidaknya 1 Surat Jalan untuk dikonfirmasi')
  }
  if (!dto.fdSndDate) {
    throw new Error('Tanggal Kirim / Konfirmasi wajib diisi')
  }
  if (!dto.fdCarID || !dto.fdCarID.trim()) {
    throw new Error('Plat Mobil wajib dipilih')
  }
  if (!dto.fdSupir || !dto.fdSupir.trim()) {
    throw new Error('Nama Supir wajib diisi')
  }

  const sndDate = new Date(dto.fdSndDate)
  const carId = dto.fdCarID.trim().slice(0, 10)
  const supir = dto.fdSupir.trim().slice(0, 35)
  const telpSupir = dto.fdTelpSupir ? dto.fdTelpSupir.trim().slice(0, 50) : null
  const emp = (user?.username || 'SYSTEM').slice(0, 10)
  const updatedBy = (user?.username || 'SYSTEM').slice(0, 25)

  const updatedSjNos: string[] = []
  const hasExpedition = Boolean(dto.expedition && dto.expedition.fdExpID && dto.expedition.fdExpID.trim())

  // Loop per baris agar trigger AFTER UPDATE (tgr_update_tbDelivery) tereksekusi akurat untuk setiap ListCode
  for (const sjNo of dto.sjNos) {
    const cleanSjNo = sjNo.trim()
    const rows = await prisma.$queryRaw<any[]>`
      SELECT TOP 1 fdSJNo, fdListCode, fdSent FROM tbDelivery WITH (NOLOCK) WHERE fdSJNo = ${cleanSjNo}
    `.catch(() => [])

    if (!rows || rows.length === 0) continue

    await prisma.$executeRaw`
      UPDATE tbDelivery
      SET 
        fdSent = 1,
        fdSndDate = ${sndDate},
        fdCarID = ${carId},
        fdSupir = ${supir},
        fdTelpSupir = ${telpSupir},
        fdUpdate = ${updatedBy},
        fdLoad = GETDATE()
      WHERE fdSJNo = ${cleanSjNo}
    `
    updatedSjNos.push(cleanSjNo)

    if (hasExpedition && dto.expedition) {
      const listCode = rows[0].fdListCode ? String(rows[0].fdListCode).trim() : ''
      if (listCode) {
        const expId = dto.expedition.fdExpID.trim().slice(0, 7)
        const resiExp = (dto.expedition.fdResiExp || '').trim().slice(0, 200)
        const currExp = (dto.expedition.fdCurrExp || 'RP.').trim().slice(0, 5)
        const totalExp = Number(dto.expedition.fdTotalExp || 0)
        const paid = Number(dto.expedition.fdPaid || 1) // 1 = Bayar Jkt, 2 = BT

        await prisma.$executeRaw`
          EXEC sp_tbExpIndo 
            @fdListCode = ${listCode}, 
            @fdExpID = ${expId}, 
            @fdResiExp = ${resiExp}, 
            @fdCurrExp = ${currExp}, 
            @fdTotalExp = ${totalExp}, 
            @fdEmp = ${emp}, 
            @fdPaid = ${paid}
        `.catch((err) => {
          logger.error(`Error executing sp_tbExpIndo for SJ ${cleanSjNo}: ${err.message}`)
        })
      }
    }
  }

  return {
    success: true,
    message: `Berhasil mengonfirmasi ${updatedSjNos.length} Surat Jalan`,
    count: updatedSjNos.length,
    updatedSjNos,
  }
}

/**
 * Mengambil daftar armada/kendaraan aktif dari tbKendaraan
 */
export async function getDeliveryVehicles() {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT RTRIM(fdCarID) AS fdCarID, RTRIM(fdSupir) AS fdSupir, RTRIM(fdNotel) AS fdNotel, ISNULL(fdStatus, 1) AS fdStatus
    FROM tbKendaraan WITH (NOLOCK)
    WHERE ISNULL(fdStatus, 1) = 1
    ORDER BY fdCarID ASC
  `.catch(() => [])

  return rows.map((v) => ({
    fdCarID: String(v.fdCarID || '').trim(),
    fdSupir: String(v.fdSupir || '').trim(),
    fdNotel: String(v.fdNotel || '').trim(),
    fdStatus: Number(v.fdStatus || 1),
  }))
}

/**
 * Mengambil master sub-carrier ekspedisi lokal dari tbExpedisi
 */
export async function getDeliveryExpeditions() {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT RTRIM(fdExpID) AS fdExpID, RTRIM(fdExpName) AS fdExpName, RTRIM(fdExpAddr1) AS fdExpAddr1, RTRIM(fdTelp) AS fdTelp
    FROM tbExpedisi WITH (NOLOCK)
    ORDER BY fdExpName ASC
  `.catch(() => [])

  return rows.map((e) => ({
    fdExpID: String(e.fdExpID || '').trim(),
    fdExpName: String(e.fdExpName || '').trim(),
    fdExpAddr1: String(e.fdExpAddr1 || '').trim(),
    fdTelp: String(e.fdTelp || '').trim(),
  }))
}

/**
 * Mengambil data tren konfirmasi surat jalan terkirim (fdSent = 1) berdasarkan batch tbDeliveryConfirm
 * serta mengagregasikannya dengan target estimasi kirim (tbDelivery.fdEstimasi)
 */
export async function getDeliveryConfirmTrends(days = 30) {
  const safeDays = Math.min(Math.max(Number(days) || 30, 7), 90)

  // 1. Kueri Komparasi Harian (Estimasi vs Realisasi Terkonfirmasi)
  const dailyRows = await prisma.$queryRawUnsafe<any[]>(`
    WITH Confirms AS (
      SELECT 
        fdTglPrintReport,
        fdListType,
        LAG(fdTglPrintReport) OVER (PARTITION BY fdListType ORDER BY fdTglPrintReport ASC) AS prevTglPrintReport
      FROM tbDeliveryConfirm WITH (NOLOCK)
      WHERE fdTglPrintReport >= DATEADD(day, -${safeDays}, GETDATE())
    ),
    BatchCounts AS (
      SELECT 
        CAST(c.fdTglPrintReport AS DATE) AS batchDate,
        c.fdTglPrintReport,
        c.fdListType,
        COUNT(d.fdSJNo) AS total_sj,
        ISNULL(SUM(d.fdJmlPackSJ), 0) AS total_pack,
        ISNULL(SUM(d.fdJmlBeratSJ), 0) AS total_weight
      FROM Confirms c
      LEFT JOIN tbDelivery d WITH (NOLOCK) ON (d.fdListType = c.fdListType OR (d.fdListType NOT IN (1, 2) AND c.fdListType = 2))
        AND d.fdSent = 1
        AND d.fdKembali > ISNULL(c.prevTglPrintReport, DATEADD(hour, -24, c.fdTglPrintReport))
        AND d.fdKembali <= c.fdTglPrintReport
      GROUP BY CAST(c.fdTglPrintReport AS DATE), c.fdTglPrintReport, c.fdListType
    ),
    DailyRealization AS (
      SELECT 
        batchDate,
        SUM(CASE WHEN fdListType = 1 THEN total_sj ELSE 0 END) AS realSjUdara,
        SUM(CASE WHEN fdListType = 2 THEN total_sj ELSE 0 END) AS realSjLaut,
        SUM(total_sj) AS totalRealSj,
        SUM(CASE WHEN fdListType = 1 THEN total_pack ELSE 0 END) AS realPackUdara,
        SUM(CASE WHEN fdListType = 2 THEN total_pack ELSE 0 END) AS realPackLaut,
        SUM(total_pack) AS totalRealPack,
        SUM(CASE WHEN fdListType = 1 THEN total_weight ELSE 0 END) AS realWeightUdara,
        SUM(CASE WHEN fdListType = 2 THEN total_weight ELSE 0 END) AS realWeightLaut,
        SUM(total_weight) AS totalRealWeight,
        COUNT(DISTINCT fdTglPrintReport) AS batchCount
      FROM BatchCounts
      GROUP BY batchDate
    ),
    DailyEstimation AS (
      SELECT 
        CAST(fdEstimasi AS DATE) AS estimasiDate,
        SUM(CASE WHEN fdListType = 1 THEN 1 ELSE 0 END) AS estSjUdara,
        SUM(CASE WHEN fdListType = 2 THEN 1 ELSE 0 END) AS estSjLaut,
        COUNT(*) AS totalEstSj,
        SUM(CASE WHEN fdListType = 1 THEN ISNULL(fdJmlPackSJ, 0) ELSE 0 END) AS estPackUdara,
        SUM(CASE WHEN fdListType = 2 THEN ISNULL(fdJmlPackSJ, 0) ELSE 0 END) AS estPackLaut,
        SUM(ISNULL(fdJmlPackSJ, 0)) AS totalEstPack,
        SUM(CASE WHEN fdListType = 1 THEN ISNULL(fdJmlBeratSJ, 0) ELSE 0 END) AS estWeightUdara,
        SUM(CASE WHEN fdListType = 2 THEN ISNULL(fdJmlBeratSJ, 0) ELSE 0 END) AS estWeightLaut,
        SUM(ISNULL(fdJmlBeratSJ, 0)) AS totalEstWeight,
        -- Analisis Pending H+1 (fdSent = fdEstimasi + 1 itu max)
        SUM(CASE 
          WHEN (fdSent = 0 OR fdSent IS NULL) 
           AND CAST(GETDATE() AS DATE) > DATEADD(day, 1, CAST(fdEstimasi AS DATE)) 
          THEN 1 ELSE 0 
        END) AS pendingOverdueSj,
        SUM(CASE 
          WHEN (fdSent = 0 OR fdSent IS NULL) 
           AND CAST(GETDATE() AS DATE) <= DATEADD(day, 1, CAST(fdEstimasi AS DATE)) 
          THEN 1 ELSE 0 
        END) AS pendingToleransiSj,
        SUM(CASE WHEN fdSent = 0 OR fdSent IS NULL THEN 1 ELSE 0 END) AS pendingSjTotal,
        SUM(CASE 
          WHEN fdSent = 1 
           AND (COALESCE(fdLoad, fdSndDate) IS NULL OR CAST(COALESCE(fdLoad, fdSndDate) AS DATE) <= DATEADD(day, 1, CAST(fdEstimasi AS DATE))) 
          THEN 1 ELSE 0 
        END) AS sentOnTimeSj,
        SUM(CASE 
          WHEN fdSent = 1 
           AND CAST(COALESCE(fdLoad, fdSndDate) AS DATE) > DATEADD(day, 1, CAST(fdEstimasi AS DATE)) 
          THEN 1 ELSE 0 
        END) AS sentLateSj,
        SUM(CASE 
          WHEN (fdSent = 0 OR fdSent IS NULL) 
           AND CAST(GETDATE() AS DATE) > DATEADD(day, 1, CAST(fdEstimasi AS DATE)) 
          THEN ISNULL(fdJmlPackSJ, 0) ELSE 0 
        END) AS pendingOverduePack,
        SUM(CASE 
          WHEN (fdSent = 0 OR fdSent IS NULL) 
           AND CAST(GETDATE() AS DATE) > DATEADD(day, 1, CAST(fdEstimasi AS DATE)) 
          THEN ISNULL(fdJmlBeratSJ, 0) ELSE 0 
        END) AS pendingOverdueWeight
      FROM tbDelivery WITH (NOLOCK)
      WHERE fdEstimasi >= DATEADD(day, -${safeDays}, GETDATE())
        AND fdEstimasi <= CAST(GETDATE() AS DATE)
      GROUP BY CAST(fdEstimasi AS DATE)
    )
    SELECT 
      COALESCE(r.batchDate, e.estimasiDate) AS logDate,
      ISNULL(r.realSjUdara, 0) AS realSjUdara,
      ISNULL(r.realSjLaut, 0) AS realSjLaut,
      ISNULL(r.totalRealSj, 0) AS totalRealSj,
      ISNULL(r.realPackUdara, 0) AS realPackUdara,
      ISNULL(r.realPackLaut, 0) AS realPackLaut,
      ISNULL(r.totalRealPack, 0) AS totalRealPack,
      ISNULL(r.realWeightUdara, 0) AS realWeightUdara,
      ISNULL(r.realWeightLaut, 0) AS realWeightLaut,
      ISNULL(r.totalRealWeight, 0) AS totalRealWeight,
      ISNULL(r.batchCount, 0) AS batchCount,
      ISNULL(e.estSjUdara, 0) AS estSjUdara,
      ISNULL(e.estSjLaut, 0) AS estSjLaut,
      ISNULL(e.totalEstSj, 0) AS totalEstSj,
      ISNULL(e.estPackUdara, 0) AS estPackUdara,
      ISNULL(e.estPackLaut, 0) AS estPackLaut,
      ISNULL(e.totalEstPack, 0) AS totalEstPack,
      ISNULL(e.estWeightUdara, 0) AS estWeightUdara,
      ISNULL(e.estWeightLaut, 0) AS estWeightLaut,
      ISNULL(e.totalEstWeight, 0) AS totalEstWeight,
      ISNULL(e.pendingOverdueSj, 0) AS pendingOverdueSj,
      ISNULL(e.pendingToleransiSj, 0) AS pendingToleransiSj,
      ISNULL(e.pendingSjTotal, 0) AS pendingSjTotal,
      ISNULL(e.sentOnTimeSj, 0) AS sentOnTimeSj,
      ISNULL(e.sentLateSj, 0) AS sentLateSj,
      ISNULL(e.pendingOverduePack, 0) AS pendingOverduePack,
      ISNULL(e.pendingOverdueWeight, 0) AS pendingOverdueWeight
    FROM DailyRealization r
    FULL OUTER JOIN DailyEstimation e ON r.batchDate = e.estimasiDate
    ORDER BY logDate ASC
  `).catch((err) => {
    logger.error(`Error querying getDeliveryConfirmTrends daily: ${err.message}`)
    return [] as any[]
  })

  // 2. Kueri Rincian per Batch Cetak FoxPro
  const batchRows = await prisma.$queryRawUnsafe<any[]>(`
    WITH Confirms AS (
      SELECT 
        fdTglPrintReport,
        fdListType,
        LAG(fdTglPrintReport) OVER (PARTITION BY fdListType ORDER BY fdTglPrintReport ASC) AS prevTglPrintReport
      FROM tbDeliveryConfirm WITH (NOLOCK)
      WHERE fdTglPrintReport >= DATEADD(day, -${safeDays}, GETDATE())
    ),
    BatchCounts AS (
      SELECT 
        c.fdTglPrintReport,
        c.fdListType,
        COUNT(d.fdSJNo) AS total_sj,
        ISNULL(SUM(d.fdJmlPackSJ), 0) AS total_pack,
        ISNULL(SUM(d.fdJmlBeratSJ), 0) AS total_weight
      FROM Confirms c
      LEFT JOIN tbDelivery d WITH (NOLOCK) ON (d.fdListType = c.fdListType OR (d.fdListType NOT IN (1, 2) AND c.fdListType = 2))
        AND d.fdSent = 1
        AND d.fdKembali > ISNULL(c.prevTglPrintReport, DATEADD(hour, -24, c.fdTglPrintReport))
        AND d.fdKembali <= c.fdTglPrintReport
      GROUP BY c.fdTglPrintReport, c.fdListType
    )
    SELECT 
      CAST(fdTglPrintReport AS DATE) AS batchDate,
      CASE WHEN DATEPART(hour, fdTglPrintReport) < 12 THEN 'Pagi' ELSE 'Sore' END AS batchSession,
      MAX(fdTglPrintReport) AS batchTimestamp,
      CONVERT(VARCHAR(5), MAX(fdTglPrintReport), 108) AS batchTime,
      SUM(CASE WHEN fdListType = 1 THEN total_sj ELSE 0 END) AS sjUdara,
      SUM(CASE WHEN fdListType = 2 THEN total_sj ELSE 0 END) AS sjLaut,
      SUM(total_sj) AS totalSj,
      SUM(CASE WHEN fdListType = 1 THEN total_pack ELSE 0 END) AS packUdara,
      SUM(CASE WHEN fdListType = 2 THEN total_pack ELSE 0 END) AS packLaut,
      SUM(total_pack) AS totalPack,
      SUM(CASE WHEN fdListType = 1 THEN total_weight ELSE 0 END) AS weightUdara,
      SUM(CASE WHEN fdListType = 2 THEN total_weight ELSE 0 END) AS weightLaut,
      SUM(total_weight) AS totalWeight
    FROM BatchCounts
    GROUP BY CAST(fdTglPrintReport AS DATE), CASE WHEN DATEPART(hour, fdTglPrintReport) < 12 THEN 'Pagi' ELSE 'Sore' END
    ORDER BY batchDate ASC, batchSession ASC
  `).catch((err) => {
    logger.error(`Error querying getDeliveryConfirmTrends batch: ${err.message}`)
    return [] as any[]
  })

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  // Format batches terlebih dahulu agar dapat diasosiasikan ke perbandingan harian
  const batches = batchRows.map((r) => {
    const d = new Date(r.batchDate)
    const day = String(d.getDate()).padStart(2, '0')
    const month = monthNames[d.getMonth()]
    const session = (r.batchSession || 'Pagi') as 'Pagi' | 'Sore'
    const batchTime = r.batchTime || (r.batchTimestamp ? new Date(r.batchTimestamp).toISOString().slice(11, 16) : '')
    const label = `${day} ${month} (${session}${batchTime ? ` ${batchTime}` : ''})`

    return {
      batchDate: r.batchDate ? new Date(r.batchDate).toISOString().slice(0, 10) : '',
      batchSession: session,
      batchTime,
      batchLabel: label,
      batchTimestamp: r.batchTimestamp ? new Date(r.batchTimestamp).toISOString() : '',
      sjUdara: Number(r.sjUdara || 0),
      sjLaut: Number(r.sjLaut || 0),
      totalSj: Number(r.totalSj || 0),
      packUdara: Number(r.packUdara || 0),
      packLaut: Number(r.packLaut || 0),
      totalPack: Number(r.totalPack || 0),
      weightUdara: Number(r.weightUdara || 0),
      weightLaut: Number(r.weightLaut || 0),
      totalWeight: Number(r.totalWeight || 0),
    }
  })

  // Format Daily Comparison dengan rincian batch & jam terintegrasi
  const dailyComparison = dailyRows.map((r) => {
    const d = new Date(r.logDate)
    const day = String(d.getDate()).padStart(2, '0')
    const month = monthNames[d.getMonth()]
    const dayName = dayNames[d.getDay()]
    const displayDate = `${day} ${month}`

    const totalRealSj = Number(r.totalRealSj || 0)
    const totalEstSj = Number(r.totalEstSj || 0)
    const achievementPct = totalEstSj > 0 ? Math.round((totalRealSj / totalEstSj) * 1000) / 10 : 0
    const diffSj = totalRealSj - totalEstSj
    const dateStr = r.logDate ? new Date(r.logDate).toISOString().slice(0, 10) : ''
    const dateBatches = batches.filter((b) => b.batchDate === dateStr)

    return {
      date: dateStr,
      displayDate,
      dayName,
      realSjUdara: Number(r.realSjUdara || 0),
      realSjLaut: Number(r.realSjLaut || 0),
      totalRealSj,
      realPackUdara: Number(r.realPackUdara || 0),
      realPackLaut: Number(r.realPackLaut || 0),
      totalRealPack: Number(r.totalRealPack || 0),
      realWeightUdara: Number(r.realWeightUdara || 0),
      realWeightLaut: Number(r.realWeightLaut || 0),
      totalRealWeight: Number(r.totalRealWeight || 0),
      batchCount: Number(r.batchCount || 0),
      batches: dateBatches,
      estSjUdara: Number(r.estSjUdara || 0),
      estSjLaut: Number(r.estSjLaut || 0),
      totalEstSj,
      estPackUdara: Number(r.estPackUdara || 0),
      estPackLaut: Number(r.estPackLaut || 0),
      totalEstPack: Number(r.totalEstPack || 0),
      estWeightUdara: Number(r.estWeightUdara || 0),
      estWeightLaut: Number(r.estWeightLaut || 0),
      totalEstWeight: Number(r.totalEstWeight || 0),
      achievementPct,
      diffSj,
      pendingOverdueSj: Number(r.pendingOverdueSj || 0),
      pendingToleransiSj: Number(r.pendingToleransiSj || 0),
      pendingSjTotal: Number(r.pendingSjTotal || 0),
      sentOnTimeSj: Number(r.sentOnTimeSj || 0),
      sentLateSj: Number(r.sentLateSj || 0),
      pendingOverduePack: Number(r.pendingOverduePack || 0),
      pendingOverdueWeight: Number(r.pendingOverdueWeight || 0),
    }
  })

  // Calculate summary metrics
  const totalBatches = batches.length
  const totalSjSent = batches.reduce((s, b) => s + b.totalSj, 0)
  const totalSjUdara = batches.reduce((s, b) => s + b.sjUdara, 0)
  const totalSjLaut = batches.reduce((s, b) => s + b.sjLaut, 0)
  const totalColySent = batches.reduce((s, b) => s + b.totalPack, 0)
  const totalWeightSent = Math.round(batches.reduce((s, b) => s + b.totalWeight, 0) * 10) / 10
  const avgSjPerBatch = totalBatches > 0 ? Math.round((totalSjSent / totalBatches) * 10) / 10 : 0

  const totalSjEstimated = dailyComparison.reduce((s, d) => s + d.totalEstSj, 0)
  const totalEstUdara = dailyComparison.reduce((s, d) => s + d.estSjUdara, 0)
  const totalEstLaut = dailyComparison.reduce((s, d) => s + d.estSjLaut, 0)
  const totalEstColy = dailyComparison.reduce((s, d) => s + d.totalEstPack, 0)
  const totalEstWeight = Math.round(dailyComparison.reduce((s, d) => s + d.totalEstWeight, 0) * 10) / 10
  const overallAchievementPct = totalSjEstimated > 0 ? Math.round((totalSjSent / totalSjEstimated) * 1000) / 10 : 0
  const diffTotalSj = totalSjSent - totalSjEstimated

  // Pending Overdue Global (> fdEstimasi + 1)
  const totalPendingOverdueSj = dailyComparison.reduce((s, d) => s + d.pendingOverdueSj, 0)
  const totalPendingSj = dailyComparison.reduce((s, d) => s + d.pendingSjTotal, 0)

  return {
    days: safeDays,
    summary: {
      totalBatches,
      totalSjSent,
      totalSjUdara,
      totalSjLaut,
      totalColySent,
      totalWeightSent,
      avgSjPerBatch,
      totalSjEstimated,
      totalEstUdara,
      totalEstLaut,
      totalEstColy,
      totalEstWeight,
      overallAchievementPct,
      diffTotalSj,
      totalPendingOverdueSj,
      totalPendingSj,
    },
    batches,
    dailyComparison,
  }
}

/**
 * Mengambil daftar surat jalan lengkap dari batch tbDeliveryConfirm tertentu
 * Menggunakan Stored Procedure resmi rpt_tbDelivery2023 @ListType, @date1, @date2
 * dengan detail moda (Udara/Laut), cabang pengirim, armada supir, dan koli/berat
 */
export async function getDeliveryConfirmBatchDetail(date: string, session: string) {
  if (!date) throw new Error('Parameter date diperlukan')
  const cleanDate = date.replace(/[^0-9-]/g, '')
  const cleanSession = session === 'Pagi' ? 'Pagi' : 'Sore'

  // 1. Dapatkan window waktu cetak dari tbDeliveryConfirm
  const batchConfirms: any[] = await prisma.$queryRawUnsafe<any[]>(`
    WITH Confirms AS (
      SELECT 
        fdTglPrintReport,
        CONVERT(VARCHAR(19), fdTglPrintReport, 120) AS strReport,
        CONVERT(VARCHAR(5), fdTglPrintReport, 108) AS batchTime,
        fdListType,
        LAG(CONVERT(VARCHAR(19), fdTglPrintReport, 120)) OVER (
          PARTITION BY fdListType ORDER BY fdTglPrintReport ASC
        ) AS prevStrReport
      FROM tbDeliveryConfirm WITH (NOLOCK)
      WHERE fdTglPrintReport >= DATEADD(day, -7, '${cleanDate}')
        AND fdTglPrintReport <= DATEADD(day, 1, '${cleanDate}')
    )
    SELECT *
    FROM Confirms
    WHERE CAST(fdTglPrintReport AS DATE) = '${cleanDate}'
      AND (CASE WHEN DATEPART(hour, fdTglPrintReport) < 12 THEN 'Pagi' ELSE 'Sore' END) = '${cleanSession}'
    ORDER BY fdListType ASC
  `).catch((err) => {
    logger.error(`Error querying batchConfirms: ${err.message}`)
    return [] as any[]
  })

  let allRows: any[] = []
  let batchTime = ''

  if (batchConfirms.length > 0) {
    for (const c of batchConfirms) {
      if (c.batchTime) batchTime = c.batchTime
      const date1 = c.prevStrReport || `${cleanDate} 00:00:00`
      const date2 = c.strReport
      try {
        const rows: any[] = await prisma.$queryRawUnsafe<any[]>(
          `EXEC rpt_tbDelivery2023 ${c.fdListType}, '${date1}', '${date2}'`
        )
        if (Array.isArray(rows)) {
          allRows.push(...rows)
        }
      } catch (err: any) {
        logger.error(`Error executing rpt_tbDelivery2023 for listType ${c.fdListType}: ${err.message}`)
      }
    }
  } else {
    // Fallback jika tidak ada record di tbDeliveryConfirm
    const startHour = cleanSession === 'Pagi' ? '00:00:00' : '12:00:00'
    const endHour = cleanSession === 'Pagi' ? '12:00:00' : '23:59:59'
    const fallbackRows: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        d.fdSJNo,
        d.fdSJDate,
        d.fdEstimasi,
        d.fdSent,
        d.fdSndDate,
        d.fdKembali,
        RTRIM(d.fdCarID) AS fdCarID,
        RTRIM(d.fdSupir) AS fdSupir,
        RTRIM(d.fdTelpSupir) AS fdTelpSupir,
        RTRIM(d.fdCustCode) AS fdCustCode,
        RTRIM(ISNULL(c_master.fdCustName, d.fdCustNameSJ)) AS fdCustName,
        RTRIM(d.fdListCode) AS fdListCode,
        d.fdListType,
        ISNULL(d.fdJmlPackSJ, 0) AS fdJmlPackSJ,
        RTRIM(d.fdSatuan) AS fdSatuan,
        ISNULL(d.fdJmlBeratSJ, 0) AS fdJmlBeratSJ,
        RTRIM(d.fdDescr) AS fdDescr,
        RTRIM(d.fdAddr) AS fdAddr1,
        RTRIM(e.fdMarkingCode) AS fdMarkingCode,
        RTRIM(e.fdMarkingNo) AS fdMarkingNo,
        ISNULL(NULLIF(RTRIM(b.fdBranchName), ''), 'GUANGZHOU') AS fdBranchName
      FROM tbDelivery d WITH (NOLOCK)
      LEFT JOIN tbCustomers c_master WITH (NOLOCK) ON d.fdCustCode = c_master.fdCustCode
      LEFT JOIN tbEntryList e WITH (NOLOCK) ON d.fdListCode = e.fdListCode
      LEFT JOIN tbCabang b WITH (NOLOCK) ON b.fdBranchCode = e.fdBranchCode
      WHERE d.fdSent = 1
        AND d.fdKembali >= '${cleanDate} ${startHour}'
        AND d.fdKembali <= '${cleanDate} ${endHour}'
      ORDER BY d.fdListType ASC, d.fdSJNo ASC
    `).catch(() => [])
    allRows = fallbackRows
  }

  // 2. Ambil informasi supir, estimasi & status billing dari tbDelivery & tbBilling untuk setiap SJ
  const driverMap = new Map<string, any>()
  if (allRows.length > 0) {
    const sjNos = allRows.map((r) => `'${String(r.fdSJNo).replace(/'/g, "''")}'`)
    const chunkSize = 200
    for (let i = 0; i < sjNos.length; i += chunkSize) {
      const chunk = sjNos.slice(i, i + chunkSize).join(',')
      try {
        const drivers: any[] = await prisma.$queryRawUnsafe(`
          SELECT 
            d.fdSJNo,
            RTRIM(d.fdSupir) AS fdSupir,
            RTRIM(d.fdTelpSupir) AS fdTelpSupir,
            RTRIM(d.fdSatuan) AS fdSatuan,
            RTRIM(d.fdAddr) AS fdAddr,
            RTRIM(d.fdCity) AS fdCity,
            d.fdEstimasi,
            d.fdKembali,
            ISNULL(b.isBilled, 0) AS isBilled,
            b.invNos AS invNos,
            b.invDates AS invDates,
            ISNULL(b.billCount, 0) AS billCount
          FROM tbDelivery d WITH (NOLOCK)
          OUTER APPLY (
            SELECT 
              CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END AS isBilled,
              COUNT(*) AS billCount,
              STRING_AGG(CAST(RTRIM(tb.fdInvNo) AS VARCHAR(MAX)), ', ') AS invNos,
              STRING_AGG(CAST(CONVERT(varchar(10), tb.fdInvDate, 120) AS VARCHAR(MAX)), ', ') AS invDates
            FROM tbBilling tb WITH (NOLOCK)
            WHERE RTRIM(tb.fdListCode) = RTRIM(d.fdListCode) AND d.fdListCode IS NOT NULL
          ) b
          WHERE d.fdSJNo IN (${chunk})
        `)
        for (const d of drivers) {
          driverMap.set(d.fdSJNo, d)
        }
      } catch (err: any) {
        logger.error(`Error querying driver info chunk: ${err.message}`)
      }
    }
  }

  // 3. Mapping data hasil SP dan data supir
  const items = allRows.map((r) => {
    const driver = driverMap.get(r.fdSJNo) || {}
    const listType = Number(r.fdListType || 0)
    const moda: 'Udara' | 'Laut' = listType === 1 ? 'Udara' : 'Laut'
    const branchName = r.fdBranchName?.trim() || 'GUANGZHOU'
    const sjParts = (r.fdSJNo || '').split('-')
    const branchCode = sjParts.length > 1 ? sjParts[0].trim() : 'GZ'

    return {
      fdSJNo: r.fdSJNo ? String(r.fdSJNo).trim() : '',
      fdSJDate: r.fdSJDate ? new Date(r.fdSJDate).toISOString().slice(0, 10) : '',
      fdEstimasi: driver.fdEstimasi
        ? new Date(driver.fdEstimasi).toISOString().slice(0, 10)
        : (r.fdEstimasi ? new Date(r.fdEstimasi).toISOString().slice(0, 10) : ''),
      fdSent: Number(r.fdSent || 1),
      fdSndDate: r.fdSndDate ? new Date(r.fdSndDate).toISOString() : '',
      fdKembali: driver.fdKembali
        ? new Date(driver.fdKembali).toISOString()
        : (r.fdKembali ? new Date(r.fdKembali).toISOString() : ''),
      fdCarID: r.fdCarID?.trim() || '-',
      fdSupir: driver.fdSupir || r.fdSupir || '-',
      fdTelpSupir: driver.fdTelpSupir || r.fdTelpSupir || '',
      fdCustCode: r.fdCustCode?.trim() || '',
      fdCustName: r.fdCustName?.trim() || '-',
      fdListCode: r.fdListCode?.trim() || '',
      fdListType: listType,
      moda,
      fdJmlPackSJ: Number(r.fdJmlPackSJ || 0),
      fdSatuan: driver.fdSatuan || r.fdSatuan || 'COLY',
      fdJmlBeratSJ: Number(Number(r.fdJmlBeratSJ || 0).toFixed(2)),
      fdDescr: r.fdDescr?.trim() || '',
      fdAddr: driver.fdAddr || r.fdAddr1?.trim() || r.fdAddr?.trim() || '',
      fdCity: driver.fdCity || r.fdCity?.trim() || '',
      fdMarkingCode: r.fdMarkingCode?.trim() || '-',
      fdMarkingNo: r.fdMarkingNo?.trim() || '',
      fdM3: Number(r.fdM3 || 0),
      branchCode,
      branchName,
      batchTime,
      isBilled: Boolean(driver.isBilled),
      invNos: driver.invNos ? String(driver.invNos).trim() : null,
      invDates: driver.invDates ? String(driver.invDates).trim() : null,
      billCount: Number(driver.billCount || 0),
    }
  })

  const totalSj = items.length
  const totalPack = items.reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0)
  const totalWeight = Math.round(items.reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10
  const sjUdara = items.filter((i) => i.moda === 'Udara').length
  const sjLaut = items.filter((i) => i.moda === 'Laut').length
  const packUdara = items.filter((i) => i.moda === 'Udara').reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0)
  const packLaut = items.filter((i) => i.moda === 'Laut').reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0)
  const weightUdara = Math.round(items.filter((i) => i.moda === 'Udara').reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10
  const weightLaut = Math.round(items.filter((i) => i.moda === 'Laut').reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10

  const billedSjCount = items.filter((i) => i.isBilled).length
  const unbilledSjCount = items.filter((i) => !i.isBilled).length

  const listCodeSet = new Set<string>()
  const billedListCodeSet = new Set<string>()
  const unbilledListCodeSet = new Set<string>()

  items.forEach((item) => {
    const lc = item.fdListCode || 'NO_LIST_CODE'
    listCodeSet.add(lc)
    if (item.isBilled) {
      billedListCodeSet.add(lc)
    } else {
      unbilledListCodeSet.add(lc)
    }
  })

  const billedPack = items.filter((i) => i.isBilled).reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0)
  const billedWeight = Math.round(items.filter((i) => i.isBilled).reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10
  const unbilledPack = items.filter((i) => !i.isBilled).reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0)
  const unbilledWeight = Math.round(items.filter((i) => !i.isBilled).reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10

  return {
    batchDate: cleanDate,
    batchSession: cleanSession,
    batchTime,
    totalSj,
    totalPack,
    totalWeight,
    sjUdara,
    sjLaut,
    packUdara,
    packLaut,
    weightUdara,
    weightLaut,
    billingRecap: {
      billedSjCount,
      unbilledSjCount,
      totalListCodes: listCodeSet.size,
      billedListCodeCount: billedListCodeSet.size,
      unbilledListCodeCount: unbilledListCodeSet.size,
      billedPack,
      billedWeight,
      unbilledPack,
      unbilledWeight,
    },
    items,
  }
}

/**
 * Mengambil daftar rincian Surat Jalan berdasarkan tanggal fdEstimasi tertentu
 * Mengidentifikasi status pengiriman dengan toleransi H+1:
 * "fdSent = fdEstimasi + 1 itu max. Apabila lebih berarti pending."
 */
export async function getDeliveryEstimasiDetails(
  date: string,
  filterType: 'all' | 'overdue' | 'pending' | 'sent' = 'all'
) {
  if (!date) throw new Error('Parameter date diperlukan')
  const cleanDate = date.replace(/[^0-9-]/g, '')

  let statusFilterClause = ''
  if (filterType === 'overdue') {
    statusFilterClause = `AND (d.fdSent = 0 OR d.fdSent IS NULL) AND CAST(GETDATE() AS DATE) > DATEADD(day, 1, CAST(d.fdEstimasi AS DATE))`
  } else if (filterType === 'pending') {
    statusFilterClause = `AND (d.fdSent = 0 OR d.fdSent IS NULL)`
  } else if (filterType === 'sent') {
    statusFilterClause = `AND d.fdSent = 1`
  }

  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT 
      d.fdSJNo,
      CONVERT(varchar(10), d.fdSJDate, 120) AS fdSJDate,
      CONVERT(varchar(10), d.fdEstimasi, 120) AS fdEstimasi,
      CONVERT(varchar(10), DATEADD(day, 1, d.fdEstimasi), 120) AS maxToleranceDate,
      ISNULL(d.fdSent, 0) AS fdSent,
      CONVERT(varchar(19), d.fdLoad, 120) AS fdLoad,
      CONVERT(varchar(19), d.fdSndDate, 120) AS fdSndDate,
      CONVERT(varchar(19), d.fdKembali, 120) AS fdKembali,
      d.fdCustCode,
      RTRIM(ISNULL(c.fdCustName, d.fdCustNameSJ)) AS custName,
      RTRIM(d.fdListCode) AS fdListCode,
      RTRIM(COALESCE(el.fdMarkingCode, d.fdSJNo)) AS fdMarkingCode,
      RTRIM(el.fdMarkingNo) AS fdMarkingNo,
      ISNULL(d.fdJmlPackSJ, 0) AS fdJmlPackSJ,
      RTRIM(ISNULL(d.fdSatuan, 'COLI')) AS fdSatuan,
      ISNULL(d.fdJmlBeratSJ, 0) AS fdJmlBeratSJ,
      RTRIM(d.fdCarID) AS fdCarID,
      RTRIM(d.fdSupir) AS fdSupir,
      RTRIM(d.fdTelpSupir) AS fdTelpSupir,
      ISNULL(d.fdListType, 2) AS fdListType,
      DATEDIFF(day, DATEADD(day, 1, d.fdEstimasi), 
        CASE 
          WHEN d.fdSent = 1 THEN CAST(COALESCE(d.fdLoad, d.fdSndDate) AS DATE) 
          ELSE CAST(GETDATE() AS DATE) 
        END
      ) AS overdueDays,
      CASE 
        WHEN (d.fdSent = 0 OR d.fdSent IS NULL) AND CAST(GETDATE() AS DATE) > DATEADD(day, 1, CAST(d.fdEstimasi AS DATE))
          THEN 1
        WHEN d.fdSent = 1 AND CAST(COALESCE(d.fdLoad, d.fdSndDate) AS DATE) > DATEADD(day, 1, CAST(d.fdEstimasi AS DATE))
          THEN 1
        ELSE 0
      END AS isOverdueHPlus1,
      CASE
        WHEN (d.fdSent = 0 OR d.fdSent IS NULL) AND CAST(GETDATE() AS DATE) > DATEADD(day, 1, CAST(d.fdEstimasi AS DATE))
          THEN 'PENDING_OVERDUE'
        WHEN (d.fdSent = 0 OR d.fdSent IS NULL)
          THEN 'PENDING_TOLERANCE'
        WHEN d.fdSent = 1 AND (COALESCE(d.fdLoad, d.fdSndDate) IS NULL OR CAST(COALESCE(d.fdLoad, d.fdSndDate) AS DATE) <= DATEADD(day, 1, CAST(d.fdEstimasi AS DATE)))
          THEN 'SENT_ONTIME'
        ELSE 'SENT_LATE'
      END AS statusLabel,
      RTRIM(d.fdTerima) AS fdTerima,
      RTRIM(d.fdDescr) AS fdDescr,
      ISNULL(b.isBilled, 0) AS isBilled,
      b.invNos AS invNos,
      b.invDates AS invDates,
      ISNULL(b.billCount, 0) AS billCount
    FROM tbDelivery d WITH (NOLOCK)
    LEFT JOIN tbCustomers c WITH (NOLOCK) ON d.fdCustCode = c.fdCustCode
    LEFT JOIN tbEntryList el WITH (NOLOCK) ON d.fdListCode = el.fdListCode
    OUTER APPLY (
      SELECT 
        CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END AS isBilled,
        COUNT(*) AS billCount,
        STRING_AGG(CAST(RTRIM(tb.fdInvNo) AS VARCHAR(MAX)), ', ') AS invNos,
        STRING_AGG(CAST(CONVERT(varchar(10), tb.fdInvDate, 120) AS VARCHAR(MAX)), ', ') AS invDates
      FROM tbBilling tb WITH (NOLOCK)
      WHERE RTRIM(tb.fdListCode) = RTRIM(d.fdListCode) AND d.fdListCode IS NOT NULL
    ) b
    WHERE CAST(d.fdEstimasi AS DATE) = '${cleanDate}'
      ${statusFilterClause}
    ORDER BY 
      CASE WHEN (d.fdSent = 0 OR d.fdSent IS NULL) THEN 0 ELSE 1 END ASC,
      CASE WHEN (d.fdSent = 0 OR d.fdSent IS NULL) AND CAST(GETDATE() AS DATE) > DATEADD(day, 1, CAST(d.fdEstimasi AS DATE)) THEN 0 ELSE 1 END ASC,
      d.fdSJNo ASC
  `)

  const items = rows.map((r) => {
    const isSent = Number(r.fdSent || 0) === 1
    // Apabila fdSent = 1, ambil data riil pengiriman dari fdLoad (fallback fdSndDate)
    const effectiveSentDate = isSent
      ? (r.fdLoad ? String(r.fdLoad).trim() : (r.fdSndDate ? String(r.fdSndDate).trim() : null))
      : (r.fdSndDate ? String(r.fdSndDate).trim() : null)

    return {
      fdSJNo: r.fdSJNo ? String(r.fdSJNo).trim() : '',
      fdSJDate: r.fdSJDate ? String(r.fdSJDate).trim() : null,
      fdEstimasi: r.fdEstimasi ? String(r.fdEstimasi).trim() : null,
      maxToleranceDate: r.maxToleranceDate ? String(r.maxToleranceDate).trim() : null,
      fdSent: Number(r.fdSent || 0),
      fdLoad: r.fdLoad ? String(r.fdLoad).trim() : null,
      fdSndDate: effectiveSentDate,
      fdKembali: r.fdKembali ? String(r.fdKembali).trim() : null,
      fdCustCode: r.fdCustCode ? String(r.fdCustCode).trim() : null,
      custName: r.custName ? String(r.custName).trim() : '—',
      fdListCode: r.fdListCode ? String(r.fdListCode).trim() : null,
      fdMarkingCode: r.fdMarkingCode ? String(r.fdMarkingCode).trim() : null,
      fdMarkingNo: r.fdMarkingNo ? String(r.fdMarkingNo).trim() : null,
      fdJmlPackSJ: Number(r.fdJmlPackSJ || 0),
      fdSatuan: r.fdSatuan ? String(r.fdSatuan).trim() : 'COLI',
      fdJmlBeratSJ: Number(r.fdJmlBeratSJ || 0),
      fdCarID: r.fdCarID ? String(r.fdCarID).trim() : null,
      fdSupir: r.fdSupir ? String(r.fdSupir).trim() : null,
      fdTelpSupir: r.fdTelpSupir ? String(r.fdTelpSupir).trim() : null,
      fdListType: Number(r.fdListType || 2),
      overdueDays: Math.max(0, Number(r.overdueDays || 0)),
      isOverdueHPlus1: Boolean(r.isOverdueHPlus1),
      statusLabel: String(r.statusLabel || 'PENDING_OVERDUE'),
      fdTerima: r.fdTerima ? String(r.fdTerima).trim() : null,
      fdDescr: r.fdDescr ? String(r.fdDescr).trim() : null,
      isBilled: Number(r.isBilled || 0) === 1,
      invNos: r.invNos ? String(r.invNos).trim() : null,
      invDates: r.invDates ? String(r.invDates).trim() : null,
      billCount: Number(r.billCount || 0),
    }
  })

  const totalSj = items.length
  const pendingOverdueCount = items.filter((i) => i.statusLabel === 'PENDING_OVERDUE').length
  const pendingToleranceCount = items.filter((i) => i.statusLabel === 'PENDING_TOLERANCE').length
  const sentCount = items.filter((i) => i.fdSent === 1).length
  const totalPack = items.reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0)
  const totalWeight = Math.round(items.reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10

  const billedSjCount = items.filter((i) => i.isBilled).length
  const unbilledSjCount = items.filter((i) => !i.isBilled).length

  const listCodeSet = new Set<string>()
  const billedListCodeSet = new Set<string>()
  const unbilledListCodeSet = new Set<string>()

  items.forEach((item) => {
    const lc = item.fdListCode || 'NO_LIST_CODE'
    listCodeSet.add(lc)
    if (item.isBilled) {
      billedListCodeSet.add(lc)
    } else {
      unbilledListCodeSet.add(lc)
    }
  })

  const billedPack = items.filter((i) => i.isBilled).reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0)
  const billedWeight = Math.round(items.filter((i) => i.isBilled).reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10
  const unbilledPack = items.filter((i) => !i.isBilled).reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0)
  const unbilledWeight = Math.round(items.filter((i) => !i.isBilled).reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10

  return {
    date: cleanDate,
    filterType,
    totalSj,
    pendingOverdueCount,
    pendingToleranceCount,
    sentCount,
    totalPack,
    totalWeight,
    billingRecap: {
      billedSjCount,
      unbilledSjCount,
      totalListCodes: listCodeSet.size,
      billedListCodeCount: billedListCodeSet.size,
      unbilledListCodeCount: unbilledListCodeSet.size,
      billedPack,
      billedWeight,
      unbilledPack,
      unbilledWeight,
    },
    items,
  }
}
