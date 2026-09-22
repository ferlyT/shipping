import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { generateMonthlyCashierId, getNextMasterCounterId } from './cashier.utils'
import {
  payUsingCustomerWallet,
  refundWalletPayment,
  overpaymentToCustomerWallet,
  adjustCustomerWallet,
} from '../wallet/wallet.service'
import type {
  CashierQuery,
  CreateCashierHeaderDto,
  CreateTempCashierHeaderDto,
  UpdateCashierHeaderDto,
  AddCashierRcvDto,
  BatchAllocateInvoiceDto,
  CashierStats,
} from './cashier.types'

// ─── MASTER DATA ──────────────────────────────────────────────────

export async function getMasterData() {
  const [banks, currencies, payTypes] = await Promise.all([
    prisma.tbBank.findMany({
      orderBy: { fdBankCode: 'asc' },
      select: { fdBankCode: true, fdBankName: true },
    }),
    prisma.tbMataUang.findMany({
      orderBy: { fdindex: 'asc' },
      select: { fdCCYCode: true, fdCCYName: true, fdCCYValue: true, CodeBCA: true },
    }),
    prisma.tbPayType.findMany({
      orderBy: { fdID: 'asc' },
      select: { fdID: true, fdPayName: true },
    }),
  ])

  return { banks, currencies, payTypes }
}

export async function getNextCashierNumber(type: 'OFFICIAL' | 'TEMPORARY', dateStr?: string) {
  const date = dateStr ? new Date(dateStr) : new Date()
  return await generateMonthlyCashierId(type, date)
}

// ─── TRANSAKSI KASIR RESMI (RR-) ──────────────────────────────────

export async function getCashiers(query: CashierQuery) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim()
  const custCode = query.custCode?.trim()
  const postStatus = query.postStatus?.toLowerCase()
  const startDate = query.startDate ? new Date(query.startDate) : undefined
  const endDate = query.endDate ? new Date(`${query.endDate}T23:59:59.999Z`) : undefined

  // Single source of truth: cari matched cust codes jika search berupa nama
  let matchedCustCodes: string[] = []
  if (search) {
    const custs = await prisma.tbCustomers.findMany({
      where: {
        OR: [
          { fdCustName: { contains: search } },
          { fdCustCode: { contains: search } },
        ],
      },
      select: { fdCustCode: true },
      take: 200,
    })
    matchedCustCodes = custs.map((c) => c.fdCustCode)
  }

  const where: any = {}

  if (search) {
    where.OR = [
      { fdCashierID: { contains: search } },
      { fdCashierXX: { contains: search } },
      ...(matchedCustCodes.length > 0 ? [{ fdCustCode: { in: matchedCustCodes } }] : []),
    ]
  }

  if (custCode) {
    where.fdCustCode = custCode
  }

  if (postStatus === 'open') {
    where.fdPost = 0
  } else if (postStatus === 'posted') {
    where.fdPost = 1
  }

  if (startDate || endDate) {
    where.fdCashierDate = {}
    if (startDate) where.fdCashierDate.gte = startDate
    if (endDate) where.fdCashierDate.lte = endDate
  }

  const [total, rows] = await Promise.all([
    prisma.tbCashier.count({ where }),
    prisma.tbCashier.findMany({
      where,
      skip,
      take,
      orderBy: { fdCashierDate: 'desc' },
      include: {
        customer: { select: { fdCustCode: true, fdCustName: true } },
        rcvList: {
          select: { fdAmount: true, fdCurValue: true },
        },
        detailList: {
          select: { fdTotal: true },
        },
      },
    }),
  ])

  // Single Source of Truth override & kalkulasi total uang masuk vs alokasi
  const items = rows.map((row) => {
    const totalRcv = row.rcvList.reduce(
      (acc, r) => acc + Number(r.fdAmount) * Number(r.fdCurValue),
      0
    )
    const totalDetail = row.detailList.reduce(
      (acc, d) => acc + Number(d.fdTotal),
      0
    )
    const balance = totalRcv - totalDetail

    return {
      fdCashierID: row.fdCashierID.trim(),
      fdCashierDate: row.fdCashierDate,
      fdCustCode: row.fdCustCode.trim(),
      fdCustName: row.customer?.fdCustName?.trim() || row.fdCustCode.trim(),
      fdEmpCode: row.fdEmpCode.trim(),
      fdPost: row.fdPost,
      fdCashierXX: row.fdCashierXX.trim(),
      totalRcv,
      totalDetail,
      balance,
      isBalanced: Math.abs(balance) < 0.01,
      rcvCount: row.rcvList.length,
      detailCount: row.detailList.length,
    }
  })

  return { items, meta: { ...meta, total, totalPages: Math.ceil(total / limit) } }
}

// ─── TRANSAKSI KASIR SEMENTARA (TR-) ──────────────────────────────

