export const CASHIER_STATUS = {
  ALL: 'all',
  OPEN: 'open',
  POSTED: 'posted',
} as const

export const TEMP_ATTACH_STATUS = {
  ALL: 'all',
  UNATTACHED: 'unattached',
  ATTACHED: 'attached',
} as const

export const DEFAULT_PAY_TYPES = [
  { id: 'CASH', label: 'CASH' },
  { id: 'TRANSFER', label: 'TRANSFER' },
  { id: 'GIRO', label: 'GIRO' },
  { id: 'CASH BACK', label: 'CASH BACK' },
]
