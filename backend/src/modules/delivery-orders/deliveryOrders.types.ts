import { z } from 'zod'

/**
 * Delivery Orders Module Types
 */

export interface DeliveryOrdersQuery {
  page?: string
  limit?: string
  search?: string
  listCode?: string
  markingCode?: string
  branch?: string
  listType?: string
  sent?: string
  year?: string
  month?: string
  [key: string]: string | undefined
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

export interface DeliveryOrderKPIResponse {
  // Legacy backward-compatible fields
  totalSJ: number
  totalPackages: number
  totalWeight: number
  sjBulanIni: number
  onDelivery: number

  // Enhanced MoM & YoY Comparison structures
  currentMonth: PeriodMetrics
  prevMonth: PeriodMetrics
  lastYearSameMonth: PeriodMetrics

  comparisons: {
    totalSJ: MetricComparison
    totalPackages: MetricComparison
    totalWeight: MetricComparison
    deliveredSJ: MetricComparison
    onDeliverySJ: MetricComparison
  }

  monthlyTrends: MonthlyTrendItem[]
}

export interface DeliveryGroupedItem {
  listCode: string
  markingCode: string
  custCode?: string | null
  satuan?: string | null
  totalQty: number
  customerName: string | null
  resiNo: string | null
  comodity: string | null
  typeComodityId: number | null
  typeComodityName: string | null
  totalWeight: number | null
  branchCode: string | null
  branchName: string | null
  totalTerkirim: number
  sisa: number
  isSent: number
  gudangStatus?: number
  m3: number
  m3Source: 'Gudang' | 'tbEntryList'
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

export const CreateCustomerDestinationSchema = z.object({
  fdCustCode: z.string().min(1, 'Kode customer wajib diisi'),
  fdContact: z.string().optional(),
  fdHP: z.string().optional(),
  fdTelp: z.string().optional(),
  fdEmail: z.string().optional(),
  fdAddr: z.string().min(1, 'Alamat pengiriman wajib diisi'),
  fdCity: z.string().optional(),
})

export type CreateCustomerDestinationDto = z.infer<typeof CreateCustomerDestinationSchema>

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
  fdLoad: Date | null
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

export interface DeliveryMonitoringResponse {
  data: DeliveryMonitoringItem[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  kpis: DeliveryMonitoringKPIs
}

export const ConfirmDeliverySchema = z.object({
  sjNos: z.array(z.string().min(1)).min(1, 'Pilih setidaknya 1 Surat Jalan untuk dikonfirmasi'),
  fdSndDate: z.string().min(1, 'Tanggal Kirim / Konfirmasi wajib diisi'),
  fdCarID: z.string().min(1, 'Plat Mobil wajib dipilih'),
  fdSupir: z.string().min(1, 'Nama Supir wajib diisi'),
  fdTelpSupir: z.string().nullable().optional(),
  expedition: z.object({
    fdExpID: z.string().min(1),
    fdResiExp: z.string(),
    fdCurrExp: z.string().optional(),
    fdTotalExp: z.number().optional(),
    fdPaid: z.number().optional(),
  }).nullable().optional(),
})

export type ConfirmDeliveryDto = z.infer<typeof ConfirmDeliverySchema>

export interface DeliveryConfirmBatchItem {
  batchDate: string
  batchSession: 'Pagi' | 'Sore'
  batchLabel: string
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
  // Analisis Pending & Toleransi Estimasi (fdEstimasi + 1 hari max)
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
  maxToleranceDate: string | null // fdEstimasi + 1 hari
  fdSent: number
  fdLoad: string | null // Waktu realisasi konfirmasi pengiriman riil (tbDelivery.fdLoad)
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
  fdListType: number // 1: Udara, 2: Laut
  overdueDays: number // Hari keterlambatan setelah fdEstimasi + 1
  isOverdueHPlus1: boolean // True jika fdSent = 0 dan GETDATE > fdEstimasi + 1
  statusLabel: string // 'PENDING_OVERDUE' | 'PENDING_TOLERANCE' | 'SENT_ONTIME' | 'SENT_LATE'
  fdTerima: string | null
  fdDescr: string | null
  isBilled: boolean
  invNos: string | null
  invDates: string | null
  billCount: number
}