export async function getTempCashiers(query: CashierQuery) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim()
  const custCode = query.custCode?.trim()
  const isAttached = query.isAttached?.toLowerCase()
  const startDate = query.startDate ? new Date(query.startDate) : undefined
  const endDate = query.endDate ? new Date(`${query.endDate}T23:59:59.999Z`) : undefined

  let matchedCustCodes: string[] = []
  if (search) {
    const custs = await prisma.tbCustomers.findMany({
      where: {
        OR: [
          { fdCustName: { contains: search } },
          { fdCustCode: { contains: search } },
        ],
      },
      select: { fdCustCode: true },
      take: 200,
    })
    matchedCustCodes = custs.map((c) => c.fdCustCode)
  }

  const where: any = {}

  if (search) {
    where.OR = [
      { fdCashierID: { contains: search } },
      { fdDescr: { contains: search } },
      ...(matchedCustCodes.length > 0 ? [{ fdCustCode: { in: matchedCustCodes } }] : []),
    ]
  }

  if (custCode) {
    where.fdCustCode = custCode
  }

  if (isAttached === 'unattached') {
    where.fdPost = 0
  } else if (isAttached === 'attached') {
    where.fdPost = 1
  }

  if (startDate || endDate) {
    where.fdCashierDate = {}
    if (startDate) where.fdCashierDate.gte = startDate
    if (endDate) where.fdCashierDate.lte = endDate
  }

  const [total, rows] = await Promise.all([
    prisma.tb2Cashier.count({ where }),
    prisma.tb2Cashier.findMany({
      where,
      skip,
      take,
      orderBy: { fdCashierDate: 'desc' },
      include: {
        customer: { select: { fdCustCode: true, fdCustName: true } },
        rcvList: {
          select: { fdAmount: true, fdCurValue: true },
        },
        detailList: {
          select: { fdTotal: true },
        },
      },
    }),
  ])

  const items = rows.map((row) => {
    const totalRcv = row.rcvList.reduce(
      (acc, r) => acc + Number(r.fdAmount) * Number(r.fdCurValue),
      0
    )
    const totalDetail = row.detailList.reduce(
      (acc, d) => acc + Number(d.fdTotal),
      0
    )
    const balance = totalRcv - totalDetail

    return {
      fdCashierID: row.fdCashierID.trim(),
      fdCashierDate: row.fdCashierDate,
      fdCustCode: row.fdCustCode.trim(),
      fdCustName: row.customer?.fdCustName?.trim() || row.fdCustCode.trim(),
      fdEmpCode: row.fdEmpCode.trim(),
      fdPost: row.fdPost,
      fdDescr: row.fdDescr.trim(),
      totalRcv,
      totalDetail,
      balance,
      isBalanced: Math.abs(balance) < 0.01,
      rcvCount: row.rcvList.length,
      detailCount: row.detailList.length,
    }
  })

  return { items, meta: { ...meta, total, totalPages: Math.ceil(total / limit) } }
}

export async function getUnattachedTempCashiers(custCode?: string, search?: string) {
  const where: any = { fdPost: 0 }
  if (custCode) where.fdCustCode = custCode
  if (search) {
    where.OR = [
      { fdCashierID: { contains: search } },
      { fdDescr: { contains: search } },
    ]
  }

  const rows = await prisma.tb2Cashier.findMany({
    where,
    orderBy: { fdCashierDate: 'desc' },
    take: 100,
    include: {
      customer: { select: { fdCustCode: true, fdCustName: true } },
      rcvList: { select: { fdAmount: true, fdCurValue: true } },
    },
  })

  return rows.map((r) => {
    const totalRcv = r.rcvList.reduce(
      (acc, x) => acc + Number(x.fdAmount) * Number(x.fdCurValue),
      0
    )
    return {
      fdCashierID: r.fdCashierID.trim(),
      fdCashierDate: r.fdCashierDate,
      fdCustCode: r.fdCustCode.trim(),
      fdCustName: r.customer?.fdCustName?.trim() || r.fdCustCode.trim(),
      fdDescr: r.fdDescr.trim(),
      totalRcv,
    }
  })
}

// ─── DETAIL KASIR (OFFICIAL / TEMPORARY) ──────────────────────────

