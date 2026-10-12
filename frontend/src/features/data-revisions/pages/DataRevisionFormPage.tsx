import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import { ROUTES } from '@/lib/constants'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  useDataRevisionDetail,
  useNextFormNumber,
  useDataRevisionMutations,
} from '../hooks/useDataRevisions'
import type {
  RevisionDetailItem,
  RevisionLampiranItem,
  RevisionAction,
  RevisionType,
} from '../types/data-revisions.types'

import StepIndicator, { type StepInfo } from '../components/StepIndicator'
import StepOfficers from './steps/StepOfficers'
import StepItems from './steps/StepItems'
import StepAttachments from './steps/StepAttachments'
import StepReview from './steps/StepReview'

const WIZARD_STEPS: { label: string; description: string }[] = [
  { label: 'Officers / PIC', description: 'Target aksi & penanggung jawab' },
  { label: 'Rincian Data', description: 'Data Awal vs Data Baru' },
  { label: 'Lampiran', description: 'Upload form fisik / dokumen' },
  { label: 'Review & Simpan', description: 'Konfirmasi pengajuan' },
]

const EMPTY_ROW: RevisionDetailItem = {
  fdNo: 1,
  fdAwalCustCode: '',
  fdAwalCustName: '',
  fdAwalSpMark: '',
  fdAwalNoBilling: '',
  fdAwalQtyVolWgt: '',
  fdAwalNoInputan: '',
  fdAwalDetail: '',
  fdBaruCustCode: '',
  fdBaruCustName: '',
  fdBaruSpMark: '',
  fdBaruNoBilling: '',
  fdBaruQtyVolWgt: '',
  fdBaruNoInputan: '',
  fdBaruDetail: '',
}

