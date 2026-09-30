import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import {
  useInspectionReports,
  useInspectionReportsStats,
  useInspectionMutations,
} from '../hooks/useInspectionReports'
import { InspectionKpiCards } from '../components/InspectionKpiCards'
import { InspectionFilterBar } from '../components/InspectionFilterBar'
import { InspectionTable } from '../components/InspectionTable'
import { InspectionFormModal } from '../components/InspectionFormModal'
import { InspectionDetailModal } from '../components/InspectionDetailModal'
import type { InspectionReport, CreateInspectionPayload, UpdateInspectionPayload } from '../types/inspection.types'

export function InspectionReportsPage() {
  const { t } = useTranslation()

  // State filters & pagination
  const [search, setSearch] = useState('')
  const [listType, setListType] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [showAnalytics, setShowAnalytics] = useState(true)
  const limit = 20
  const debouncedSearch = useDebounce(search, 400)

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<InspectionReport | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [detailDefaultTab, setDetailDefaultTab] = useState<'attachments' | 'items'>('attachments')

  // Query API
  const { data, isLoading } = useInspectionReports({
    page,
    limit,
    search: debouncedSearch.trim() || undefined,
    listType: listType !== 'all' ? listType : undefined,
    status: status !== 'all' ? status : undefined,
  })
  const { data: stats, isLoading: statsLoading } = useInspectionReportsStats()

  const reports = data?.data || []
  const meta = data?.meta || { page: 1, limit: 20, total: 0, totalPages: 1 }

  // Mutations
  const { createMutation, updateMutation, deleteMutation } = useInspectionMutations()

  const handleOpenCreate = () => {
    setEditingReport(null)
    setFormModalOpen(true)
  }

  const handleOpenEdit = (report: InspectionReport) => {
    setEditingReport(report)
    setFormModalOpen(true)
  }

  const handleOpenDetail = (report: InspectionReport, tab: 'attachments' | 'items' = 'attachments') => {
    setSelectedReportId(report.fdId)
    setDetailDefaultTab(tab)
    setDetailModalOpen(true)
  }

  const handleDeleteReport = async (report: InspectionReport) => {
    const confirmDelete = window.confirm(
      t('bap.deleteConfirm')
    )
    if (!confirmDelete) return

    try {
      await deleteMutation.mutateAsync(report.fdId)
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Gagal menghapus BAP')
    }
  }

  const handleFormSubmit = async (payload: CreateInspectionPayload | UpdateInspectionPayload) => {
    if (editingReport) {
      await updateMutation.mutateAsync({
        id: editingReport.fdId,
        payload,
      })
    } else {
      await createMutation.mutateAsync(payload as CreateInspectionPayload)
    }
    setFormModalOpen(false)
    setEditingReport(null)
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-4 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* 3-Level Breadcrumb Page Header */}
      <PageHeader
        title={t('bap.title')}
        subtitle={t('bap.subtitle')}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.SHIPMENTS },
          { label: t('nav.inspectionReports') },
        ]}
      />

      {/* Overview & Analytics Section (Matching local-charges) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold font-[var(--font-heading)] text-[var(--color-primary)] flex items-center gap-2">
            {t('bap.overviewTitle')}
          </h2>
          <button
            type="button"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="text-xs sm:text-sm font-medium text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-1.5 rounded-full shadow-xs hover:shadow-sm active:scale-95 cursor-pointer"
          >
            {showAnalytics ? (
              <>
                <ChevronUp size={14} /> {t('bap.hideAnalytics')}
              </>
            ) : (
              <>
                <ChevronDown size={14} /> {t('bap.showAnalytics')}
              </>
            )}
          </button>
        </div>

        {showAnalytics && (
          <InspectionKpiCards stats={stats} reports={reports} isLoading={statsLoading} />
        )}
      </div>

      {/* Filter & Action Toolbar */}
      <InspectionFilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val)
          setPage(1)
        }}
        listType={listType}
        onListTypeChange={(val) => {
          setListType(val)
          setPage(1)
        }}
        status={status}
        onStatusChange={(val) => {
          setStatus(val)
          setPage(1)
        }}
        onCreateClick={handleOpenCreate}
      />

      {/* Inspection Table */}
      <InspectionTable
        reports={reports}
        isLoading={isLoading}
        onViewDetail={handleOpenDetail}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteReport}
      />

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-end pt-2">
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Create / Edit Modal */}
      <InspectionFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false)
          setEditingReport(null)
        }}
        onSubmit={handleFormSubmit}
        initialData={editingReport}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Detail & Photo Gallery Modal */}
      <InspectionDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedReportId(null)
        }}
        reportId={selectedReportId}
        defaultTab={detailDefaultTab}
        onEdit={handleOpenEdit}
      />
    </div>
  )
}