export async function getCashierDetail(rawId: string) {
  const cleanId = rawId.trim().toUpperCase()
  const isTemp = cleanId.startsWith('TR-')

  if (isTemp) {
    const header = await prisma.tb2Cashier.findUnique({
      where: { fdCashierID: cleanId },
      include: {
        customer: {
          select: {
            fdCustCode: true,
            fdCustName: true,
            fdContact: true,
            fdAddr1: true,
            fdCityName: true,
            fdTelp: true,
          },
        },
        rcvList: { orderBy: { fdID: 'asc' } },
        detailList: { orderBy: { fdID: 'asc' } },
      },
    })

    if (!header) throw new Error(`Kasir sementara '${cleanId}' tidak ditemukan`)

    const banks = await prisma.tbBank.findMany()
    const bankMap = new Map(banks.map((b) => [b.fdBankCode.trim(), b.fdBankName.trim()]))

    const rcvList = header.rcvList.map((r) => ({
      fdCashierID: r.fdCashierID.trim(),
      fdID: r.fdID.trim(),
      fdType: r.fdType.trim(),
      fdCCYCode: r.fdCCYCode.trim(),
      fdCurValue: Number(r.fdCurValue),
      fdAmount: Number(r.fdAmount),
      fdBankID1: r.fdBankID1.trim(),
      bank1Name: bankMap.get(r.fdBankID1.trim()) || r.fdBankID1.trim(),
      fdGiroNo: r.fdGiroNo.trim(),
      fdDate1: r.fdDate1,
      fdDate2: r.fdDate2,
      fdBankID2: r.fdBankID2.trim(),
      bank2Name: bankMap.get(r.fdBankID2.trim()) || r.fdBankID2.trim(),
    }))

    const detailList = header.detailList.map((d) => ({
      fdCashierID: d.fdCashierID.trim(),
      fdID: d.fdID.trim(),
      fdDate: d.fdDate,
      fdType: d.fdType.trim(),
      fdInvNo: d.fdInvNo.trim(),
      fdCCYCode: d.fdCCYCode.trim(),
      fdAmount: Number(d.fdAmount),
      fdCurValue: Number(d.fdCurValue),
      fdTotal: Number(d.fdTotal),
    }))

    const totalRcv = rcvList.reduce((acc, r) => acc + r.fdAmount * r.fdCurValue, 0)
    const totalDetail = detailList.reduce((acc, d) => acc + d.fdTotal, 0)
    const balance = totalRcv - totalDetail

    return {
      type: 'TEMPORARY' as const,
      header: {
        fdCashierID: header.fdCashierID.trim(),
        fdCashierDate: header.fdCashierDate,
        fdEmpCode: header.fdEmpCode.trim(),
        fdCustCode: header.fdCustCode.trim(),
        fdCustName: header.customer?.fdCustName?.trim() || header.fdCustCode.trim(),
        customer: header.customer,
        fdPost: header.fdPost,
        fdDescr: header.fdDescr.trim(),
        fdCashierXX: '',
      },
      rcvList,
      detailList,
      totalRcv,
      totalDetail,
      balance,
      isBalanced: Math.abs(balance) < 0.01,
      isLocked: header.fdPost === 1,
    }
  }

  // Kasir Resmi (RR-)
  const header = await prisma.tbCashier.findUnique({
    where: { fdCashierID: cleanId },
    include: {
      customer: {
        select: {
          fdCustCode: true,
          fdCustName: true,
          fdContact: true,
          fdAddr1: true,
          fdCityName: true,
          fdTelp: true,
        },
      },
      rcvList: { orderBy: { fdID: 'asc' } },
      detailList: { orderBy: { fdID: 'asc' } },
    },
  })

  if (!header) throw new Error(`Kasir resmi '${cleanId}' tidak ditemukan`)

  const banks = await prisma.tbBank.findMany()
  const bankMap = new Map(banks.map((b) => [b.fdBankCode.trim(), b.fdBankName.trim()]))

  const rcvList = header.rcvList.map((r) => ({
    fdCashierID: r.fdCashierID.trim(),
    fdID: r.fdID.trim(),
    fdType: r.fdType.trim(),
    fdCCYCode: r.fdCCYCode.trim(),
    fdCurValue: Number(r.fdCurValue),
    fdAmount: Number(r.fdAmount),
    fdBankID1: r.fdBankID1.trim(),
    bank1Name: bankMap.get(r.fdBankID1.trim()) || r.fdBankID1.trim(),
    fdGiroNo: r.fdGiroNo.trim(),
    fdDate1: r.fdDate1,
    fdDate2: r.fdDate2,
    fdBankID2: r.fdBankID2.trim(),
    bank2Name: bankMap.get(r.fdBankID2.trim()) || r.fdBankID2.trim(),
  }))

  const detailList = header.detailList.map((d) => ({
    fdCashierID: d.fdCashierID.trim(),
    fdID: d.fdID.trim(),
    fdDate: d.fdDate,
    fdType: d.fdType.trim(),
    fdInvNo: d.fdInvNo.trim(),
    fdCCYCode: d.fdCCYCode.trim(),
    fdAmount: Number(d.fdAmount),
    fdCurValue: Number(d.fdCurValue),
    fdTotal: Number(d.fdTotal),
  }))

  const totalRcv = rcvList.reduce((acc, r) => acc + r.fdAmount * r.fdCurValue, 0)
  const totalDetail = detailList.reduce((acc, d) => acc + d.fdTotal, 0)
  const balance = totalRcv - totalDetail

  return {
    type: 'OFFICIAL' as const,
    header: {
      fdCashierID: header.fdCashierID.trim(),
      fdCashierDate: header.fdCashierDate,
      fdEmpCode: header.fdEmpCode.trim(),
      fdCustCode: header.fdCustCode.trim(),
      fdCustName: header.customer?.fdCustName?.trim() || header.fdCustCode.trim(),
      customer: header.customer,
      fdPost: header.fdPost,
      fdDescr: '',
      fdCashierXX: header.fdCashierXX.trim(),
    },
    rcvList,
    detailList,
    totalRcv,
    totalDetail,
    balance,
    isBalanced: Math.abs(balance) < 0.01,
    isLocked: header.fdPost === 1,
  }
}

// ─── KPI METRICS ──────────────────────────────────────────────────

