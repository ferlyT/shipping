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
