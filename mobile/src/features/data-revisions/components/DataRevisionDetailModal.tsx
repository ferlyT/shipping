import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
  Dimensions,
  Linking,
  PanResponder,
} from 'react-native'
import {
  X,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
  Ban,
  Camera,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  ExternalLink,
  Edit2,
  Trash2,
  Plus,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { useToastStore } from '@/stores/toastStore'
import { DEFAULT_API_URL } from '@/api/client'
import {
  useDataRevisionDetail,
  useExecuteCancelData,
  useDeleteDataRevision,
} from '../hooks/useDataRevisions'

interface Props {
  revisionId: number | null
  visible: boolean
  onClose: () => void
  onSuccess: () => void
  onEdit?: (item: any) => void
  onDelete?: (id: number) => void
  onOpenPhotos?: (item: any) => void
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export function DataRevisionDetailModal({
  revisionId,
  visible,
  onClose,
  onSuccess,
  onEdit,
  onDelete,
  onOpenPhotos,
}: Props) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const insets = useSafeAreaInsets()
  const { showToast } = useToastStore()

  const topPadding =
    Platform.OS === 'android'
      ? Math.max(insets.top, 28) + 8
      : Math.max(insets.top, 12) + 4

  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 28) + 12
      : Math.max(insets.bottom, 12) + 12

  const lineColor = isDark ? '#222C38' : '#E3E7EC'

  const { data, isLoading, refetch } = useDataRevisionDetail(revisionId)
  const executeCancelMutation = useExecuteCancelData()
  const deleteMutation = useDeleteDataRevision()

  const [previewPhoto, setPreviewPhoto] = useState<{
    url: string
    title: string
    filename: string
  } | null>(null)
  const [isPhotoLoading, setIsPhotoLoading] = useState(false)
  const [photoLoadError, setPhotoLoadError] = useState(false)

  // Zoom & Pan state
  const [zoomScale, setZoomScale] = useState(1)
  const [zoomRotation, setZoomRotation] = useState(0)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })

  const zoomScaleRef = useRef(1)
  const panOffsetRef = useRef({ x: 0, y: 0 })
  zoomScaleRef.current = zoomScale
  panOffsetRef.current = panOffset

  const lastTouchTime = useRef(0)
  const initialDistance = useRef(0)
  const initialScale = useRef(1)
  const lastTouchPos = useRef<{ x: number; y: number } | null>(null)

  const handleResetZoom = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setZoomScale(1)
    setPanOffset({ x: 0, y: 0 })
    setZoomRotation(0)
    initialDistance.current = 0
    lastTouchPos.current = null
  }

  const handleZoomIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setZoomScale((prev) => Math.min(Number((prev + 0.5).toFixed(1)), 4.0))
  }

  const handleZoomOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setZoomScale((prev) => {
      const next = Math.max(Number((prev - 0.5).toFixed(1)), 1.0)
      if (next === 1.0) setPanOffset({ x: 0, y: 0 })
      return next
    })
  }

  const handleRotate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setZoomRotation((prev) => (prev + 90) % 360)
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt) => {
        const now = Date.now()
        const touches = evt.nativeEvent.touches

        // Double tap toggle
        if (touches.length === 1 && now - lastTouchTime.current < 300) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          setZoomScale((prev) => {
            if (prev > 1) {
              setPanOffset({ x: 0, y: 0 })
              return 1
            } else {
              return 2.5
            }
          })
          lastTouchTime.current = 0
          initialDistance.current = 0
          lastTouchPos.current = null
          return
        }
        lastTouchTime.current = now

        if (touches.length >= 2) {
          const dx = touches[0].pageX - touches[1].pageX
          const dy = touches[0].pageY - touches[1].pageY
          initialDistance.current = Math.hypot(dx, dy)
          initialScale.current = zoomScaleRef.current
          lastTouchPos.current = null
        } else if (touches.length === 1) {
          initialDistance.current = 0
          lastTouchPos.current = { x: touches[0].pageX, y: touches[0].pageY }
        }
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches
        if (touches.length >= 2) {
          // Pinch to zoom langsung aktif
          const dx = touches[0].pageX - touches[1].pageX
          const dy = touches[0].pageY - touches[1].pageY
          const dist = Math.hypot(dx, dy)

          if (initialDistance.current <= 0) {
            initialDistance.current = dist
            initialScale.current = zoomScaleRef.current
          } else {
            const factor = dist / initialDistance.current
            const targetScale = initialScale.current * factor
            const clampedScale = Math.min(Math.max(targetScale, 1.0), 5.0)
            setZoomScale(Number(clampedScale.toFixed(2)))
          }
          lastTouchPos.current = null
        } else if (touches.length === 1) {
          initialDistance.current = 0
          if (zoomScaleRef.current > 1) {
            const curX = touches[0].pageX
            const curY = touches[0].pageY
            if (lastTouchPos.current) {
              const deltaX = curX - lastTouchPos.current.x
              const deltaY = curY - lastTouchPos.current.y
              const maxPanX = (zoomScaleRef.current - 1) * (SCREEN_WIDTH * 0.45)
              const maxPanY = (zoomScaleRef.current - 1) * (SCREEN_HEIGHT * 0.35)
              setPanOffset((prev) => ({
                x: Math.min(Math.max(prev.x + deltaX, -maxPanX), maxPanX),
                y: Math.min(Math.max(prev.y + deltaY, -maxPanY), maxPanY),
              }))
            }
            lastTouchPos.current = { x: curX, y: curY }
          } else {
            lastTouchPos.current = null
          }
        }
      },
      onPanResponderRelease: () => {
        initialDistance.current = 0
        lastTouchPos.current = null
        if (zoomScaleRef.current <= 1) {
          setPanOffset({ x: 0, y: 0 })
        }
      },
      onPanResponderTerminate: () => {
        initialDistance.current = 0
        lastTouchPos.current = null
      },
    })
  ).current

  const resolveLampiranUrl = (lamp: any) => {
    if (!lamp) return ''
    const rawPath = lamp.fdPath || lamp.fdFilePath || lamp.fdNamaFileSimpan || ''
    if (!rawPath) return ''
    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
      return rawPath
    }
    const normalized = rawPath.replace(/\\/g, '/').replace(/^\/+/, '')
    const fullRelative = normalized.startsWith('uploads/')
      ? normalized
      : `uploads/data-revisions/${normalized.replace(/^uploads\/data-revisions\//, '')}`
    const baseUrl = DEFAULT_API_URL.replace(/\/api$/, '')
    return `${baseUrl}/${fullRelative}`
  }

  if (!visible || !revisionId) return null

  const form = data?.data

  const isCancel = form?.fdAksi === 'CANCEL_DATA'
  const isPending = form?.fdStatus === 'PENDING'
  const isBilled = form?.fdStatus === 'BILL_CREATED' || form?.fdStatus === 'BILL_TERBUAT'
  const isCancelled = form?.fdStatus === 'DATA_CANCELLED'

  const handleExecuteCancel = () => {
    Alert.alert(
      'Konfirmasi Pembatalan Data',
      `Apakah Anda yakin ingin mengeksekusi pembatalan data untuk form ${form?.fdNomorForm}? Sistem akan mengubah fdCancel = 1 di database tbEntryList.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Batalkan Data',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning
            )
            try {
              await executeCancelMutation.mutateAsync(revisionId)
              showToast('Data kargo berhasil dibatalkan (fdCancel = 1)!', 'success')
              refetch()
              onSuccess()
            } catch (err: any) {
              const msg =
                err.response?.data?.message ||
                err.message ||
                'Gagal mengeksekusi pembatalan data'
              Alert.alert('Eksekusi Ditolak', msg)
            }
          },
        },
      ]
    )
  }

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert(
      'Hapus Formulir Revisi',
      `Apakah Anda yakin ingin menghapus form ${form?.fdNomorForm}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              if (onDelete && revisionId) {
                onDelete(revisionId)
              } else if (revisionId) {
                await deleteMutation.mutateAsync(revisionId)
                showToast('Formulir revisi berhasil dihapus', 'success')
                onSuccess()
              }
              onClose()
            } catch (err: any) {
              const msg =
                err.response?.data?.message || err.message || 'Gagal menghapus formulir'
              Alert.alert('Gagal Menghapus', msg)
            }
          },
        },
      ]
    )
  }

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onClose()
    if (onEdit && form) {
      onEdit(form)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2' },
        ]}
      >
        {/* Header Bar */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? '#131A23' : '#FFFFFF',
              borderBottomColor: lineColor,
              paddingTop: topPadding,
            },
          ]}
        >
          <View style={styles.headerTitleCol}>
            <Text
              style={[
                styles.headerFormNo,
                { color: colors.primary },
              ]}
              numberOfLines={1}
            >
              {form?.fdNomorForm || 'Memuat...'}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: colors.secondary },
              ]}
            >
              Detail form input & revisi data
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { borderColor: lineColor, backgroundColor: isDark ? '#131A23' : '#FFFFFF' }]}
            accessibilityLabel="Tutup"
          >
            <X size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[
                styles.loadingText,
                { color: colors.secondary },
              ]}
            >
              Memuat detail formulir...
            </Text>
          </View>
        ) : !form ? (
          <View style={styles.centerBox}>
            <Text
              style={{ color: colors.secondary, fontSize: 13 }}
            >
              Data form tidak ditemukan
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: bottomPadding + 80,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Invoice Banner jika ada (seperti HTML .invoice) */}
            {form.fdMatchedInvNo ? (
              <View style={[styles.invoiceBanner, { borderLeftColor: isDark ? '#4CC38A' : '#17855A' }]}>
                <Text style={[styles.invoiceBannerTitle, { color: isDark ? '#4CC38A' : '#17855A' }]}>
                  Faktur telah diterbitkan
                </Text>
                <Text style={[styles.invoiceBannerText, { color: colors.secondary }]}>
                  No. invoice{' '}
                  <Text style={[styles.invoiceBannerTextBold, { color: colors.primary }]}>
                    {form.fdMatchedInvNo}
                  </Text>
                </Text>
              </View>
            ) : null}

            {/* Status & Aksi Metadata Tags */}
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.metaTag,
                  {
                    borderColor: isBilled
                      ? (isDark ? '#4CC38A' : '#17855A')
                      : isPending
                      ? (isDark ? '#E5A93C' : '#A97612')
                      : (isDark ? '#EF6B5B' : '#C4402F'),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.metaTagText,
                    {
                      color: isBilled
                        ? (isDark ? '#4CC38A' : '#17855A')
                        : isPending
                        ? (isDark ? '#E5A93C' : '#A97612')
                        : (isDark ? '#EF6B5B' : '#C4402F'),
                    },
                  ]}
                >
                  {isPending
                    ? 'Menunggu'
                    : isBilled
                    ? 'Bill terbit'
                    : 'Dibatalkan'}
                </Text>
              </View>

              <View style={[styles.metaTag, { borderColor: lineColor }]}>
                <Text style={[styles.metaTagText, { color: colors.secondary }]}>
                  {isCancel ? 'Cancel data' : 'Buat bill'}
                </Text>
              </View>

              {form.fdTanggal && (
                <View style={[styles.metaTag, { borderColor: lineColor }]}>
                  <Text style={[styles.metaTagText, { color: colors.secondary }]}>
                    {form.fdTanggal.substring(0, 10)}
                  </Text>
                </View>
              )}
            </View>

            {/* Rincian Komparasi Perubahan Data (HTML .diff) */}
            <View style={[styles.sectionBlock, { borderTopColor: lineColor }]}>
              <Text
                style={[
                  styles.sectionHeading,
                  { color: colors.primary },
                ]}
              >
                Rincian perubahan data
              </Text>

              {(form.details || []).map((d: any, idx: number) => (
                <View key={d.fdId || idx} style={styles.diffGroupWrapper}>
                  {/* Data Awal */}
                  <View style={[styles.diffGroup, styles.diffGroupOld]}>
                    <Text style={[styles.diffGroupTitle, { color: colors.secondary }]}>
                      Data awal {isCancel ? '(target pembatalan)' : ''}
                    </Text>
                    <View style={styles.dlList}>
                      <View style={styles.dlItem}>
                        <Text style={[styles.dt, { color: colors.secondary }]}>No. inputan</Text>
                        <Text style={[styles.ddOld, { color: colors.secondary }]}>
                          {d.fdAwalNoInputan || '–'}
                        </Text>
                      </View>
                      {d.fdAwalCustName ? (
                        <View style={styles.dlItem}>
                          <Text style={[styles.dt, { color: colors.secondary }]}>Pelanggan</Text>
                          <Text style={[styles.ddOld, { color: colors.secondary }]}>
                            {d.fdAwalCustName}
                          </Text>
                        </View>
                      ) : null}
                      {d.fdAwalSpMark ? (
                        <View style={styles.dlItem}>
                          <Text style={[styles.dt, { color: colors.secondary }]}>Marking</Text>
                          <Text style={[styles.ddOld, { color: colors.secondary }]}>
                            {d.fdAwalSpMark}
                          </Text>
                        </View>
                      ) : null}
                      {d.fdAwalQtyVolWgt ? (
                        <View style={styles.dlItem}>
                          <Text style={[styles.dt, { color: colors.secondary }]}>Volume</Text>
                          <Text style={[styles.ddOld, { color: colors.secondary }]}>
                            {d.fdAwalQtyVolWgt}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Data Baru (Target Penagihan) */}
                  {!isCancel && (
                    <View
                      style={[
                        styles.diffGroup,
                        styles.diffGroupNew,
                        {
                          borderLeftColor: isDark ? '#4CC38A' : '#17855A',
                          borderTopColor: lineColor,
                        },
                      ]}
                    >
                      <Text style={[styles.diffGroupTitle, { color: colors.secondary }]}>
                        Data baru (target penagihan)
                      </Text>
                      <View style={styles.dlList}>
                        <View style={styles.dlItem}>
                          <Text style={[styles.dt, { color: colors.secondary }]}>No. inputan baru</Text>
                          <Text style={[styles.dd, { color: colors.primary }]}>
                            {d.fdBaruNoInputan || '–'}
                          </Text>
                        </View>
                        {d.fdBaruCustName ? (
                          <View style={styles.dlItem}>
                            <Text style={[styles.dt, { color: colors.secondary }]}>Pelanggan baru</Text>
                            <Text style={[styles.dd, { color: colors.primary }]}>
                              {d.fdBaruCustName}
                            </Text>
                          </View>
                        ) : null}
                        {d.fdBaruSpMark ? (
                          <View style={styles.dlItem}>
                            <Text style={[styles.dt, { color: colors.secondary }]}>Marking baru</Text>
                            <Text style={[styles.dd, { color: colors.primary }]}>
                              {d.fdBaruSpMark}
                            </Text>
                          </View>
                        ) : null}
                        {d.fdBaruQtyVolWgt ? (
                          <View style={styles.dlItem}>
                            <Text style={[styles.dt, { color: colors.secondary }]}>Volume baru</Text>
                            <Text style={[styles.dd, { color: colors.primary }]}>
                              {d.fdBaruQtyVolWgt}
                            </Text>
                          </View>
                        ) : null}
                        {d.fdBaruDetail ? (
                          <View style={styles.dlItem}>
                            <Text style={[styles.dt, { color: colors.secondary }]}>Keterangan</Text>
                            <Text style={[styles.dd, { color: colors.primary }]}>
                              {d.fdBaruDetail}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Lampiran Foto Fisik */}
            <View style={[styles.sectionBlock, { borderTopColor: lineColor }]}>
              <View style={styles.sectionHeadingRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={[
                      styles.sectionHeading,
                      { color: colors.primary, marginBottom: 0 },
                    ]}
                  >
                    Bukti lampiran fisik
                  </Text>
                  <View style={[styles.countBadge, { borderColor: lineColor }]}>
                    <Text style={[styles.countBadgeText, { color: colors.secondary }]}>
                      {(form.lampiran || []).length}
                    </Text>
                  </View>
                </View>

                {onOpenPhotos && (
                  <TouchableOpacity
                    onPress={() => onOpenPhotos(form)}
                    activeOpacity={0.7}
                    style={styles.linkActionBtn}
                  >
                    <Camera size={16} color="#E0644E" />
                    <Text style={styles.linkActionBtnText}>Kelola foto</Text>
                  </TouchableOpacity>
                )}
              </View>

              {(form.lampiran || []).length === 0 ? (
                <View style={styles.emptyPhotoBox}>
                  <Text style={[styles.emptyPhotoText, { color: colors.secondary }]}>
                    Tidak ada lampiran foto fisik pada dokumen ini.
                  </Text>
                </View>
              ) : (
                <View style={styles.photosGrid}>
                  {form.lampiran!.map((lamp: any) => {
                    const photoUrl = resolveLampiranUrl(lamp)
                    const fileName = lamp.fdNamaFile || lamp.fdNamaFileSimpan || 'Foto lampiran'
                    return (
                      <View key={lamp.fdId} style={styles.photoCol}>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => {
                            setPhotoLoadError(false)
                            setIsPhotoLoading(true)
                            setZoomScale(1)
                            setZoomRotation(0)
                            setPanOffset({ x: 0, y: 0 })
                            setPreviewPhoto({
                              url: photoUrl,
                              title: lamp.fdKeterangan || fileName,
                              filename: fileName,
                            })
                          }}
                          style={[styles.photoCard, { borderColor: lineColor }]}
                        >
                          <Image
                            source={{ uri: photoUrl }}
                            style={styles.photoImg}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>

                        <View style={styles.capRow}>
                          <Text style={[styles.capName, { color: colors.secondary }]} numberOfLines={1}>
                            {fileName}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              setPhotoLoadError(false)
                              setIsPhotoLoading(true)
                              setZoomScale(1)
                              setZoomRotation(0)
                              setPanOffset({ x: 0, y: 0 })
                              setPreviewPhoto({
                                url: photoUrl,
                                title: lamp.fdKeterangan || fileName,
                                filename: fileName,
                              })
                            }}
                            style={styles.capOpenBtn}
                          >
                            <ZoomIn size={14} color="#E0644E" />
                            <Text style={styles.capOpenText}>Buka</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>

            {/* Informasi Dokumen */}
            <View style={[styles.sectionBlock, { borderTopColor: lineColor }]}>
              <Text style={[styles.sectionHeading, { color: colors.primary }]}>
                Informasi dokumen
              </Text>
              <View style={styles.dlList}>
                <View style={styles.dlItem}>
                  <Text style={[styles.dt, { color: colors.secondary }]}>Dibuat oleh</Text>
                  <Text style={[styles.dd, { color: colors.primary }]}>
                    {form.fdDibuatOleh || form.fdCreatedBy} ({form.fdCreatedAt?.substring(0, 10)})
                  </Text>
                </View>

                {form.fdCatatan ? (
                  <View style={styles.dlItem}>
                    <Text style={[styles.dt, { color: colors.secondary }]}>Catatan</Text>
                    <Text style={[styles.dd, { color: colors.primary }]}>
                      {form.fdCatatan}
                    </Text>
                  </View>
                ) : null}

                {form.fdExecutedBy ? (
                  <View style={styles.dlItem}>
                    <Text style={[styles.dt, { color: colors.secondary }]}>Dieksekusi</Text>
                    <Text style={[styles.dd, { color: '#EF6B5B' }]}>
                      {form.fdExecutedBy} ({form.fdExecutedAt?.substring(0, 16)})
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Fixed Bottom Action Bar (seperti HTML .actions) */}
        {form && (
          <View
            style={[
              styles.actionsFixedBar,
              {
                backgroundColor: isDark ? 'rgba(12,17,24,0.95)' : 'rgba(246,247,249,0.95)',
                borderTopColor: lineColor,
                paddingBottom: bottomPadding,
              },
            ]}
          >
            {isCancel && isPending ? (
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={handleExecuteCancel}
                  disabled={executeCancelMutation.isPending}
                  style={styles.btnExecuteCancel}
                >
                  {executeCancelMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ban size={16} color="#FFFFFF" />
                      <Text style={styles.btnExecuteCancelText}>
                        Eksekusi pembatalan (fdCancel = 1)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.actionsGrid}>
                  <TouchableOpacity
                    onPress={handleDelete}
                    disabled={deleteMutation.isPending}
                    style={[styles.btnAction, styles.btnDel]}
                  >
                    <Trash2 size={16} color="#EF6B5B" />
                    <Text style={styles.btnDelText}>Hapus</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleEdit}
                    style={[styles.btnAction, styles.btnMain]}
                  >
                    <Edit2 size={16} color="#FFFFFF" />
                    <Text style={styles.btnMainText}>Edit form</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={deleteMutation.isPending}
                  style={[styles.btnAction, styles.btnDel]}
                >
                  <Trash2 size={16} color="#EF6B5B" />
                  <Text style={styles.btnDelText}>Hapus</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleEdit}
                  style={[styles.btnAction, styles.btnMain]}
                >
                  <Edit2 size={16} color="#FFFFFF" />
                  <Text style={styles.btnMainText}>Edit form</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Preview Zoom Modal */}
        <Modal
          visible={!!previewPhoto}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setPreviewPhoto(null)
            handleResetZoom()
          }}
        >
          <View style={styles.previewBackdrop}>
            {/* Top Toolbar */}
            <View style={styles.previewTopBar}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {previewPhoto?.title}
                </Text>
                <Text style={styles.previewSubtitle} numberOfLines={1}>
                  {previewPhoto?.filename}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {previewPhoto?.url && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(previewPhoto.url)}
                    style={styles.previewActionBtn}
                  >
                    <ExternalLink size={15} color="#FFFFFF" />
                    <Text style={styles.previewActionText}>Browser</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => {
                    setPreviewPhoto(null)
                    handleResetZoom()
                  }}
                  style={styles.previewCloseBtn}
                >
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Image Container with PanResponder */}
            <View style={styles.previewImageContainer}>
              {isPhotoLoading && (
                <View style={styles.previewLoaderBox}>
                  <ActivityIndicator size="large" color="#38BDF8" />
                  <Text style={styles.previewLoaderText}>Memuat gambar...</Text>
                </View>
              )}

              {photoLoadError ? (
                <View style={styles.previewErrorBox}>
                  <AlertTriangle size={32} color="#F43F5E" />
                  <Text style={styles.previewErrorTitle}>Gagal memuat gambar</Text>
                  <Text style={styles.previewErrorDesc}>
                    Gambar tidak dapat dimuat di penampil internal. Tap tombol di bawah untuk membuka langsung di peramban.
                  </Text>
                  {previewPhoto?.url && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(previewPhoto.url)}
                      style={styles.previewErrorActionBtn}
                    >
                      <ExternalLink size={15} color="#FFFFFF" />
                      <Text style={styles.previewErrorActionText}>Buka di Peramban Web</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : previewPhoto ? (
                <View
                  {...panResponder.panHandlers}
                  style={styles.zoomTouchArea}
                >
                  <Image
                    source={{ uri: previewPhoto.url }}
                    style={[
                      styles.previewImage,
                      {
                        transform: [
                          { translateX: panOffset.x },
                          { translateY: panOffset.y },
                          { scale: zoomScale },
                          { rotate: `${zoomRotation}deg` },
                        ],
                      },
                    ]}
                    resizeMode="contain"
                    onLoadStart={() => setIsPhotoLoading(true)}
                    onLoadEnd={() => setIsPhotoLoading(false)}
                    onError={() => {
                      setIsPhotoLoading(false)
                      setPhotoLoadError(true)
                    }}
                  />
                </View>
              ) : null}
            </View>

            {/* Bottom Floating Zoom Controls */}
            {!photoLoadError && previewPhoto && (
              <View
                style={[
                  styles.zoomControlBar,
                  {
                    bottom:
                      Platform.OS === 'android'
                        ? Math.max(insets.bottom + 48, 76)
                        : Math.max(insets.bottom + 24, 60),
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={handleZoomOut}
                  disabled={zoomScale <= 1}
                  style={[styles.zoomBtn, zoomScale <= 1 && styles.zoomBtnDisabled]}
                >
                  <ZoomOut size={16} color={zoomScale <= 1 ? '#64748B' : '#FFFFFF'} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleResetZoom} style={styles.zoomBadgeBtn}>
                  <Text style={styles.zoomBadgeText}>{Math.round(zoomScale * 100)}%</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleZoomIn}
                  disabled={zoomScale >= 4}
                  style={[styles.zoomBtn, zoomScale >= 4 && styles.zoomBtnDisabled]}
                >
                  <ZoomIn size={16} color={zoomScale >= 4 ? '#64748B' : '#FFFFFF'} />
                </TouchableOpacity>

                <View style={styles.zoomDivider} />

                <TouchableOpacity onPress={handleRotate} style={styles.zoomBtn}>
                  <RotateCw size={15} color="#FFFFFF" />
                </TouchableOpacity>

                {zoomScale > 1 && (
                  <TouchableOpacity onPress={handleResetZoom} style={styles.zoomResetPill}>
                    <RotateCcw size={13} color="#38BDF8" />
                    <Text style={styles.zoomResetText}>Reset</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleCol: {
    flex: 1,
    paddingRight: 10,
  },
  headerFormNo: {
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  },
  headerSubtitle: {
    fontSize: 13.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  invoiceBanner: {
    borderLeftWidth: 2,
    paddingLeft: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  invoiceBannerTitle: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  invoiceBannerText: {
    fontSize: 13.5,
    marginTop: 2,
  },
  invoiceBannerTextBold: {
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 8,
  },
  metaTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  metaTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionBlock: {
    paddingTop: 20,
    paddingBottom: 6,
    borderTopWidth: 1,
    marginTop: 14,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
    marginBottom: 12,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  linkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  linkActionBtnText: {
    color: '#E0644E',
    fontSize: 13.5,
    fontWeight: '500',
  },
  diffGroupWrapper: {
    marginBottom: 14,
  },
  diffGroup: {
    paddingVertical: 10,
  },
  diffGroupOld: {},
  diffGroupNew: {
    borderLeftWidth: 2,
    paddingLeft: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  diffGroupTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  dlList: {
    gap: 8,
  },
  dlItem: {
    gap: 2,
  },
  dt: {
    fontSize: 13,
  },
  dd: {
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  ddOld: {
    fontSize: 15,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  photoCol: {
    width: (SCREEN_WIDTH - 40 - 14) / 2,
  },
  photoCard: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 6,
  },
  capName: {
    fontSize: 12.5,
    flex: 1,
  },
  capOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  capOpenText: {
    color: '#E0644E',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyPhotoBox: {
    paddingVertical: 16,
  },
  emptyPhotoText: {
    fontSize: 13,
  },
  actionsFixedBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  btnAction: {
    minHeight: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnDel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EF6B5B',
    backgroundColor: 'transparent',
  },
  btnDelText: {
    color: '#EF6B5B',
    fontSize: 14.5,
    fontWeight: '600',
  },
  btnMain: {
    flex: 2,
    backgroundColor: '#E0644E',
    borderWidth: 1,
    borderColor: '#E0644E',
  },
  btnMainText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '600',
  },
  btnExecuteCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF6B5B',
    backgroundColor: 'rgba(239, 107, 91, 0.1)',
  },
  btnExecuteCancelText: {
    color: '#EF6B5B',
    fontSize: 13.5,
    fontWeight: '600',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  previewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    paddingBottom: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 20,
  },
  previewTitle: {
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: '700',
  },
  previewSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  previewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  previewActionText: {
    color: '#38BDF8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  previewCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  previewImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  previewImage: {
    width: SCREEN_WIDTH - 24,
    height: SCREEN_HEIGHT * 0.76,
  },
  previewLoaderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewLoaderText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  previewErrorBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
    maxWidth: 320,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 16,
  },
  previewErrorTitle: {
    color: '#F43F5E',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  previewErrorDesc: {
    color: '#94A3B8',
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
  },
  previewErrorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  previewErrorActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  zoomTouchArea: {
    width: SCREEN_WIDTH - 24,
    height: SCREEN_HEIGHT * 0.72,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  zoomControlBar: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  zoomBtn: {
    padding: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnDisabled: {
    opacity: 0.35,
  },
  zoomBadgeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  zoomBadgeText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  zoomDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 2,
  },
  zoomResetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 2,
  },
  zoomResetText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
})