export async function getCashierStats(startDateStr?: string, endDateStr?: string): Promise<CashierStats> {
  const todayStart = startDateStr ? new Date(startDateStr) : new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayEnd = endDateStr ? new Date(`${endDateStr}T23:59:59.999Z`) : new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [todayOfficial, pendingTempCount] = await Promise.all([
    prisma.tbCashier.findMany({
      where: {
        fdCashierDate: { gte: todayStart, lte: todayEnd },
      },
      select: {
        rcvList: { select: { fdAmount: true, fdCurValue: true } },
        detailList: { select: { fdTotal: true } },
      },
    }),
    prisma.tb2Cashier.count({ where: { fdPost: 0 } }),
  ])

  let todayTotalRcv = 0
  let todayInvoiceAllocated = 0
  let unbalancedCount = 0

  for (const c of todayOfficial) {
    const rcv = c.rcvList.reduce((acc, x) => acc + Number(x.fdAmount) * Number(x.fdCurValue), 0)
    const dtl = c.detailList.reduce((acc, x) => acc + Number(x.fdTotal), 0)
    todayTotalRcv += rcv
    todayInvoiceAllocated += dtl
    if (Math.abs(rcv - dtl) >= 0.01) {
      unbalancedCount++
    }
  }

  return {
    todayTotalRcv,
    todayInvoiceAllocated,
    unbalancedCount,
    pendingTempCount,
  }
}

// ─── UNPAID INVOICES LOOKUP ───────────────────────────────────────

export async function getUnpaidInvoices(custCode: string, search?: string) {
  const cleanCust = custCode.trim()

  const where: any = {
    billing: { fdCustCode: cleanCust },
  }

  if (search) {
    where.fdInvNo = { contains: search.trim() }
  }

  const totals = await prisma.tbBillingTotal.findMany({
    where,
    orderBy: { fdInvNo: 'desc' },
    include: {
      billing: {
        select: {
          fdInvDate: true,
          fdDescr: true,
          fdCustCode: true,
        },
      },
    },
    take: 100,
  })

  // Filter faktur yang sisa tagihannya (fdJumlah - fdBayar) > 0
  return totals
    .map((t) => {
      const fdJumlah = Number(t.fdJumlah || 0)
      const fdBayar = Number(t.fdBayar || 0)
      const sisaTagihan = fdJumlah - fdBayar
      return {
        fdInvNo: t.fdInvNo.trim(),
        fdInvDate: t.billing?.fdInvDate,
        fdDescr: t.billing?.fdDescr?.trim() || '',
        fdCCYCode: t.fdCCYCode?.trim() || 'RP.',
        fdJumlah,
        fdBayar,
        sisaTagihan,
        isLunas: sisaTagihan <= 0,
      }
    })
    .filter((inv) => inv.sisaTagihan > 0.01)
}

// ─── TRANSAKSI CRUD HEADER ────────────────────────────────────────

export async function createCashier(payload: CreateCashierHeaderDto, user: { username?: string; empCode?: string }) {
  const empCode = user.empCode?.trim() || '0001'

  return await prisma.$transaction(async (tx) => {
    const officialId = await generateMonthlyCashierId('OFFICIAL', payload.cashierDate, tx)

    const created = await tx.tbCashier.create({
      data: {
        fdCashierID: officialId,
        fdCashierDate: new Date(payload.cashierDate),
        fdEmpCode: empCode.slice(0, 4),
        fdCustCode: payload.custCode.trim().slice(0, 7),
        fdPost: 0,
        fdCashierXX: payload.attachTempId ? payload.attachTempId.trim().slice(0, 20) : '',
      },
    })

    // Jika membuat kasir resmi dengan opsi attach kasir sementara
    if (payload.attachTempId) {
      const tempId = payload.attachTempId.trim()
      const tempHeader = await tx.tb2Cashier.findUnique({ where: { fdCashierID: tempId } })
      if (!tempHeader) throw new Error(`Kasir sementara '${tempId}' tidak ditemukan`)

      // Salin rcv
      const tempRcvs = await tx.tb2CashierRcv.findMany({ where: { fdCashierID: tempId } })
      for (const rcv of tempRcvs) {
        const nextRcvId = await getNextMasterCounterId('A', 'fdCRCounter', tx)
        await tx.tbCashierRcv.create({
          data: {
            fdCashierID: officialId,
            fdID: nextRcvId,
            fdType: rcv.fdType,
            fdCCYCode: rcv.fdCCYCode,
            fdCurValue: rcv.fdCurValue,
            fdAmount: rcv.fdAmount,
            fdBankID1: rcv.fdBankID1,
            fdGiroNo: rcv.fdGiroNo,
            fdDate1: rcv.fdDate1,
            fdDate2: rcv.fdDate2,
            fdBankID2: rcv.fdBankID2,
          },
        })
      }

      // Salin details
      const tempDetails = await tx.tb2CashierDetail.findMany({ where: { fdCashierID: tempId } })
      for (const dtl of tempDetails) {
        const nextDtlId = await getNextMasterCounterId('A', 'fdCDCounter', tx)
        await tx.tbCashierDetail.create({
          data: {
            fdCashierID: officialId,
            fdID: nextDtlId,
            fdDate: new Date(payload.cashierDate),
            fdType: dtl.fdType,
            fdInvNo: dtl.fdInvNo,
            fdCCYCode: dtl.fdCCYCode,
            fdAmount: dtl.fdAmount,
            fdCurValue: dtl.fdCurValue,
            fdTotal: dtl.fdTotal,
            fdInputDate: new Date(),
          },
        })
      }

      // Tandai kasir sementara sudah ter-attach
      await tx.tb2Cashier.update({
        where: { fdCashierID: tempId },
        data: { fdPost: 1 },
      })
    }

    return created
  })
}

