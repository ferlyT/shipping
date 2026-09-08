import { useModalEscape } from '@/hooks/useModalEscape'
import { useState } from 'react'
import { CheckCircle2, Sparkles, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { commodityMappingApi } from '../services/commodity-mapping.service'

interface PriceListUploadContinuityModalProps {
  isOpen: boolean
  onClose: () => void
  uploadId: number
  effectiveDate: string
  isCustomerUpload?: boolean
  fdCustCode?: string
  onApplied?: (count: number) => void
  onNavigateToMapping?: () => void
}

export function PriceListUploadContinuityModal({
  isOpen,
  onClose,
  uploadId,
  effectiveDate,
  isCustomerUpload,
  fdCustCode,
  onApplied,
  onNavigateToMapping,
}: PriceListUploadContinuityModalProps) {
  useModalEscape(isOpen, onClose)
  const [isApplying, setIsApplying] = useState(false)
  const [appliedResult, setAppliedResult] = useState<{ appliedCount: number } | null>(null)

  if (!isOpen) return null

  const handleApply = async () => {
    setIsApplying(true)
    try {
      const res = await commodityMappingApi.applyToUpload({
        uploadId,
        effectiveDate,
        isCustomerUpload,
        fdCustCode,
      })
      const count = res.data?.appliedCount ?? 0
      setAppliedResult({ appliedCount: count })
      if (onApplied) onApplied(count)
    } catch {
      // Fallback
      onClose()
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Price List Berhasil Diunggah!
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Penyelarasan Aturan Pemetaan Komoditas (*Commodity Mapping*)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-gray-600 dark:text-gray-300">
          {appliedResult ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-200 mx-auto flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                Pemetaan Komoditas Berhasil Diterapkan!
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Sebanyak <strong>{appliedResult.appliedCount} aturan pemetaan</strong> komoditas aktif telah otomatis diterapkan pada Price List periode ini.
              </p>
              <div className="pt-2 flex justify-center">
                <Button variant="primary" onClick={onClose}>
                  Selesai
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p>
                File Price List periode <strong>{effectiveDate.slice(0, 10)}</strong> telah siap digunakan.
              </p>

              <div className="p-4 bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                <div className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Konfirmasi Masa Berlaku Pemetaan Komoditas:
                </div>
                <p className="text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed">
                  Apakah Anda ingin <strong>seluruh aturan pemetaan komoditas</strong> yang sudah ada sebelumnya ({isCustomerUpload && fdCustCode ? `Khusus Customer ${fdCustCode} & Global` : 'Global'}) otomatis berlaku juga pada Price List yang baru di-upload ini?
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!appliedResult && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2 bg-gray-50/50 dark:bg-gray-800/50">
            <Button variant="ghost" onClick={onClose} disabled={isApplying} className="text-xs">
              Gunakan Default Excel Saja
            </Button>
            <div className="flex items-center gap-2">
              {onNavigateToMapping && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    onClose()
                    onNavigateToMapping()
                  }}
                  disabled={isApplying}
                  className="text-xs flex items-center gap-1.5"
                >
                  <span>Sesuaikan Pemetaan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleApply}
                disabled={isApplying}
                className="text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isApplying ? 'Menerapkan...' : 'Ya, Terapkan Semua'}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
