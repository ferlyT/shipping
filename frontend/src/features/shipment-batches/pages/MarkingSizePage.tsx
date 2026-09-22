import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToastStore } from '@/stores/toastStore'
import { markingApi } from '../services/marking.service'
import type { MarkingSizeAuditResponse, MarkingSizeDetailItem } from '../types/marking.types'
import { MarkingSizeToolbar } from '../components/MarkingSizeToolbar'
import { MarkingSizeKpiSection } from '../components/MarkingSizeKpiSection'
import { MarkingSizeTable } from '../components/MarkingSizeTable'
import { MarkingBoxDimensionModal, type BoxDimensionTabType } from '../components/MarkingBoxDimensionModal'
import { exportMarkingSizeToExcel } from '../utils/markingSizeExcel'

export default function MarkingSizePage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const addToast = useToastStore((state) => state.addToast)

  // Baca URL query parameter
  const codeParam = searchParams.get('code')?.trim() || ''
  const sortParam = Number(searchParams.get('sort')) === 2 ? 2 : 1

  const [markingCode, setMarkingCode] = useState<string>(codeParam)
  const [sortById, setSortById] = useState<1 | 2>(sortParam)
  const [tableSearch, setTableSearch] = useState<string>('')
  const [isExporting, setIsExporting] = useState<boolean>(false)

  // State untuk modal drilldown box
  const [boxModalItem, setBoxModalItem] = useState<MarkingSizeDetailItem | null>(null)
  const [boxModalTab, setBoxModalTab] = useState<BoxDimensionTabType>('gudang')

  // Sinkronkan state saat URL param berubah
  useEffect(() => {
    if (codeParam !== markingCode) {
      setMarkingCode(codeParam)
    }
  }, [codeParam])

  // Update URL params saat state berubah
  const handleMarkingCodeChange = (newCode: string) => {
    const clean = newCode.trim().toUpperCase()
    setMarkingCode(clean)
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      if (clean) {
        p.set('code', clean)
      } else {
        p.delete('code')
      }
      return p
    })
  }

  const handleSortChange = (newSort: 1 | 2) => {
    setSortById(newSort)
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      p.set('sort', String(newSort))
      return p
    })
  }

  // Fetch data audit ukuran
  const { data: auditResponse, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['markingSizeAudit', markingCode, sortById],
    queryFn: async () => {
      if (!markingCode) return null
      const res = await markingApi.getSizeAudit(markingCode, sortById)
      return res.data as { data: MarkingSizeAuditResponse }
    },
    enabled: Boolean(markingCode),
    placeholderData: keepPreviousData,
  })

  const auditData = auditResponse?.data

  // Filter baris data instan di tabel (FoxPro Text2)
  const filteredItems = useMemo(() => {
    if (!auditData?.items) return []
    if (!tableSearch.trim()) return auditData.items

    const q = tableSearch.toLowerCase().trim()
    return auditData.items.filter((item) => {
      return (
        item.fdCustName?.toLowerCase().includes(q) ||
        item.fdMarkingNo?.toLowerCase().includes(q) ||
        item.fdListCode?.toLowerCase().includes(q) ||
        item.fdComodity?.toLowerCase().includes(q) ||
        item.fdKeterangan?.toLowerCase().includes(q)
      )
    })
  }, [auditData?.items, tableSearch])

  // Handler ekspor Excel 4 sheet
  const handleExportExcel = async () => {
    if (!auditData) return
    setIsExporting(true)
    try {
      await exportMarkingSizeToExcel(auditData)
      addToast({
        type: 'success',
        message: t('marking.sizeAudit.exportSuccess'),
      })
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || t('marking.sizeAudit.exportError'),
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleOpenDimensions = (
    item: MarkingSizeDetailItem,
    initialTab: BoxDimensionTabType = 'gudang'
  ) => {
    setBoxModalItem(item)
    setBoxModalTab(initialTab)
  }

  return (
    <div className="flex flex-col min-h-full bg-[var(--color-neutral)] p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5">
      {/* Breadcrumb & Header ERP 3-Level */}
      <PageHeader
        title={t('marking.sizeAudit.pageTitle')}
        subtitle={
          auditData?.header
            ? `${auditData.header.fdMarkingCode} • ${auditData.header.fdListType === 1 ? t('marking.sizeAudit.batchAir') : t('marking.sizeAudit.batchSea')} • Total ${auditData.summary.totalRowCount} Resi / Listcode`
            : t('marking.sizeAudit.pageSubtitle')
        }
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.SHIPMENT_BATCHES },
          { label: t('nav.batchMarking'), path: ROUTES.SHIPMENT_BATCHES_LIST },
          { label: t('marking.sizeAudit.breadcrumbTitle') },
        ]}
      />

      {/* Toolbar Kontrol & Filter */}
      <MarkingSizeToolbar
        markingCode={markingCode}
        onMarkingCodeChange={handleMarkingCodeChange}
        sortById={sortById}
        onSortChange={handleSortChange}
        tableSearch={tableSearch}
        onTableSearchChange={setTableSearch}
        onRefresh={() => refetch()}
        onExportExcel={handleExportExcel}
        isExporting={isExporting}
        isFetching={isFetching}
      />

      {/* Kartu Metrik KPI Ringkasan Adaptif */}
      {auditData?.summary && (
        <MarkingSizeKpiSection summary={auditData.summary} isLoading={isLoading && !auditData} />
      )}

      {/* Tabel Rincian Data Kargo */}
      <MarkingSizeTable
        items={filteredItems}
        isAir={auditData?.header?.fdListType === 1}
        markingCode={markingCode}
        onViewDimensions={handleOpenDimensions}
        isLoading={isLoading && !auditData}
      />

      {/* Modal Drilldown Dimensi Fisik Koli */}
      {boxModalItem && (
        <MarkingBoxDimensionModal
          listCode={boxModalItem.fdListCode}
          customerName={boxModalItem.fdCustName}
          markingNo={boxModalItem.fdMarkingNo}
          markingCode={boxModalItem.fdMarkingCode}
          isAir={auditData?.header?.fdListType === 1}
          initialTab={boxModalTab}
          onClose={() => setBoxModalItem(null)}
        />
      )}
    </div>
  )
}
