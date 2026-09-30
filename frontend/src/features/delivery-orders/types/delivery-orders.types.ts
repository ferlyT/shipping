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

export interface DeliveryMonitoringItem {
  fdSJNo: string
  fdSJDate: string | null
  fdEstimasi: string | null
  fdSent: number
  fdSndDate: string | null
  fdCarID: string | null
  fdSupir: string | null
  fdTelpSupir: string | null
  fdCustCode: string | null
  fdCustName: string
  fdCustNameSJ: string | null
  fdListCode: string | null
  fdListType: number | null
  fdJmlPackSJ: number
  fdSatuan: string | null
  fdJmlBeratSJ: number
  fdDescr: string | null
  fdPrint: number | null
  fdPrintDate: string | null
  fdGive: number | null
  fdGiveDate: string | null
  fdAddr: string | null
  fdCity: string | null
  fdContact: string | null
  fdHp: string | null
  fdTelp: string | null
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdM3: number
  agingDays: number
  isOverdue: boolean
  overdueDays: number
}

export interface DeliveryMonitoringKPIs {
  totalPending: number
  overdueCount: number
  todayCount: number
  aging1to2Count: number
  aging3to5Count: number
  aging6to7Count: number
  agingOver7Count: number
  airCount: number
  seaCount: number
  totalPackages: number
  totalWeight: number
}

export interface DeliveryMonitoringQueryParams {
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
  search?: string
  aging?: 'all' | 'today' | '1-2' | '3-5' | '6-7' | '>7'
  status?: 'all' | 'overdue' | 'ontime'
  listType?: 'all' | '1' | '2'
  branch?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ConfirmDeliveryDto {
  sjNos: string[]
  fdSndDate: string // YYYY-MM-DD
  fdCarID: string
  fdSupir: string
  fdTelpSupir?: string | null
  expedition?: {
    fdExpID: string
    fdResiExp: string
    fdCurrExp?: string
    fdTotalExp?: number
    fdPaid?: number
  } | null
}

export interface VehicleItem {
  fdCarID: string
  fdSupir: string
  fdNotel: string
  fdStatus: number
}

export interface ExpeditionItem {
  fdExpID: string
  fdExpName: string
  fdExpAddr1: string
  fdTelp: string
}

export interface DeliveryConfirmBatchItem {
  batchDate: string
  batchSession: 'Pagi' | 'Sore'
  batchLabel: string
  batchTime?: string
  batchTimestamp: string
  sjUdara: number
  sjLaut: number
  totalSj: number
  packUdara: number
  packLaut: number
  totalPack: number
  weightUdara: number
  weightLaut: number
  totalWeight: number
}

export interface DeliveryDailyCompareItem {
  date: string // YYYY-MM-DD
  displayDate: string // DD MMM
  dayName: string // e.g. "Kam"
  // Realisasi Terkonfirmasi (tbDeliveryConfirm)
  realSjUdara: number
  realSjLaut: number
  totalRealSj: number
  realPackUdara: number
  realPackLaut: number
  totalRealPack: number
  realWeightUdara: number
  realWeightLaut: number
  totalRealWeight: number
  batchCount: number
  batches?: DeliveryConfirmBatchItem[]
  // Target Estimasi Kirim (tbDelivery.fdEstimasi)
  estSjUdara: number
  estSjLaut: number
  totalEstSj: number
  estPackUdara: number
  estPackLaut: number
  totalEstPack: number
  estWeightUdara: number
  estWeightLaut: number
  totalEstWeight: number
  // Komparasi & Ketercapaian
  achievementPct: number // % realisasi terhadap target estimasi
  diffSj: number // totalRealSj - totalEstSj
  // Analisis Pending & Toleransi Estimasi (fdSent = fdEstimasi + 1 itu max)
  pendingOverdueSj: number // Belum terkirim dan sudah lewat fdEstimasi + 1
  pendingToleransiSj: number // Belum terkirim tapi masih dalam toleransi <= fdEstimasi + 1
  pendingSjTotal: number // Total belum terkirim (fdSent = 0)
  sentOnTimeSj: number // Terkirim tepat waktu (<= fdEstimasi + 1)
  sentLateSj: number // Terkirim lewat batas (> fdEstimasi + 1)
  pendingOverduePack: number
  pendingOverdueWeight: number
}

export interface DeliveryConfirmTrendsSummary {
  days: number
  totalBatches: number
  // Realisasi
  totalSjSent: number
  totalSjUdara: number
  totalSjLaut: number
  totalColySent: number
  totalWeightSent: number
  avgSjPerBatch: number
  // Estimasi
  totalSjEstimated: number
  totalEstUdara: number
  totalEstLaut: number
  totalEstColy: number
  totalEstWeight: number
  // Ketercapaian Global
  overallAchievementPct: number
  diffTotalSj: number
  // Pending Overdue Global (> fdEstimasi + 1)
  totalPendingOverdueSj: number
  totalPendingSj: number
}

export interface DeliveryConfirmTrendsResponse {
  days: number
  summary: DeliveryConfirmTrendsSummary
  batches: DeliveryConfirmBatchItem[]
  dailyComparison: DeliveryDailyCompareItem[]
}

export interface DeliveryEstimasiDetailItem {
  fdSJNo: string
  fdSJDate: string | null
  fdEstimasi: string | null
  maxToleranceDate: string | null
  fdSent: number
  fdLoad: string | null
  fdSndDate: string | null
  fdKembali: string | null
  fdCustCode: string | null
  custName: string
  fdListCode: string | null
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdJmlPackSJ: number
  fdSatuan: string
  fdJmlBeratSJ: number
  fdCarID: string | null
  fdSupir: string | null
  fdTelpSupir: string | null
  fdListType: number
  overdueDays: number
  isOverdueHPlus1: boolean
  statusLabel: 'PENDING_OVERDUE' | 'PENDING_TOLERANCE' | 'SENT_ONTIME' | 'SENT_LATE' | string
  fdTerima: string | null
  fdDescr: string | null
}

export interface DeliveryEstimasiDetailResponse {
  date: string
  filterType: 'all' | 'overdue' | 'pending' | 'sent'
  totalSj: number
  pendingOverdueCount: number
  pendingToleranceCount: number
  sentCount: number
  totalPack: number
  totalWeight: number
  items: DeliveryEstimasiDetailItem[]
}

export interface DeliveryBatchOrderItem {
  fdSJNo: string
  fdSJDate: string
  fdEstimasi?: string
  fdSent: number
  fdSndDate?: string
  fdKembali?: string
  fdCarID: string
  fdSupir: string
  fdTelpSupir?: string
  fdCustCode: string
  fdCustName: string
  fdListCode: string
  fdListType: number
  moda: 'Udara' | 'Laut'
  fdJmlPackSJ: number
  fdSatuan: string
  fdJmlBeratSJ: number
  fdDescr?: string
  fdAddr?: string
  fdCity?: string
  fdMarkingCode: string
  fdMarkingNo?: string
  fdM3: number
  branchCode: string
  branchName: string
  batchTime?: string
}

export interface DeliveryBatchDetailResponse {
  batchDate: string
  batchSession: 'Pagi' | 'Sore'
  batchTime: string
  totalSj: number
  totalPack: number
  totalWeight: number
  sjUdara: number
  sjLaut: number
  packUdara: number
  packLaut: number
  weightUdara: number
  weightLaut: number
  items: DeliveryBatchOrderItem[]
}


