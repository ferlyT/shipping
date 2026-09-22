import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import { v4 as uuidv4 } from 'uuid'
import type {
  TopupWalletDto,
  WithdrawWalletDto,
  AdjustWalletDto,
  CustomerWalletSummary,
  CustomerWalletListItem,
  WalletLedgerItem,
  WalletStats,
} from './wallet.types'

/**
 * Mengambil atau menginisialisasi saldo wallet pelanggan.
 * Single Source of Truth nama customer: tbCustomers.fdCustName
 */
export async function getOrCreateCustomerWallet(custCode: string): Promise<CustomerWalletSummary> {
  const cleanCode = custCode.trim()

  // Verifikasi master customer
  const customer = await prisma.tbCustomers.findUnique({
    where: { fdCustCode: cleanCode },
    select: { fdCustCode: true, fdCustName: true },
  })

  if (!customer) {
    throw new Error(`Customer dengan kode '${cleanCode}' tidak ditemukan`)
  }

  // Ambil atau buat record wallet
  let wallet = await prisma.tbCustomerWallet.findUnique({
    where: { fdCustCode: cleanCode },
  })

  if (!wallet) {
    wallet = await prisma.tbCustomerWallet.create({
      data: {
        fdWalletID: uuidv4(),
        fdCustCode: cleanCode,
        fdBalance: 0.0,
        fdCurrency: 'RP.',
        fdStatus: 'ACTIVE',
        fdLastUpdated: new Date(),
      },
    })
  }

  // 10 Riwayat mutasi terakhir
  const recentLedgersRaw = await prisma.tbCustomerWalletLedger.findMany({
    where: { fdCustCode: cleanCode },
    orderBy: { fdCreatedDate: 'desc' },
    take: 10,
  })

  const recentLedgers: WalletLedgerItem[] = recentLedgersRaw.map((l) => ({
    fdLedgerID: l.fdLedgerID.toString(),
    fdWalletID: l.fdWalletID,
    fdCustCode: l.fdCustCode.trim(),
    fdCustName: customer.fdCustName?.trim() || cleanCode,
    fdTxType: l.fdTxType,
    fdDirection: l.fdDirection as 'CREDIT' | 'DEBIT',
    fdAmount: Number(l.fdAmount),
    fdBalanceBefore: Number(l.fdBalanceBefore),
    fdBalanceAfter: Number(l.fdBalanceAfter),
    fdRefType: l.fdRefType,
    fdRefNo: l.fdRefNo,
    fdNotes: l.fdNotes,
    fdCreatedDate: l.fdCreatedDate.toISOString(),
    fdCreatedBy: l.fdCreatedBy,
  }))

  return {
    fdWalletID: wallet.fdWalletID,
    fdCustCode: cleanCode,
    fdCustName: customer.fdCustName?.trim() || cleanCode,
    fdBalance: Number(wallet.fdBalance),
    fdCurrency: wallet.fdCurrency.trim(),
    fdStatus: wallet.fdStatus.trim(),
    fdLastUpdated: wallet.fdLastUpdated.toISOString(),
    recentLedgers,
  }
}

/**
 * Top-Up saldo deposit customer (Transfer / Tunai / Giro)
 */
