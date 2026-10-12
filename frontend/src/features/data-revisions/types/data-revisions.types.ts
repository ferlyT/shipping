export type RevisionType = 'INPUT_BARU' | 'INPUT_LOCAL_CHARGES' | 'REVISI'
export type RevisionAction = 'CANCEL_DATA' | 'BUAT_BILL'
export type RevisionStatus = 'PENDING' | 'DATA_CANCELLED' | 'BILL_TERBUAT'

export interface RevisionDetailItem {
  fdId?: number
  fdRevisionId?: number
  fdNo: number
  // DATA AWAL
  fdAwalCustCode?: string | null
  fdAwalCustName?: string | null
  fdAwalSpMark?: string | null
  fdAwalNoBilling?: string | null
  fdAwalQtyVolWgt?: string | null
  fdAwalNoInputan?: string | null
  fdAwalDetail?: string | null
  // DATA BARU
  fdBaruCustCode?: string | null
  fdBaruCustName?: string | null
  fdBaruSpMark?: string | null
  fdBaruNoBilling?: string | null
  fdBaruQtyVolWgt?: string | null
  fdBaruNoInputan?: string | null
  fdBaruDetail?: string | null
}

export interface RevisionLampiranItem {
  fdId: number
  fdRevisionId: number
  fdNamaFile: string
  fdNamaFileSimpan: string
  fdMimeType: string
  fdUkuranBytes: number
  fdPath: string
  fdUploadedBy: string
  fdUploadedAt: string
  fdKeterangan?: string | null
}

export interface DataRevision {
  fdId: number
  fdNomorForm: string
  fdTipeData: RevisionType
  fdAksi: RevisionAction
  fdStatus: RevisionStatus
  fdTanggal: string

  // Officers
  fdDibuatOleh?: string | null
  fdTglDibuat?: string | null
  fdStuffing?: string | null
  fdTglStuffing?: string | null
  fdBilling?: string | null
  fdTglBilling?: string | null
  fdAR?: string | null
  fdTglAR?: string | null
  fdDiketahui?: string | null
  fdTglDiketahui?: string | null

  // Execution audit
  fdExecutedBy?: string | null
  fdExecutedAt?: string | null

  // Auto-detect billing
  fdMatchedInvNo?: string | null
  fdMatchedInvDate?: string | null

  fdCatatan?: string | null
  fdCreatedBy: string
  fdCreatedAt: string
  fdUpdatedAt: string
  fdDeletedAt?: string | null

  details?: RevisionDetailItem[]
  lampiran?: RevisionLampiranItem[]
}

export interface DataRevisionsStats {
  total: number
  pending: number
  cancelled: number
  billTerbuat: number
  tipeInputBaru: number
  tipeLocalCharges: number
  tipeRevisi: number
}

export interface DataRevisionsListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  tipeData?: string
  aksi?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface DataRevisionsResponse {
  data: DataRevision[]
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
    stats?: DataRevisionsStats
  }
}
