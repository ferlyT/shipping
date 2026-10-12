import type { M3CheckResponse } from '../../types/billing.types'
import type { BillingValidationState } from '../../hooks/useBillingValidation'
import type { DimensionSourceKey } from '../DimensionDetailModal'
import type { BillType } from '../../constants/billing.constants'

export type ValidationCardTab = 'profile' | 'm3_weight' | 'overweight' | 'freight' | 'transport'

export interface InvoiceDetail {
  fdInvNo: string
  fdID: string
  fdItemName: string
  fdQty: number
  fdListCode: string | null
  fdItemPrice: number
  fdTotal: number
  fdCurr: string | null
  fdTypeComodity?: number | null
  fdComodity?: string | null
}

export interface MarkingDetailItem {
  fdListCode: string
  fdMarkingNo: string
  fdQty: number | null
  fdM3PL: number | null
  fdM3Gudang: number | null
  fdM3Komplain: number | null
  fdBerat: number | null
  fdSatuan: string
}

export interface BillingValidationCardProps {
  listCode: string
  validation?: BillingValidationState
  validationData?: M3CheckResponse | null
  billedM3: number
  billedKg?: number
  billedVfc?: number
  invoiceDetails?: InvoiceDetail[]
  billFdTypeComodity?: number | null
  billType?: BillType
  billFdListType?: number | null
  markingCode?: string | null
  markingNo?: string | null
  invoiceNo?: string | null
  branchCode?: string | null
  customerName?: string | null
  custCode?: string | null
  onOpenSummaryModal?: () => void
  onOpenAuditModal?: () => void
  onOpenCustomerHargaModal?: () => void
  activeTab?: ValidationCardTab | null
  onTabChange?: (tab: ValidationCardTab) => void
}

/** Props derivasi internal yang diteruskan dari orchestrator ke tiap tab */
export interface ValidationCardDerivedProps {
  res: M3CheckResponse
  validation?: BillingValidationState
  listCode: string
  invoiceNo?: string | null
  markingCode?: string | null
  branchCode?: string | null
  customerName?: string | null
  custCode?: string | null
  invoiceDetails: InvoiceDetail[]
  billedM3: number
  billedKg: number
  billedVfc: number

  // Mode flags
  isAir: boolean
  isType2: boolean
  isGabungan: boolean

  // Match status
  matchStatus: 'MATCH_PRIMARY' | 'MATCH_MARKING' | 'NO_MATCH'
  matchedSourceName: string
  matchedRawVal: number
  isMinChargeApplied: boolean
  isMatch: boolean

  // Kandidat sumber data M3 / berat
  seaPrimaryMatch?: { sourceKey: string; sourceName: string; val: number; rawVal?: number } | null
  airPrimaryMatch?: { sourceKey: string; sourceName: string; val: number; rawVal?: number } | null
  primaryCandidates: { sourceKey: string; sourceName: string; val: number; rawVal?: number }[]
  airCandidates: { sourceKey: string; sourceName: string; val: number; rawVal?: number }[]

  // M3 values
  plValues: number[]
  gudangValues: number[]
  komplainValues: number[]
  komplainPerMarkingValues: number[]
  custMarkingValues: number[]
  plPerMarkingValues: number[]
  listBatchValues: number[]

  // Qty
  qtyList: number | null
  qtyPL: number | null
  qtyGudang: number | null
  qtyKomplain: number | null
  totalEntryList: number | null
  totalEntryKomplain: number | null
  fdSatuan: string
  activeQtys: { key: string; label: string; val: number }[]
  hasQtyMismatch: boolean
  isQtyListDiff: boolean
  isQtyPLDiff: boolean
  isQtyGudangDiff: boolean
  isQtyKomplainDiff: boolean

  // Berat
  beratList: number
  beratSJ: number
  beratKomplain: number
  beratMarking: number | null
  effectiveBilledKg: number
  effectiveBilledVfc: number
  vfcGudang: number
  minChargeKg: number
  activeWeights: { key: string; label: string; val: number }[]
  hasWeightMismatch: boolean
  isWeightListDiff: boolean
  isWeightSJDiff: boolean
  isWeightKomplainDiff: boolean
  isVfcMatched: boolean

  // Validated flags
  isBilledBelowMinM3: boolean
  effectiveMinChargeM3: number
  isCodOrUrgent: boolean
  recommendedM3: number
  isCodUrgentShortfall: boolean
  isType2Discrepancy: boolean
  localType2Compare: any

  // Overweight
  overweight: ReturnType<typeof import('../../hooks/useOverweightValidation').useOverweightValidation>

  // Ekspedisi
  validExpedisiList: any[]
  mustBillExpedisiList: any[]
  codExpedisiList: any[]
  unbilledExpedisiList: any[]
  hasUnbilledTransport: boolean
  hasFreightCharge: boolean
  hasOverweightIssue: boolean

  // Evaluated items
  evaluatedItems: any[]
  hasPriceDiscrepancy: boolean

  // Comodity
  defaultTypeId: number | null
  defaultComodityName: string

  // Mode catatan tarif
  effectiveNoteMode: 'air' | 'sea'
  selectedNoteMode: 'air' | 'sea' | null
  setSelectedNoteMode: (mode: 'air' | 'sea') => void

  // Modal openers
  setIsModalOpen: (open: boolean) => void
  setIsCustMarkingModalOpen: (open: boolean) => void
  setDimensionInitialSource: (source: DimensionSourceKey) => void
  setIsDimensionModalOpen: (open: boolean) => void
  onOpenAuditModal?: () => void
}

export type { M3CheckResponse }
