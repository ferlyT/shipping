/**
 * Render a currency value dengan simbol rata kiri dan angkanya rata kanan — gaya
 * ledger/invoice, supaya digit antar baris rapi sejajar di sisi kanan.
 *
 * PENTING: simbol mata uang di-pass eksplisit lewat prop `currency`, BUKAN
 * di-assume selalu "Rp"/IDR. Data invoice/item ternyata bisa beda mata uang per
 * baris — lihat field `fdCurr1` di level header Billing (mis. "S$") dan `fdCurr`
 * di level BillingDetail per item (mis. "RP."). Kalau `currency` tidak dikasih,
 * fallback ke "Rp" untuk kompatibilitas kode lama yang belum di-update.
 *
 * Angkanya diformat manual (bukan pakai formatCurrency() dari lib/utils) karena
 * formatCurrency() memang sengaja hardcode style:'currency', currency:'IDR' —
 * kalau dipanggil untuk baris yang mata uangnya S$/USD/dll, simbolnya akan salah.
 *
 * PENTING soal tempat pakai: supaya split-nya kelihatan (bukan cuma nempel jadi
 * satu blok), elemen ini butuh CONTAINER yang lebih lebar dari teksnya sendiri
 * (mis. kolom tabel dengan `table-fixed` + width tetap, atau span dengan
 * min-width/flex-1).
 */
/** Versi string biasa (non-split) dari logic di atas, untuk teks inline compact
 * yang tidak butuh layout simbol-kiri/angka-kanan (mis. baris meta "2 × Rp 50.000"). */
export function formatWithCurrency(value: number | string | null | undefined, currency?: string | null): string {
  const numeric = value == null || value === '' ? null : Number(value)
  if (numeric == null || Number.isNaN(numeric)) return '—'
  let symbol = (currency || 'Rp.').trim()
  if (symbol.toUpperCase() === 'RP' || symbol.toUpperCase() === 'RP.') symbol = 'Rp.'
  return `${symbol} ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)}`
}

export function CurrencyValue({
  value,
  currency,
  className = '',
}: {
  value: number | string | null | undefined
  /** Simbol mata uang dari data, mis. row.fdCurr atau data.fdCurr1. Default "Rp." kalau kosong. */
  currency?: string | null
  className?: string
}) {
  const numeric = value == null || value === '' ? null : Number(value)
  let symbol = (currency || 'Rp.').trim()
  if (symbol.toUpperCase() === 'RP' || symbol.toUpperCase() === 'RP.') symbol = 'Rp.'
  const amount =
    numeric == null || Number.isNaN(numeric)
      ? '—'
      : new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)

  return (
    <span className={`inline-flex w-full items-baseline justify-between gap-2 ${className}`}>
      {amount !== '—' && <span className="shrink-0">{symbol}</span>}
      <span className="tabular-nums text-right">{amount}</span>
    </span>
  )
}