export async function createTempCashier(payload: CreateTempCashierHeaderDto, user: { username?: string; empCode?: string }) {
  const empCode = user.empCode?.trim() || '0001'

  return await prisma.$transaction(async (tx) => {
    const tempId = await generateMonthlyCashierId('TEMPORARY', payload.cashierDate, tx)

    return await tx.tb2Cashier.create({
      data: {
        fdCashierID: tempId,
        fdCashierDate: new Date(payload.cashierDate),
        fdEmpCode: empCode.slice(0, 4),
        fdCustCode: payload.custCode.trim().slice(0, 7),
        fdPost: 0,
        fdDescr: (payload.descr || '').slice(0, 150),
        fdCheck: 0,
        fdEmpCode1: empCode.slice(0, 4),
      },
    })
  })
}

export async function updateCashierHeader(id: string, payload: UpdateCashierHeaderDto) {
  const cleanId = id.trim().toUpperCase()
  const isTemp = cleanId.startsWith('TR-')

  if (isTemp) {
    const existing = await prisma.tb2Cashier.findUnique({ where: { fdCashierID: cleanId } })
    if (!existing) throw new Error(`Kasir sementara '${cleanId}' tidak ditemukan`)
    if (existing.fdPost === 1) throw new Error('Kasir sementara yang sudah di-attach/diposting tidak dapat diubah')

    return await prisma.tb2Cashier.update({
      where: { fdCashierID: cleanId },
      data: {
        ...(payload.cashierDate ? { fdCashierDate: new Date(payload.cashierDate) } : {}),
        ...(payload.descr !== undefined ? { fdDescr: payload.descr.slice(0, 150) } : {}),
      },
    })
  }

  const existing = await prisma.tbCashier.findUnique({ where: { fdCashierID: cleanId } })
  if (!existing) throw new Error(`Kasir resmi '${cleanId}' tidak ditemukan`)
  if (existing.fdPost === 1) throw new Error('Kasir resmi yang sudah diposting ke akuntansi tidak dapat diubah')

  return await prisma.tbCashier.update({
    where: { fdCashierID: cleanId },
    data: {
      ...(payload.cashierDate ? { fdCashierDate: new Date(payload.cashierDate) } : {}),
    },
  })
}

export async function deleteCashier(id: string) {
  const cleanId = id.trim().toUpperCase()
  const isTemp = cleanId.startsWith('TR-')

  if (isTemp) {
    const existing = await prisma.tb2Cashier.findUnique({ where: { fdCashierID: cleanId } })
    if (!existing) throw new Error(`Kasir sementara '${cleanId}' tidak ditemukan`)
    if (existing.fdPost === 1) throw new Error('Kasir sementara yang sudah di-attach tidak dapat dihapus')

    return await prisma.$transaction(async (tx) => {
      await tx.tb2CashierDetail.deleteMany({ where: { fdCashierID: cleanId } })
      await tx.tb2CashierRcv.deleteMany({ where: { fdCashierID: cleanId } })
      return await tx.tb2Cashier.delete({ where: { fdCashierID: cleanId } })
    })
  }

  const existing = await prisma.tbCashier.findUnique({ where: { fdCashierID: cleanId } })
  if (!existing) throw new Error(`Kasir resmi '${cleanId}' tidak ditemukan`)
  if (existing.fdPost === 1) throw new Error('Kasir resmi yang sudah diposting tidak dapat dihapus')

  return await prisma.$transaction(async (tx) => {
    // Jika ada referensi temp receipt yang di-attach, buka kembali lock temp receipt
    if (existing.fdCashierXX?.trim()) {
      await tx.tb2Cashier.updateMany({
        where: { fdCashierID: existing.fdCashierXX.trim() },
        data: { fdPost: 0 },
      })
    }

    await tx.tbCashierDetail.deleteMany({ where: { fdCashierID: cleanId } })
    await tx.tbCashierRcv.deleteMany({ where: { fdCashierID: cleanId } })
    return await tx.tbCashier.delete({ where: { fdCashierID: cleanId } })
  })
}

// ─── TRANSAKSI PENERIMAAN UANG (RCV) ──────────────────────────────

