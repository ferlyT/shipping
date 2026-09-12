// ATURAN: Semua formatter didefinisikan di sini
// DILARANG: format date/currency inline di komponen

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return String(date)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return String(date)
  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(d)
  return `${formatted} WIB`
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return formatted.replace(/^(IDR|Rp\.?|RP\.?)\s*/i, 'Rp. ')
}

export function formatWithCurrency(amount: number | null | undefined, currency = 'IDR'): string {
  if (amount == null) return '—'
  const upperCurr = (currency || 'IDR').toUpperCase().trim()
  if (upperCurr === 'IDR' || upperCurr === 'RP') {
    return formatCurrency(amount)
  }
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${upperCurr} ${formatted}`
}

export function formatCompactRupiah(amount: number | null | undefined): string {
  if (amount == null || amount === 0) return 'Rp 0'
  const val = Number(amount)
  if (Math.abs(val) >= 1_000_000_000) {
    return `Rp ${(val / 1_000_000_000).toFixed(2)} M`
  }
  if (Math.abs(val) >= 1_000_000) {
    return `Rp ${(val / 1_000_000).toFixed(1)} Jt`
  }
  return formatCurrency(val)
}

export function formatNumber(num: number | null | undefined): string {
  if (num == null) return '—'
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatDecimal(num: number | null | undefined, decimals = 2): string {
  if (num == null) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function formatWeight(weight: number | null | undefined): string {
  if (weight == null) return '—'
  return `${formatDecimal(weight, 1)} kg`
}
