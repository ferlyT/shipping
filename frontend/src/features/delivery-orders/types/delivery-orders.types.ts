export type ListType = 'air' | 'sea'
export type GroupMode = 'marking' | 'branch' | 'none'
export type SentValue = '0' | '1'

export interface DeliveryOrder {
  fdSJNo: string
  fdSJDate: string
  fdCustCode: string | null
  fdCustNameSJ: string | null
  fdCustName?: string | null
  fdDescr: string
  fdSupir: string | null
  fdCarID: string | null
  fdJmlPackSJ: number | null
  fdJmlBeratSJ: number | null
  fdEstimasi?: string | null
  fdSent?: number | null
  fdSndDate?: string | null
  fdPrint?: number | null
  fdPrintDate?: string | null
  fdGive?: number | null
  fdGiveDate?: string | null
  fdAddr: string | null
  fdCity: string | null
}

export interface GroupedDataRow {
  listCode: string
  markingCode: string
  custCode?: string | null
  satuan?: string | null
  customerName?: string
  resiNo?: string
  comodity?: string
  typeComodityId?: number
  typeComodityName?: string | null
  totalWeight?: number
  m3?: number
  m3Source?: 'Gudang' | 'tbEntryList' | string
  branchCode?: string
  branchName?: string
  totalQty: number
  totalTerkirim: number
  sisa: number
  isSent: number
  gudangStatus?: number
}

export interface GroupMeta {
  code: string
  label: string
  total: number
}

export interface PeriodMetrics {
  year: number
  month: number
  monthName: string
  totalSJ: number
  totalPackages: number
  totalWeight: number
  deliveredSJ: number
  onDeliverySJ: number
  seaSJ: number
  airSJ: number
}

export interface MetricComparison {
  current: number
  prev: number
  momDiff: number
  momPercent: number
  lastYear: number
  yoyDiff: number
  yoyPercent: number
}

export interface MonthlyTrendItem {
  monthKey: string
  name: string
  year: number
  month: number
  totalSJ: number
  packages: number
  weight: number
  delivered: number
  onDelivery: number
}

export interface KpiData {
  totalSJ: number
  totalPackages: number
  totalWeight: number
  sjBulanIni?: number
  onDelivery?: number

  currentMonth?: PeriodMetrics
  prevMonth?: PeriodMetrics
  lastYearSameMonth?: PeriodMetrics

  comparisons?: {
    totalSJ: MetricComparison
    totalPackages: MetricComparison
    totalWeight: MetricComparison
    deliveredSJ: MetricComparison
    onDeliverySJ: MetricComparison
  }

  monthlyTrends?: MonthlyTrendItem[]
}

export interface DeliveryMasterVehicle {
  fdCarID: string
  fdSupir: string
  fdNotel: string
  fdStatus: number
}

export interface DeliveryMasterUnit {
  fdUnitCode: string
  fdUnitName: string
}

export interface DeliveryMasterPaymentType {
  fdID: number
  fdJenisPembayaran: string
}

export interface DeliveryMasterExpedition {
  fdExpID: string
  fdExpName: string
  fdExpAddr1?: string
  fdTelp?: string
}

export interface DeliveryMasterDataResponse {
  vehicles: DeliveryMasterVehicle[]
  units: DeliveryMasterUnit[]
  paymentTypes: DeliveryMasterPaymentType[]
  expeditions: DeliveryMasterExpedition[]
}

export interface DeliveryDimensionItem {
  fdListCode: string
  fdListDCode: string
  fdDescr: string | null
  fdPjg: number
  fdLbr: number
  fdTng: number
  fdQty: number
  fdLoad: string | null
  m3Total: number
}

export interface DeliveryOrderDetailResponse {
  // 1. Data Utama tbDelivery
  delivery: {
    fdSJNo: string
    fdSJDate: string | null
    fdCarID: string | null
    fdCustCode: string | null
    fdDescr: string | null
    fdListCode: string | null
    fdListType: number | null
    fdPrint: number | null
    fdSent: number | null
    fdSndDate: string | null
    fdLoad: string | null
    fdJmlPackSJ: number | null
    fdJmlBeratSJ: number | null
    fdPrintDate: string | null
    fdKembali: string | null
    fdUpdate: string | null
    fdCreated: string | null
    fdPrintBy: string | null
    fdTerima: string | null
    fdGive: number | null
    fdGiveDate: string | null
    fdAddr: string | null
    fdSupir: string | null
    fdEstimasi: string | null
    fdCustNameSJ: string | null
    fdTelp: string | null
    fdTelpSupir: string | null
    fdSatuan: string | null
    fdContact: string | null
    fdCity: string | null
    fdHp: string | null
    fdEmail: string | null
    fdExpID: string | null
    fdExp3: number | null
    fdKondisiBarang: number | null
  }

  // 2. Data Master Pelanggan (tbCustomers - Single Source of Truth)
  customer: {
    fdCustCode: string
    fdCustName: string
    fdContact: string | null
    fdAddr1: string | null
    fdAddr2: string | null
    fdCityName: string | null
    fdTelp: string | null
    fdHP: string | null
    fdBlocked: number
    fdBlockedStatusName?: string | null
    fdBroker: number
    fdDiscontinued: number
    fdKeterangan: string | null
  } | null

