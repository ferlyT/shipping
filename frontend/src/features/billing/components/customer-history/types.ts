import type {
  CustomerBillingHistoryResponse,
  CustomerBillingHistoryItem,
  CustomerBillingHistoryDetail,
  FlatDetailTraceItem,
  CommodityAvgRate,
} from '../../types/billing.types'

export type {
  CustomerBillingHistoryResponse,
  CustomerBillingHistoryItem,
  CustomerBillingHistoryDetail,
  FlatDetailTraceItem,
  CommodityAvgRate,
}

export interface CustomerBillingHistoryModalProps {
  isOpen: boolean
  custCode: string | null
  custName?: string | null
  tglAgent?: string | null
  typeComodity?: string | null
  onClose: () => void
}

export type HistoryViewMode = 'detail' | 'invoice'
export type DiffFilterStatus = 'all' | 'diff' | 'same'
export type ModaFilter = 'all' | 'air' | 'sea'
export type PaymentFilter = 'all' | 'lunas' | 'partial' | 'issued' | 'unpaid' | 'overdue' | 'draft'

export interface CustomerHistoryFilterState {
  viewMode: HistoryViewMode
  search: string
  selectedYear: string
  selectedBranch: string
  selectedTypeComodity: string
  selectedDiffStatus: DiffFilterStatus
  selectedModa: ModaFilter
  selectedStatus: PaymentFilter
}

export interface CustomerHistoryKpiSummary {
  totalInvoices: number
  totalItems: number
  totalAmount: number
  totalM3: number
  totalWeight: number
  avgPricePerM3: number
  diffInvoicesCount: number
  diffItemsCount: number
  commodityAvgRates: CommodityAvgRate[]
  activeCommodityRate?: CommodityAvgRate | null
}
