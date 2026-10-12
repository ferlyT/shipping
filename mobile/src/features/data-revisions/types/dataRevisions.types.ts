export type RevisionAction = 'CANCEL_DATA' | 'BUAT_BILL'

export type RevisionType = 'INPUT_BARU' | 'INPUT_LOCAL_CHARGES' | 'REVISI'

export type RevisionStatus = 'PENDING' | 'BILL_CREATED' | 'BILL_TERBUAT' | 'DATA_CANCELLED'

export interface DataRevisionDetailItem {
  fdId?: number
  fdHeadId?: number
  fdNo: number
  fdAwalCustCode?: string | null
  fdAwalCustName?: string | null
  fdAwalSpMark?: string | null
  fdAwalNoBilling?: string | null
  fdAwalQtyVolWgt?: string | null
  fdAwalNoInputan?: string | null
  fdAwalDetail?: string | null
  fdBaruCustCode?: string | null
  fdBaruCustName?: string | null
  fdBaruSpMark?: string | null
  fdBaruNoBilling?: string | null
  fdBaruQtyVolWgt?: string | null
  fdBaruNoInputan?: string | null
  fdBaruDetail?: string | null
}

export interface DataRevisionLampiran {
  fdId: number
  fdRevisionId?: number
  fdHeadId?: number
  fdPath?: string
  fdFilePath?: string
  fdNamaFile?: string
  fdFileName?: string
  fdNamaFileSimpan?: string
  fdMimeType?: string | null
  fdFileType?: string | null
  fdUkuranBytes?: number | bigint | null
  fdFileSize?: number | null
  fdKeterangan?: string | null
  fdUploadedBy: string
  fdUploadedAt: string
}

export interface DataRevision {
  fdId: number
  fdNomorForm: string
  fdTipeData: RevisionType
  fdAksi: RevisionAction
  fdStatus: RevisionStatus
  fdTanggal: string
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
  fdMatchedInvNo?: string | null
  fdMatchedInvDate?: string | null
  fdExecutedBy?: string | null
  fdExecutedAt?: string | null
  fdCatatan?: string | null
  fdCreatedBy: string
  fdCreatedAt: string
  fdUpdatedAt?: string | null
  details?: DataRevisionDetailItem[]
  lampiran?: DataRevisionLampiran[]
  _count?: {
    details?: number
    lampiran?: number
  }
}

export interface LookupListCodeItem {
  fdListCode: string
  fdCustCode?: string
  fdCustName?: string
  fdTerima?: string
  fdMarkingCode?: string
  fdMarkingNo?: string
  fdJmlPack?: number
  fdM3?: number
  fdJmlBerat?: number
  fdCancel?: number
  fdInvNo?: string | null
  hasBill: boolean
  isGiven: boolean
  fdSJNo?: string | null
  isCancelBlocked: boolean
  cancelBlockReason?: string | null
}

export interface DataRevisionsQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
  tipeData?: string
  aksi?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
