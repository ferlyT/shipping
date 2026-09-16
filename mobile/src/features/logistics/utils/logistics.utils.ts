// Utility helpers untuk Logistics Screen
// Dipindahkan dari app/(tabs)/logistics.tsx untuk modularitas

export function getBatchDateDisplay(item: any): { label: string; date: string | Date } | null {
  if (item.fdExitDate) return { label: 'Exit', date: item.fdExitDate }
  if (item.fdETA) return { label: 'ETA', date: item.fdETA }
  if (item.fdETD) return { label: 'ETD', date: item.fdETD }
  if (item.fdLoadDate) return { label: 'Load', date: item.fdLoadDate }
  if (item.fdDate || item.fdSysDate) return { label: 'Tgl', date: item.fdDate || item.fdSysDate }
  return null
}

export function getDeliveryOrderStatus(item: any): { label: string; variant: 'success' | 'warning' | 'info' } {
  if (item.fdSent === 1) {
    return { label: 'Delivered', variant: 'success' }
  }
  if (item.fdEstimasi) {
    const estimasiDate = new Date(item.fdEstimasi)
    const now = new Date()
    estimasiDate.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)
    if (now >= estimasiDate && (item.fdSent === 0 || !item.fdSent)) {
      return { label: 'On Delivery', variant: 'warning' }
    }
  }
  return { label: 'Scheduled', variant: 'info' }
}

export function getShipmentStatusBadge(status?: any): { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' } {
  if (!status) return { label: 'Waiting', variant: 'neutral' }
  const step = status.statusStep ?? 0
  const label = status.statusLabel || 'Waiting'

  if (step === -1) return { label: 'Canceled', variant: 'danger' }
  if (step === 10 || label === 'Blocked' || Boolean(status.isBlocked)) return { label: 'Blocked', variant: 'danger' }
  if (step === 0) return { label: 'Waiting', variant: 'neutral' }
  if (step === 1) return { label: label || 'Loading', variant: 'info' }
  if (step === 2) return { label: label || 'ETD', variant: 'info' }
  if (step === 3) return { label: label || 'ETA', variant: 'warning' }
  if (step === 4) return { label: label || 'Warehouse', variant: 'success' }
  if (step === 5) return { label: label || 'Delivery', variant: 'info' }
  if (step === 6) return { label: label || 'Delivered', variant: 'success' }
  if (step === 7) return { label: label || 'Billed', variant: 'info' }
  if (step === 8) return { label: label || 'Partial', variant: 'warning' }
  if (step === 9) return { label: label || 'Paid', variant: 'success' }
  return { label, variant: 'neutral' }
}

export function getFinancialStatusBadge(financialStatus?: string, isBlocked?: number | boolean): {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
} {
  const isItemBlocked = Number(isBlocked) === 1 || financialStatus === 'BLOCKED'
  const finStatus = (financialStatus || 'NO STATUS').toUpperCase()

  if (isItemBlocked || finStatus === 'BLOCKED') return { label: 'BLOCKED', variant: 'danger' }
  if (finStatus === 'OK') return { label: 'OK', variant: 'neutral' }
  if (finStatus === 'COD') return { label: 'COD', variant: 'success' }
  if (finStatus === 'WARNING') return { label: 'WARNING', variant: 'warning' }
  if (finStatus === 'URGENT') return { label: 'URGENT', variant: 'info' }
  if (finStatus === 'PAID' || finStatus === 'LUNAS') return { label: 'LUNAS', variant: 'success' }
  return { label: finStatus || 'NO STATUS', variant: 'neutral' }
}
