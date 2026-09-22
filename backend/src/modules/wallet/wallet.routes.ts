import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import {
  getWalletStats,
  getCustomerWallets,
  getOrCreateCustomerWallet,
  getWalletLedgers,
  topupCustomerWallet,
  withdrawCustomerWallet,
  adjustCustomerWallet,
  overpaymentToCustomerWallet,
} from './wallet.service'
import {
  TopupWalletSchema,
  WithdrawWalletSchema,
  AdjustWalletSchema,
} from './wallet.types'

const walletRoutes = new Hono()

walletRoutes.use('/*', authMiddleware)

// ─── STATISTIK & RINGKASAN ──────────────────────────────────────────

// GET /api/wallet/stats
walletRoutes.get('/stats', async (c) => {
  try {
    const stats = await getWalletStats()
    return successResponse(c, stats)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal memuat statistik wallet', 500)
  }
})

// GET /api/wallet/customers (list balances)
walletRoutes.get('/customers', async (c) => {
  try {
    const data = await getCustomerWallets(c.req.query())
    return successResponse(c, data)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal memuat daftar saldo wallet', 500)
  }
})

// GET /api/wallet/customer/:custCode
walletRoutes.get('/customer/:custCode', async (c) => {
  try {
    const custCode = c.req.param('custCode')
    const wallet = await getOrCreateCustomerWallet(custCode)
    return successResponse(c, wallet)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal memuat saldo pelanggan', 404)
  }
})

// GET /api/wallet/ledger (Buku besar / mutasi)
walletRoutes.get('/ledger', async (c) => {
  try {
    const data = await getWalletLedgers(c.req.query())
    return successResponse(c, data)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal memuat riwayat mutasi wallet', 500)
  }
})

// ─── TRANSAKSI WALLET ────────────────────────────────────────────────

// POST /api/wallet/topup
walletRoutes.post('/topup', async (c) => {
  try {
    const user = c.get('user' as any) as any
    const username = user?.username || 'SYSTEM'
    const body = await c.req.json()

    const parsed = TopupWalletSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(c, parsed.error.issues[0]?.message || 'Input top-up tidak valid', 400)
    }

    const result = await topupCustomerWallet(parsed.data, username)
    return successResponse(c, result, 'Top-up saldo deposit berhasil')
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal melakukan top-up deposit', 400)
  }
})

// POST /api/wallet/withdraw
walletRoutes.post('/withdraw', async (c) => {
  try {
    const user = c.get('user' as any) as any
    const username = user?.username || 'SYSTEM'
    const body = await c.req.json()

    const parsed = WithdrawWalletSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(c, parsed.error.issues[0]?.message || 'Input penarikan tidak valid', 400)
    }

    const result = await withdrawCustomerWallet(parsed.data, username)
    return successResponse(c, result, 'Penarikan saldo deposit berhasil')
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal melakukan penarikan saldo deposit', 400)
  }
})

// POST /api/wallet/adjust
walletRoutes.post('/adjust', async (c) => {
  try {
    const user = c.get('user' as any) as any
    const username = user?.username || 'SYSTEM'
    const body = await c.req.json()

    const parsed = AdjustWalletSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(c, parsed.error.issues[0]?.message || 'Input penyesuaian tidak valid', 400)
    }

    const result = await adjustCustomerWallet(parsed.data, username)
    return successResponse(c, result, 'Penyesuaian saldo berhasil')
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal melakukan penyesuaian saldo', 400)
  }
})

// POST /api/wallet/overpayment (Alihkan kelebihan kasir ke deposit)
walletRoutes.post('/overpayment', async (c) => {
  try {
    const user = c.get('user' as any) as any
    const username = user?.username || 'SYSTEM'
    const body = await c.req.json()

    const { custCode, amount, cashierId } = body
    if (!custCode || !amount || !cashierId || amount <= 0) {
      return errorResponse(c, 'Data kelebihan bayar tidak lengkap atau nominal tidak valid', 400)
    }

    const result = await overpaymentToCustomerWallet(custCode, Number(amount), cashierId, username)
    return successResponse(c, result, 'Kelebihan bayar berhasil dialihkan ke saldo deposit pelanggan')
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengalihkan kelebihan bayar ke deposit', 400)
  }
})

export default walletRoutes
