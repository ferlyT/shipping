import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Printer,
  RotateCcw,
  Save,
  Download,
  Upload,
  ArrowLeft,
  Layout,
  Type,
  Table as TableIcon,
  Sliders,
  Sparkles,
  Eye,
  Check,
  Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { useReportDesignerStore } from '../stores/reportDesignerStore'
import { useToastStore } from '@/stores/toastStore'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'

export function ReportDesignerPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    config,
    updateConfig,
    resetToDefault,
    exportConfig,
    importConfig,
    loadFromBackend,
    saveToBackend,
    isLoadingBackend,
    isSavingBackend,
    updatedBy,
    lastSyncedAt,
  } = useReportDesignerStore()
  const { addToast } = useToastStore()

  // Muat konfigurasi terbaru dari database saat pertama kali halaman dibuka
  useEffect(() => {
    loadFromBackend()
  }, [loadFromBackend])

  const [activeTab, setActiveTab] = useState<'paper' | 'typography' | 'header' | 'table' | 'watermark'>('paper')
  const [previewMode, setPreviewMode] = useState<'pdf' | 'matrix'>('pdf')
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [isSaved, setIsSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    const ok = await saveToBackend()
    if (ok) {
      setIsSaved(true)
      addToast({
        type: 'success',
        message: 'Desain template berhasil disimpan ke server dan otomatis berlaku serentak!',
      })
      setTimeout(() => setIsSaved(false), 2500)
    } else {
      addToast({
        type: 'error',
        message: 'Gagal menyimpan ke server. Pastikan koneksi aman dan akun Anda memiliki hak akses admin.',
      })
    }
  }

  const handleReset = () => {
    if (window.confirm('Kembalikan desain template ke standar acuan?')) {
      resetToDefault()
      addToast({
        type: 'info',
        message: 'Desain template telah di-reset ke nilai default.',
      })
    }
  }

  const handleExport = () => {
    const json = exportConfig()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bill-template-config-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    addToast({ type: 'success', message: 'Konfigurasi template berhasil di-export ke JSON.' })
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content && importConfig(content)) {
        addToast({ type: 'success', message: 'Konfigurasi template berhasil di-import!' })
      } else {
        addToast({ type: 'error', message: 'Format file JSON konfigurasi tidak valid.' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Sample data to preview
  const sampleData = {
    to: 'AP123',
    sales: 'PA',
    collector: '',
    invNo: '--S-000128-07-2026',
    date: '7 July 2026',
    markingCode: '26SGA55',
    markingNo: 'HITECH: 1-3',
    items: [
      { id: '1', qty: '14.1335 M3', desc: 'PARCELS TO JAKARTA (M3) - TABLE OF WOOD PLASTICS', price: '7,500,000.00', amount: '106,001,250.00' },
      { id: '2', qty: '25.00 SGD', desc: 'STAMP FEE', price: '14,016.00', amount: '350,400.00' },
      { id: '3', qty: '480.00 SGD', desc: 'AGENCY FEE', price: '14,016.00', amount: '6,727,680.00' },
      { id: '4', qty: '670.85 SGD', desc: 'UBTS CHARGES', price: '14,016.00', amount: '9,402,633.60' },
    ],
    terbilang: 'Seratus Dua Puluh Dua Juta Empat Ratus Delapan Puluh Satu Ribu Sembilan Ratus Enam Puluh Tiga Koma Enam Puluh Rp.',
    total: '122,481,963.60',
    printedBy: 'Printed by :Ferly',
  }

  const currentFontFamily = previewMode === 'matrix' ? config.matrixFontFamily : config.pdfFontFamily
  const isWatermarkVisible = previewMode === 'pdf' ? config.enableWatermarkPdf : config.enableWatermarkMatrix
  const isPrintedByVisible = previewMode === 'pdf' ? config.showPrintedByPdf : config.showPrintedByMatrix

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] overflow-hidden bg-[var(--color-neutral)] text-[var(--color-primary)] font-[var(--font-body)] animate-fadeIn">
      {/* ── Top PageHeader Bar ── */}
      <div className="shrink-0 p-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-2xs">
        <PageHeader
          title="Bill Report Designer"
          subtitle={`Kustomisasi visual format cetak tagihan continuous form & PDF${
            isLoadingBackend
              ? ' (Memuat dari server...)'
              : updatedBy
              ? ` • Tersinkron server (${updatedBy}${lastSyncedAt ? `, ${new Date(lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''})`
              : ''
          }`}
          breadcrumbs={[
            { label: t('module.finance'), path: ROUTES.BILLING },
            { label: t('nav.billing'), path: ROUTES.BILLING_LIST },
            { label: 'Report Designer' },
          ]}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button variant="secondary" size="sm" onClick={handleExport} title="Download konfigurasi template ke file JSON">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export JSON
              </Button>
              <Button variant="secondary" size="sm" onClick={handleImportClick} title="Import konfigurasi template dari file JSON">
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Import JSON
              </Button>
              <Button variant="secondary" size="sm" onClick={handleReset} title="Kembalikan semua pengaturan ke standar acuan">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Default
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSavingBackend}>
                {isSavingBackend ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : isSaved ? (
                  <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                {isSavingBackend ? 'Menyimpan...' : isSaved ? 'Tersimpan ke Server' : 'Simpan Desain'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.BILLING_LIST)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
              </Button>
            </div>
          }
        />
      </div>

      {/* ── Main 2-Column Split Workspace ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ══ LEFT PANEL: Configuration Inspector (Width ~400px) ══ */}
        <div className="w-[380px] lg:w-[420px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full overflow-hidden">

          {/* Tab Navigation Ribbon */}
          <div className="flex items-center gap-1 p-2 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('paper')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-all border ${activeTab === 'paper'
                ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs font-bold'
                : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <Layout size={13} />
              <span>Kertas & Margin</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('typography')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-all border ${activeTab === 'typography'
                ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs font-bold'
                : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <Type size={13} />
              <span>Tipografi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('header')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-all border ${activeTab === 'header'
                ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs font-bold'
                : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <Sliders size={13} />
              <span>Header</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-all border ${activeTab === 'table'
                ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs font-bold'
                : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <TableIcon size={13} />
              <span>Kolom</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('watermark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-all border ${activeTab === 'watermark'
                ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs font-bold'
                : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <Sparkles size={13} />
              <span>Watermark</span>
            </button>
          </div>

          {/* Tab Content Panels (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

            {/* TAB 1: KERTAS & MARGIN */}
            {activeTab === 'paper' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-3">
                  <h4 className="font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                    <Layout size={14} className="text-blue-600" />
                    <span>Ukuran Lembar Kertas (mm)</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--color-secondary)] mb-1">
                        Lebar (mm)
                      </label>
                      <input
                        type="number"
                        value={config.paperWidthMm}
                        onChange={(e) => updateConfig({ paperWidthMm: Number(e.target.value) || 230 })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--color-secondary)] mb-1">
                        Tinggi (mm)
                      </label>
                      <input
                        type="number"
                        value={config.paperHeightMm}
                        onChange={(e) => updateConfig({ paperHeightMm: Number(e.target.value) || 156 })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--color-secondary)] mb-1">
                      Orientasi Cetak (Default Printer)
                    </label>
                    <select
                      value={config.orientation || 'landscape'}
                      onChange={(e) => updateConfig({ orientation: e.target.value as 'landscape' | 'portrait' })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold"
                    >
                      <option value="landscape">Landscape (Mendatar - Rekomendasi Continuous Form & LX310)</option>
                      <option value="portrait">Portrait (Tegak)</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-[var(--color-secondary)] leading-tight">
                    Standar continuous form LX310: 230 mm (9 inci) × 156 mm (6 inci) - Orientasi Landscape.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-3">
                  <h4 className="font-bold text-[var(--color-primary)]">Margin Halaman (mm)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--color-secondary)] mb-1">Atas (Top)</label>
                      <input
                        type="number"
                        value={config.marginTopMm}
                        onChange={(e) => updateConfig({ marginTopMm: Number(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--color-secondary)] mb-1">Bawah (Bottom)</label>
                      <input
                        type="number"
                        value={config.marginBottomMm}
                        onChange={(e) => updateConfig({ marginBottomMm: Number(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--color-secondary)] mb-1">Kiri (Left)</label>
                      <input
                        type="number"
                        value={config.marginLeftMm}
                        onChange={(e) => updateConfig({ marginLeftMm: Number(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--color-secondary)] mb-1">Kanan (Right)</label>
                      <input
                        type="number"
                        value={config.marginRightMm}
                        onChange={(e) => updateConfig({ marginRightMm: Number(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TIPOGRAFI & FONT */}
            {activeTab === 'typography' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-3">
                  <h4 className="font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                    <Type size={14} className="text-purple-600" />
                    <span>Font Versi PDF</span>
                  </h4>
                  <select
                    value={config.pdfFontFamily}
                    onChange={(e) => updateConfig({ pdfFontFamily: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold"
                  >
                    <option value="Arial, 'Helvetica Neue', Helvetica, sans-serif">Arial / Helvetica (Standar PDF)</option>
                    <option value="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif">Segoe UI</option>
                    <option value="'Times New Roman', Times, serif">Times New Roman</option>
                    <option value="'Courier New', Courier, monospace">Courier New (Monospace)</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-3">
                  <h4 className="font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                    <Printer size={14} className="text-emerald-600" />
                    <span>Font Versi Dot Matrix (LX310)</span>
                  </h4>
                  <select
                    value={config.matrixFontFamily}
                    onChange={(e) => updateConfig({ matrixFontFamily: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold font-mono"
                  >
                    <option value="'Courier New', Courier, monospace">Courier New (Monospace LX310)</option>
                    <option value="'Lucida Console', Monaco, monospace">Lucida Console</option>
                    <option value="Consolas, 'Courier New', monospace">Consolas</option>
                    <option value="Arial, sans-serif">Arial</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-3">
                  <h4 className="font-bold text-[var(--color-primary)]">Ukuran Font Dasar (pt)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--color-secondary)] mb-1">Header (pt)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={config.baseFontSizePt}
                        onChange={(e) => updateConfig({ baseFontSizePt: Number(e.target.value) || 9 })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--color-secondary)] mb-1">Tabel (pt)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={config.tableFontSizePt}
                        onChange={(e) => updateConfig({ tableFontSizePt: Number(e.target.value) || 9 })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: HEADER BOX */}
            {activeTab === 'header' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-[var(--color-primary)]">Pembagian Lebar Kotak Header</h4>
                    <span className="text-[11px] font-mono font-bold text-blue-600">
                      {config.headerLeftWidthPct}% : {100 - config.headerLeftWidthPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={80}
                    value={config.headerLeftWidthPct}
                    onChange={(e) => {
                      const left = Number(e.target.value)
                      updateConfig({
                        headerLeftWidthPct: left,
                        headerRightWidthPct: 100 - left,
                      })
                    }}
                    className="w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--color-secondary)]">
                    <span>Kiri (Customer/Sales): {config.headerLeftWidthPct}%</span>
                    <span>Kanan (Bill/Date): {config.headerRightWidthPct}%</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-2.5">
                  <h4 className="font-bold text-[var(--color-primary)]">Teks Label Header</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Label Customer</label>
                      <input
                        type="text"
                        value={config.labelTo}
                        onChange={(e) => updateConfig({ labelTo: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Label Sales</label>
                        <input
                          type="text"
                          value={config.labelSales}
                          onChange={(e) => updateConfig({ labelSales: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Label Collector</label>
                        <input
                          type="text"
                          value={config.labelCollector}
                          onChange={(e) => updateConfig({ labelCollector: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Bill No</label>
                        <input
                          type="text"
                          value={config.labelBillNo}
                          onChange={(e) => updateConfig({ labelBillNo: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Date</label>
                        <input
                          type="text"
                          value={config.labelDate}
                          onChange={(e) => updateConfig({ labelDate: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Marking</label>
                        <input
                          type="text"
                          value={config.labelMarking}
                          onChange={(e) => updateConfig({ labelMarking: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-2">
                  <h4 className="font-bold text-[var(--color-primary)]">Visibilitas Baris</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showSalesCollector}
                      onChange={(e) => updateConfig({ showSalesCollector: e.target.checked })}
                      className="rounded border-[var(--color-border)]"
                    />
                    <span>Tampilkan Baris SALES & COLLECTOR</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showMarkingNo}
                      onChange={(e) => updateConfig({ showMarkingNo: e.target.checked })}
                      className="rounded border-[var(--color-border)]"
                    />
                    <span>Tampilkan Catatan Marking No (Baris kedua marking)</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 4: KOLOM TABEL */}
            {activeTab === 'table' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-3">
                  <h4 className="font-bold text-[var(--color-primary)]">Lebar Kolom Tabel (%)</h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">QTY (%)</label>
                      <input
                        type="number"
                        value={config.colQtyWidthPct}
                        onChange={(e) => updateConfig({ colQtyWidthPct: Number(e.target.value) || 16 })}
                        className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">DESCRIPTION (%)</label>
                      <input
                        type="number"
                        value={config.colDescWidthPct}
                        onChange={(e) => updateConfig({ colDescWidthPct: Number(e.target.value) || 46 })}
                        className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">UNIT PRICE (%)</label>
                      <input
                        type="number"
                        value={config.colPriceWidthPct}
                        onChange={(e) => updateConfig({ colPriceWidthPct: Number(e.target.value) || 17 })}
                        className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">AMOUNT (%)</label>
                      <input
                        type="number"
                        value={config.colAmountWidthPct}
                        onChange={(e) => updateConfig({ colAmountWidthPct: Number(e.target.value) || 21 })}
                        className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] font-mono"
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-[var(--color-secondary)] flex justify-between font-mono">
                    <span>Total Lebar:</span>
                    <span className={`font-bold ${config.colQtyWidthPct + config.colDescWidthPct + config.colPriceWidthPct + config.colAmountWidthPct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {config.colQtyWidthPct + config.colDescWidthPct + config.colPriceWidthPct + config.colAmountWidthPct}%
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-2.5">
                  <h4 className="font-bold text-[var(--color-primary)]">Judul Header Kolom</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Header QTY</label>
                      <input
                        type="text"
                        value={config.labelQtyCol}
                        onChange={(e) => updateConfig({ labelQtyCol: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Header Description</label>
                      <input
                        type="text"
                        value={config.labelDescCol}
                        onChange={(e) => updateConfig({ labelDescCol: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Header Unit Price</label>
                      <input
                        type="text"
                        value={config.labelPriceCol}
                        onChange={(e) => updateConfig({ labelPriceCol: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Header Amount</label>
                      <input
                        type="text"
                        value={config.labelAmountCol}
                        onChange={(e) => updateConfig({ labelAmountCol: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-2">
                  <h4 className="font-bold text-[var(--color-primary)]">Simbol Mata Uang</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Prefix Baris Item</label>
                      <input
                        type="text"
                        value={config.currencyPrefix}
                        onChange={(e) => updateConfig({ currencyPrefix: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Prefix Total Akhir</label>
                      <input
                        type="text"
                        value={config.totalCurrencyPrefix}
                        onChange={(e) => updateConfig({ totalCurrencyPrefix: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: WATERMARK & FOOTER */}
            {activeTab === 'watermark' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-3">
                  <h4 className="font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-600" />
                    <span>Watermark Background</span>
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Teks Watermark</label>
                      <input
                        type="text"
                        value={config.watermarkText}
                        onChange={(e) => updateConfig({ watermarkText: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] font-bold tracking-wider"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-[var(--color-secondary)] uppercase">Opasitas: {config.watermarkOpacityPct}%</label>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={config.watermarkOpacityPct}
                        onChange={(e) => updateConfig({ watermarkOpacityPct: Number(e.target.value) || 4 })}
                        className="w-full cursor-pointer"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={config.enableWatermarkPdf}
                        onChange={(e) => updateConfig({ enableWatermarkPdf: e.target.checked })}
                        className="rounded border-[var(--color-border)]"
                      />
                      <span>Tampilkan Watermark di Versi PDF</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enableWatermarkMatrix}
                        onChange={(e) => updateConfig({ enableWatermarkMatrix: e.target.checked })}
                        className="rounded border-[var(--color-border)]"
                      />
                      <span>Tampilkan Watermark di Versi Dot Matrix</span>
                    </label>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-2.5">
                  <h4 className="font-bold text-[var(--color-primary)]">Teks & Footer Terbilang</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Label Terbilang</label>
                      <input
                        type="text"
                        value={config.labelTerbilang}
                        onChange={(e) => updateConfig({ labelTerbilang: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Akhiran Terbilang</label>
                      <input
                        type="text"
                        value={config.terbilangSuffix}
                        onChange={(e) => updateConfig({ terbilangSuffix: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-2.5">
                  <h4 className="font-bold text-[var(--color-primary)]">Teks & Visibilitas "Printed by"</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-secondary)] uppercase">Prefix Label</label>
                    <input
                      type="text"
                      value={config.printedByPrefix}
                      onChange={(e) => updateConfig({ printedByPrefix: e.target.value })}
                      className="w-full px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] font-mono text-xs"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={config.showPrintedByPdf}
                      onChange={(e) => updateConfig({ showPrintedByPdf: e.target.checked })}
                      className="rounded border-[var(--color-border)]"
                    />
                    <span>Tampilkan "Printed by" di Versi PDF</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showPrintedByMatrix}
                      onChange={(e) => updateConfig({ showPrintedByMatrix: e.target.checked })}
                      className="rounded border-[var(--color-border)]"
                    />
                    <span>Tampilkan "Printed by" di Versi Dot Matrix</span>
                  </label>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ══ RIGHT PANEL: Realtime Interactive WYSIWYG Preview ══ */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-200 dark:bg-slate-900">

          {/* Preview Control Toolbar */}
          <div className="px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-secondary)] flex items-center gap-1">
                <Eye size={13} /> Pratinjau:
              </span>
              <div className="inline-flex rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)] text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode('pdf')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${previewMode === 'pdf'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  📄 Versi PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('matrix')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${previewMode === 'matrix'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  🖨️ Versi Dot Matrix (LX310)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--color-secondary)]">Zoom:</span>
              <select
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold"
              >
                <option value={75}>75%</option>
                <option value={85}>85%</option>
                <option value={100}>100% (Skala Penuh)</option>
                <option value={110}>110%</option>
              </select>
            </div>
          </div>

          {/* Preview Canvas Area */}
          <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
              }}
            >
              {/* Paper Sheet Representation */}
              <div
                style={{
                  width: `${config.paperWidthMm}mm`,
                  height: `${config.paperHeightMm}mm`,
                  padding: `${config.marginTopMm}mm ${config.marginRightMm}mm ${config.marginBottomMm}mm ${config.marginLeftMm}mm`,
                  fontFamily: currentFontFamily,
                  color: '#000',
                  background: '#fff',
                  boxSizing: 'border-box',
                  boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* 1. Header Row (2 Boxes) */}
                <div style={{ display: 'flex', gap: '6px', width: '100%', minHeight: '76px' }}>

                  {/* Left Box */}
                  <div
                    style={{
                      flex: `0 0 ${config.headerLeftWidthPct}%`,
                      maxWidth: `${config.headerLeftWidthPct}%`,
                      border: '1px solid #000',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '145px',
                    }}
                  >
                    <div
                      style={{
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0 8px',
                      }}
                    >
                      <span style={{ fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : 'Tahoma, Verdana, sans-serif', fontSize: '12pt', fontWeight: 'normal' }}>
                        {config.labelTo}
                      </span>
                      <span style={{ fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : "'Century Gothic', CenturyGothic, AppleGothic, sans-serif", fontSize: '11pt', fontWeight: 'normal' }}>
                        {sampleData.to}
                      </span>
                    </div>

                    {config.showSalesCollector && (
                      <div style={{ display: 'flex', height: '32px', borderTop: '1px solid #000', fontSize: '9pt', fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : 'Tahoma, Verdana, sans-serif' }}>
                        <div style={{ flex: 1, borderRight: '1px solid #000', padding: '0 8px', display: 'flex', alignItems: 'center' }}>
                          <span>{config.labelSales} {sampleData.sales}</span>
                        </div>
                        <div style={{ flex: 1.18, padding: '0 8px', display: 'flex', alignItems: 'center' }}>
                          <span>{config.labelCollector} {sampleData.collector}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Box */}
                  <div
                    style={{
                      flex: 1,
                      border: '1px solid #000',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '145px',
                      fontSize: '9pt',
                      fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : 'Tahoma, Verdana, sans-serif',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', height: '36px', borderBottom: '1px solid #000' }}>
                      <span style={{ width: '74px', flexShrink: 0, fontSize: '9pt' }}>{config.labelBillNo}</span>
                      <span style={{ margin: '0 6px 0 2px' }}>:</span>
                      <span style={{ flex: 1, fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif", fontSize: '12pt', fontWeight: 'normal' }}>
                        {sampleData.invNo}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', height: '32px', borderBottom: '1px solid #000' }}>
                      <span style={{ width: '74px', flexShrink: 0, fontSize: '9pt' }}>{config.labelDate}</span>
                      <span style={{ margin: '0 6px 0 2px' }}>:</span>
                      <span style={{ flex: 1, fontSize: '9pt' }}>{sampleData.date}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '3px 8px', flex: 1 }}>
                      <span style={{ width: '74px', flexShrink: 0, fontSize: '9pt' }}>{config.labelMarking}</span>
                      <span style={{ margin: '0 6px 0 2px' }}>:</span>
                      <div style={{ flex: 1, lineHeight: 1.25 }}>
                        <div>{sampleData.markingCode}</div>
                        {config.showMarkingNo && sampleData.markingNo && (
                          <div style={{ fontSize: '8.5pt', marginTop: '1px' }}>
                            {sampleData.markingNo}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* 2. Main Table Area */}
                <div
                  style={{
                    marginTop: '10px',
                    flex: 1,
                    border: '1px solid #000',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    background: '#fff',
                  }}
                >
                  {/* Watermark */}
                  {isWatermarkVisible && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '35%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontFamily: currentFontFamily,
                        fontSize: `${config.watermarkFontSizePt}pt`,
                        fontWeight: 900,
                        color: `rgba(0, 0, 0, ${config.watermarkOpacityPct / 100})`,
                        letterSpacing: '12px',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        zIndex: 0,
                      }}
                    >
                      {config.watermarkText}
                    </div>
                  )}

                  <table
                    style={{
                      width: '100%',
                      height: '100%',
                      borderCollapse: 'collapse',
                      tableLayout: 'fixed',
                      fontSize: `${config.tableFontSizePt}pt`,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <colgroup>
                      <col style={{ width: `${config.colQtyWidthPct}%` }} />
                      <col style={{ width: `${config.colDescWidthPct}%` }} />
                      <col style={{ width: `${config.colPriceWidthPct}%` }} />
                      <col style={{ width: `${config.colAmountWidthPct}%` }} />
                    </colgroup>

                    <thead>
                      <tr>
                        <th style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '2px 6px', height: '34px', textAlign: 'center', verticalAlign: 'middle', fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : 'Tahoma, Verdana, sans-serif', fontSize: '10pt', fontWeight: 'normal' }}>
                          {config.labelQtyCol}
                        </th>
                        <th style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '2px 6px', height: '34px', textAlign: 'center', verticalAlign: 'middle', fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : 'Tahoma, Verdana, sans-serif', fontSize: '10pt', fontWeight: 'normal' }}>
                          {config.labelDescCol}
                        </th>
                        <th style={{ borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '2px 6px', height: '34px', textAlign: 'center', verticalAlign: 'middle', fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : 'Tahoma, Verdana, sans-serif', fontSize: '10pt', fontWeight: 'normal' }}>
                          {config.labelPriceCol}
                        </th>
                        <th style={{ borderBottom: '1px solid #000', padding: '2px 6px', height: '34px', textAlign: 'center', verticalAlign: 'middle', fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : 'Tahoma, Verdana, sans-serif', fontSize: '10pt', fontWeight: 'normal' }}>
                          {config.labelAmountCol}
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {sampleData.items.map((row) => (
                        <tr key={row.id}>
                          <td style={{ borderRight: '1px solid #000', padding: '3.5px 6px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : 'Tahoma, Verdana, sans-serif', fontSize: '10pt', fontWeight: 'normal' }}>
                                {row.qty.split(' ')[0]}
                              </span>
                              <span style={{ fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : 'Tahoma, Verdana, sans-serif', fontSize: '10pt', fontWeight: 'normal' }}>
                                {row.qty.split(' ')[1] || ''}
                              </span>
                            </div>
                          </td>
                          <td style={{ borderRight: '1px solid #000', padding: '3.5px 6px 3.5px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                            <div style={{ display: 'block', width: '100%', lineHeight: 1.35, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip', width: '100%', display: 'block', fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif", fontSize: '10pt', fontWeight: 'normal', textTransform: 'uppercase', lineHeight: 1.35 }}>
                                {row.desc}
                              </span>
                            </div>
                          </td>
                          <td style={{ borderRight: '1px solid #000', padding: '3.5px 6px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 4px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif", fontSize: '10pt', fontWeight: 'normal' }}>{config.currencyPrefix}</span>
                              <span style={{ fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif", fontSize: '10pt', fontWeight: 'normal' }}>{row.price}</span>
                            </div>
                          </td>
                          <td style={{ padding: '3.5px 6px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 4px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif", fontSize: '10pt', fontWeight: 'normal' }}>{config.currencyPrefix}</span>
                              <span style={{ fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif", fontSize: '10pt', fontWeight: 'normal' }}>{row.amount}</span>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Spacer row to maintain vertical divider lines */}
                      <tr>
                        <td style={{ borderRight: '1px solid #000', height: '100%' }}>&nbsp;</td>
                        <td style={{ borderRight: '1px solid #000', height: '100%' }}>&nbsp;</td>
                        <td style={{ borderRight: '1px solid #000', height: '100%' }}>&nbsp;</td>
                        <td style={{ height: '100%' }}>&nbsp;</td>
                      </tr>
                    </tbody>

                    <tfoot>
                      <tr>
                        <td style={{ borderRight: '1px solid #000', verticalAlign: 'bottom', padding: '2px 4px 10px 4px' }}>&nbsp;</td>
                        <td style={{ borderRight: '1px solid #000', verticalAlign: 'bottom', padding: '2px 8px 10px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', width: '100%' }}>
                            <span style={{ whiteSpace: 'nowrap', fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif", fontSize: '9pt', fontWeight: 'normal', flexShrink: 0, lineHeight: 1.35 }}>{config.labelTerbilang}</span>
                            <div style={{ fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif", fontSize: '8.5pt', fontWeight: 'normal', lineHeight: 1.35, wordBreak: 'break-word', flex: 1 }}>{sampleData.terbilang}</div>
                          </div>
                        </td>
                        <td style={{ borderRight: '1px solid #000', verticalAlign: 'bottom', padding: '2px 4px 10px 4px' }}></td>
                        <td style={{ verticalAlign: 'bottom', padding: '2px 4px 10px 4px' }}>
                          <div style={{ padding: '0 4px' }}>
                            <div style={{ borderTop: '1px solid #000', marginBottom: '2px' }} />
                            <div style={{ margin: 0, padding: '1px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', lineHeight: 1.2 }}>
                              <span style={{ fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif", fontSize: '10.5pt', fontWeight: 'normal' }}>{config.totalCurrencyPrefix}</span>
                              <span style={{ fontFamily: previewMode === 'matrix' ? config.matrixFontFamily : "Arial, 'Helvetica Neue', Helvetica, sans-serif", fontSize: '10.5pt', fontWeight: 'normal' }}>{sampleData.total}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* 3. Printed By */}
                {isPrintedByVisible && (
                  <div
                    style={{
                      fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
                      fontSize: '5.5pt',
                      fontStyle: 'normal',
                      fontWeight: 'normal',
                      color: '#000',
                      textAlign: 'right',
                      marginTop: '1.5px',
                      paddingRight: '5.5mm',
                      height: 'auto',
                    }}
                  >
                    {config.printedByPrefix}Ferly
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
