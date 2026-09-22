import type { DeliveryOrderDetailResponse, PrintDeliveryOrderDto } from '../types/delivery-orders.types'

export interface DeliveryPrintDocumentProps {
  data: DeliveryOrderDetailResponse
  documentType?: 'both' | 'sj' | 'ukuran'
  options?: PrintDeliveryOrderDto
  isPrintPreview?: boolean
}

/**
 * Format tanggal dalam gaya Indonesia lengkap (e.g. 21 September 2026)
 */
function formatLongDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Komponen Lembar Surat Jalan Resmi (Berdasarkan rpf_delivery_2022.frx)
 * Ukuran Kertas: Continuous 23 cm (lebar) x 16.5 cm (tinggi) Landscape
 */
export function SuratJalanSheet({
  data,
  options = {},
  isPrintPreview = false,
}: {
  data: DeliveryOrderDetailResponse
  options?: PrintDeliveryOrderDto
  isPrintPreview?: boolean
}) {
  const { delivery, customer, entryList, orderDelivery, expedition, dimensions } = data

  const isAir = delivery.fdListType === 1
  const isSJKosong = Boolean(options.cetakSJKosong)
  const showUkuran = Boolean(options.cetakUkuran)
  const showKeterangan = options.cetakKeterangan !== false
  const showSupir = options.cetakSupir !== false

  // Maksimal 5 baris dimensi pada lembar Surat Jalan utama (sesuai aturan FoxPro sp_tbDeliveryPrint_2021)
  const displayDimensions = showUkuran ? (dimensions || []).slice(0, 5) : []

  // Data kalkulasi
  const qty = isSJKosong ? '' : delivery.fdJmlPackSJ ?? entryList?.fdJmlPack ?? 0
  const satuan = isSJKosong ? '' : (delivery.fdSatuan || entryList?.fdSatuan || 'KOLI')
  const berat = isSJKosong ? '' : delivery.fdJmlBeratSJ ?? entryList?.fdJmlBerat ?? 0
  const m3 = isSJKosong ? '' : (data.m3Comparison?.m3Gudang || 0)
  const vfc = isSJKosong ? '' : (dimensions.reduce((sum, d) => sum + ((d.fdPjg * d.fdLbr * d.fdTng * d.fdQty) / 6000), 0))

  // Tanggal estimasi
  const tglKirim = delivery.fdEstimasi || delivery.fdSJDate || new Date().toISOString()
  const displayDate = formatLongDate(tglKirim)

  // Status COD
  const isCod = orderDelivery?.fdJenisPembayaran === 1 || orderDelivery?.fdEksBayar === 1

  return (
    <div
      className={`print-sheet relative bg-white text-black font-mono select-none overflow-hidden ${
        isPrintPreview
          ? 'w-[230mm] h-[165mm] min-h-[165mm] max-h-[165mm] p-[6mm_8mm] border border-neutral-300 shadow-md mx-auto my-3 text-[11px] leading-tight rounded-sm'
          : 'w-[230mm] h-[165mm] min-h-[165mm] max-h-[165mm] p-[6mm_8mm] text-[11px] leading-tight'
      }`}
      style={{
        boxSizing: 'border-box',
        pageBreakAfter: 'always',
        breakAfter: 'page',
      }}
    >
      {/* ─── HEADER: JUDUL & KOTA TANGGAL ─── */}
      <div className="flex justify-between items-start border-b border-black pb-1.5 mb-1.5">
        <div>
          <h1 className="text-base font-black tracking-widest uppercase font-serif">
            SURAT JALAN
          </h1>
          <span className="text-[9px] uppercase tracking-wider text-neutral-600 block">
            PT. SAMUDERA ENERGI JAYA (M-SHIPPING)
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-semibold">Jakarta, {displayDate}</span>
          {entryList?.fdBranchCode && (
            <span className="text-[9.5px] font-bold block">Cabang: {entryList.fdBranchCode}</span>
          )}
        </div>
      </div>

      {/* ─── GRID INFORMASI DOKUMEN & PENERIMA (2 KOLOM) ─── */}
      <div className="grid grid-cols-2 gap-3 text-[10px] border-b border-black pb-1.5 mb-1.5">
        {/* Kolom Kiri: Meta Surat Jalan & Kargo */}
        <div className="space-y-0.5">
          <div className="flex">
            <span className="w-24 shrink-0 font-bold">No. SJ</span>
            <span className="w-2 shrink-0">:</span>
            <span className="font-extrabold text-[11px] font-mono tracking-wide">
              {delivery.fdSJNo}
            </span>
          </div>
          <div className="flex">
            <span className="w-24 shrink-0 font-semibold">No. Mobil</span>
            <span className="w-2 shrink-0">:</span>
            <span className="font-bold">{delivery.fdCarID || '—'}</span>
          </div>
          <div className="flex">
            <span className="w-24 shrink-0 font-semibold">No. Resi</span>
            <span className="w-2 shrink-0">:</span>
            <span className="font-semibold">{delivery.fdTerima || entryList?.fdTerima || '—'}</span>
          </div>
          <div className="flex">
            <span className="w-24 shrink-0 font-semibold">Shpmt. Mark.</span>
            <span className="w-2 shrink-0">:</span>
            <span className="font-extrabold">
              {entryList?.fdMarkingCode || '—'}
            </span>
          </div>
          <div className="flex">
            <span className="w-24 shrink-0 font-semibold">Mark. No.</span>
            <span className="w-2 shrink-0">:</span>
            <span>{entryList?.fdMarkingNo || '—'}</span>
          </div>
          <div className="flex">
            <span className="w-24 shrink-0 font-semibold">ID Inv / List</span>
            <span className="w-2 shrink-0">:</span>
            <span>{entryList?.fdInvoiceNo || delivery.fdListCode || '—'}</span>
          </div>
          {delivery.fdDescr && showKeterangan && (
            <div className="flex text-[9px] italic text-neutral-800">
              <span className="w-24 shrink-0 font-semibold">Keterangan</span>
              <span className="w-2 shrink-0">:</span>
              <span className="truncate max-w-[210px]">{delivery.fdDescr}</span>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Tujuan & Kepada Penerima */}
        <div className="space-y-0.5 relative pl-2 border-l border-neutral-300">
          <div className="flex justify-between items-start">
            <span className="font-bold uppercase text-[9.5px]">Kepada :</span>
            {isCod && (
              <span className="border-2 border-black font-black text-[10px] px-1 py-0.2 uppercase tracking-wider">
                COD
              </span>
            )}
          </div>
          <div className="font-extrabold text-[11px] leading-snug">
            {delivery.fdCustNameSJ || customer?.fdCustName || 'Customer'}
          </div>
          <div className="text-[9.5px] leading-tight text-neutral-900">
            {delivery.fdAddr ? (
              <>
                {delivery.fdAddr} {delivery.fdCity ? `, ${delivery.fdCity}` : ''}
              </>
            ) : customer?.fdAddr1 ? (
              <>
                {customer.fdAddr1} {customer.fdCityName ? `, ${customer.fdCityName}` : ''}
              </>
            ) : (
              'Alamat tidak terdata'
            )}
          </div>
          <div className="text-[9px] font-semibold text-neutral-800">
            Telp / HP: {delivery.fdHp || delivery.fdTelp || customer?.fdHP || customer?.fdTelp || '—'}
            {delivery.fdContact ? ` (PIC: ${delivery.fdContact})` : ''}
          </div>
          {delivery.fdExpID && expedition && (
            <div className="text-[9px] pt-0.5 border-t border-dotted border-neutral-400 mt-0.5">
              <span className="font-bold">Via Ekspedisi: </span>
              <span>{expedition.fdExpName} {expedition.fdExpAddr1 ? `(${expedition.fdExpAddr1})` : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── TABEL KUANTITAS MUATAN (QTY, BERAT, VOLUME, KETERANGAN) ─── */}
      <table className="w-full border-collapse text-[10px] border border-black mb-1.5">
        <thead>
          <tr className="border-b border-black bg-neutral-100 text-center font-bold">
            <th className="py-1 px-2 border-r border-black w-24">QTY</th>
            <th className="py-1 px-2 border-r border-black w-24">BERAT</th>
            <th className="py-1 px-2 border-r border-black w-36">
              {isAir ? 'VOLUME FREIGHT' : 'VOLUME'}
            </th>
            <th className="py-1 px-2 text-left">KETERANGAN / KOMODITAS</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black text-center align-top">
            <td className="py-1 px-2 border-r border-black font-mono font-bold text-[11px]">
              {isSJKosong ? '—' : `${qty} ${satuan}`}
            </td>
            <td className="py-1 px-2 border-r border-black font-mono">
              {isSJKosong ? '—' : `${berat} Kgs`}
            </td>
            <td className="py-1 px-2 border-r border-black font-mono">
              {isSJKosong ? (
                '—'
              ) : isAir ? (
                `${Number(vfc).toFixed(2)} Kgs`
              ) : (
                `${Number(m3).toFixed(4)} m³`
              )}
            </td>
            <td className="py-1 px-2 text-left text-[9.5px]">
              {isSJKosong ? (
                <span className="italic text-neutral-400">Lembar Isian Kosong</span>
              ) : (
                <div>
                  <span className="font-bold uppercase">
                    {entryList?.fdComodity || entryList?.fdDesc || 'BARANG PAKET'}
                  </span>
                  {showKeterangan && delivery.fdDescr && (
                    <span className="block text-[9px] text-neutral-700 italic">
                      {delivery.fdDescr}
                    </span>
                  )}
                </div>
              )}
            </td>
          </tr>

          {/* Sub-Rincian Dimensi Coly (Maks 5 Baris pada SJ Utama) */}
          {displayDimensions.length > 0 && !isSJKosong && (
            <tr className="text-[8.5px] bg-neutral-50/50">
              <td colSpan={4} className="py-1 px-2 border-t border-dashed border-neutral-400">
                <div className="flex items-center gap-1 font-bold mb-0.5 text-[9px]">
                  <span>Detail Ukuran Koli (m):</span>
                  {dimensions.length > 5 && (
                    <span className="font-normal italic text-neutral-600">
                      (5 dari {dimensions.length} box ditampilkan — lihat Lampiran Ukuran lengkap)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {displayDimensions.map((d, i) => {
                    const p = (d.fdPjg / 100).toFixed(2)
                    const l = (d.fdLbr / 100).toFixed(2)
                    const t = (d.fdTng / 100).toFixed(2)
                    const vol = Number(d.m3Total || 0).toFixed(4)
                    return (
                      <div key={i} className="flex justify-between font-mono">
                        <span>
                          #{i + 1} {p}m × {l}m × {t}m ({d.fdQty} box)
                        </span>
                        <span className="font-semibold">= {vol} m³</span>
                      </div>
                    )
                  })}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ─── KETENTUAN KELUHAN & PERHATIAN ─── */}
      <div className="grid grid-cols-12 gap-2 text-[8px] leading-[1.15] border border-black p-1.5 mb-1.5 bg-neutral-50/30">
        <div className="col-span-8 space-y-0.5">
          <p className="font-bold uppercase tracking-wider text-[8.5px]">PERHATIAN:</p>
          <p>1. Waktu pengajuan keluhan adalah 2 (dua) hari kerja sejak tanggal penerimaan barang yang tertera di Surat Jalan.</p>
          <p>2. Pengajuan keluhan tidak berlaku bagi barang yang diterima dalam keadaan original packing.</p>
          <p>3. Keluhan atas penerimaan barang tidak meliputi kerusakan akibat sifat-sifat alamiah barang itu sendiri dan force majeure.</p>
        </div>
        <div className="col-span-4 flex flex-col justify-center border-l border-neutral-300 pl-2 text-[8.5px] space-y-1 font-semibold">
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[9px] font-bold">
              {delivery.fdKondisiBarang === 1 ? '✓' : ''}
            </span>
            <span>ORIGINAL PACKING</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[9px] font-bold">
              {delivery.fdKondisiBarang !== 1 ? '✓' : ''}
            </span>
            <span>TIDAK ORIGINAL PACKING</span>
          </div>
        </div>
      </div>

      {/* ─── FOOTER TANDA TERIMA 3 KOLOM ─── */}
      <div className="pt-0.5">
        <p className="text-[8.5px] font-semibold text-neutral-800 mb-1">
          Barang diterima dengan baik oleh,
        </p>
        <div className="grid grid-cols-3 text-center text-[9px]">
          {/* Penerima */}
          <div className="flex flex-col justify-between h-14">
            <span className="font-bold">Penerima,</span>
            <div className="font-mono text-[8.5px]">
              ( .................................... )
            </div>
          </div>

          {/* Pengirim / Supir */}
          <div className="flex flex-col justify-between h-14">
            <span className="font-bold">Pengirim / Supir,</span>
            <div className="font-mono text-[9px] font-bold">
              {showSupir && delivery.fdSupir ? `( ${delivery.fdSupir} )` : '( .................................... )'}
            </div>
          </div>

          {/* Gudang / Petugas Print */}
          <div className="flex flex-col justify-between h-14">
            <span className="font-bold">Gudang,</span>
            <div className="font-mono text-[9px] font-semibold">
              ( {delivery.fdPrintBy || 'Petugas'} )
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Komponen Lembar Lampiran Ukuran Marking (Berdasarkan rpt_deliverysize_bill_2023.FRX)
 * Ukuran Kertas: Continuous 23 cm (lebar) x 16.5 cm (tinggi) Landscape
 */
export function LampiranUkuranSheet({
  data,
  isPrintPreview = false,
}: {
  data: DeliveryOrderDetailResponse
  isPrintPreview?: boolean
}) {
  const { delivery, customer, entryList, dimensions } = data
  const isAir = delivery.fdListType === 1

  const items = dimensions || []
  const totalQty = items.reduce((sum, d) => sum + Number(d.fdQty || 0), 0)
  
  // Total volume (m3 untuk laut, kg untuk udara)
  const totalVolumeM3 = items.reduce((sum, d) => {
    const vol = ((d.fdPjg / 100) * (d.fdLbr / 100) * (d.fdTng / 100) * d.fdQty)
    return sum + vol
  }, 0)

  const totalVolumeVfc = items.reduce((sum, d) => {
    const vfc = ((d.fdPjg * d.fdLbr * d.fdTng * d.fdQty) / 6000)
    return sum + vfc
  }, 0)

  const displayDate = formatLongDate(delivery.fdEstimasi || delivery.fdSJDate || new Date().toISOString())

  return (
    <div
      className={`print-sheet relative bg-white text-black font-mono select-none overflow-hidden ${
        isPrintPreview
          ? 'w-[230mm] h-[165mm] min-h-[165mm] max-h-[165mm] p-[6mm_8mm] border border-neutral-300 shadow-md mx-auto my-3 text-[11px] leading-tight rounded-sm'
          : 'w-[230mm] h-[165mm] min-h-[165mm] max-h-[165mm] p-[6mm_8mm] text-[11px] leading-tight'
      }`}
      style={{
        boxSizing: 'border-box',
        pageBreakAfter: 'always',
        breakAfter: 'page',
      }}
    >
      {/* ─── HEADER: LAMPIRAN UKURAN MARKING ─── */}
      <div className="border-b border-black pb-1 mb-1.5 flex justify-between items-start">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider font-sans">
            Lampiran Ukuran Marking
          </h2>
          <span className="text-[8.5px] text-neutral-600 uppercase tracking-widest block">
            Rincian Dimensi Fisik Kargo Surat Jalan
          </span>
        </div>
        <div className="text-right text-[9.5px]">
          <span className="font-semibold">Date : {displayDate}</span>
          <span className="block text-[9px] text-neutral-600">Page : 1 / 1</span>
        </div>
      </div>

      {/* ─── HEADER INFORMASI 3 BLOK (SESUAI FRX) ─── */}
      <div className="grid grid-cols-3 gap-2 text-[10px] border-b border-black pb-1.5 mb-1.5 font-sans">
        {/* Blok 1: SJ & Customer */}
        <div className="space-y-0.5">
          <div className="flex">
            <span className="w-20 shrink-0 font-semibold">Nomor SJ</span>
            <span className="w-2 shrink-0">:</span>
            <span className="font-mono font-extrabold">{delivery.fdSJNo}</span>
          </div>
          <div className="flex">
            <span className="w-20 shrink-0 font-semibold">Customer</span>
            <span className="w-2 shrink-0">:</span>
            <span className="font-bold truncate max-w-[150px]">
              {delivery.fdCustNameSJ || customer?.fdCustName || 'Customer'}
            </span>
          </div>
        </div>

        {/* Blok 2: Marking Info */}
        <div className="space-y-0.5">
          <div className="flex">
            <span className="w-24 shrink-0 font-semibold">Kode Marking</span>
            <span className="w-2 shrink-0">:</span>
            <span className="font-mono font-bold">
              {entryList?.fdMarkingCode || '—'}
            </span>
          </div>
          <div className="flex">
            <span className="w-24 shrink-0 font-semibold">No. Marking</span>
            <span className="w-2 shrink-0">:</span>
            <span className="font-mono">{entryList?.fdMarkingNo || '—'}</span>
          </div>
        </div>

        {/* Blok 3: Ringkasan Muatan */}
        <div className="space-y-0.5 text-right font-mono">
          <div>
            <span className="text-[9px] text-neutral-600 uppercase">Total Muatan: </span>
            <span className="font-bold">{delivery.fdJmlPackSJ ?? entryList?.fdJmlPack ?? totalQty} {delivery.fdSatuan || 'KOLI'}</span>
          </div>
          <div>
            <span className="text-[9px] text-neutral-600 uppercase">Total Tonase: </span>
            <span className="font-bold">{delivery.fdJmlBeratSJ ?? entryList?.fdJmlBerat ?? 0} Kg</span>
          </div>
        </div>
      </div>

      {/* ─── TABEL DIMENSI KOLI FISIK (PERSIS FORMAT rpt_deliverysize_bill_2023) ─── */}
      <div className="overflow-hidden border border-black mb-1.5">
        <table className="w-full border-collapse text-[9.5px]">
          <thead>
            <tr className="border-b border-black bg-neutral-100 font-sans font-bold text-center">
              <th className="py-1 px-1.5 border-r border-black w-10">No #</th>
              <th className="py-1 px-1.5 border-r border-black w-20">Panjang (cm)</th>
              <th className="py-1 px-1.5 border-r border-black w-20">Lebar (cm)</th>
              <th className="py-1 px-1.5 border-r border-black w-20">Tinggi (cm)</th>
              <th className="py-1 px-1.5 border-r border-black w-16">Jumlah</th>
              <th className="py-1 px-2 border-r border-black w-28 text-right">
                {isAir ? 'Total (VFC Kg)' : 'Total (M³)'}
              </th>
              <th className="py-1 px-2 text-left">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-300 font-mono">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4 italic text-neutral-500">
                  Tidak ada rincian ukuran fisik coly yang tercatat (tbEntryListDetail).
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const pjg = Number(item.fdPjg || 0)
                const lbr = Number(item.fdLbr || 0)
                const tng = Number(item.fdTng || 0)
                const qty = Number(item.fdQty || 1)
                const rowTotal = isAir
                  ? ((pjg * lbr * tng * qty) / 6000)
                  : ((pjg / 100) * (lbr / 100) * (tng / 100) * qty)

                return (
                  <tr key={idx} className="hover:bg-neutral-50 text-center">
                    <td className="py-0.5 px-1.5 border-r border-black">{idx + 1}.</td>
                    <td className="py-0.5 px-1.5 border-r border-black">{pjg}</td>
                    <td className="py-0.5 px-1.5 border-r border-black">{lbr}</td>
                    <td className="py-0.5 px-1.5 border-r border-black">{tng}</td>
                    <td className="py-0.5 px-1.5 border-r border-black font-bold">{qty}</td>
                    <td className="py-0.5 px-2 border-r border-black text-right font-bold">
                      {isAir ? rowTotal.toFixed(2) : rowTotal.toFixed(4)}
                    </td>
                    <td className="py-0.5 px-2 text-left font-sans text-[9px] truncate max-w-[180px]">
                      {item.fdDescr || '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {/* ─── FOOTER GRAND TOTAL ─── */}
          <tfoot>
            <tr className="border-t-2 border-black bg-neutral-100 font-bold font-mono">
              <td colSpan={4} className="py-1 px-2 text-right border-r border-black font-sans uppercase">
                Grand Total :
              </td>
              <td className="py-1 px-1.5 text-center border-r border-black">
                {totalQty}
              </td>
              <td className="py-1 px-2 text-right border-r border-black">
                {isAir ? `${totalVolumeVfc.toFixed(2)} Kg` : `${totalVolumeM3.toFixed(4)} m³`}
              </td>
              <td className="py-1 px-2 text-left font-sans text-[8.5px] italic text-neutral-600">
                {items.length} rincian box
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ─── FOOTER VALIDASI DOKUMEN UKURAN ─── */}
      <div className="flex justify-between items-end text-[8.5px] pt-1 border-t border-neutral-300">
        <div>
          <p className="text-neutral-600 italic">
            * Lampiran ini merupakan rekaman ukuran fisik resmi yang diverifikasi di gudang logistik.
          </p>
        </div>
        <div className="flex items-center gap-8 font-sans text-center">
          <div>
            <p className="mb-6 font-semibold">Petugas Ukur,</p>
            <p className="border-t border-black font-mono px-4">( .................... )</p>
          </div>
          <div>
            <p className="mb-6 font-semibold">Gudang Logistik,</p>
            <p className="border-t border-black font-mono px-4">( {delivery.fdPrintBy || 'Petugas'} )</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Komponen Induk Penggabung Dokumen Cetak Surat Jalan
 */
export function DeliveryPrintDocument({
  data,
  documentType = 'both',
  options = {},
  isPrintPreview = false,
}: DeliveryPrintDocumentProps) {
  return (
    <div className="delivery-print-container">
      <style>{`
        @page {
          size: 230mm 165mm landscape;
          margin: 0;
        }
        @media print {
          html, body {
            width: 230mm;
            height: 165mm;
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .delivery-print-container {
            margin: 0;
            padding: 0;
          }
          .print-sheet {
            width: 230mm !important;
            height: 165mm !important;
            max-height: 165mm !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .print-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* Lembar 1: Surat Jalan Resmi */}
      {(documentType === 'both' || documentType === 'sj') && (
        <SuratJalanSheet
          data={data}
          options={options}
          isPrintPreview={isPrintPreview}
        />
      )}

      {/* Lembar 2: Lampiran Ukuran Marking */}
      {(documentType === 'both' || documentType === 'ukuran') && (
        <LampiranUkuranSheet
          data={data}
          isPrintPreview={isPrintPreview}
        />
      )}
    </div>
  )
}
