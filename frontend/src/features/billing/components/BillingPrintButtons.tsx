import React, { useState, useEffect } from 'react'
import { Printer, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { downloadInvoicePdf } from '../utils/billing.utils'
import { useToastStore } from '@/stores/toastStore'

export interface BillingPrintButtonsProps {
  invNo: string
  size?: 'xs' | 'sm' | 'md'
  showMatrix?: boolean
  showPdf?: boolean
  iconOnly?: boolean
  className?: string
}

/**
 * Shared Action Buttons untuk Cetak Matrix & Download Instan PDF Tagihan (Single Source of Truth).
 * - Tombol PDF: Mengunduh file PDF secara instan ke komputer tanpa dialog print.
 *   (Gunakan Ctrl/Cmd + Klik untuk membuka di tab baru jika ingin preview).
 * - Tombol Matrix: Membuka format cetak continuous form dot matrix.
 */
const lastDownloadToastMap = new Map<string, number>()

export function BillingPrintButtons({
  invNo,
  size = 'sm',
  showMatrix = true,
  showPdf = true,
  iconOnly = false,
  className = '',
}: BillingPrintButtonsProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const { addToast } = useToastStore()

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'BILLING_PDF_DOWNLOADED' && event.data?.invNo === invNo) {
        setIsDownloadingPdf(false)
        const now = Date.now()
        const lastTime = lastDownloadToastMap.get(invNo) || 0
        if (now - lastTime > 2000) {
          lastDownloadToastMap.set(invNo, now)
          addToast({
            type: 'success',
            message: `PDF Tagihan ${invNo} berhasil diunduh!`,
          })
        }
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [invNo, addToast])

  if (!invNo) return null

  const handleDownloadPdf = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (e.ctrlKey || e.metaKey) {
      window.open(ROUTES.BILLING_PRINT(invNo, 'pdf'), '_blank')
      return
    }
    setIsDownloadingPdf(true)
    downloadInvoicePdf(invNo)
    setTimeout(() => setIsDownloadingPdf(false), 4000)
  }

  const handlePrintMatrix = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(ROUTES.BILLING_PRINT(invNo, 'matrix'), '_blank')
  }

  const buttonSizeClass =
    size === 'xs'
      ? 'h-6 text-[11px] px-2'
      : size === 'sm'
      ? 'h-7 text-xs px-2.5'
      : 'h-8 text-sm px-3'

  return (
    <div className={cn('flex items-center gap-1.5', className)} onClick={(e) => e.stopPropagation()}>
      {showMatrix && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handlePrintMatrix}
          title="Cetak via Printer Dot Matrix LX310 (Continuous Form 23×15.6cm)"
          className={cn(
            buttonSizeClass,
            'font-medium border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors'
          )}
        >
          <Printer className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400 shrink-0" />
          {!iconOnly && <span>Print</span>}
        </Button>
      )}

      {showPdf && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          title="Download PDF Instan ke komputer (Ctrl+Klik untuk buka preview tab)"
          className={cn(
            buttonSizeClass,
            'font-medium border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors'
          )}
        >
          {isDownloadingPdf ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 text-rose-600 dark:text-rose-400 animate-spin shrink-0" />
          ) : (
            <FileText className="w-3.5 h-3.5 mr-1 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          {!iconOnly && <span>{isDownloadingPdf ? 'Mengunduh...' : 'PDF'}</span>}
        </Button>
      )}
    </div>
  )
}
