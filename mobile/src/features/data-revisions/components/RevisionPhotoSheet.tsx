import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native'
import {
  X,
  Camera,
  Image as ImageIcon,
  Trash2,
  Maximize2,
  Plus,
  RotateCcw,
  RotateCw,
  Crop,
  ZoomIn,
  ZoomOut,
  Zap,
  ZapOff,
  Share2,
} from 'lucide-react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { useThemeStore } from '@/theme/themeStore'
import { useToastStore } from '@/stores/toastStore'
import { DEFAULT_API_URL } from '@/api/client'
import {
  DATA_REVISIONS_QUERY_KEY,
  useDataRevisionDetail,
  useUploadDataRevisionPhoto,
  useDeleteDataRevisionPhoto,
} from '../hooks/useDataRevisions'
import type { DataRevision, DataRevisionLampiran } from '../types/dataRevisions.types'
import { RevisionCropModal } from './RevisionCropModal'

interface Props {
  revision: DataRevision | null
  visible: boolean
  onClose: () => void
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 32 - 16) / 3 // 3 columns with padding and gap

export function resolveDataRevisionPhotoUrl(lamp: DataRevisionLampiran | any): string {
  if (!lamp) return ''
  const raw = lamp.fdPath || lamp.fdFilePath || lamp.fdNamaFileSimpan || ''
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw
  }
  const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '')
  const fullRelative = normalized.startsWith('uploads/')
    ? normalized
    : `uploads/data-revisions/${normalized.replace(/^uploads\/data-revisions\//, '')}`
  const baseUrl = DEFAULT_API_URL.replace(/\/api$/, '')
  return `${baseUrl}/${fullRelative}`
}