export async function topupCustomerWallet(
  payload: TopupWalletDto,
  createdBy: string
): Promise<{ newBalance: number; ledgerId: string }> {
  const cleanCode = payload.custCode.trim()

  return await prisma.$transaction(async (tx) => {
    // Pessimistic Lock pada wallet
    let wallet = await tx.tbCustomerWallet.findUnique({
      where: { fdCustCode: cleanCode },
    })

    if (!wallet) {
      wallet = await tx.tbCustomerWallet.create({
        data: {
          fdWalletID: uuidv4(),
          fdCustCode: cleanCode,
          fdBalance: 0.0,
          fdCurrency: 'RP.',
          fdStatus: 'ACTIVE',
        },
      })
    }

    const balanceBefore = Number(wallet.fdBalance)
    const amount = Number(payload.amount)
    const balanceAfter = balanceBefore + amount

    // Update Saldo
    await tx.tbCustomerWallet.update({
      where: { fdWalletID: wallet.fdWalletID },
      data: {
        fdBalance: balanceAfter,
        fdLastUpdated: new Date(),
        fdUpdatedBy: createdBy,
      },
    })

    // Catat Buku Besar (Append-Only Ledger)
    const noteParts: string[] = [`Metode: ${payload.paymentMethod}`]
    if (payload.bankId) noteParts.push(`Bank: ${payload.bankId}`)
    if (payload.refNo) noteParts.push(`Ref: ${payload.refNo}`)
    if (payload.notes) noteParts.push(payload.notes)

    const ledger = await tx.tbCustomerWalletLedger.create({
      data: {
        fdWalletID: wallet.fdWalletID,
        fdCustCode: cleanCode,
        fdTxType: 'TOPUP',
        fdDirection: 'CREDIT',
        fdAmount: amount,
        fdBalanceBefore: balanceBefore,
        fdBalanceAfter: balanceAfter,
        fdRefType: payload.paymentMethod,
        fdRefNo: payload.refNo || null,
        fdNotes: noteParts.join(' | '),
        fdCreatedDate: new Date(),
        fdCreatedBy: createdBy,
      },
    })

    logger.info('Topup wallet berhasil', {
      custCode: cleanCode,
      amount,
      balanceAfter,
      createdBy,
    })

    return { newBalance: balanceAfter, ledgerId: ledger.fdLedgerID.toString() }
  })
}

/**
 * Pembayaran kasir menggunakan saldo deposit (Debit)
 */
export async function payUsingCustomerWallet(
  custCode: string,
  amount: number,
  cashierId: string,
  createdBy: string,
  externalTx?: any
): Promise<{ balanceAfter: number }> {
  const cleanCode = custCode.trim()

  const run = async (tx: any) => {
    const wallet = await tx.tbCustomerWallet.findUnique({
      where: { fdCustCode: cleanCode },
    })

    if (!wallet) {
      throw new Error(`Customer '${cleanCode}' belum memiliki akun wallet/deposit`)
    }

    const currentBalance = Number(wallet.fdBalance)
    if (currentBalance < amount) {
      throw new Error(
        `Saldo deposit tidak mencukupi. Saldo aktif: Rp ${currentBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp ${amount.toLocaleString('id-ID')}`
      )
    }

    const balanceBefore = currentBalance
    const balanceAfter = currentBalance - amount

    await tx.tbCustomerWallet.update({
      where: { fdWalletID: wallet.fdWalletID },
      data: {
        fdBalance: balanceAfter,
        fdLastUpdated: new Date(),
        fdUpdatedBy: createdBy,
      },
    })

    await tx.tbCustomerWalletLedger.create({
      data: {
        fdWalletID: wallet.fdWalletID,
        fdCustCode: cleanCode,
        fdTxType: 'PAYMENT',
        fdDirection: 'DEBIT',
        fdAmount: amount,
        fdBalanceBefore: balanceBefore,
        fdBalanceAfter: balanceAfter,
        fdRefType: 'CASHIER',
        fdRefNo: cashierId,
        fdNotes: `Pelunasan tagihan kasir nomor ${cashierId}`,
        fdCreatedDate: new Date(),
        fdCreatedBy: createdBy,
      },
    })

    return { balanceAfter }
  }

  return externalTx ? await run(externalTx) : await prisma.$transaction(run)
}

/**
 * Pengembalian saldo jika baris pembayaran WALLET pada kasir dibatalkan/dihapus (Kredit Refund)
 */
export async function refundWalletPayment(
  custCode: string,
  amount: number,
  cashierId: string,
  createdBy: string,
  externalTx?: any
): Promise<{ balanceAfter: number }> {
  const cleanCode = custCode.trim()

  const run = async (tx: any) => {
    let wallet = await tx.tbCustomerWallet.findUnique({
      where: { fdCustCode: cleanCode },
    })

    if (!wallet) {
      wallet = await tx.tbCustomerWallet.create({
        data: {
          fdWalletID: uuidv4(),
          fdCustCode: cleanCode,
          fdBalance: 0.0,
          fdCurrency: 'RP.',
        },
      })
    }

    const balanceBefore = Number(wallet.fdBalance)
    const balanceAfter = balanceBefore + amount

    await tx.tbCustomerWallet.update({
      where: { fdWalletID: wallet.fdWalletID },
      data: {
        fdBalance: balanceAfter,
        fdLastUpdated: new Date(),
        fdUpdatedBy: createdBy,
      },
    })

    await tx.tbCustomerWalletLedger.create({
      data: {
        fdWalletID: wallet.fdWalletID,
        fdCustCode: cleanCode,
        fdTxType: 'REFUND',
        fdDirection: 'CREDIT',
        fdAmount: amount,
        fdBalanceBefore: balanceBefore,
        fdBalanceAfter: balanceAfter,
        fdRefType: 'CASHIER',
        fdRefNo: cashierId,
        fdNotes: `Pengembalian saldo atas penghapusan instrumen WALLET di kasir ${cashierId}`,
        fdCreatedDate: new Date(),
        fdCreatedBy: createdBy,
      },
    })

    return { balanceAfter }
  }

  return externalTx ? await run(externalTx) : await prisma.$transaction(run)
}

