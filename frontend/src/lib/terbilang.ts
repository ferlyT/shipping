// Utility: Konversi angka ke teks Indonesia (Terbilang)
// Contoh: terbilang(122481963.60) → "Seratus Dua Puluh Dua Juta Empat Ratus Delapan Puluh Satu Ribu Sembilan Ratus Enam Puluh Tiga Koma Enam Puluh"

const SATUAN = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan']
const BELASAN = ['Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas', 'Enam Belas', 'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas']
const PULUHAN = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh', 'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh']

function ratusan(n: number): string {
  if (n === 0) return ''
  const parts: string[] = []
  const ratus = Math.floor(n / 100)
  const sisa = n % 100
  if (ratus === 1) parts.push('Seratus')
  else if (ratus > 1) parts.push(SATUAN[ratus] + ' Ratus')
  if (sisa >= 10 && sisa <= 19) {
    parts.push(BELASAN[sisa - 10])
  } else {
    const puluh = Math.floor(sisa / 10)
    const sat = sisa % 10
    if (puluh > 0) parts.push(PULUHAN[puluh])
    if (sat > 0) parts.push(SATUAN[sat])
  }
  return parts.join(' ')
}

function integerTerbilang(n: number): string {
  if (n === 0) return 'Nol'
  if (n < 0) return 'Minus ' + integerTerbilang(-n)

  const parts: string[] = []

  const trilyun = Math.floor(n / 1_000_000_000_000)
  n = n % 1_000_000_000_000
  const milyar = Math.floor(n / 1_000_000_000)
  n = n % 1_000_000_000
  const juta = Math.floor(n / 1_000_000)
  n = n % 1_000_000
  const ribu = Math.floor(n / 1_000)
  n = n % 1_000

  if (trilyun > 0) parts.push(ratusan(trilyun) + ' Trilyun')
  if (milyar > 0) parts.push(ratusan(milyar) + ' Milyar')
  if (juta > 0) parts.push(ratusan(juta) + ' Juta')
  if (ribu === 1) parts.push('Seribu')
  else if (ribu > 1) parts.push(ratusan(ribu) + ' Ribu')
  if (n > 0) parts.push(ratusan(n))

  return parts.join(' ')
}

/**
 * Konversi angka ke teks Indonesia (Terbilang).
 * @param amount - Angka yang akan dikonversi (boleh desimal)
 * @returns Teks terbilang dalam Bahasa Indonesia dengan kapital setiap kata berakhiran ' Rp.'
 */
export function terbilang(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return 'Nol Rp.'

  const rounded = Math.round(amount * 100) / 100
  const intPart = Math.floor(Math.abs(rounded))
  const decPart = Math.round((Math.abs(rounded) - intPart) * 100)

  let result = (rounded < 0 ? 'Minus ' : '') + integerTerbilang(intPart)

  if (decPart > 0) {
    if (decPart < 10) {
      result += ' Koma Nol ' + SATUAN[decPart]
    } else {
      result += ' Koma ' + integerTerbilang(decPart)
    }
  }

  return result.trim() + ' Rp.'
}

