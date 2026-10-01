import { z } from 'zod'

export interface CreateInspectionReportPayload {
  fdReportDate: string // ISO string
  fdListType?: number // 1 = Udara / Air, 2 = Laut / Sea
  fdListCode?: string
  fdMarkingCode?: string
  fdMarkingNo?: string
  fdNamaCustomer: string
  fdTerima?: string
  fdKeterangan?: string
  fdStatus?: string // '1' = Draft, '2' = Done
}

export interface UpdateInspectionReportPayload {
  fdReportDate?: string
  fdListType?: number
  fdListCode?: string
  fdMarkingCode?: string
  fdMarkingNo?: string
  fdNamaCustomer?: string
  fdTerima?: string
  fdKeterangan?: string
  fdStatus?: string
}

export interface ListInspectionReportsQuery {
  page?: string | number
  limit?: string | number
  search?: string
  status?: string
  listType?: string | number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface LookupMarkingResult {
  fdListCode: string
  fdMarkingCode: string
  fdMarkingNo: string
  fdCustName: string
  fdTerima?: string
  fdListType?: number
}

export const CreateInspectionReportSchema = z.object({
  fdReportDate: z.string().min(1, 'Tanggal laporan wajib diisi'),
  fdListType: z.number().int().optional(),
  fdListCode: z.string().optional(),
  fdMarkingCode: z.string().optional(),
  fdMarkingNo: z.string().optional(),
  fdNamaCustomer: z.string().min(1, 'Nama customer wajib diisi'),
  fdTerima: z.string().optional(),
  fdKeterangan: z.string().optional(),
  fdStatus: z.string().optional(),
})

export const UpdateInspectionReportSchema = z.object({
  fdReportDate: z.string().optional(),
  fdListType: z.number().int().optional(),
  fdListCode: z.string().optional(),
  fdMarkingCode: z.string().optional(),
  fdMarkingNo: z.string().optional(),
  fdNamaCustomer: z.string().optional(),
  fdTerima: z.string().optional(),
  fdKeterangan: z.string().optional(),
  fdStatus: z.string().optional(),
})

export const UploadBapPhotoSchema = z.object({
  photoBase64: z.string().min(1, 'Data foto (photoBase64) wajib disertakan'),
  caption: z.string().optional(),
})