/**
 * Mengalihkan kelebihan bayar kasir (Overpayment) ke saldo deposit customer
 */
export async function overpaymentToCustomerWallet(
  custCode: string,
  amount: number,
  cashierId: string,
  createdBy: string,
  externalTx?: any
): Promise<{ balanceAfter: number }> {
  const cleanCode = custCode.trim()

  const run = async (tx: any) => {
    let wallet = await tx.tbCustomerWallet.findUnique({
      where: { fdCustCode: cleanCode },
    })

    if (!wallet) {
      wallet = await tx.tbCustomerWallet.create({
        data: {
          fdWalletID: uuidv4(),
          fdCustCode: cleanCode,
          fdBalance: 0.0,
          fdCurrency: 'RP.',
        },
      })
    }

    const balanceBefore = Number(wallet.fdBalance)
    const balanceAfter = balanceBefore + amount

    await tx.tbCustomerWallet.update({
      where: { fdWalletID: wallet.fdWalletID },
      data: {
        fdBalance: balanceAfter,
        fdLastUpdated: new Date(),
        fdUpdatedBy: createdBy,
      },
    })

    await tx.tbCustomerWalletLedger.create({
      data: {
        fdWalletID: wallet.fdWalletID,
        fdCustCode: cleanCode,
        fdTxType: 'OVERPAYMENT',
        fdDirection: 'CREDIT',
        fdAmount: amount,
        fdBalanceBefore: balanceBefore,
        fdBalanceAfter: balanceAfter,
        fdRefType: 'CASHIER',
        fdRefNo: cashierId,
        fdNotes: `Kelebihan bayar pada register kasir ${cashierId}`,
        fdCreatedDate: new Date(),
        fdCreatedBy: createdBy,
      },
    })

    return { balanceAfter }
  }

  return externalTx ? await run(externalTx) : await prisma.$transaction(run)
}

/**
 * Penarikan kembali deposit ke rekening pelanggan (Withdrawal)
 */
export async function withdrawCustomerWallet(
  payload: WithdrawWalletDto,
  createdBy: string
): Promise<{ newBalance: number }> {
  const cleanCode = payload.custCode.trim()

  return await prisma.$transaction(async (tx) => {
    const wallet = await tx.tbCustomerWallet.findUnique({
      where: { fdCustCode: cleanCode },
    })

    if (!wallet) {
      throw new Error(`Customer '${cleanCode}' belum memiliki akun wallet/deposit`)
    }

    const currentBalance = Number(wallet.fdBalance)
    const amount = Number(payload.amount)

    if (currentBalance < amount) {
      throw new Error(
        `Saldo tidak mencukupi untuk penarikan. Saldo tersedia: Rp ${currentBalance.toLocaleString('id-ID')}`
      )
    }

    const balanceBefore = currentBalance
    const balanceAfter = currentBalance - amount

    await tx.tbCustomerWallet.update({
      where: { fdWalletID: wallet.fdWalletID },
      data: {
        fdBalance: balanceAfter,
        fdLastUpdated: new Date(),
        fdUpdatedBy: createdBy,
      },
    })

    const note = `Penarikan ke Bank ${payload.bankName} Rek: ${payload.accountNo} a/n ${payload.accountName}${payload.notes ? ` (${payload.notes})` : ''}`

    await tx.tbCustomerWalletLedger.create({
      data: {
        fdWalletID: wallet.fdWalletID,
        fdCustCode: cleanCode,
        fdTxType: 'WITHDRAWAL',
        fdDirection: 'DEBIT',
        fdAmount: amount,
        fdBalanceBefore: balanceBefore,
        fdBalanceAfter: balanceAfter,
        fdRefType: 'BANK_TRANSFER',
        fdRefNo: payload.accountNo,
        fdNotes: note,
        fdCreatedDate: new Date(),
        fdCreatedBy: createdBy,
      },
    })

    return { newBalance: balanceAfter }
  })
}

