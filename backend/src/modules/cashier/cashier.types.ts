import { z } from 'zod'

// ─── ZOD SCHEMAS ──────────────────────────────────────────────────

export const CreateCashierHeaderSchema = z.object({
  custCode: z.string().min(1, 'Customer code wajib diisi').max(7),
  cashierDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD wajib'),
  descr: z.string().max(150).optional().default(''),
  attachTempId: z.string().optional(),
})

export type CreateCashierHeaderDto = z.infer<typeof CreateCashierHeaderSchema>

export const CreateTempCashierHeaderSchema = z.object({
  custCode: z.string().min(1, 'Customer code wajib diisi').max(7),
  cashierDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD wajib'),
  descr: z.string().max(150).optional().default(''),
})

export type CreateTempCashierHeaderDto = z.infer<typeof CreateTempCashierHeaderSchema>

export const UpdateCashierHeaderSchema = z.object({
  cashierDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  descr: z.string().max(150).optional(),
})

export type UpdateCashierHeaderDto = z.infer<typeof UpdateCashierHeaderSchema>

export const AddCashierRcvSchema = z.object({
  type: z.string().min(1, 'Tipe pembayaran wajib dipilih'),
  ccyCode: z.string().default('RP.'),
  currValue: z.coerce.number().positive().default(1.0),
  amount: z.coerce.number().positive('Nominal pembayaran harus lebih besar dari 0'),
  bankId1: z.string().optional().default(''),
  giroNo: z.string().optional().default(''),
  giroDate: z.string().optional().nullable(),
  validDate: z.string().optional().nullable(),
  bankId2: z.string().optional().default(''),
})

export type AddCashierRcvDto = z.infer<typeof AddCashierRcvSchema>

export const BatchAllocateInvoiceSchema = z.object({
  invoices: z.array(z.object({
    invNo: z.string().min(1, 'Nomor invoice wajib diisi'),
    amount: z.coerce.number().positive('Nominal pelunasan harus lebih besar dari 0'),
    ccyCode: z.string().default('RP.'),
    currValue: z.coerce.number().positive().default(1.0),
  })).min(1, 'Minimal 1 invoice wajib dipilih'),
})

export type BatchAllocateInvoiceDto = z.infer<typeof BatchAllocateInvoiceSchema>

export const AttachTempReceiptSchema = z.object({
  tempCashierId: z.string().min(1, 'Nomor kasir sementara wajib diisi'),
  officialDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD wajib'),
  descr: z.string().max(150).optional(),
})

export type AttachTempReceiptDto = z.infer<typeof AttachTempReceiptSchema>

// ─── QUERY PARAMS & TYPES ──────────────────────────────────────────

export interface CashierQuery {
  page?: string
  limit?: string
  search?: string
  startDate?: string
  endDate?: string
  custCode?: string
  postStatus?: string // 'all' | 'open' | 'posted'
  isAttached?: string // 'all' | 'unattached' | 'attached'
}

export interface CashierStats {
  todayTotalRcv: number
  todayInvoiceAllocated: number
  unbalancedCount: number
  pendingTempCount: number
}
