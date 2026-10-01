import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse } from '../../utils/response'
import {
  getMasterData,
  getNextCashierNumber,
  getCashiers,
  getTempCashiers,
  getUnattachedTempCashiers,
  getCashierDetail,
  getCashierStats,
  getUnpaidInvoices,
  createCashier,
  createTempCashier,
  updateCashierHeader,
  deleteCashier,
  addCashierRcv,
  deleteCashierRcv,
  batchAllocateInvoices,
  deleteCashierDetail,
  allocateOverpaymentToDeposit,
  attachTempReceipt,
} from './cashier.service'
import {
  CreateCashierHeaderSchema,
  CreateTempCashierHeaderSchema,
  UpdateCashierHeaderSchema,
  AddCashierRcvSchema,
  BatchAllocateInvoiceSchema,
  AttachTempReceiptSchema,
  AllocateOverpaymentDepositSchema,
} from './cashier.types'
import { validateBody } from '../../middleware/requestValidator'

const cashierRoutes = new Hono()

cashierRoutes.use('/*', authMiddleware)

// ─── MASTER & PENUNJANG ───────────────────────────────────────────

// GET /api/cashier/master-data
cashierRoutes.get('/master-data', async (c) => {
  try {
    const data = await getMasterData()
    return successResponse(c, data)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal memuat master data kasir', 500)
  }
})

// GET /api/cashier/next-number?type=OFFICIAL|TEMPORARY&date=YYYY-MM-DD
cashierRoutes.get('/next-number', async (c) => {
  try {
    const type = (c.req.query('type') || 'OFFICIAL').toUpperCase() as 'OFFICIAL' | 'TEMPORARY'
    const date = c.req.query('date')
    const nextNo = await getNextCashierNumber(type, date)
    return successResponse(c, { nextNumber: nextNo })
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal menghasilkan nomor kasir', 500)
  }
})

// GET /api/cashier/stats
cashierRoutes.get('/stats', async (c) => {
  try {
    const startDate = c.req.query('startDate')
    const endDate = c.req.query('endDate')
    const stats = await getCashierStats(startDate, endDate)
    return successResponse(c, stats)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal memuat metrik KPI kasir', 500)
  }
})

// GET /api/cashier/unpaid-invoices/:custCode
cashierRoutes.get('/unpaid-invoices/:custCode', async (c) => {
  try {
    const custCode = c.req.param('custCode')
    const search = c.req.query('search')
    const invoices = await getUnpaidInvoices(custCode, search)
    return successResponse(c, invoices)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil tagihan piutang customer', 500)
  }
})

// ─── LIST KASIR (OFFICIAL / TEMPORARY) ────────────────────────────

// GET /api/cashier/temp/unattached
cashierRoutes.get('/temp/unattached', async (c) => {
  try {
    const custCode = c.req.query('custCode')
    const search = c.req.query('search')
    const items = await getUnattachedTempCashiers(custCode, search)
    return successResponse(c, items)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal memuat daftar kasir sementara pending', 500)
  }
})

// GET /api/cashier/temp
cashierRoutes.get('/temp', async (c) => {
  try {
    const query = c.req.query()
    const result = await getTempCashiers(query)
    return successResponse(c, result.items, result.meta)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil daftar kasir sementara', 500)
  }
})

// GET /api/cashier
cashierRoutes.get('/', async (c) => {
  try {
    const query = c.req.query()
    const result = await getCashiers(query)
    return successResponse(c, result.items, result.meta)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengambil daftar kasir resmi', 500)
  }
})

// ─── DETAIL TRANSAKSI ─────────────────────────────────────────────

// GET /api/cashier/:id
cashierRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const detail = await getCashierDetail(id)
    return successResponse(c, detail)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal memuat detail kasir', 404)
  }
})

// ─── CREATE TRANSAKSI ─────────────────────────────────────────────

// ─── CREATE TRANSAKSI ─────────────────────────────────────────────

// POST /api/cashier
cashierRoutes.post('/', validateBody(CreateCashierHeaderSchema), async (c) => {
  try {
    const data = c.req.valid('json')
    const user = c.get('user')
    const result = await createCashier(data, {
      username: user.username,
      empCode: user.fdEmpCode || undefined,
    })
    return successResponse(c, result, undefined, 201)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal membuat kasir resmi', 500)
  }
})