/**
 * Penyesuaian saldo manual oleh Supervisor / Admin Finance
 */
export async function adjustCustomerWallet(
  payload: AdjustWalletDto,
  createdBy: string
): Promise<{ newBalance: number }> {
  const cleanCode = payload.custCode.trim()

  return await prisma.$transaction(async (tx) => {
    let wallet = await tx.tbCustomerWallet.findUnique({
      where: { fdCustCode: cleanCode },
    })

    if (!wallet) {
      wallet = await tx.tbCustomerWallet.create({
        data: {
          fdWalletID: uuidv4(),
          fdCustCode: cleanCode,
          fdBalance: 0.0,
          fdCurrency: 'RP.',
        },
      })
    }

    const balanceBefore = Number(wallet.fdBalance)
    const amount = Number(payload.amount)
    let balanceAfter: number

    if (payload.direction === 'CREDIT') {
      balanceAfter = balanceBefore + amount
    } else {
      if (balanceBefore < amount) {
        throw new Error(
          `Penyesuaian debit gagal: Saldo saat ini (Rp ${balanceBefore.toLocaleString('id-ID')}) kurang dari Rp ${amount.toLocaleString('id-ID')}`
        )
      }
      balanceAfter = balanceBefore - amount
    }

    await tx.tbCustomerWallet.update({
      where: { fdWalletID: wallet.fdWalletID },
      data: {
        fdBalance: balanceAfter,
        fdLastUpdated: new Date(),
        fdUpdatedBy: createdBy,
      },
    })

    await tx.tbCustomerWalletLedger.create({
      data: {
        fdWalletID: wallet.fdWalletID,
        fdCustCode: cleanCode,
        fdTxType: 'ADJUSTMENT',
        fdDirection: payload.direction,
        fdAmount: amount,
        fdBalanceBefore: balanceBefore,
        fdBalanceAfter: balanceAfter,
        fdRefType: 'MANUAL',
        fdRefNo: null,
        fdNotes: `Penyesuaian Manual: ${payload.reason}`,
        fdCreatedDate: new Date(),
        fdCreatedBy: createdBy,
      },
    })

    return { newBalance: balanceAfter }
  })
}

/**
 * Mengambil daftar buku besar mutasi dengan filter & pagination
 */
