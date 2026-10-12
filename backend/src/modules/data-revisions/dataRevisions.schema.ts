import { z } from 'zod'

export const RevisionDetailSchema = z.object({
  fdId: z.number().optional(),
  fdNo: z.number().int().positive(),
  // DATA AWAL
  fdAwalCustCode: z.string().nullable().optional(),
  fdAwalCustName: z.string().nullable().optional(),
  fdAwalSpMark: z.string().nullable().optional(),
  fdAwalNoBilling: z.string().nullable().optional(),
  fdAwalQtyVolWgt: z.string().nullable().optional(),
  fdAwalNoInputan: z.string().nullable().optional(),
  fdAwalDetail: z.string().nullable().optional(),
  // DATA BARU
  fdBaruCustCode: z.string().nullable().optional(),
  fdBaruCustName: z.string().nullable().optional(),
  fdBaruSpMark: z.string().nullable().optional(),
  fdBaruNoBilling: z.string().nullable().optional(),
  fdBaruQtyVolWgt: z.string().nullable().optional(),
  fdBaruNoInputan: z.string().nullable().optional(),
  fdBaruDetail: z.string().nullable().optional(),
})

export const CreateDataRevisionSchema = z.object({
  fdNomorForm: z.string().min(1, 'Nomor form wajib diisi'),
  fdTipeData: z.enum(['INPUT_BARU', 'INPUT_LOCAL_CHARGES', 'REVISI']),
  fdAksi: z.enum(['CANCEL_DATA', 'BUAT_BILL']),
  fdTanggal: z.string().min(1, 'Tanggal form wajib diisi'),

  // Officers
  fdDibuatOleh: z.string().nullable().optional(),
  fdStuffing: z.string().nullable().optional(),
  fdBilling: z.string().nullable().optional(),
  fdAR: z.string().nullable().optional(),
  fdDiketahui: z.string().nullable().optional(),

  fdCatatan: z.string().nullable().optional(),
  details: z.array(RevisionDetailSchema).min(1, 'Minimal satu baris detail perubahan wajib diisi'),
})

export const UpdateDataRevisionSchema = CreateDataRevisionSchema.partial()

export const DataRevisionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['ALL', 'PENDING', 'DATA_CANCELLED', 'BILL_TERBUAT', 'BILL_CREATED']).default('ALL'),
  tipeData: z.enum(['ALL', 'INPUT_BARU', 'INPUT_LOCAL_CHARGES', 'REVISI']).default('ALL'),
  aksi: z.enum(['ALL', 'CANCEL_DATA', 'BUAT_BILL']).default('ALL'),
  sortBy: z.enum(['fdTanggal', 'fdNomorForm', 'fdCreatedAt', 'fdStatus']).default('fdCreatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