export default function DataRevisionFormPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.user)

  const [currentStep, setCurrentStep] = useState(0)

  const [form, setForm] = useState({
    fdNomorForm: '',
    fdTipeData: 'REVISI' as RevisionType,
    fdAksi: 'BUAT_BILL' as RevisionAction,
    fdTanggal: new Date().toISOString().split('T')[0],
    fdDibuatOleh: currentUser?.fullName || currentUser?.username || '',
    fdStuffing: '',
    fdBilling: '',
    fdAR: '',
    fdDiketahui: '',
    fdCatatan: '',
  })

  const [details, setDetails] = useState<RevisionDetailItem[]>([{ ...EMPTY_ROW }])
  const [lampiran, setLampiran] = useState<RevisionLampiranItem[]>([])

  const { data: detailData, isLoading: isDetailLoading } = useDataRevisionDetail(id)
  const { data: nextNumData, isLoading: isGeneratingNumber, refetch: refetchNextNumber } =
    useNextFormNumber(!isEdit)
  const {
    createMutation,
    updateMutation,
    uploadLampiranMutation,
    deleteLampiranMutation,
  } = useDataRevisionMutations()

  useEffect(() => {
    if (!isEdit && nextNumData?.nextNumber && !form.fdNomorForm) {
      setForm((prev) => ({ ...prev, fdNomorForm: nextNumData.nextNumber }))
    }
  }, [nextNumData, isEdit])

  useEffect(() => {
    if (isEdit && detailData?.data) {
      const d = detailData.data
      setForm({
        fdNomorForm: d.fdNomorForm || '',
        fdTipeData: d.fdTipeData || 'REVISI',
        fdAksi: d.fdAksi || 'BUAT_BILL',
        fdTanggal: d.fdTanggal ? d.fdTanggal.split('T')[0] : '',
        fdDibuatOleh: d.fdDibuatOleh || '',
        fdStuffing: d.fdStuffing || '',
        fdBilling: d.fdBilling || '',
        fdAR: d.fdAR || '',
        fdDiketahui: d.fdDiketahui || '',
        fdCatatan: d.fdCatatan || '',
      })
      if (d.details && d.details.length > 0) {
        setDetails(d.details)
      }
      if (d.lampiran) {
        setLampiran(d.lampiran)
      }
    }
  }, [isEdit, detailData])

  const handleFormChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleUpdateDetail = (index: number, field: keyof RevisionDetailItem, value: any) => {
    setDetails((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleUpdateMultipleDetail = (index: number, data: Partial<RevisionDetailItem>) => {
    setDetails((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...data }
      return next
    })
  }

  const handleAddRow = () => {
    setDetails((prev) => [...prev, { ...EMPTY_ROW, fdNo: prev.length + 1 }])
  }

  const handleRemoveRow = (index: number) => {
    setDetails((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUploadLampiran = async (file: File, keterangan?: string) => {
    if (isEdit && id) {
      uploadLampiranMutation.mutate(
        { id, file, keterangan },
        {
          onSuccess: (res) => {
            setLampiran((prev) => [res.data, ...prev])
          },
        }
      )
    } else {
      toast.info('Lampiran dapat diunggah setelah form disimpan, atau simpan form terlebih dahulu.')
    }
  }

  const handleDeleteLampiran = (lampiranId: number) => {
    deleteLampiranMutation.mutate(lampiranId, {
      onSuccess: () => {
        setLampiran((prev) => prev.filter((item) => item.fdId !== lampiranId))
      },
    })
  }

  const handleSave = async (andPrint: boolean = false) => {
    if (!form.fdNomorForm.trim()) {
      toast.error('Nomor form wajib diisi')
      setCurrentStep(0)
      return
    }

    if (!form.fdDibuatOleh?.trim()) {
      toast.error('Nama pembuat form (Dibuat Oleh) wajib diisi')
      setCurrentStep(0)
      return
    }

    const payload = { ...form, details }

    if (isEdit && id) {
      updateMutation.mutate(
        { id, payload },
        {
          onSuccess: (res) => {
            if (andPrint) navigate(ROUTES.DATA_REVISION_PRINT(res.data.fdId))
            else navigate(ROUTES.DATA_REVISIONS_LIST)
          },
        }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: (res) => {
          if (andPrint) navigate(ROUTES.DATA_REVISION_PRINT(res.data.fdId))
          else navigate(ROUTES.DATA_REVISIONS_LIST)
        },
      })
    }
  }

  const steps: StepInfo[] = WIZARD_STEPS.map((step, idx) => ({
    label: step.label,
    description: step.description,
    status:
      idx < currentStep
        ? 'done'
        : idx === currentStep
        ? 'active'
        : 'upcoming',
  }))

  const isSaving = createMutation.isPending || updateMutation.isPending

  if (isEdit && isDetailLoading) {
    return (
      <div className="flex flex-col min-h-full bg-[var(--color-neutral)]">
        <div className="p-6 space-y-4">
          <div className="h-10 w-64 rounded-xl skeleton-shimmer" />
          <div className="h-64 rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-[var(--color-neutral)]">
      {/* ── Page Header ── */}
      <div className="px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4">
        <PageHeader
          title={isEdit ? `Edit Form: ${form.fdNomorForm}` : 'Form Input & Revisi Data Baru'}
          subtitle="Dokumen resmi pencatatan perubahan data manifest, billing, atau biaya lokal."
          breadcrumbs={[
            { label: t('module.logistics'), path: ROUTES.SHIPMENTS },
            { label: t('nav.dataRevisions'), path: ROUTES.DATA_REVISIONS_LIST },
            { label: isEdit ? 'Edit Form' : 'Form Baru' },
          ]}
          actions={
            <>
              <Link
                to={ROUTES.DATA_REVISIONS_LIST}
                className="btn btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Batal
              </Link>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 shadow-sm"
              >
                <Save size={14} />
                {isSaving ? 'Menyimpan...' : 'Simpan Form'}
              </button>
            </>
          }
          className="!pb-0 !border-b-0 !mb-0"
        />
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-6 space-y-5">
        {/* Stepper Indicator */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs p-4 sm:p-5">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        {/* Step Content */}
        <div className="min-h-[420px]">
          {currentStep === 0 && (
            <StepOfficers
              form={form}
              onChange={handleFormChange}
              onGenerateNextNumber={() => refetchNextNumber()}
              isGeneratingNumber={isGeneratingNumber}
            />
          )}

          {currentStep === 1 && (
            <StepItems
              details={details}
              tipeData={form.fdTipeData}
              aksi={form.fdAksi}
              onUpdate={handleUpdateDetail}
              onUpdateMultiple={handleUpdateMultipleDetail}
              onAdd={handleAddRow}
              onRemove={handleRemoveRow}
            />
          )}

          {currentStep === 2 && (
            <StepAttachments
              lampiran={lampiran}
              onUpload={handleUploadLampiran}
              onDelete={handleDeleteLampiran}
              isUploading={uploadLampiranMutation.isPending}
              isDeleting={deleteLampiranMutation.isPending}
            />
          )}

          {currentStep === 3 && (
            <StepReview
              form={form}
              details={details}
              lampiran={lampiran}
              onGoToStep={(step) => setCurrentStep(step)}
            />
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 flex items-center justify-between gap-4 sticky bottom-4 z-20 shadow-lg">
          <div>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                className="btn btn-secondary text-xs py-2 px-4 inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Sebelumnya
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < WIZARD_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 0 && !form.fdNomorForm.trim()) {
                    toast.error('Nomor form wajib diisi')
                    return
                  }
                  setCurrentStep((prev) => Math.min(WIZARD_STEPS.length - 1, prev + 1))
                }}
                className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
              >
                Selanjutnya <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="btn btn-secondary text-xs py-2 px-4 inline-flex items-center gap-1.5 border-[var(--color-primary)]/50 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                >
                  <Printer size={14} />
                  Simpan &amp; Cetak Form
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="btn btn-primary text-xs py-2 px-5 inline-flex items-center gap-1.5 shadow-md"
                >
                  <Save size={14} />
                  {isSaving ? 'Menyimpan...' : 'Simpan Selesai'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