export async function getWalletLedgers(query: Record<string, any>) {
  const page = Math.max(1, parseInt(query.page || '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(query.limit || '20', 10)))
  const skip = (page - 1) * limit

  const where: any = {}

  if (query.custCode) {
    where.fdCustCode = query.custCode.trim()
  }

  if (query.txType && query.txType !== 'all') {
    where.fdTxType = query.txType.toUpperCase()
  }

  if (query.direction && query.direction !== 'all') {
    where.fdDirection = query.direction.toUpperCase()
  }

  if (query.startDate || query.endDate) {
    where.fdCreatedDate = {}
    if (query.startDate) {
      where.fdCreatedDate.gte = new Date(`${query.startDate}T00:00:00`)
    }
    if (query.endDate) {
      where.fdCreatedDate.lte = new Date(`${query.endDate}T23:59:59`)
    }
  }

  if (query.search) {
    const s = query.search.trim()
    where.OR = [
      { fdCustCode: { contains: s } },
      { fdRefNo: { contains: s } },
      { fdNotes: { contains: s } },
    ]
  }

  const [total, rows] = await Promise.all([
    prisma.tbCustomerWalletLedger.count({ where }),
    prisma.tbCustomerWalletLedger.findMany({
      where,
      orderBy: { fdCreatedDate: 'desc' },
      skip,
      take: limit,
    }),
  ])

  // Lookup master customer names (Single Source of Truth)
  const custCodes = Array.from(new Set(rows.map((r) => r.fdCustCode.trim())))
  const customers = await prisma.tbCustomers.findMany({
    where: { fdCustCode: { in: custCodes } },
    select: { fdCustCode: true, fdCustName: true },
  })
  const custMap = new Map(customers.map((c) => [c.fdCustCode.trim(), c.fdCustName?.trim() || '']))

  const items: WalletLedgerItem[] = rows.map((r) => ({
    fdLedgerID: r.fdLedgerID.toString(),
    fdWalletID: r.fdWalletID,
    fdCustCode: r.fdCustCode.trim(),
    fdCustName: custMap.get(r.fdCustCode.trim()) || r.fdCustCode.trim(),
    fdTxType: r.fdTxType,
    fdDirection: r.fdDirection as 'CREDIT' | 'DEBIT',
    fdAmount: Number(r.fdAmount),
    fdBalanceBefore: Number(r.fdBalanceBefore),
    fdBalanceAfter: Number(r.fdBalanceAfter),
    fdRefType: r.fdRefType,
    fdRefNo: r.fdRefNo,
    fdNotes: r.fdNotes,
    fdCreatedDate: r.fdCreatedDate.toISOString(),
    fdCreatedBy: r.fdCreatedBy,
  }))

  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

/**
 * Mengambil ringkasan statistik wallet seluruh customer
 */
export async function getWalletStats(): Promise<WalletStats> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  const [aggregateBalance, activeCount, creditToday, debitToday] = await Promise.all([
    prisma.tbCustomerWallet.aggregate({
      _sum: { fdBalance: true },
      where: { fdStatus: 'ACTIVE' },
    }),
    prisma.tbCustomerWallet.count({
      where: { fdBalance: { gt: 0 } },
    }),
    prisma.tbCustomerWalletLedger.aggregate({
      _sum: { fdAmount: true },
      where: {
        fdDirection: 'CREDIT',
        fdCreatedDate: { gte: startOfDay, lte: endOfDay },
      },
    }),
    prisma.tbCustomerWalletLedger.aggregate({
      _sum: { fdAmount: true },
      where: {
        fdDirection: 'DEBIT',
        fdCreatedDate: { gte: startOfDay, lte: endOfDay },
      },
    }),
  ])

  return {
    totalBalance: Number(aggregateBalance._sum.fdBalance || 0),
    activeCustomerCount: activeCount,
    totalCreditToday: Number(creditToday._sum.fdAmount || 0),
    totalDebitToday: Number(debitToday._sum.fdAmount || 0),
  }
}

/**
 * Mengambil daftar saldo wallet pelanggan (list table)
 */
export async function getCustomerWallets(query: Record<string, any>) {
  const page = Math.max(1, parseInt(query.page || '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(query.limit || '20', 10)))
  const skip = (page - 1) * limit

  const where: any = {}
  if (query.hasBalance === 'true') {
    where.fdBalance = { gt: 0 }
  }

  if (query.search) {
    const s = query.search.trim()
    const matchedCustomers = await prisma.tbCustomers.findMany({
      where: {
        OR: [
          { fdCustCode: { contains: s } },
          { fdCustName: { contains: s } },
        ],
      },
      select: { fdCustCode: true },
      take: 200,
    })
    const codes = matchedCustomers.map((c) => c.fdCustCode)
    where.fdCustCode = { in: codes }
  }

  const [total, rows] = await Promise.all([
    prisma.tbCustomerWallet.count({ where }),
    prisma.tbCustomerWallet.findMany({
      where,
      orderBy: { fdBalance: 'desc' },
      skip,
      take: limit,
    }),
  ])

  // Lookup master customer names (Single Source of Truth)
  const custCodes = rows.map((r) => r.fdCustCode.trim())
  const customers = await prisma.tbCustomers.findMany({
    where: { fdCustCode: { in: custCodes } },
    select: { fdCustCode: true, fdCustName: true },
  })
  const custMap = new Map(customers.map((c) => [c.fdCustCode.trim(), c.fdCustName?.trim() || '']))

  const items: CustomerWalletListItem[] = rows.map((r) => ({
    fdWalletID: r.fdWalletID,
    fdCustCode: r.fdCustCode.trim(),
    fdCustName: custMap.get(r.fdCustCode.trim()) || r.fdCustCode.trim(),
    fdBalance: Number(r.fdBalance),
    fdCurrency: r.fdCurrency.trim(),
    fdStatus: r.fdStatus.trim(),
    fdLastUpdated: r.fdLastUpdated.toISOString(),
  }))

  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}
