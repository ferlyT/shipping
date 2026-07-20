// ATURAN: Semua formatter dan helper didefinisikan di sini
// DILARANG: format date/currency inline di komponen
// CATATAN: formatDate() = locale id-ID (default), formatDateShort() = locale en-GB (untuk komponen marking & dual-bahasa)

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Class name merger — untuk komponen Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format tanggal ke "12 Jan 2024"
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date))
}

// Format angka ke "Rp 1.500.000"
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount)
}

// Format angka biasa ke "1.500"
export function formatNumber(num: number | null | undefined): string {
  if (num == null) return '—'
  return new Intl.NumberFormat('id-ID').format(num)
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