// POST /api/cashier/temp
cashierRoutes.post('/temp', validateBody(CreateTempCashierHeaderSchema), async (c) => {
  try {
    const data = c.req.valid('json')
    const user = c.get('user')
    const result = await createTempCashier(data, {
      username: user.username,
      empCode: user.fdEmpCode || undefined,
    })
    return successResponse(c, result, undefined, 201)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal membuat kasir sementara', 500)
  }
})

// POST /api/cashier/attach
cashierRoutes.post('/attach', validateBody(AttachTempReceiptSchema), async (c) => {
  try {
    const data = c.req.valid('json')
    const user = c.get('user')
    const result = await attachTempReceipt(
      data.tempCashierId,
      data.officialDate,
      { username: user.username, empCode: user.fdEmpCode || undefined },
      data.descr
    )
    return successResponse(c, result)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal melakukan attach kasir sementara', 500)
  }
})

// ─── UPDATE & DELETE HEADER ───────────────────────────────────────

// PUT /api/cashier/:id
cashierRoutes.put('/:id', validateBody(UpdateCashierHeaderSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const data = c.req.valid('json')
    const updated = await updateCashierHeader(id, data)
    return successResponse(c, updated)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal memperbarui header kasir', 400)
  }
})

// DELETE /api/cashier/:id
cashierRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await deleteCashier(id)
    return successResponse(c, { deleted: true, id })
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal menghapus transaksi kasir', 400)
  }
})

// ─── SUB-ITEMS: RCV (UANG MASUK) ──────────────────────────────────

// POST /api/cashier/:id/rcv
cashierRoutes.post('/:id/rcv', validateBody(AddCashierRcvSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const data = c.req.valid('json')
    const user = c.get('user' as any) as any
    const username = user?.username || 'SYSTEM'
    const created = await addCashierRcv(id, data, username)
    return successResponse(c, created, undefined, 201)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal menambahkan penerimaan uang', 400)
  }
})

// DELETE /api/cashier/:id/rcv/:rcvId
cashierRoutes.delete('/:id/rcv/:rcvId', async (c) => {
  try {
    const id = c.req.param('id')
    const rcvId = c.req.param('rcvId')
    const user = c.get('user' as any) as any
    const username = user?.username || 'SYSTEM'
    await deleteCashierRcv(id, rcvId, username)
    return successResponse(c, { deleted: true, id, rcvId })
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal menghapus baris penerimaan uang', 400)
  }
})

// ─── SUB-ITEMS: DETAILS (ALOKASI INVOICE) ─────────────────────────

// POST /api/cashier/:id/allocate
cashierRoutes.post('/:id/allocate', validateBody(BatchAllocateInvoiceSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const data = c.req.valid('json')
    const created = await batchAllocateInvoices(id, data)
    return successResponse(c, created, undefined, 201)
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengalokasikan faktur invoice', 400)
  }
})

// DELETE /api/cashier/:id/details/:detailId
cashierRoutes.delete('/:id/details/:detailId', async (c) => {
  try {
    const id = c.req.param('id')
    const detailId = c.req.param('detailId')
    const user = c.get('user' as any) as any
    const username = user?.username || 'SYSTEM'
    await deleteCashierDetail(id, detailId, username)
    return successResponse(c, { deleted: true, id, detailId })
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal menghapus alokasi invoice', 400)
  }
})

// POST /api/cashier/:id/overpayment-deposit (Alihkan kelebihan bayar kasir ke saldo deposit)
cashierRoutes.post('/:id/overpayment-deposit', validateBody(AllocateOverpaymentDepositSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const { amount } = c.req.valid('json')
    const user = c.get('user' as any) as any
    const username = user?.username || 'SYSTEM'
    const result = await allocateOverpaymentToDeposit(id, amount, username)
    return successResponse(c, result, 'Kelebihan bayar kasir berhasil dialihkan ke saldo deposit pelanggan')
  } catch (err: any) {
    return errorResponse(c, err.message || 'Gagal mengalihkan kelebihan bayar ke deposit', 400)
  }
})

export default cashierRoutes