export async function addCashierRcv(cashierId: string, payload: AddCashierRcvDto, createdBy = 'SYSTEM') {
  const cleanId = cashierId.trim().toUpperCase()
  const isTemp = cleanId.startsWith('TR-')
  const counterCode = isTemp ? 'B' : 'A'

  return await prisma.$transaction(async (tx) => {
    let custCode = ''
    if (isTemp) {
      const header = await tx.tb2Cashier.findUnique({ where: { fdCashierID: cleanId } })
      if (!header) throw new Error(`Kasir sementara '${cleanId}' tidak ditemukan`)
      if (header.fdPost === 1) throw new Error('Kasir sementara sudah di-attach, tidak dapat menambah uang masuk')
      custCode = header.fdCustCode?.trim() || ''
    } else {
      const header = await tx.tbCashier.findUnique({ where: { fdCashierID: cleanId } })
      if (!header) throw new Error(`Kasir resmi '${cleanId}' tidak ditemukan`)
      if (header.fdPost === 1) throw new Error('Kasir resmi sudah diposting, tidak dapat menambah uang masuk')
      custCode = header.fdCustCode?.trim() || ''
    }

    const typeNormalized = payload.type.trim().toUpperCase()

    // Jika metode bayar adalah WALLET, potong saldo deposit pelanggan
    if (typeNormalized === 'WALLET') {
      if (!custCode) {
        throw new Error('Pelanggan tidak valid pada transaksi kasir ini')
      }
      const totalDebit = payload.amount * (payload.currValue || 1.0)
      await payUsingCustomerWallet(custCode, totalDebit, cleanId, createdBy, tx)
    }

    const nextId = await getNextMasterCounterId(counterCode, 'fdCRCounter', tx)

    const rcvData = {
      fdCashierID: cleanId,
      fdID: nextId,
      fdType: typeNormalized.slice(0, 10),
      fdCCYCode: payload.ccyCode.trim().slice(0, 3),
      fdCurValue: payload.currValue,
      fdAmount: payload.amount,
      fdBankID1: (payload.bankId1 || '').trim().slice(0, 7),
      fdGiroNo: (payload.giroNo || '').trim().slice(0, 25),
      fdDate1: payload.giroDate ? new Date(payload.giroDate) : null,
      fdDate2: payload.validDate ? new Date(payload.validDate) : null,
      fdBankID2: (payload.bankId2 || '').trim().slice(0, 7),
    }

    if (isTemp) {
      return await tx.tb2CashierRcv.create({ data: rcvData })
    }
    return await tx.tbCashierRcv.create({ data: rcvData })
  })
}

export async function deleteCashierRcv(cashierId: string, rcvId: string, deletedBy = 'SYSTEM') {
  const cleanId = cashierId.trim().toUpperCase()
  const cleanRcvId = rcvId.trim()
  const isTemp = cleanId.startsWith('TR-')

  return await prisma.$transaction(async (tx) => {
    let custCode = ''
    if (isTemp) {
      const header = await tx.tb2Cashier.findUnique({ where: { fdCashierID: cleanId } })
      if (header?.fdPost === 1) throw new Error('Kasir sementara sudah terkunci')
      custCode = header?.fdCustCode?.trim() || ''

      const existingRcv = await tx.tb2CashierRcv.findUnique({
        where: { fdCashierID_fdID: { fdCashierID: cleanId, fdID: cleanRcvId } },
      })
      if (!existingRcv) throw new Error('Baris penerimaan uang tidak ditemukan')

      if (existingRcv.fdType?.trim().toUpperCase() === 'WALLET' && custCode) {
        const refundAmt = Number(existingRcv.fdAmount) * Number(existingRcv.fdCurValue || 1.0)
        await refundWalletPayment(custCode, refundAmt, cleanId, deletedBy, tx)
      }

      return await tx.tb2CashierRcv.delete({
        where: { fdCashierID_fdID: { fdCashierID: cleanId, fdID: cleanRcvId } },
      })
    }

    const header = await tx.tbCashier.findUnique({ where: { fdCashierID: cleanId } })
    if (header?.fdPost === 1) throw new Error('Kasir resmi sudah terkunci')
    custCode = header?.fdCustCode?.trim() || ''

    const existingRcv = await tx.tbCashierRcv.findUnique({
      where: { fdCashierID_fdID: { fdCashierID: cleanId, fdID: cleanRcvId } },
    })
    if (!existingRcv) throw new Error('Baris penerimaan uang tidak ditemukan')

    if (existingRcv.fdType?.trim().toUpperCase() === 'WALLET' && custCode) {
      const refundAmt = Number(existingRcv.fdAmount) * Number(existingRcv.fdCurValue || 1.0)
      await refundWalletPayment(custCode, refundAmt, cleanId, deletedBy, tx)
    }

    return await tx.tbCashierRcv.delete({
      where: { fdCashierID_fdID: { fdCashierID: cleanId, fdID: cleanRcvId } },
    })
  })
}

// ─── TRANSAKSI ALOKASI FAKTUR (DETAILS) ───────────────────────────

