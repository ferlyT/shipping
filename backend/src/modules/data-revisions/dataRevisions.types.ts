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
  fdUkuranBytes: number | string
  fdPath: string
  fdUploadedBy: string
  fdUploadedAt: string | Date
  fdKeterangan?: string | null
}

export interface DataRevision {
  fdId: number
  fdNomorForm: string
  fdTipeData: RevisionType
  fdAksi: RevisionAction
  fdStatus: RevisionStatus
  fdTanggal: string | Date

  // Officers
  fdDibuatOleh?: string | null
  fdTglDibuat?: string | Date | null
  fdStuffing?: string | null
  fdTglStuffing?: string | Date | null
  fdBilling?: string | null
  fdTglBilling?: string | Date | null
  fdAR?: string | null
  fdTglAR?: string | Date | null
  fdDiketahui?: string | null
  fdTglDiketahui?: string | Date | null

  // Execution audit
  fdExecutedBy?: string | null
  fdExecutedAt?: string | Date | null

  // Auto-detect billing
  fdMatchedInvNo?: string | null
  fdMatchedInvDate?: string | Date | null

  fdCatatan?: string | null
  fdCreatedBy: string
  fdCreatedAt: string | Date
  fdUpdatedAt: string | Date
  fdDeletedAt?: string | Date | null

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

export interface DataRevisionsListResponse {
  data: DataRevision[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: DataRevisionsStats
}
