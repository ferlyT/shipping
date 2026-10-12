import { useParams, Link } from 'react-router-dom'
import { Printer, ArrowLeft } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { useDataRevisionDetail } from '../hooks/useDataRevisions'

export default function DataRevisionPrintPage() {
  const { id } = useParams<{ id: string }>()
  const { data: detailData, isLoading } = useDataRevisionDetail(id)
  const form = detailData?.data

  const handlePrint = () => {
    window.print()
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="h-10 w-48 card skeleton-shimmer" />
        <div className="h-96 card skeleton-shimmer" />
      </div>
    )
  }

  if (!form) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Form Input &amp; Revisi Data tidak ditemukan.</p>
        <Link to={ROUTES.DATA_REVISIONS_LIST} className="btn btn-primary text-xs py-2 px-4">
          Kembali ke Daftar
        </Link>
      </div>
    )
  }

  const details = form.details && form.details.length > 0 ? form.details : [{ fdNo: 1 } as any]

  return (
    <div className="min-h-screen bg-neutral-100/60 dark:bg-neutral-950 p-4 sm:p-8">
      {/* Print Action Bar (Hidden during print) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          to={ROUTES.DATA_REVISIONS_LIST}
          className="btn btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> Kembali ke Daftar
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to={ROUTES.DATA_REVISION_EDIT(form.fdId)}
            className="btn btn-secondary text-xs py-2 px-3"
          >
            Edit Form
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 shadow-md"
          >
            <Printer size={15} /> Cetak Form Fisik (A4)
          </button>
        </div>
      </div>

      {/* A4 Paper Container */}
      <div
        className="max-w-[210mm] mx-auto bg-white text-black p-8 sm:p-10 shadow-xl border border-neutral-300 rounded-sm print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none text-[11px] leading-tight font-sans"
        id="print-sheet"
      >
        {/* Top Header Box */}
        <div className="border border-black flex mb-0">
          {/* Left Title */}
          <div className="w-1/2 p-4 flex items-center justify-center border-r border-black">
            <h1 className="text-base sm:text-lg font-bold tracking-wider text-center uppercase">
              FORM INPUT &amp; REVISI DATA
            </h1>
          </div>

          {/* Right Metadata */}
          <div className="w-1/2 p-3 text-[11px] space-y-1">
            <div className="flex">
              <span className="w-24 font-semibold">No. Form</span>
              <span className="mr-1">:</span>
              <span className="font-mono font-bold">{form.fdNomorForm}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-semibold">Tipe Data</span>
              <span className="mr-1">:</span>
              {form.fdAksi === 'CANCEL_DATA' ? (
                <span className="font-bold underline text-rose-800">PEMBATALAN DATA (CANCEL)</span>
              ) : (
                <span className="space-x-1">
                  <span className={form.fdTipeData === 'INPUT_BARU' ? 'font-bold underline' : 'line-through text-neutral-400'}>
                    INPUT BARU
                  </span>
                  <span>/</span>
                  <span className={form.fdTipeData === 'INPUT_LOCAL_CHARGES' ? 'font-bold underline' : 'line-through text-neutral-400'}>
                    INPUT LOCAL CHARGES
                  </span>
                  <span>/</span>
                  <span className={form.fdTipeData === 'REVISI' ? 'font-bold underline' : 'line-through text-neutral-400'}>
                    REVISI
                  </span>
                </span>
              )}
            </div>
            <div className="flex">
              <span className="w-24 font-semibold">Tanggal</span>
              <span className="mr-1">:</span>
              <span>{formatDate(form.fdTanggal)}</span>
            </div>
            {form.fdAksi && (
              <div className="flex text-[10px] text-neutral-500 pt-0.5">
                <span className="w-24 font-semibold">Target Aksi</span>
                <span className="mr-1">:</span>
                <span className="font-mono">
                  {form.fdAksi === 'CANCEL_DATA' ? 'CANCEL DATA (fdCancel=1)' : 'BUAT BILL'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Rows of Comparison */}
        <div className="divide-y divide-black border-x border-b border-black">
          {details.map((d, idx) => (
            <div key={idx} className="flex min-h-[140px] divide-x divide-black">
              {/* DATA AWAL */}
              <div className="w-1/2 p-3 space-y-1">
                <p className="font-bold underline text-[10px] uppercase mb-2">
                  DATA AWAL
                </p>
                <div className="flex">
                  <span className="w-32 font-semibold shrink-0">Customer Code</span>
                  <span className="mr-1">:</span>
                  <span className="font-medium">
                    {d.fdAwalCustCode ? (
                      <>
                        {d.fdAwalCustCode}
                        {d.fdAwalCustName ? ` / ${d.fdAwalCustName}` : ''}
                      </>
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold shrink-0">SP Mark / No. Resi</span>
                  <span className="mr-1">:</span>
                  <span>{d.fdAwalSpMark || '—'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold shrink-0">No. Billing</span>
                  <span className="mr-1">:</span>
                  <span className="font-mono">{d.fdAwalNoBilling || '—'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold shrink-0">Qty / Vol / Wgt</span>
                  <span className="mr-1">:</span>
                  <span>{d.fdAwalQtyVolWgt || '—'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold shrink-0">No. Inputan</span>
                  <span className="mr-1">:</span>
                  <span className="font-mono font-bold">{d.fdAwalNoInputan || '—'}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-32 font-semibold shrink-0">Detail</span>
                  <span className="mr-1">:</span>
                  <span className="italic">{d.fdAwalDetail || '—'}</span>
                </div>
              </div>

              {/* DATA BARU */}
              <div className="w-1/2 p-3 space-y-1 bg-neutral-50/50">
                <p className="font-bold underline text-[10px] uppercase mb-2">
                  DATA BARU
                </p>
                <div className="flex">
                  <span className="w-32 font-semibold shrink-0">Customer Code</span>
                  <span className="mr-1">:</span>
                  <span className="font-bold">
                    {d.fdBaruCustCode ? (
                      <>
                        {d.fdBaruCustCode}
                        {d.fdBaruCustName ? ` / ${d.fdBaruCustName}` : ''}
                      </>
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold shrink-0">SP Mark / No. Resi</span>
                  <span className="mr-1">:</span>
                  <span>{d.fdBaruSpMark || '—'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold shrink-0">No. Billing</span>
                  <span className="mr-1">:</span>
                  <span className="font-mono font-bold">{d.fdBaruNoBilling || '—'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold shrink-0">Qty / Vol / Wgt</span>
                  <span className="mr-1">:</span>
                  <span>{d.fdBaruQtyVolWgt || '—'}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-semibold shrink-0">No. Inputan</span>
                  <span className="mr-1">:</span>
                  <span className="font-mono font-bold">{d.fdBaruNoInputan || '—'}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-32 font-semibold shrink-0">Detail</span>
                  <span className="mr-1">:</span>
                  <span className="font-medium">{d.fdBaruDetail || '—'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 5 Signature Boxes */}
        <div className="border-x border-b border-black grid grid-cols-5 text-center text-[10px]">
          {/* DIBUAT OLEH */}
          <div className="border-r border-black p-2 flex flex-col justify-between min-h-[95px]">
            <p className="font-bold uppercase tracking-wider">DIBUAT OLEH</p>
            <div className="mt-8 border-b border-black/40 mx-2" />
            <p className="font-semibold truncate">
              {form.fdDibuatOleh || ' '}
            </p>
          </div>

          {/* STUFFING */}
          <div className="border-r border-black p-2 flex flex-col justify-between min-h-[95px]">
            <p className="font-bold uppercase tracking-wider">STUFFING</p>
            <div className="mt-8 border-b border-black/40 mx-2" />
            <p className="font-semibold truncate">
              {form.fdStuffing || ' '}
            </p>
          </div>

          {/* BILLING */}
          <div className="border-r border-black p-2 flex flex-col justify-between min-h-[95px]">
            <p className="font-bold uppercase tracking-wider">BILLING</p>
            <div className="mt-8 border-b border-black/40 mx-2" />
            <p className="font-semibold truncate">
              {form.fdBilling || ' '}
            </p>
          </div>

          {/* AR */}
          <div className="border-r border-black p-2 flex flex-col justify-between min-h-[95px]">
            <p className="font-bold uppercase tracking-wider">AR</p>
            <div className="mt-8 border-b border-black/40 mx-2" />
            <p className="font-semibold truncate">
              {form.fdAR || ' '}
            </p>
          </div>

          {/* DIKETAHUI */}
          <div className="p-2 flex flex-col justify-between min-h-[95px]">
            <p className="font-bold uppercase tracking-wider">DIKETAHUI</p>
            <div className="mt-8 border-b border-black/40 mx-2" />
            <p className="font-semibold truncate">
              {form.fdDiketahui || ' '}
            </p>
          </div>
        </div>

        {/* Footnote notes from physical form */}
        <div className="flex justify-between items-start pt-2 text-[9px] text-neutral-600">
          <div>
            <p>Update: 11.8.2026</p>
            <p>Note: ada tambahan ttd stuffing</p>
          </div>
          <p className="italic">- Tanda tangan dan nama jelas</p>
        </div>
      </div>
    </div>
  )
}
