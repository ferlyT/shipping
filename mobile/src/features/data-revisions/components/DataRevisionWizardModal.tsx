import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Receipt,
  Ban,
  Search,
  Camera,
  Trash2,
  AlertTriangle,
  UserCheck,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { mobileDataRevisionsApi } from '../services/data-revisions.service'
import { MobileInputanLookupModal } from './MobileInputanLookupModal'
import { CameraCaptureModal } from './CameraCaptureModal'
import type { RevisionAction, RevisionType, DataRevision } from '../types/dataRevisions.types'

interface Props {
  visible: boolean
  editItem?: DataRevision | null
  onClose: () => void
  onSuccess: () => void
}

export function DataRevisionWizardModal({ visible, editItem, onClose, onSuccess }: Props) {
  const { mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const insets = useSafeAreaInsets()
  const { user } = useAuthStore()

  // Safe area insets: proteksi batas atas (status bar / jam / notch) & batas bawah (nav bar Android)
  const topPadding =
    Platform.OS === 'android'
      ? Math.max(insets.top, 28) + 8
      : Math.max(insets.top, 12) + 4

  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 28) + 12
      : Math.max(insets.bottom, 12) + 12

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1 State
  const [aksi, setAksi] = useState<RevisionAction>('BUAT_BILL')
  const [tipeData, setTipeData] = useState<RevisionType>('REVISI')
  const [nomorForm, setNomorForm] = useState('')
  const [tanggal, setTanggal] = useState(new Date().toISOString().substring(0, 10))
  const [dibuatOleh, setDibuatOleh] = useState(user?.fullName || user?.username || '')
  const [catatan, setCatatan] = useState('')
  const [showPicAccordion, setShowPicAccordion] = useState(false)
  const [stuffing, setStuffing] = useState('')
  const [billing, setBilling] = useState('')
  const [ar, setAr] = useState('')
  const [diketahui, setDiketahui] = useState('')

  // Step 2 State (Item data)
  const [awalNoInputan, setAwalNoInputan] = useState('')
  const [awalCustCode, setAwalCustCode] = useState('')
  const [awalCustName, setAwalCustName] = useState('')
  const [awalSpMark, setAwalSpMark] = useState('')
  const [awalQtyVolWgt, setAwalQtyVolWgt] = useState('')
  const [awalDetail, setAwalDetail] = useState('')

  const [baruNoInputan, setBaruNoInputan] = useState('')
  const [baruCustCode, setBaruCustCode] = useState('')
  const [baruCustName, setBaruCustName] = useState('')
  const [baruSpMark, setBaruSpMark] = useState('')
  const [baruNoBilling, setBaruNoBilling] = useState('')
  const [baruQtyVolWgt, setBaruQtyVolWgt] = useState('')
  const [baruDetail, setBaruDetail] = useState('')

  // Step 3 State (Lampiran foto)
  const [photos, setPhotos] = useState<string[]>([])
  const [isCameraOpen, setIsCameraOpen] = useState(false)

  // Modal Lookup
  const [isLookupOpen, setIsLookupOpen] = useState(false)
  const [lookupTarget, setLookupTarget] = useState<'AWAL' | 'BARU'>('AWAL')

  // Helper generator nomor fallback
  const getFallbackNumber = () => {
    const now = new Date()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = now.getFullYear()
    return `001/${mm}/${yyyy}`
  }

  // Load data form saat modal terbuka (mode edit atau create)
  useEffect(() => {
    if (visible) {
      setCurrentStep(1)
      if (editItem) {
        setNomorForm(editItem.fdNomorForm || '')
        setAksi(editItem.fdAksi || 'BUAT_BILL')
        setTipeData(editItem.fdTipeData || 'REVISI')
        setTanggal(
          editItem.fdTanggal
            ? editItem.fdTanggal.substring(0, 10)
            : new Date().toISOString().substring(0, 10)
        )
        setDibuatOleh(editItem.fdDibuatOleh || user?.fullName || user?.username || '')
        setStuffing(editItem.fdStuffing || '')
        setBilling(editItem.fdBilling || '')
        setAr(editItem.fdAR || '')
        setDiketahui(editItem.fdDiketahui || '')
        setCatatan(editItem.fdCatatan || '')

        const first = editItem.details?.[0]
        if (first) {
          setAwalNoInputan(first.fdAwalNoInputan || '')
          setAwalCustCode(first.fdAwalCustCode || '')
          setAwalCustName(first.fdAwalCustName || '')
          setAwalSpMark(first.fdAwalSpMark || '')
          setAwalQtyVolWgt(first.fdAwalQtyVolWgt || '')
          setAwalDetail(first.fdAwalDetail || '')

          setBaruNoInputan(first.fdBaruNoInputan || '')
          setBaruCustCode(first.fdBaruCustCode || '')
          setBaruCustName(first.fdBaruCustName || '')
          setBaruSpMark(first.fdBaruSpMark || '')
          setBaruNoBilling(first.fdBaruNoBilling || '')
          setBaruQtyVolWgt(first.fdBaruQtyVolWgt || '')
          setBaruDetail(first.fdBaruDetail || '')
        } else {
          setAwalNoInputan('')
          setAwalCustCode('')
          setAwalCustName('')
          setAwalSpMark('')
          setAwalQtyVolWgt('')
          setAwalDetail('')
          setBaruNoInputan('')
          setBaruCustCode('')
          setBaruCustName('')
          setBaruSpMark('')
          setBaruNoBilling('')
          setBaruQtyVolWgt('')
          setBaruDetail('')
        }
        setPhotos([])
      } else {
        const fallback = getFallbackNumber()
        setAksi('BUAT_BILL')
        setTipeData('REVISI')
        setTanggal(new Date().toISOString().substring(0, 10))
        setDibuatOleh(user?.fullName || user?.username || '')
        setStuffing('')
        setBilling('')
        setAr('')
        setDiketahui('')
        setCatatan('')
        setAwalNoInputan('')
        setAwalCustCode('')
        setAwalCustName('')
        setAwalSpMark('')
        setAwalQtyVolWgt('')
        setAwalDetail('')
        setBaruNoInputan('')
        setBaruCustCode('')
        setBaruCustName('')
        setBaruSpMark('')
        setBaruNoBilling('')
        setBaruQtyVolWgt('')
        setBaruDetail('')
        setPhotos([])

        mobileDataRevisionsApi
          .getNextNumber()
          .then((res: any) => {
            const num =
              res?.data?.nextNumber ||
              res?.data?.nextNomorForm ||
              res?.nextNumber
            if (num) {
              setNomorForm(num)
            } else {
              setNomorForm((prev) => prev || fallback)
            }
          })
          .catch((e: any) => {
            console.warn('[DataRevision] Gagal ambil next-number:', e)
            setNomorForm((prev) => prev || fallback)
          })
      }
    }
  }, [visible, editItem])

  // Saat aksi CANCEL_DATA dipilih, otomatis set tipeData ke REVISI
  const handleAksiChange = (newAksi: RevisionAction) => {
    setAksi(newAksi)
    if (newAksi === 'CANCEL_DATA') {
      setTipeData('REVISI')
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  // Buka lookup untuk Data Awal
  const openLookupAwal = () => {
    setLookupTarget('AWAL')
    setIsLookupOpen(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  // Buka lookup untuk Data Baru
  const openLookupBaru = () => {
    setLookupTarget('BARU')
    setIsLookupOpen(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (currentStep === 1) {
      const activeNumber = nomorForm.trim() || getFallbackNumber()
      if (!nomorForm.trim()) {
        setNomorForm(activeNumber)
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (aksi === 'CANCEL_DATA') {
        if (!awalNoInputan.trim()) {
          Alert.alert(
            'Perhatian',
            'Mohon masukkan No. Inputan (fdListCode) target pembatalan.'
          )
          return
        }
      } else {
        if (!baruNoInputan.trim() && !awalNoInputan.trim()) {
          Alert.alert(
            'Perhatian',
            'Mohon masukkan No. Inputan target penagihan bill.'
          )
          return
        }
      }
      setCurrentStep(3)
    } else if (currentStep === 3) {
      setCurrentStep(4)
    }
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    try {
      const payload = {
        fdNomorForm: nomorForm.trim() || getFallbackNumber(),
        fdTipeData: tipeData,
        fdAksi: aksi,
        fdTanggal: tanggal,
        fdDibuatOleh: dibuatOleh.trim() || null,
        fdStuffing: stuffing.trim() || null,
        fdBilling: billing.trim() || null,
        fdAR: ar.trim() || null,
        fdDiketahui: diketahui.trim() || null,
        fdCatatan: catatan.trim() || null,
        details: [
          {
            fdNo: 1,
            fdAwalCustCode: awalCustCode.trim() || null,
            fdAwalCustName: awalCustName.trim() || null,
            fdAwalSpMark: awalSpMark.trim() || null,
            fdAwalQtyVolWgt: awalQtyVolWgt.trim() || null,
            fdAwalNoInputan: awalNoInputan.trim() || null,
            fdAwalDetail: awalDetail.trim() || null,
            fdBaruCustCode: baruCustCode.trim() || null,
            fdBaruCustName: baruCustName.trim() || null,
            fdBaruSpMark: baruSpMark.trim() || null,
            fdBaruNoBilling: baruNoBilling.trim() || null,
            fdBaruQtyVolWgt: baruQtyVolWgt.trim() || null,
            fdBaruNoInputan: baruNoInputan.trim() || null,
            fdBaruDetail: baruDetail.trim() || null,
          },
        ],
      }

      let res: any
      if (editItem?.fdId) {
        res = await mobileDataRevisionsApi.update(editItem.fdId, payload)
      } else {
        res = await mobileDataRevisionsApi.create(payload)
      }

      const targetId = editItem?.fdId || res?.data?.fdId

      // Upload lampiran foto jika ada
      let uploadFailCount = 0
      if (targetId && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          try {
            await mobileDataRevisionsApi.uploadLampiran(
              targetId,
              photos[i],
              `foto-form-${i + 1}.jpg`,
              `Lampiran foto fisik ${i + 1}`
            )
          } catch (uploadErr) {
            uploadFailCount++
            console.warn('[Upload] Gagal upload foto:', uploadErr)
          }
        }
      }

      if (uploadFailCount > 0) {
        Alert.alert(
          'Form Tersimpan',
          `Form berhasil disimpan, namun ${uploadFailCount} dari ${photos.length} foto lampiran gagal diunggah.`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess()
                onClose()
              },
            },
          ]
        )
      } else {
        Alert.alert(
          'Berhasil',
          editItem
            ? 'Perubahan Form Input & Revisi Data berhasil diperbarui!'
            : 'Form Input & Revisi Data berhasil disimpan!',
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess()
                onClose()
              },
            },
          ]
        )
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'Gagal menyimpan form'
      Alert.alert('Gagal Menyimpan', msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!visible) return null

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? '#0B0F17' : '#F8FAFC' },
        ]}
      >
        {/* Top Header Navigation (Terproteksi Safe Area Atas: Jam & Notch) */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
              borderBottomColor: isDark ? '#1E293B' : '#E2E8F0',
              paddingTop: topPadding,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.stepCircle,
                { backgroundColor: isDark ? '#1E293B' : '#E0F2FE' },
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  { color: isDark ? '#38BDF8' : '#0284C7' },
                ]}
              >
                {currentStep}/4
              </Text>
            </View>
            <View>
              <Text
                style={[
                  styles.headerTitle,
                  { color: isDark ? '#F8FAFC' : '#0F172A' },
                ]}
              >
                {currentStep === 1
                  ? 'Info & Aksi Form'
                  : currentStep === 2
                  ? 'Data Target'
                  : currentStep === 3
                  ? 'Foto Lampiran'
                  : 'Review & Simpan'}
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: isDark ? '#94A3B8' : '#64748B' },
                ]}
              >
                {editItem ? `Edit Form: ${editItem.fdNomorForm}` : 'Form Input & Revisi Data'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[
              styles.closeBtn,
              { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
            ]}
          >
            <X size={18} color={isDark ? '#E2E8F0' : '#475569'} />
          </TouchableOpacity>
        </View>

        {/* Keyboard Avoiding Container */}
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scrollStyle}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: bottomPadding + 36 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ═════════ STEP 1: INFO & AKSI ═════════ */}
            {currentStep === 1 && (
              <View style={styles.stepContainer}>
                {/* Segmented Control Target Aksi */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.fieldLabel,
                      { color: isDark ? '#CBD5E1' : '#334155' },
                    ]}
                  >
                    Target Aksi Form *
                  </Text>
                  <View style={styles.actionGrid}>
                    <TouchableOpacity
                      onPress={() => handleAksiChange('BUAT_BILL')}
                      activeOpacity={0.8}
                      style={[
                        styles.actionCard,
                        {
                          backgroundColor:
                            aksi === 'BUAT_BILL'
                              ? isDark
                                ? 'rgba(2, 132, 199, 0.18)'
                                : '#E0F2FE'
                              : isDark
                              ? '#131B2E'
                              : '#FFFFFF',
                          borderColor:
                            aksi === 'BUAT_BILL'
                              ? '#0284C7'
                              : isDark
                              ? '#1E293B'
                              : '#E2E8F0',
                        },
                      ]}
                    >
                      <View style={styles.actionCardTop}>
                        <View
                          style={[
                            styles.actionIconWrap,
                            {
                              backgroundColor:
                                aksi === 'BUAT_BILL'
                                  ? '#0284C7'
                                  : isDark
                                  ? '#1E293B'
                                  : '#F1F5F9',
                            },
                          ]}
                        >
                          <Receipt
                            size={16}
                            color={
                              aksi === 'BUAT_BILL'
                                ? '#FFFFFF'
                                : isDark
                                ? '#94A3B8'
                                : '#64748B'
                            }
                          />
                        </View>
                        {aksi === 'BUAT_BILL' && (
                          <View style={styles.activeCheckBadge}>
                            <Check size={11} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.actionCardTitle,
                          {
                            color:
                              aksi === 'BUAT_BILL'
                                ? isDark
                                  ? '#38BDF8'
                                  : '#0284C7'
                                : isDark
                                ? '#F1F5F9'
                                : '#0F172A',
                          },
                        ]}
                      >
                        BUAT BILL
                      </Text>
                      <Text
                        style={[
                          styles.actionCardSub,
                          { color: isDark ? '#94A3B8' : '#64748B' },
                        ]}
                      >
                        Default Penagihan
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleAksiChange('CANCEL_DATA')}
                      activeOpacity={0.8}
                      style={[
                        styles.actionCard,
                        {
                          backgroundColor:
                            aksi === 'CANCEL_DATA'
                              ? isDark
                                ? 'rgba(225, 29, 72, 0.18)'
                                : '#FFE4E6'
                              : isDark
                              ? '#131B2E'
                              : '#FFFFFF',
                          borderColor:
                            aksi === 'CANCEL_DATA'
                              ? '#E11D48'
                              : isDark
                              ? '#1E293B'
                              : '#E2E8F0',
                        },
                      ]}
                    >
                      <View style={styles.actionCardTop}>
                        <View
                          style={[
                            styles.actionIconWrap,
                            {
                              backgroundColor:
                                aksi === 'CANCEL_DATA'
                                  ? '#E11D48'
                                  : isDark
                                  ? '#1E293B'
                                  : '#F1F5F9',
                            },
                          ]}
                        >
                          <Ban
                            size={16}
                            color={
                              aksi === 'CANCEL_DATA'
                                ? '#FFFFFF'
                                : isDark
                                ? '#94A3B8'
                                : '#64748B'
                            }
                          />
                        </View>
                        {aksi === 'CANCEL_DATA' && (
                          <View
                            style={[
                              styles.activeCheckBadge,
                              { backgroundColor: '#E11D48' },
                            ]}
                          >
                            <Check size={11} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.actionCardTitle,
                          {
                            color:
                              aksi === 'CANCEL_DATA'
                                ? '#E11D48'
                                : isDark
                                ? '#F1F5F9'
                                : '#0F172A',
                          },
                        ]}
                      >
                        CANCEL DATA
                      </Text>
                      <Text
                        style={[
                          styles.actionCardSub,
                          { color: isDark ? '#FDA4AF' : '#E11D48' },
                        ]}
                      >
                        Pembatalan Kargo
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Kategori Tipe Data (Kondisional) */}
                {aksi === 'CANCEL_DATA' ? (
                  <View
                    style={[
                      styles.cancelInfoBox,
                      {
                        backgroundColor: isDark
                          ? 'rgba(244, 63, 94, 0.12)'
                          : '#FFF1F2',
                        borderColor: isDark
                          ? 'rgba(244, 63, 94, 0.3)'
                          : '#FECDD3',
                      },
                    ]}
                  >
                    <AlertTriangle size={18} color="#F43F5E" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cancelInfoTitle}>
                        Mode Pembatalan Data Aktif
                      </Text>
                      <Text
                        style={[
                          styles.cancelInfoDesc,
                          { color: isDark ? '#FDA4AF' : '#BE123C' },
                        ]}
                      >
                        Kategori tipe data otomatis diatur sebagai{' '}
                        <Text style={{ fontWeight: '700' }}>Pembatalan Data</Text>.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: isDark ? '#CBD5E1' : '#334155' },
                      ]}
                    >
                      Kategori Tipe Data *
                    </Text>
                    <View style={styles.tipeDataRow}>
                      {(
                        [
                          { id: 'REVISI', label: 'Revisi' },
                          { id: 'INPUT_BARU', label: 'Input Baru' },
                          { id: 'INPUT_LOCAL_CHARGES', label: 'Local Charges' },
                        ] as const
                      ).map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          onPress={() => {
                            setTipeData(t.id)
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          }}
                          style={[
                            styles.tipeDataBtn,
                            {
                              backgroundColor:
                                tipeData === t.id
                                  ? isDark
                                    ? '#1E293B'
                                    : '#E0F2FE'
                                  : isDark
                                  ? '#131B2E'
                                  : '#FFFFFF',
                              borderColor:
                                tipeData === t.id
                                  ? '#0284C7'
                                  : isDark
                                  ? '#1E293B'
                                  : '#CBD5E1',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tipeDataBtnText,
                              {
                                color:
                                  tipeData === t.id
                                    ? '#0284C7'
                                    : isDark
                                    ? '#94A3B8'
                                    : '#64748B',
                                fontWeight:
                                  tipeData === t.id ? '700' : '500',
                              },
                            ]}
                          >
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Nomor Form */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: isDark ? '#CBD5E1' : '#334155' },
                      ]}
                    >
                      Nomor Formulir *
                    </Text>
                    <View
                      style={[
                        styles.autoBadge,
                        {
                          backgroundColor: isDark
                            ? 'rgba(56, 189, 248, 0.15)'
                            : '#E0F2FE',
                        },
                      ]}
                    >
                      <Sparkles size={11} color="#0284C7" />
                      <Text style={styles.autoBadgeText}>OTOMATIS</Text>
                    </View>
                  </View>
                  <TextInput
                    value={nomorForm}
                    onChangeText={setNomorForm}
                    style={[
                      styles.input,
                      styles.monoInput,
                      {
                        backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                        borderColor: isDark ? '#1E293B' : '#CBD5E1',
                        color: isDark ? '#38BDF8' : '#0284C7',
                      },
                    ]}
                  />
                </View>

                {/* Tanggal & Dibuat Oleh (2 Kolom) */}
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: isDark ? '#CBD5E1' : '#334155' },
                      ]}
                    >
                      Tanggal
                    </Text>
                    <TextInput
                      value={tanggal}
                      onChangeText={setTanggal}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      style={[
                        styles.input,
                        styles.monoInput,
                        {
                          backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                          borderColor: isDark ? '#1E293B' : '#CBD5E1',
                          color: isDark ? '#F8FAFC' : '#0F172A',
                        },
                      ]}
                    />
                  </View>

                  <View style={{ flex: 1, gap: 6 }}>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: isDark ? '#CBD5E1' : '#334155' },
                      ]}
                    >
                      Dibuat Oleh
                    </Text>
                    <TextInput
                      value={dibuatOleh}
                      onChangeText={setDibuatOleh}
                      placeholder="Nama pembuat..."
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      style={[
                        styles.input,
                        {
                          backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                          borderColor: isDark ? '#1E293B' : '#CBD5E1',
                          color: isDark ? '#F8FAFC' : '#0F172A',
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Accordion PIC Opsional */}
                <TouchableOpacity
                  onPress={() => {
                    setShowPicAccordion(!showPicAccordion)
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.picToggle,
                    {
                      backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                      borderColor: isDark ? '#1E293B' : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <UserCheck size={16} color={isDark ? '#38BDF8' : '#0284C7'} />
                    <Text
                      style={[
                        styles.picToggleText,
                        { color: isDark ? '#F8FAFC' : '#0F172A' },
                      ]}
                    >
                      Penanggung Jawab / PIC Form (Opsional)
                    </Text>
                  </View>
                  {showPicAccordion ? (
                    <ChevronUp size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                  ) : (
                    <ChevronDown size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                  )}
                </TouchableOpacity>

                {showPicAccordion && (
                  <View
                    style={[
                      styles.picContentBox,
                      {
                        backgroundColor: isDark ? '#101726' : '#F1F5F9',
                        borderColor: isDark ? '#1E293B' : '#E2E8F0',
                      },
                    ]}
                  >
                    <View style={styles.twoColRow}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.fieldSubLabel}>Stuffing</Text>
                        <TextInput
                          value={stuffing}
                          onChangeText={setStuffing}
                          placeholder="PIC Stuffing..."
                          placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                          style={[
                            styles.input,
                            {
                              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                              borderColor: isDark ? '#1E293B' : '#CBD5E1',
                              color: isDark ? '#F8FAFC' : '#0F172A',
                            },
                          ]}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.fieldSubLabel}>Billing</Text>
                        <TextInput
                          value={billing}
                          onChangeText={setBilling}
                          placeholder="PIC Billing..."
                          placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                          style={[
                            styles.input,
                            {
                              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                              borderColor: isDark ? '#1E293B' : '#CBD5E1',
                              color: isDark ? '#F8FAFC' : '#0F172A',
                            },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.twoColRow}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.fieldSubLabel}>AR / Finance</Text>
                        <TextInput
                          value={ar}
                          onChangeText={setAr}
                          placeholder="PIC AR..."
                          placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                          style={[
                            styles.input,
                            {
                              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                              borderColor: isDark ? '#1E293B' : '#CBD5E1',
                              color: isDark ? '#F8FAFC' : '#0F172A',
                            },
                          ]}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.fieldSubLabel}>Diketahui Oleh</Text>
                        <TextInput
                          value={diketahui}
                          onChangeText={setDiketahui}
                          placeholder="Atasan / Manager..."
                          placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                          style={[
                            styles.input,
                            {
                              backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                              borderColor: isDark ? '#1E293B' : '#CBD5E1',
                              color: isDark ? '#F8FAFC' : '#0F172A',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Catatan Form */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.fieldLabel,
                      { color: isDark ? '#CBD5E1' : '#334155' },
                    ]}
                  >
                    Catatan Form (Opsional)
                  </Text>
                  <TextInput
                    value={catatan}
                    onChangeText={setCatatan}
                    placeholder="Alasan pembuatan form atau catatan pengingat audit..."
                    placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                    multiline
                    numberOfLines={3}
                    style={[
                      styles.input,
                      styles.textArea,
                      {
                        backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                        borderColor: isDark ? '#1E293B' : '#CBD5E1',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* ═════════ STEP 2: DATA TARGET ═════════ */}
            {currentStep === 2 && (
              <View style={styles.stepContainer}>
                {/* Alert Mode Banner */}
                {aksi === 'CANCEL_DATA' ? (
                  <View
                    style={[
                      styles.cancelBanner,
                      {
                        backgroundColor: isDark
                          ? 'rgba(244, 63, 94, 0.12)'
                          : '#FFF1F2',
                        borderColor: isDark
                          ? 'rgba(244, 63, 94, 0.35)'
                          : '#FECDD3',
                      },
                    ]}
                  >
                    <Ban size={20} color="#F43F5E" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cancelBannerTitle}>
                        Target Pembatalan: fdCancel = 1
                      </Text>
                      <Text
                        style={[
                          styles.cancelBannerDesc,
                          { color: isDark ? '#FDA4AF' : '#BE123C' },
                        ]}
                      >
                        Pilih nomor inputan pada kotak DATA AWAL di bawah yang akan diajukan untuk dibatalkan.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.billBanner,
                      {
                        backgroundColor: isDark
                          ? 'rgba(56, 189, 248, 0.12)'
                          : '#F0F9FF',
                        borderColor: isDark
                          ? 'rgba(56, 189, 248, 0.3)'
                          : '#BAE6FD',
                      },
                    ]}
                  >
                    <Receipt size={20} color="#0284C7" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.billBannerTitle}>
                        Target Penagihan: Buat Bill
                      </Text>
                      <Text
                        style={[
                          styles.billBannerDesc,
                          { color: isDark ? '#38BDF8' : '#0369A1' },
                        ]}
                      >
                        Cari kargo di Data Awal, lalu cari atau lengkapi nomor inputan target di Data Baru.
                      </Text>
                    </View>
                  </View>
                )}

                {/* SECTION: DATA AWAL */}
                <View
                  style={[
                    styles.dataCard,
                    {
                      backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                      borderColor:
                        aksi === 'CANCEL_DATA'
                          ? '#F43F5E'
                          : isDark
                          ? '#1E293B'
                          : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.dataCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Layers
                        size={15}
                        color={aksi === 'CANCEL_DATA' ? '#F43F5E' : '#0284C7'}
                      />
                      <Text
                        style={[
                          styles.dataCardTitle,
                          {
                            color:
                              aksi === 'CANCEL_DATA' ? '#F43F5E' : '#0284C7',
                          },
                        ]}
                      >
                        DATA AWAL{' '}
                        {aksi === 'CANCEL_DATA'
                          ? '(TARGET BATAL)'
                          : '(EKSISTING)'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={openLookupAwal}
                      activeOpacity={0.8}
                      style={[
                        styles.lookupBtn,
                        {
                          backgroundColor:
                            aksi === 'CANCEL_DATA'
                              ? '#F43F5E'
                              : '#0284C7',
                        },
                      ]}
                    >
                      <Search size={13} color="#FFFFFF" />
                      <Text style={styles.lookupBtnText}>Cari Data / Resi</Text>
                    </TouchableOpacity>
                  </View>

                  {/* No Inputan */}
                  <View style={styles.inputGroupSmall}>
                    <Text style={styles.fieldSubLabel}>
                      No. Inputan (fdListCode) *
                    </Text>
                    <View style={styles.inputWithAction}>
                      <TextInput
                        value={awalNoInputan}
                        onChangeText={setAwalNoInputan}
                        placeholder="Ketik atau cari nomor inputan..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        keyboardType="number-pad"
                        style={[
                          styles.input,
                          styles.monoInput,
                          styles.inputWithFlex,
                          {
                            backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                            borderColor:
                              aksi === 'CANCEL_DATA'
                                ? '#FDA4AF'
                                : isDark
                                ? '#1E293B'
                                : '#CBD5E1',
                            color: isDark ? '#F8FAFC' : '#0F172A',
                          },
                        ]}
                      />
                      <TouchableOpacity
                        onPress={openLookupAwal}
                        style={[
                          styles.inlineSearchBtn,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
                          },
                        ]}
                      >
                        <Search
                          size={15}
                          color={isDark ? '#38BDF8' : '#0284C7'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Customer */}
                  <View style={styles.inputGroupSmall}>
                    <Text style={styles.fieldSubLabel}>Pelanggan Awal</Text>
                    <TextInput
                      value={awalCustName}
                      onChangeText={setAwalCustName}
                      placeholder="Nama pelanggan awal..."
                      placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                      style={[
                        styles.input,
                        {
                          backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                          borderColor: isDark ? '#1E293B' : '#CBD5E1',
                          color: isDark ? '#F8FAFC' : '#0F172A',
                        },
                      ]}
                    />
                  </View>

                  {/* Marking & Volume */}
                  <View style={styles.twoColRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.fieldSubLabel}>Marking</Text>
                      <TextInput
                        value={awalSpMark}
                        onChangeText={setAwalSpMark}
                        placeholder="Contoh: 26ASG-..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        style={[
                          styles.input,
                          styles.monoInput,
                          {
                            backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                            borderColor: isDark ? '#1E293B' : '#CBD5E1',
                            color: isDark ? '#F8FAFC' : '#0F172A',
                          },
                        ]}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.fieldSubLabel}>Volume / Colly</Text>
                      <TextInput
                        value={awalQtyVolWgt}
                        onChangeText={setAwalQtyVolWgt}
                        placeholder="Contoh: 1 Colly..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        style={[
                          styles.input,
                          {
                            backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                            borderColor: isDark ? '#1E293B' : '#CBD5E1',
                            color: isDark ? '#F8FAFC' : '#0F172A',
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {/* SECTION: DATA BARU (Jika Aksi Buat Bill / Revisi) */}
                {aksi !== 'CANCEL_DATA' && (
                  <View
                    style={[
                      styles.dataCard,
                      {
                        backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                        borderColor: '#10B981',
                      },
                    ]}
                  >
                    <View style={styles.dataCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Receipt size={15} color="#10B981" />
                        <Text style={[styles.dataCardTitle, { color: '#10B981' }]}>
                          DATA BARU (TARGET BILL)
                        </Text>
                      </View>

                      {/* Tombol Cari fdListCode untuk Data Baru */}
                      <TouchableOpacity
                        onPress={openLookupBaru}
                        activeOpacity={0.8}
                        style={[
                          styles.lookupBtn,
                          {
                            backgroundColor: '#10B981',
                          },
                        ]}
                      >
                        <Search size={13} color="#FFFFFF" />
                        <Text style={styles.lookupBtnText}>Cari Data / Resi</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroupSmall}>
                      <Text style={styles.fieldSubLabel}>
                        No. Inputan Baru (fdListCode) *
                      </Text>
                      <View style={styles.inputWithAction}>
                        <TextInput
                          value={baruNoInputan}
                          onChangeText={setBaruNoInputan}
                          placeholder="Ketik atau cari fdListCode baru..."
                          placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                          keyboardType="number-pad"
                          style={[
                            styles.input,
                            styles.monoInput,
                            styles.inputWithFlex,
                            {
                              backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                              borderColor: isDark ? '#1E293B' : '#A7F3D0',
                              color: '#10B981',
                              fontWeight: '700',
                            },
                          ]}
                        />
                        <TouchableOpacity
                          onPress={openLookupBaru}
                          style={[
                            styles.inlineSearchBtn,
                            {
                              backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
                            },
                          ]}
                        >
                          <Search
                            size={15}
                            color="#10B981"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.inputGroupSmall}>
                      <Text style={styles.fieldSubLabel}>Pelanggan Baru</Text>
                      <TextInput
                        value={baruCustName}
                        onChangeText={setBaruCustName}
                        placeholder="Nama pelanggan baru..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        style={[
                          styles.input,
                          {
                            backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                            borderColor: isDark ? '#1E293B' : '#CBD5E1',
                            color: isDark ? '#F8FAFC' : '#0F172A',
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.twoColRow}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.fieldSubLabel}>Marking Baru</Text>
                        <TextInput
                          value={baruSpMark}
                          onChangeText={setBaruSpMark}
                          placeholder="Marking baru..."
                          placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                          style={[
                            styles.input,
                            styles.monoInput,
                            {
                              backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                              borderColor: isDark ? '#1E293B' : '#CBD5E1',
                              color: isDark ? '#F8FAFC' : '#0F172A',
                            },
                          ]}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.fieldSubLabel}>Volume Baru</Text>
                        <TextInput
                          value={baruQtyVolWgt}
                          onChangeText={setBaruQtyVolWgt}
                          placeholder="Volume baru..."
                          placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                          style={[
                            styles.input,
                            {
                              backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                              borderColor: isDark ? '#1E293B' : '#CBD5E1',
                              color: isDark ? '#F8FAFC' : '#0F172A',
                            },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroupSmall}>
                      <Text style={styles.fieldSubLabel}>Keterangan Perubahan</Text>
                      <TextInput
                        value={baruDetail}
                        onChangeText={setBaruDetail}
                        placeholder="Alasan perubahan atau rincian penagihan..."
                        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                        style={[
                          styles.input,
                          {
                            backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                            borderColor: isDark ? '#1E293B' : '#CBD5E1',
                            color: isDark ? '#F8FAFC' : '#0F172A',
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* ═════════ STEP 3: FOTO LAMPIRAN ═════════ */}
            {currentStep === 3 && (
              <View style={styles.stepContainer}>
                <View
                  style={[
                    styles.photoBanner,
                    {
                      backgroundColor: isDark
                        ? 'rgba(56, 189, 248, 0.12)'
                        : '#F0F9FF',
                      borderColor: isDark
                        ? 'rgba(56, 189, 248, 0.25)'
                        : '#BAE6FD',
                    },
                  ]}
                >
                  <Camera size={22} color={isDark ? '#38BDF8' : '#0284C7'} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.photoBannerTitle,
                        { color: isDark ? '#38BDF8' : '#0284C7' },
                      ]}
                    >
                      Foto Bukti Fisik Formulir
                    </Text>
                    <Text
                      style={[
                        styles.photoBannerDesc,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                      ]}
                    >
                      Jepret fisik formulir revisi/pembatalan yang sudah ditandatangani menggunakan kamera HP.
                    </Text>
                  </View>
                </View>

                {/* Tombol Ambil Foto */}
                <TouchableOpacity
                  onPress={() => setIsCameraOpen(true)}
                  activeOpacity={0.85}
                  style={styles.takePhotoBtn}
                >
                  <Camera size={20} color="#FFFFFF" />
                  <Text style={styles.takePhotoBtnText}>
                    + Buka Kamera & Jepret Dokumen
                  </Text>
                </TouchableOpacity>

                {/* Grid Preview Foto */}
                {photos.length === 0 ? (
                  <View
                    style={[
                      styles.emptyPhotoBox,
                      {
                        backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                        borderColor: isDark ? '#1E293B' : '#E2E8F0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.emptyPhotoText,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                      ]}
                    >
                      Belum ada foto lampiran yang diambil.
                    </Text>
                    <Text
                      style={[
                        styles.emptyPhotoSubtext,
                        { color: isDark ? '#64748B' : '#94A3B8' },
                      ]}
                    >
                      Foto formulir fisik bersifat opsional tetapi sangat disarankan untuk bukti verifikasi penagihan.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.photoGrid}>
                    {photos.map((uri, idx) => (
                      <View key={uri} style={styles.photoItemWrapper}>
                        <Image source={{ uri }} style={styles.photoThumb} />
                        <TouchableOpacity
                          onPress={() => {
                            setPhotos(photos.filter((_, i) => i !== idx))
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          }}
                          style={styles.deletePhotoBtn}
                        >
                          <Trash2 size={13} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.photoIndexBadge}>
                          <Text style={styles.photoIndexText}>#{idx + 1}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ═════════ STEP 4: REVIEW & SIMPAN ═════════ */}
            {currentStep === 4 && (
              <View style={styles.stepContainer}>
                {/* Alert jika target CANCEL */}
                {aksi === 'CANCEL_DATA' && (
                  <View
                    style={[
                      styles.finalCancelAlert,
                      {
                        backgroundColor: isDark
                          ? 'rgba(244, 63, 94, 0.15)'
                          : '#FFF1F2',
                        borderColor: isDark
                          ? 'rgba(244, 63, 94, 0.35)'
                          : '#FECDD3',
                      },
                    ]}
                  >
                    <AlertTriangle size={20} color="#F43F5E" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.finalCancelTitle}>
                        Konfirmasi Target Pembatalan Kargo
                      </Text>
                      <Text
                        style={[
                          styles.finalCancelDesc,
                          { color: isDark ? '#FDA4AF' : '#BE123C' },
                        ]}
                      >
                        Nomor inputan{' '}
                        <Text style={{ fontWeight: '700', color: '#F43F5E' }}>
                          {awalNoInputan}
                        </Text>{' '}
                        akan diajukan untuk dibatalkan (fdCancel = 1).
                      </Text>
                    </View>
                  </View>
                )}

                {/* Card Ringkasan */}
                <View
                  style={[
                    styles.reviewCard,
                    {
                      backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                      borderColor: isDark ? '#1E293B' : '#E2E8F0',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.reviewHeader,
                      { color: isDark ? '#F8FAFC' : '#0F172A' },
                    ]}
                  >
                    Ringkasan Formulir
                  </Text>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewKey}>Nomor Form</Text>
                    <Text
                      style={[
                        styles.reviewVal,
                        styles.monoInput,
                        { color: isDark ? '#38BDF8' : '#0284C7' },
                      ]}
                    >
                      {nomorForm}
                    </Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewKey}>Aksi</Text>
                    <Text
                      style={[
                        styles.reviewVal,
                        { color: aksi === 'CANCEL_DATA' ? '#F43F5E' : '#0284C7' },
                      ]}
                    >
                      {aksi === 'CANCEL_DATA' ? 'CANCEL DATA' : 'BUAT BILL'}
                    </Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewKey}>Tipe Data</Text>
                    <Text style={styles.reviewVal}>{tipeData}</Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewKey}>Dibuat Oleh</Text>
                    <Text style={styles.reviewVal}>{dibuatOleh || '-'}</Text>
                  </View>

                  <View style={styles.reviewDivider} />

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewKey}>No. Inputan Awal</Text>
                    <Text style={[styles.reviewVal, styles.monoInput]}>
                      {awalNoInputan || '-'}
                    </Text>
                  </View>

                  {awalCustName ? (
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewKey}>Pelanggan Awal</Text>
                      <Text style={styles.reviewVal}>{awalCustName}</Text>
                    </View>
                  ) : null}

                  {aksi !== 'CANCEL_DATA' && (
                    <>
                      <View style={styles.reviewRow}>
                        <Text style={styles.reviewKey}>No. Inputan Baru</Text>
                        <Text
                          style={[
                            styles.reviewVal,
                            styles.monoInput,
                            { color: '#10B981', fontWeight: '700' },
                          ]}
                        >
                          {baruNoInputan || '-'}
                        </Text>
                      </View>
                      {baruCustName ? (
                        <View style={styles.reviewRow}>
                          <Text style={styles.reviewKey}>Pelanggan Baru</Text>
                          <Text style={styles.reviewVal}>{baruCustName}</Text>
                        </View>
                      ) : null}
                    </>
                  )}

                  <View style={styles.reviewDivider} />

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewKey}>Foto Lampiran</Text>
                    <Text style={styles.reviewVal}>
                      {photos.length} foto siap upload
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Navigation Bar Terproteksi Safe Area Android */}
          <View
            style={[
              styles.bottomNav,
              {
                backgroundColor: isDark ? '#131B2E' : '#FFFFFF',
                borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
                paddingBottom: bottomPadding,
              },
            ]}
          >
            {currentStep > 1 ? (
              <TouchableOpacity
                onPress={handleBack}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  styles.backBtn,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  },
                ]}
                activeOpacity={0.7}
              >
                <ChevronLeft size={18} color={isDark ? '#E2E8F0' : '#475569'} />
                <Text
                  style={[
                    styles.backBtnText,
                    { color: isDark ? '#E2E8F0' : '#475569' },
                  ]}
                >
                  Kembali
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 100 }} />
            )}

            {currentStep < 4 ? (
              <TouchableOpacity
                onPress={handleNext}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.8}
                style={styles.nextBtn}
              >
                <Text style={styles.nextBtnText}>Selanjutnya</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.8}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor:
                      aksi === 'CANCEL_DATA' ? '#E11D48' : '#0284C7',
                  },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.submitBtnText}>Simpan Form</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>

        {/* Modal Sub-Komponen Lookup: Bisa untuk DATA AWAL atau DATA BARU */}
        <MobileInputanLookupModal
          visible={isLookupOpen}
          onClose={() => setIsLookupOpen(false)}
          isTargetCancel={aksi === 'CANCEL_DATA' && lookupTarget === 'AWAL'}
          title={
            lookupTarget === 'AWAL'
              ? aksi === 'CANCEL_DATA'
                ? 'Pilih Target Pembatalan (DATA AWAL)'
                : 'Pilih Data Awal (Eksisting)'
              : 'Pilih Target Bill (DATA BARU)'
          }
          onSelect={(item) => {
            if (lookupTarget === 'AWAL') {
              setAwalNoInputan(item.fdNoInputan)
              if (item.fdCustCode) setAwalCustCode(item.fdCustCode)
              if (item.fdCustName) setAwalCustName(item.fdCustName)
              if (item.fdSpMark) setAwalSpMark(item.fdSpMark)
              if (item.fdQtyVolWgt) setAwalQtyVolWgt(item.fdQtyVolWgt)
            } else {
              setBaruNoInputan(item.fdNoInputan)
              if (item.fdCustCode) setBaruCustCode(item.fdCustCode)
              if (item.fdCustName) setBaruCustName(item.fdCustName)
              if (item.fdSpMark) setBaruSpMark(item.fdSpMark)
              if (item.fdQtyVolWgt) setBaruQtyVolWgt(item.fdQtyVolWgt)
            }
          }}
        />

        <CameraCaptureModal
          visible={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={(photoUri) => {
            setPhotos([...photos, photoUri])
          }}
        />
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollStyle: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  stepContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputGroupSmall: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  fieldSubLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  autoBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  actionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  actionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  actionCardSub: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  cancelInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelInfoTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F43F5E',
  },
  cancelInfoDesc: {
    fontSize: 11.5,
    marginTop: 2,
  },
  tipeDataRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipeDataBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  tipeDataBtnText: {
    fontSize: 11.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13.5,
    minHeight: 46,
  },
  monoInput: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textArea: {
    minHeight: 76,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  inputWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWithFlex: {
    flex: 1,
  },
  inlineSearchBtn: {
    width: 46,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  picToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  picToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  picContentBox: {
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F43F5E',
  },
  cancelBannerDesc: {
    fontSize: 11.5,
    marginTop: 2,
  },
  billBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  billBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  billBannerDesc: {
    fontSize: 11.5,
    marginTop: 2,
  },
  dataCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  dataCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  dataCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  lookupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  lookupBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  photoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  photoBannerDesc: {
    fontSize: 11.5,
    marginTop: 2,
  },
  takePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  takePhotoBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  emptyPhotoBox: {
    padding: 24,
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyPhotoText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  emptyPhotoSubtext: {
    fontSize: 11,
    textAlign: 'center',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoItemWrapper: {
    width: 96,
    height: 128,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoIndexText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  finalCancelAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  finalCancelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F43F5E',
  },
  finalCancelDesc: {
    fontSize: 12,
    marginTop: 3,
  },
  reviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  reviewHeader: {
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 4,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewKey: {
    fontSize: 12,
    color: '#94A3B8',
  },
  reviewVal: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  reviewDivider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    marginVertical: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    zIndex: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 6,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 12,
    shadowColor: '#0284C7',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
})