export async function batchAllocateInvoices(cashierId: string, payload: BatchAllocateInvoiceDto) {
  const cleanId = cashierId.trim().toUpperCase()
  const isTemp = cleanId.startsWith('TR-')
  const counterCode = isTemp ? 'B' : 'A'

  return await prisma.$transaction(async (tx) => {
    let cashierDate = new Date()

    if (isTemp) {
      const header = await tx.tb2Cashier.findUnique({ where: { fdCashierID: cleanId } })
      if (!header) throw new Error(`Kasir sementara '${cleanId}' tidak ditemukan`)
      if (header.fdPost === 1) throw new Error('Kasir sementara sudah terkunci')
      cashierDate = header.fdCashierDate
    } else {
      const header = await tx.tbCashier.findUnique({ where: { fdCashierID: cleanId } })
      if (!header) throw new Error(`Kasir resmi '${cleanId}' tidak ditemukan`)
      if (header.fdPost === 1) throw new Error('Kasir resmi sudah terkunci')
      cashierDate = header.fdCashierDate || new Date()
    }

    const createdRows = []
    for (const inv of payload.invoices) {
      const nextId = await getNextMasterCounterId(counterCode, 'fdCDCounter', tx)
      const ccy = (inv.ccyCode || 'RP.').trim().slice(0, 3)
      const currVal = inv.currValue || 1.0
      const total = inv.amount * currVal

      const dtlData = {
        fdCashierID: cleanId,
        fdID: nextId,
        fdDate: cashierDate,
        fdType: 'INVOICE',
        fdInvNo: inv.invNo.trim().slice(0, 20),
        fdCCYCode: ccy,
        fdAmount: inv.amount,
        fdCurValue: currVal,
        fdTotal: total,
      }

      if (isTemp) {
        const row = await tx.tb2CashierDetail.create({ data: dtlData })
        createdRows.push(row)
      } else {
        const row = await tx.tbCashierDetail.create({
          data: { ...dtlData, fdInputDate: new Date() },
        })
        createdRows.push(row)
      }
    }

    return createdRows
  })
}

export async function deleteCashierDetail(cashierId: string, detailId: string, deletedBy = 'SYSTEM') {
  const cleanId = cashierId.trim().toUpperCase()
  const cleanDtlId = detailId.trim()
  const isTemp = cleanId.startsWith('TR-')

  return await prisma.$transaction(async (tx) => {
    if (isTemp) {
      const header = await tx.tb2Cashier.findUnique({ where: { fdCashierID: cleanId } })
      if (header?.fdPost === 1) throw new Error('Kasir sementara sudah terkunci')
      const existing = await tx.tb2CashierDetail.findUnique({
        where: { fdCashierID_fdID: { fdCashierID: cleanId, fdID: cleanDtlId } },
      })
      if (!existing) throw new Error('Baris alokasi invoice tidak ditemukan')

      if (existing.fdType?.trim().toUpperCase() === 'DEPOSIT' && header?.fdCustCode) {
        await adjustCustomerWallet(
          {
            custCode: header.fdCustCode.trim(),
            direction: 'DEBIT',
            amount: Number(existing.fdTotal),
            reason: `Pembatalan alokasi deposit kasir ${cleanId}`,
          },
          deletedBy
        )
      }

      return await tx.tb2CashierDetail.delete({
        where: { fdCashierID_fdID: { fdCashierID: cleanId, fdID: cleanDtlId } },
      })
    }

    const header = await tx.tbCashier.findUnique({ where: { fdCashierID: cleanId } })
    if (header?.fdPost === 1) throw new Error('Kasir resmi sudah terkunci')
    const existing = await tx.tbCashierDetail.findUnique({
      where: { fdCashierID_fdID: { fdCashierID: cleanId, fdID: cleanDtlId } },
    })
    if (!existing) throw new Error('Baris alokasi invoice tidak ditemukan')

    if (existing.fdType?.trim().toUpperCase() === 'DEPOSIT' && header?.fdCustCode) {
      await adjustCustomerWallet(
        {
          custCode: header.fdCustCode.trim(),
          direction: 'DEBIT',
          amount: Number(existing.fdTotal),
          reason: `Pembatalan alokasi deposit kasir ${cleanId}`,
        },
        deletedBy
      )
    }

    return await tx.tbCashierDetail.delete({
      where: { fdCashierID_fdID: { fdCashierID: cleanId, fdID: cleanDtlId } },
    })
  })
}

/**
 * Mengalihkan surplus kasir (Uang Masuk > Total Faktur) ke Saldo Deposit Pelanggan
 * sehingga kasir mencapai Zero-Difference (Rp 0).
 */
