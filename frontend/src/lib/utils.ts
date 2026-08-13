// ATURAN: Semua formatter dan helper didefinisikan di sini
// DILARANG: format date/currency inline di komponen
// CATATAN: formatDate() = locale id-ID (default), formatDateShort() = locale en-GB (untuk komponen marking & dual-bahasa)

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Class name merger — untuk komponen Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format tanggal ke "12 Jan 2024" (Waktu Indonesia / Jakarta sesuai database ERP)
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return String(date)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

// Format tanggal & jam ke "12 Jan 2024, 13:12 WIB"
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return String(date)
  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'UTC',
  }).format(d)
  return `${formatted} WIB`
}

// Format angka ke "Rp. 1,500,000.00"
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount)
  return formatted.replace(/^(IDR|Rp\.?|RP\.?)\s*/i, 'Rp. ')
}

// Format angka ringkas ke "Rp 1.64 M" atau "Rp 500 Jt"
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

// Format angka biasa ke "1,500"
export function formatNumber(num: number | null | undefined): string {
  if (num == null) return '—'
  return new Intl.NumberFormat('en-US').format(num)
}

// Format angka desimal ke 2 desimal, mis. "12.50"
export function formatDecimal(num: number | null | undefined, decimals = 2): string {
  if (num == null) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

// Format berat Kg ke "12.50 Kg"
export function formatWeight(num: number | null | undefined): string {
  if (num == null) return '—'
  return `${formatDecimal(num, 2)} Kg`
}

// Truncate string
export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str
}

// Get initials dari nama
export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// Format tanggal singkat ke "12 Jan 2024" (en-GB) — dipakai di komponen marking
// Terpisah dari formatDate() agar mendukung fitur dual bahasa
export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Format key grup marking "YYYY-MM" menjadi label bulan, misal: "July 2024"
export function formatYearMonthKey(key: string): string {
  if (key === 'Tidak diketahui' || key === 'Unknown') return key
  const [year, month] = key.split('-')
  if (!year || !month) return key
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