export function RevisionPhotoSheet({ revision, visible, onClose }: Props) {
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()
  const insets = useSafeAreaInsets()
  const isDark = mode === 'midnight'

  const queryClient = useQueryClient()
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [previewRotation, setPreviewRotation] = useState<number>(0)
  const [previewZoom, setPreviewZoom] = useState<number>(1)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now())
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSharingPhoto, setIsSharingPhoto] = useState(false)
  const previewFlatListRef = useRef<FlatList<DataRevisionLampiran>>(null)

  // Kamera native states
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back')
  const [cameraFlash, setCameraFlash] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)

  // Ambil fresh detail revision beserta lampiran
  const { data: detailRes, isLoading: isDetailLoading } = useDataRevisionDetail(
    visible && revision ? revision.fdId : null
  )

  const uploadMutation = useUploadDataRevisionPhoto()
  const deleteMutation = useDeleteDataRevisionPhoto()

  const activeRevision = detailRes?.data || revision
  const photos: DataRevisionLampiran[] = (activeRevision?.lampiran as DataRevisionLampiran[]) || []

  // Sinkronkan previewIndex jika ada foto yang dihapus
  useEffect(() => {
    if (previewIndex !== null) {
      if (photos.length === 0) {
        setPreviewIndex(null)
      } else if (previewIndex >= photos.length) {
        setPreviewIndex(photos.length - 1)
      }
    }
  }, [photos.length, previewIndex])

  if (!revision) return null

  const handleOpenCamera = async () => {
    if (photos.length >= 10) {
      showToast('Batas maksimal 10 foto per formulir tercapai', 'warning')
      return
    }

    if (!permission?.granted) {
      const res = await requestPermission()
      if (!res.granted) {
        Alert.alert(
          'Izin Kamera Ditolak',
          'Harap berikan izin akses kamera di pengaturan perangkat untuk mengambil foto fisik formulir.'
        )
        return
      }
    }

    setIsCameraActive(true)
  }

  const handleCapturePhoto = async () => {
    if (!cameraRef.current || isProcessing) return
    setIsProcessing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      })

      if (!photo?.uri && !photo?.base64) {
        throw new Error('Gagal memotret gambar')
      }

      setIsCameraActive(false)
      showToast('Mengunggah foto...', 'info')

      const photoPayload = photo.base64
        ? `data:image/jpeg;base64,${photo.base64}`
        : photo.uri

      const nextIndex = photos.length + 1
      await uploadMutation.mutateAsync({
        revisionId: revision.fdId,
        fileUri: photoPayload,
        fileName: `form-${revision.fdNomorForm.replace(/\//g, '-')}-${nextIndex}.jpg`,
        keterangan: `Lampiran foto formulir ${nextIndex}`,
      })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      showToast('Foto berhasil ditambahkan', 'success')
    } catch (err: any) {
      console.error('[RevisionPhoto] Gagal jepret/upload foto:', err)
      const msg = err.response?.data?.message || err.message || 'Gagal mengunggah foto'
      Alert.alert('Gagal Upload', msg)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeletePhoto = (lamp: DataRevisionLampiran) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert(
      'Hapus Foto Lampiran',
      'Apakah Anda yakin ingin menghapus foto ini secara permanen dari formulir?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true)
              await deleteMutation.mutateAsync({
                revisionId: revision.fdId,
                lampiranId: lamp.fdId,
              })
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              showToast('Foto lampiran berhasil dihapus', 'success')
            } catch (err: any) {
              const msg = err.response?.data?.message || err.message || 'Gagal menghapus foto'
              Alert.alert('Gagal Hapus', msg)
            } finally {
              setIsProcessing(false)
            }
          },
        },
      ]
    )
  }

  const handleSharePhoto = async (photoUrl: string) => {
    if (!photoUrl || isSharingPhoto) return
    setIsSharingPhoto(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      const isAvailable = await Sharing.isAvailableAsync()
      if (!isAvailable) {
        Alert.alert('Fitur Tidak Didukung', 'Berbagi berkas tidak tersedia di perangkat ini.')
        return
      }

      const filename = photoUrl.split('/').pop()?.split('?')[0] || `revisi_${Date.now()}.jpg`
      const localUri = `${FileSystem.cacheDirectory}${filename}`

      const downloadResult = await FileSystem.downloadAsync(photoUrl, localUri)
      if (downloadResult.status !== 200) {
        throw new Error('Gagal mengunduh berkas foto')
      }

      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'image/jpeg',
        dialogTitle: `Bagikan Foto Formulir #${revision.fdNomorForm}`,
      })
    } catch (error: any) {
      console.warn('[SharePhoto] Gagal berbagi:', error)
      Alert.alert('Gagal Berbagi', error.message || 'Terjadi kesalahan saat menyiapkan foto.')
    } finally {
      setIsSharingPhoto(false)
    }
  }

  const custName =
    revision.details?.[0]?.fdBaruCustName ||
    revision.details?.[0]?.fdAwalCustName ||
    'Kargo'

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.sheetHeader,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
            ]}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.sheetTitle, { color: colors.primary }]}>
                  Foto Formulir: {revision.fdNomorForm}
                </Text>
                <View
                  style={[
                    styles.counterBadge,
                    {
                      backgroundColor: isDark
                        ? 'rgba(56, 189, 248, 0.15)'
                        : 'rgba(2, 132, 199, 0.1)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.counterBadgeText,
                      { color: isDark ? '#38BDF8' : '#0284C7' },
                    ]}
                  >
                    {photos.length}/10
                  </Text>
                </View>
              </View>
              <Text style={[styles.sheetSubtitle, { color: colors.secondary }]} numberOfLines={1}>
                {custName} • {revision.fdTanggal ? revision.fdTanggal.substring(0, 10) : ''}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Upload Action Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenCamera}
              disabled={photos.length >= 10 || isProcessing}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.tabBarActive,
                  opacity: photos.length >= 10 || isProcessing ? 0.6 : 1,
                },
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Camera size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>
                    {photos.length >= 10
                      ? 'Maksimal 10 Foto Tercapai'
                      : '+ Ambil Foto Formulir'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Photo Grid */}
            {isDetailLoading && photos.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tabBarActive} />
                <Text style={[styles.loadingText, { color: colors.secondary }]}>
                  Memuat foto formulir...
                </Text>
              </View>
            ) : photos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(0,0,0,0.04)',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <ImageIcon size={32} color={colors.secondary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.primary }]}>
                  Belum Ada Foto Lampiran
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.secondary }]}>
                  Ambil foto dokumen fisik formulir atau surat pendukung menggunakan tombol di atas.
                </Text>
              </View>
            ) : (
              <View style={styles.gridContainer}>
                {photos.map((item, index) => {
                  const photoUrl = resolveDataRevisionPhotoUrl(item)
                  return (
                    <View
                      key={String(item.fdId || index)}
                      style={[
                        styles.gridItem,
                        { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          setPreviewIndex(index)
                        }}
                        style={styles.gridImageWrapper}
                      >
                        <Image
                          source={{ uri: photoUrl }}
                          style={styles.gridImage}
                          resizeMode="cover"
                        />

                        {/* Foto Index Badge */}
                        <View style={styles.indexBadge}>
                          <Text style={styles.indexBadgeText}>#{index + 1}</Text>
                        </View>

                        {/* Tap to Zoom Overlay Icon */}
                        <View style={styles.zoomHint}>
                          <Maximize2 size={11} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>

                      {/* Tombol Hapus Pojok Bawah */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleDeletePhoto(item)}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={13} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Integrated Native Camera Modal Viewfinder (Persis BAP Tanpa Anotasi) */}
      {isCameraActive && (
        <Modal
          visible={isCameraActive}
          animationType="slide"
          onRequestClose={() => setIsCameraActive(false)}
        >
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={cameraFacing}
              enableTorch={cameraFlash}
            />

            {/* Top Bar Controls */}
            <View
              style={[
                styles.cameraTopBar,
                { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : insets.top + 16 },
              ]}
            >
              <TouchableOpacity
                onPress={() => setIsCameraActive(false)}
                style={styles.cameraIconBtn}
                activeOpacity={0.8}
              >
                <X size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setCameraFlash(!cameraFlash)}
                  style={styles.cameraIconBtn}
                  activeOpacity={0.8}
                >
                  {cameraFlash ? (
                    <Zap size={20} color="#FBBF24" />
                  ) : (
                    <ZapOff size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
                  style={styles.cameraIconBtn}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Bar Shutter */}
            <View
              style={[
                styles.cameraBottomBar,
                {
                  paddingBottom:
                    Platform.OS === 'android'
                      ? Math.max(insets.bottom, 48) + 24
                      : Math.max(insets.bottom, 24) + 16,
                },
              ]}
            >
              <TouchableOpacity
                onPress={handleCapturePhoto}
                disabled={isProcessing}
                style={styles.shutterBtn}
                activeOpacity={0.8}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#0B0F17" />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Fullscreen Horizontal Slider Modal with Share & Delete (Persis BAP) */}
      {previewIndex !== null && photos[previewIndex] && (
        <Modal
          visible={previewIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewIndex(null)}
        >
          <View style={styles.fullscreenBackdrop}>
            {/* Header */}
            <View style={styles.fullscreenHeader}>
              <TouchableOpacity
                onPress={() => setPreviewIndex(null)}
                style={styles.fullscreenIconBtn}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.fullscreenCounterBadge}>
                <Text style={styles.fullscreenCounterText}>
                  {previewIndex + 1} / {photos.length}
                </Text>
              </View>

              <View style={styles.fullscreenActionsRow}>
                <TouchableOpacity
                  onPress={() =>
                    handleSharePhoto(resolveDataRevisionPhotoUrl(photos[previewIndex]))
                  }
                  disabled={isSharingPhoto}
                  style={styles.fullscreenIconBtn}
                >
                  {isSharingPhoto ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Share2 size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    const currentPhoto = photos[previewIndex]
                    if (currentPhoto) {
                      handleDeletePhoto(currentPhoto)
                    }
                  }}
                  style={[styles.fullscreenIconBtn, styles.fullscreenDeleteBtn]}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Slider */}
            <View style={styles.fullscreenSliderContainer}>
              <FlatList
                ref={previewFlatListRef}
                data={photos}
                keyExtractor={(item, idx) => String(item.fdId || idx)}
                horizontal
                pagingEnabled={previewZoom === 1}
                scrollEnabled={previewZoom === 1}
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={previewIndex}
                getItemLayout={(_, index) => ({
                  length: SCREEN_WIDTH,
                  offset: SCREEN_WIDTH * index,
                  index,
                })}
                onMomentumScrollEnd={(e) => {
                  const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
                  if (newIndex >= 0 && newIndex < photos.length) {
                    setPreviewIndex(newIndex)
                    setPreviewRotation(0)
                    setPreviewZoom(1)
                  }
                }}
                renderItem={({ item }) => {
                  const currentUrl = `${resolveDataRevisionPhotoUrl(item)}?t=${cacheBuster}`
                  return (
                    <View style={styles.fullscreenSlideItem}>
                      <View
                        style={[
                          styles.fullscreenImageWrapper,
                          {
                            transform: [
                              { rotate: `${previewRotation}deg` },
                              { scale: previewZoom },
                            ],
                          },
                        ]}
                      >
                        <Image
                          source={{ uri: currentUrl }}
                          style={styles.fullscreenImage}
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                  )
                }}
              />
            </View>

            {/* Floating Zoom & Rotate & Crop Toolbar */}
            <View style={styles.fullscreenToolbarRow}>
              {/* Rotate Counter-Clockwise */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setPreviewRotation((prev) => (prev - 90 + 360) % 360)
                }}
                style={styles.floatingToolBtn}
                activeOpacity={0.7}
              >
                <RotateCcw size={17} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Rotate Clockwise */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setPreviewRotation((prev) => (prev + 90) % 360)
                }}
                style={styles.floatingToolBtn}
                activeOpacity={0.7}
              >
                <RotateCw size={17} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.floatingSeparator} />

              {/* Zoom Out */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setPreviewZoom((prev) => Math.max(prev - 0.25, 0.75))
                }}
                disabled={previewZoom <= 0.75}
                style={[styles.floatingToolBtn, previewZoom <= 0.75 && { opacity: 0.4 }]}
                activeOpacity={0.7}
              >
                <ZoomOut size={17} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Zoom Reset / Value */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setPreviewZoom(1)
                  setPreviewRotation(0)
                }}
                style={styles.floatingZoomBadge}
                activeOpacity={0.7}
              >
                <Text style={styles.floatingZoomText}>
                  {Math.round(previewZoom * 100)}%
                </Text>
              </TouchableOpacity>

              {/* Zoom In */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setPreviewZoom((prev) => Math.min(prev + 0.25, 3))
                }}
                disabled={previewZoom >= 3}
                style={[styles.floatingToolBtn, previewZoom >= 3 && { opacity: 0.4 }]}
                activeOpacity={0.7}
              >
                <ZoomIn size={17} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.floatingSeparator} />

              {/* Crop & Rotate Button */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  setIsCropModalOpen(true)
                }}
                style={[styles.floatingToolBtn, styles.floatingCropBtn]}
                activeOpacity={0.7}
              >
                <Crop size={16} color="#FFFFFF" />
                <Text style={styles.floatingCropText}>Crop</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.fullscreenFooter}>
              {photos.length > 1 && (
                <View style={styles.dotsRow}>
                  {photos.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.dotItem,
                        idx === previewIndex && styles.dotItemActive,
                      ]}
                    />
                  ))}
                </View>
              )}

              <Text style={styles.fullscreenCaption} numberOfLines={2}>
                {photos[previewIndex].fdKeterangan ||
                  photos[previewIndex].fdNamaFile ||
                  photos[previewIndex].fdNamaFileSimpan ||
                  `Foto #${previewIndex + 1}`}
              </Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Revision Crop & Rotate Modal */}
      {previewIndex !== null && photos[previewIndex] && (
        <RevisionCropModal
          visible={isCropModalOpen}
          photo={photos[previewIndex]}
          photoUrl={`${resolveDataRevisionPhotoUrl(photos[previewIndex])}?t=${cacheBuster}`}
          onClose={() => setIsCropModalOpen(false)}
          onSuccess={() => {
            setCacheBuster(Date.now())
            setPreviewRotation(0)
            setPreviewZoom(1)
            queryClient.invalidateQueries({ queryKey: [DATA_REVISIONS_QUERY_KEY] })
            queryClient.invalidateQueries({
              queryKey: [DATA_REVISIONS_QUERY_KEY, 'detail', revision.fdId],
            })
          }}
        />
      )}
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  counterBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  counterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sheetSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
  },
  sheetBody: {
    paddingHorizontal: 16,
  },
  sheetBodyContent: {
    paddingTop: 14,
    paddingBottom: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyDesc: {
    fontSize: 11.5,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 17,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  gridImageWrapper: {
    width: '100%',
    height: '100%',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
  },
  indexBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  indexBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  zoomHint: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  // Native Camera Modal Viewfinder
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  cameraIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  // Fullscreen Viewer
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'space-between',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    zIndex: 10,
  },
  fullscreenCounterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  fullscreenCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  fullscreenActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fullscreenIconBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  fullscreenDeleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  fullscreenSliderContainer: {
    flex: 1,
  },
  fullscreenSlideItem: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fullscreenImageWrapper: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  fullscreenToolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
    zIndex: 20,
  },
  floatingToolBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCropBtn: {
    flexDirection: 'row',
    width: 'auto',
    paddingHorizontal: 12,
    gap: 4,
    backgroundColor: '#0284C7',
  },
  floatingCropText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  floatingSeparator: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 2,
  },
  floatingZoomBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingZoomText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  fullscreenFooter: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 44 : 36,
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 4,
  },
  dotItem: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotItemActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  fullscreenCaption: {
    color: '#94A3B8',
    fontSize: 11.5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
})
