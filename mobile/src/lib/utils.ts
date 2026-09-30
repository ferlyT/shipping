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

export function resolveAvatarUrl(url?: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const cleanPath = url.startsWith('/') ? url : `/${url}`
  return `https://app.sampai.co${cleanPath}`
}

export function getInitials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function cleanFoxProString(str: string | null | undefined): string {
  if (!str) return ''
  return str.replace(/\^/g, "'").trim()
}

export function displayCustName(name: string | null | undefined, fallback = '—'): string {
  if (!name || !name.trim()) return fallback
  return cleanFoxProString(name)
}

export function calcTotalVolume(dims: any[]): number {
  if (!dims || !Array.isArray(dims)) return 0
  return dims.reduce((sum, d) =>
    sum + (Number(d.fdPjg || 0) * Number(d.fdLbr || 0) * Number(d.fdTng || 0) * Number(d.fdQty || 0)) / 1_000_000, 0
  )
}

export function formatCustomerSince(dateStr?: string | Date | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function formatCustomerTenure(dateStr?: string | Date | null): string | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null
  const now = new Date()
  let months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
  if (now.getDate() < date.getDate()) months -= 1
  if (months < 1) return 'Baru'
  if (months < 12) return `${months} bln`
  const years = Math.floor(months / 12)
  return `${years} thn`
}