  // 3. Data Manifest & Fisik Gudang (tbEntryList)
  entryList: {
    fdListCode: string
    fdListDate: string | null
    fdBranchCode: string | null
    fdBranchName: string | null
    fdContainerNo: string | null
    fdCNo: string | null
    fdMarkingCode: string | null
    fdMarkingNo: string | null
    fdJmlPack: number | null
    fdSatuan: string | null
    fdJmlBerat: number | null
    fdJmlPack2: number | null
    fdSatuan2: string | null
    fdJmlBerat2: number | null
    fdLokasi: string | null
    fdTgl_IN: string | null
    fdTime_IN: string | null
    fdDesc: string | null
    fdDeliveryNote: string | null
    fdTerima: string | null
    fdPrintUkuran: number | null
    fdInvoiceNo?: string | null
    fdComodity?: string | null
  } | null

  // 4. Trio Kubikasi M3
  m3Comparison: {
    m3PackingList: number
    m3Gudang: number
    m3Bill: number
  }

  // 5. Permintaan Kirim CS (qr_OrderDelivey)
  orderDelivery: {
    fdTglKirim: string | null
    fdNamaPemberiOrder: string | null
    fdKeterangan: string | null
    fdJenisPembayaran: number | null
    fdJenisPembayaranLabel: string | null
    fdTglTransfer: string | null
    fdAlamatKirim: string | null
    fdExpID: string | null
    fdExpName: string | null
    fdExpAddr: string | null
    fdEksBayar: number | null
  } | null

  // 6. Ekspedisi Terpilih (tbExpedisi)
  expedition: {
    fdExpID: string
    fdExpName: string
    fdExpAddr1: string | null
    fdTelp: string | null
    fdExp3: number | null
  } | null

  // 7. Rincian Dimensi Koli Fisik (tbEntryListDetail)
  dimensions: DeliveryDimensionItem[]

  // 8. Peringatan Amfibi & Status Penting
  isAmfibi: boolean
  amfibiMarking?: string | null

  // 9. Peringatan Blocked Finance (tbEntryList_Bloked_Finance -> fdBlocked = 1)
  financeBlocked: {
    isBlocked: boolean
    blockedBy?: string | null
    blockedReason?: string | null
  } | null
}

export interface UpdateDeliveryOrderDto {
  fdEstimasi: string // Wajib! format YYYY-MM-DD
  fdCarID: string // Wajib! plat mobil
  fdSupir?: string | null
  fdTelpSupir?: string | null
  fdSndDate?: string | null
  fdCustNameSJ?: string | null
  fdContact?: string | null
  fdAddr?: string | null
  fdCity?: string | null
  fdTelp?: string | null
  fdHp?: string | null
  fdEmail?: string | null
  fdDescr?: string | null
  fdJmlPackSJ?: number | null
  fdSatuan?: string | null
  fdJmlBeratSJ?: number | null
  fdKondisiBarang?: number | null
  fdExpID?: string | null
  fdExp3?: number | null
  fdKembali?: string | null
  fdTerima?: string | null
  fdGive?: number | null
  fdGiveDate?: string | null
}

export interface PrintDeliveryOrderDto {
  cetakUkuran?: boolean // check1 di foxpro
  cetakSJKosong?: boolean // check2 di foxpro
  cetakKeterangan?: boolean // check3 di foxpro
  cetakSupir?: boolean // fdCetakSupir di foxpro
}

export interface CreateDeliveryOrderDto {
  fdListCode: string
  fdListType?: number
  fdCustCode?: string
  fdCustNameSJ?: string
  fdJmlPackSJ: number
  fdSatuan?: string
  fdJmlBeratSJ?: number
  fdCarID: string
  fdSupir?: string
  fdTelpSupir?: string
  fdEstimasi: string // 'YYYY-MM-DD'
  fdAddr?: string
  fdCity?: string
  fdContact?: string
  fdHp?: string
  fdTelp?: string
  fdDescr?: string
  fdKondisiBarang?: number
  fdBranchCode?: string
}

export interface CustomerDestination {
  fdCustCode: string
  fdID: string
  fdContact: string | null
  fdHP: string | null
  fdTelp: string | null
  fdEmail: string | null
  fdAddr: string | null
  fdCity: string | null
  fdAktif: number
}

export interface CreateCustomerDestinationDto {
  fdCustCode: string
  fdContact?: string
  fdHP?: string
  fdTelp?: string
  fdEmail?: string
  fdAddr: string
  fdCity?: string
}

export interface OrderDeliveryItem {
  fdTglKirim: string | null
  fdNamaPemberiOrder: string | null
  fdKeterangan: string | null
  fdJenisPembayaran: number | null
  fdJenisPembayaranLabel: string | null
  fdTglTransfer: string | null
  fdAlamatKirim: string | null
  fdExpID: string | null
  fdExpName: string | null
  fdExpAddr: string | null
  fdEksBayar: number | null
  fdContact?: string | null
  fdCity?: string | null
  fdTelp?: string | null
  fdMobile?: string | null
}
