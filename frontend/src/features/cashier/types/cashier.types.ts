export interface CashierItem {
  fdCashierID: string
  fdCashierDate: string | null
  fdCustCode: string
  fdCustName: string
  fdEmpCode: string
  fdPost: number
  fdCashierXX: string
  fdDescr?: string
  totalRcv: number
  totalDetail: number
  balance: number
  isBalanced: boolean
  rcvCount: number
  detailCount: number
}

export interface CashierRcvItem {
  fdCashierID: string
  fdID: string
  fdType: string
  fdCCYCode: string
  fdCurValue: number
  fdAmount: number
  fdBankID1: string
  bank1Name?: string
  fdGiroNo: string
  fdDate1: string | null
  fdDate2: string | null
  fdBankID2: string
  bank2Name?: string
}

export interface CashierDetailItem {
  fdCashierID: string
  fdID: string
  fdDate: string | null
  fdType: string
  fdInvNo: string
  fdCCYCode: string
  fdAmount: number
  fdCurValue: number
  fdTotal: number
}

export interface CashierDetailResponse {
  type: 'OFFICIAL' | 'TEMPORARY'
  header: {
    fdCashierID: string
    fdCashierDate: string | null
    fdEmpCode: string
    fdCustCode: string
    fdCustName: string
    customer?: {
      fdCustCode: string
      fdCustName: string
      fdContact?: string
      fdAddr1?: string
      fdCityName?: string
      fdTelp?: string
    }
    fdPost: number
    fdDescr?: string
    fdCashierXX?: string
  }
  rcvList: CashierRcvItem[]
  detailList: CashierDetailItem[]
  totalRcv: number
  totalDetail: number
  balance: number
  isBalanced: boolean
  isLocked: boolean
}

export interface BankOption {
  fdBankCode: string
  fdBankName: string
}

export interface CurrencyOption {
  fdCCYCode: string
  fdCCYName: string
  fdCCYValue: number
  CodeBCA?: string
}

export interface PayTypeOption {
  fdID: string
  fdPayName: string
}

export interface MasterDataResponse {
  banks: BankOption[]
  currencies: CurrencyOption[]
  payTypes: PayTypeOption[]
}

export interface CashierStatsResponse {
  todayTotalRcv: number
  todayInvoiceAllocated: number
  unbalancedCount: number
  pendingTempCount: number
}

export interface UnpaidInvoice {
  fdInvNo: string
  fdInvDate?: string | null
  fdDescr: string
  fdCCYCode: string
  fdJumlah: number
  fdBayar: number
  sisaTagihan: number
  isLunas: boolean
}

export interface UnattachedTempCashier {
  fdCashierID: string
  fdCashierDate: string | null
  fdCustCode: string
  fdCustName: string
  fdDescr: string
  totalRcv: number
}

export interface CreateCashierDto {
  custCode: string
  cashierDate: string
  descr?: string
  attachTempId?: string
}

export interface CreateTempCashierDto {
  custCode: string
  cashierDate: string
  descr?: string
}

export interface AddPaymentRcvDto {
  type: string
  ccyCode?: string
  currValue?: number
  amount: number
  bankId1?: string
  giroNo?: string
  giroDate?: string | null
  validDate?: string | null
  bankId2?: string
}

export interface BatchAllocateInvoicesDto {
  invoices: {
    invNo: string
    amount: number
    ccyCode?: string
    currValue?: number
  }[]
}
