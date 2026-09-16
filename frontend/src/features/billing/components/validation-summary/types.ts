import type { BillType } from '../../constants/billing.constants'
import type { BillingValidationState } from '../../hooks/useBillingValidation'
import type { Billing, M3CheckResponse } from '../../types/billing.types'

export type SummaryModalTab = 'items' | 'm3_weight' | 'overweight' | 'freight' | 'transport'

export interface BillingValidationSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: string
  billingData: Billing
  validation?: BillingValidationState
  validationData?: M3CheckResponse | null
  isLoadingValidation?: boolean
  billedM3: number
  billedKg?: number
  billedVfc?: number
  unitTotals?: Record<string, number>
  billType?: BillType
  onOpenCustMarkingModal?: () => void
  onOpenIssueModal?: () => void
}