export async function allocateOverpaymentToDeposit(
  cashierId: string,
  amount?: number,
  createdBy = 'SYSTEM'
) {
  const cleanId = cashierId.trim().toUpperCase()
  const isTemp = cleanId.startsWith('TR-')
  const counterCode = isTemp ? 'B' : 'A'

  return await prisma.$transaction(async (tx) => {
    let custCode = ''
    let cashierDate = new Date()

    if (isTemp) {
      const header = await tx.tb2Cashier.findUnique({
        where: { fdCashierID: cleanId },
        include: { rcvList: true, detailList: true },
      })
      if (!header) throw new Error(`Kasir sementara '${cleanId}' tidak ditemukan`)
      if (header.fdPost === 1) throw new Error('Kasir sementara sudah terkunci')
      custCode = header.fdCustCode.trim()
      cashierDate = header.fdCashierDate

      const totalRcv = header.rcvList.reduce(
        (acc, r) => acc + Number(r.fdAmount) * Number(r.fdCurValue),
        0
      )
      const totalDtl = header.detailList.reduce((acc, d) => acc + Number(d.fdTotal), 0)
      const surplus = totalRcv - totalDtl
      const targetAmount = amount && amount > 0 ? amount : surplus

      if (targetAmount <= 0) {
        throw new Error('Tidak ada kelebihan bayar untuk dialihkan ke deposit')
      }

      await overpaymentToCustomerWallet(custCode, targetAmount, cleanId, createdBy, tx)

      const nextId = await getNextMasterCounterId(counterCode, 'fdCDCounter', tx)
      return await tx.tb2CashierDetail.create({
        data: {
          fdCashierID: cleanId,
          fdID: nextId,
          fdDate: cashierDate,
          fdType: 'DEPOSIT',
          fdInvNo: 'DEPOSIT',
          fdCCYCode: 'RP.',
          fdAmount: targetAmount,
          fdCurValue: 1.0,
          fdTotal: targetAmount,
        },
      })
    } else {
      const header = await tx.tbCashier.findUnique({
        where: { fdCashierID: cleanId },
        include: { rcvList: true, detailList: true },
      })
      if (!header) throw new Error(`Kasir resmi '${cleanId}' tidak ditemukan`)
      if (header.fdPost === 1) throw new Error('Kasir resmi sudah terkunci')
      custCode = header.fdCustCode.trim()
      cashierDate = header.fdCashierDate || new Date()

      const totalRcv = header.rcvList.reduce(
        (acc, r) => acc + Number(r.fdAmount) * Number(r.fdCurValue),
        0
      )
      const totalDtl = header.detailList.reduce((acc, d) => acc + Number(d.fdTotal), 0)
      const surplus = totalRcv - totalDtl
      const targetAmount = amount && amount > 0 ? amount : surplus

      if (targetAmount <= 0) {
        throw new Error('Tidak ada kelebihan bayar untuk dialihkan ke deposit')
      }

      await overpaymentToCustomerWallet(custCode, targetAmount, cleanId, createdBy, tx)

      const nextId = await getNextMasterCounterId(counterCode, 'fdCDCounter', tx)
      return await tx.tbCashierDetail.create({
        data: {
          fdCashierID: cleanId,
          fdID: nextId,
          fdDate: cashierDate,
          fdType: 'DEPOSIT',
          fdInvNo: 'DEPOSIT',
          fdCCYCode: 'RP.',
          fdAmount: targetAmount,
          fdCurValue: 1.0,
          fdTotal: targetAmount,
          fdInputDate: new Date(),
        },
      })
    }
  })
}

// ─── PROSES ATTACH MANDIRI ────────────────────────────────────────

export async function attachTempReceipt(
  tempCashierId: string,
  officialDate: string,
  user: { username?: string; empCode?: string },
  descr?: string
) {
  const cleanTempId = tempCashierId.trim()

  return await prisma.$transaction(async (tx) => {
    const tempHeader = await tx.tb2Cashier.findUnique({ where: { fdCashierID: cleanTempId } })
    if (!tempHeader) throw new Error(`Kasir sementara '${cleanTempId}' tidak ditemukan`)
    if (tempHeader.fdPost === 1) throw new Error(`Kasir sementara '${cleanTempId}' sudah pernah di-attach`)

    const officialId = await generateMonthlyCashierId('OFFICIAL', officialDate, tx)
    const empCode = user.empCode?.trim() || '0001'

    const official = await tx.tbCashier.create({
      data: {
        fdCashierID: officialId,
        fdCashierDate: new Date(officialDate),
        fdEmpCode: empCode.slice(0, 4),
        fdCustCode: tempHeader.fdCustCode,
        fdPost: 0,
        fdCashierXX: cleanTempId,
      },
    })

    // Salin rcv
    const tempRcvs = await tx.tb2CashierRcv.findMany({ where: { fdCashierID: cleanTempId } })
    for (const rcv of tempRcvs) {
      const nextRcvId = await getNextMasterCounterId('A', 'fdCRCounter', tx)
      await tx.tbCashierRcv.create({
        data: {
          fdCashierID: officialId,
          fdID: nextRcvId,
          fdType: rcv.fdType,
          fdCCYCode: rcv.fdCCYCode,
          fdCurValue: rcv.fdCurValue,
          fdAmount: rcv.fdAmount,
          fdBankID1: rcv.fdBankID1,
          fdGiroNo: rcv.fdGiroNo,
          fdDate1: rcv.fdDate1,
          fdDate2: rcv.fdDate2,
          fdBankID2: rcv.fdBankID2,
        },
      })
    }

    // Salin details
    const tempDetails = await tx.tb2CashierDetail.findMany({ where: { fdCashierID: cleanTempId } })
    for (const dtl of tempDetails) {
      const nextDtlId = await getNextMasterCounterId('A', 'fdCDCounter', tx)
      await tx.tbCashierDetail.create({
        data: {
          fdCashierID: officialId,
          fdID: nextDtlId,
          fdDate: new Date(officialDate),
          fdType: dtl.fdType,
          fdInvNo: dtl.fdInvNo,
          fdCCYCode: dtl.fdCCYCode,
          fdAmount: dtl.fdAmount,
          fdCurValue: dtl.fdCurValue,
          fdTotal: dtl.fdTotal,
          fdInputDate: new Date(),
        },
      })
    }

    // Kunci kasir sementara
    await tx.tb2Cashier.update({
      where: { fdCashierID: cleanTempId },
      data: { fdPost: 1 },
    })

    return { officialId, tempCashierId: cleanTempId }
  })
}
