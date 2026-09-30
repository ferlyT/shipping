export interface BapPhoto {
  fdId: number
  fdReportId: number
  fdPhotoUrl: string
  fdCaption?: string | null
  fdUploadedBy: string
  fdCreatedAt: string
}

export interface InspectionReport {
  fdId: number
  fdReportNumber: string
  fdReportDate: string
  fdListType: number // 1 = Udara (Air), 2 = Laut (Sea)
  fdListCode: string | null
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdNamaCustomer: string
  fdTerima: string | null
  fdKeterangan: string | null
  fdStatus: '1' | '2' // '1' = Draft, '2' = Selesai
  fdCreatedBy: string
  fdCreatedAt: string
  fdUpdatedAt: string
  photoCount?: number
  photos?: BapPhoto[]
}

export interface InspectionReportsMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface InspectionListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  listType?: number | string
}

export interface CreateInspectionPayload {
  fdReportDate: string
  fdListType: number
  fdListCode: string
  fdMarkingCode: string
  fdMarkingNo: string
  fdNamaCustomer: string
  fdTerima: string
  fdKeterangan: string
  fdStatus: '1' | '2'
}

export interface UpdateInspectionPayload {
  fdReportDate?: string
  fdListType?: number
  fdListCode?: string
  fdMarkingCode?: string
  fdMarkingNo?: string
  fdNamaCustomer?: string
  fdTerima?: string
  fdKeterangan?: string
  fdStatus?: '1' | '2'
}

export interface LookupMarkingEntry {
  fdListCode: string
  fdMarkingCode: string
  fdMarkingNo: string
  fdCustName: string
  fdTerima?: string
  fdListType?: number
}

export interface InspectionStatsData {
  totalForms: number
  totalThisMonth: number
  totalLastMonth: number
  growthPercent: number
  byStatus: Record<string, number>
  topCustomers: { name: string | null; count: number }[]
  monthlyTrend: { month: string; count: number }[]
  totalPhotos?: number
}

