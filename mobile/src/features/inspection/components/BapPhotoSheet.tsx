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
  Zap,
  ZapOff,
  Share2,
} from 'lucide-react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeStore } from '@/theme/themeStore'
import { useToastStore } from '@/stores/toastStore'
import { DEFAULT_API_URL } from '@/api/client'
import { useBapPhotos, useUploadBapPhoto, useDeleteBapPhoto } from '../hooks/useBapPhotos'
import type { InspectionReport, BapPhoto } from '../types/inspectionReport.types'

interface Props {
  report: InspectionReport | null
  visible: boolean
  onClose: () => void
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 32 - 16) / 3 // 3 columns with padding and gap

export function BapPhotoSheet({ report, visible, onClose }: Props) {
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()
  const insets = useSafeAreaInsets()
  const isDark = mode === 'midnight'

  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSharingPhoto, setIsSharingPhoto] = useState(false)
  const previewFlatListRef = useRef<FlatList<BapPhoto>>(null)

  // Native integrated camera states
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back')
  const [cameraFlash, setCameraFlash] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)

  const { data: photos = [], isLoading } = useBapPhotos(report?.fdId, visible)
  const uploadMutation = useUploadBapPhoto()
  const deleteMutation = useDeleteBapPhoto()

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

  if (!report) return null

  const getFullPhotoUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    const baseUrl = DEFAULT_API_URL.replace(/\/api$/, '')
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
  }

  const handleOpenCamera = async () => {
    if (photos.length >= 10) {
      showToast('Batas maksimal 10 foto per BAP tercapai', 'warning')
      return
    }

    if (!permission?.granted) {
      const res = await requestPermission()
      if (!res.granted) {
        showToast('Izin kamera ditolak. Aktifkan izin kamera di pengaturan ponsel.', 'error')
        return
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setIsCameraActive(true)
  }

  const handleCapturePhoto = async () => {
    if (!cameraRef.current || isProcessing) return

    try {
      setIsProcessing(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      })

      if (photo?.base64) {
        await uploadMutation.mutateAsync({
          reportId: report.fdId,
          photoBase64: photo.base64,
        })
        setIsCameraActive(false)
        showToast('Foto berhasil ditambahkan', 'success')
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengambil foto dari kamera', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSharePhoto = async (photo: BapPhoto) => {
    if (isSharingPhoto) return
    try {
      const fullUrl = getFullPhotoUrl(photo.fdPhotoUrl)
      if (!fullUrl) return

      setIsSharingPhoto(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      showToast('Menyiapkan foto untuk dibagikan...', 'info')

      const isAvailable = await Sharing.isAvailableAsync()
      if (!isAvailable) {
        showToast('Fitur berbagi tidak didukung di perangkat ini', 'warning')
        return
      }

      const rawExt = photo.fdPhotoUrl.split('.').pop()?.toLowerCase() || 'jpg'
      const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg'
      const filename = `bap-${report.fdReportNumber || 'photo'}-${photo.fdId}.${ext}`
      const localUri = `${FileSystem.cacheDirectory}${filename}`

      const downloadResult = await FileSystem.downloadAsync(fullUrl, localUri)
      if (downloadResult.status !== 200) {
        throw new Error(`Gagal mengunduh foto (HTTP ${downloadResult.status})`)
      }

      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: ext === 'png' ? 'image/png' : 'image/jpeg',
        dialogTitle: `Bagikan Foto BAP: ${report.fdReportNumber || 'Pemeriksaan'}`,
        UTI: ext === 'png' ? 'public.png' : 'public.jpeg',
      })
    } catch (err: any) {
      showToast(err.message || 'Gagal membagikan foto', 'error')
    } finally {
      setIsSharingPhoto(false)
    }
  }

  const handleDeletePhoto = (photo: BapPhoto) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert(
      'Hapus Foto',
      'Yakin ingin menghapus foto pemeriksaan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const currentIdx = photos.findIndex((p) => p.fdId === photo.fdId)
            await deleteMutation.mutateAsync({
              reportId: report.fdId,
              photoId: photo.fdId,
            })
            if (previewIndex !== null) {
              if (photos.length <= 1) {
                setPreviewIndex(null)
              } else if (previewIndex === currentIdx && currentIdx === photos.length - 1) {
                setPreviewIndex(Math.max(0, currentIdx - 1))
              }
            }
          },
        },
      ]
    )
  }

  const bottomPadding = Platform.OS === 'android'
    ? Math.max(insets.bottom, 48) + 16
    : Math.max(insets.bottom, 24)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <View>
              <Text style={[styles.title, { color: colors.primary }]}>
                Foto BAP ({photos.length}/10)
              </Text>
              <Text style={[styles.subtitle, { color: colors.secondary }]}>
                {report.fdReportNumber} • {report.fdNamaCustomer}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  borderColor: colors.border,
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(0,0,0,0.04)',
                },
              ]}
            >
              <X size={18} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* Grid Content */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.tertiary} />
                <Text style={[styles.loadingText, { color: colors.secondary }]}>
                  Memuat foto pemeriksaan...
                </Text>
              </View>
            ) : photos.length === 0 ? (
              <View style={styles.emptyBox}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      borderColor: colors.border,
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(0,0,0,0.03)',
                    },
                  ]}
                >
                  <ImageIcon size={32} color={colors.secondary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.primary }]}>
                  Belum Ada Foto
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.secondary }]}>
                  Ambil foto dari kamera atau pilih dari galeri untuk mendokumentasikan kondisi kargo.
                </Text>
              </View>
            ) : (
              <View style={styles.gridContainer}>
                {photos.map((photo, idx) => {
                  const fullUrl = getFullPhotoUrl(photo.fdPhotoUrl)
                  return (
                    <View
                      key={photo.fdId}
                      style={[
                        styles.gridItem,
                        {
                          borderColor: colors.border,
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.02)'
                            : 'rgba(0,0,0,0.02)',
                        },
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          setPreviewIndex(idx)
                        }}
                        style={styles.imageTouchable}
                      >
                        <Image
                          source={{ uri: fullUrl }}
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>

                      <View style={styles.thumbnailActionRow}>
                        <TouchableOpacity
                          onPress={() => handleSharePhoto(photo)}
                          disabled={isSharingPhoto}
                          style={styles.actionBadgeBtn}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Share2 size={11} color="#FFFFFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeletePhoto(photo)}
                          style={[styles.actionBadgeBtn, styles.deleteBadgeBtn]}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Trash2 size={11} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}

            {isProcessing && (
              <View style={styles.uploadingNotice}>
                <ActivityIndicator size="small" color={colors.tertiary} />
                <Text style={[styles.uploadingText, { color: colors.tertiary }]}>
                  Sedang mengunggah foto ke server...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Footer Buttons */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.08)',
                paddingBottom: bottomPadding,
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleOpenCamera}
              disabled={isProcessing || photos.length >= 10}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.tabBarActive,
                  opacity: photos.length >= 10 || isProcessing ? 0.6 : 1,
                },
              ]}
            >
              <Camera size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>
                {photos.length >= 10 ? 'Maksimal 10 Foto Tercapai' : '+ Ambil Foto Pemeriksaan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Integrated Native Camera Modal Viewfinder */}
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
              >
                <X size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setCameraFlash(!cameraFlash)}
                  style={styles.cameraIconBtn}
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

      {/* Fullscreen Horizontal Slider Modal with Share & Delete */}
      {previewIndex !== null && photos[previewIndex] && (
        <Modal
          visible={previewIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewIndex(null)}
        >
          <View style={styles.fullscreenBackdrop}>
            {/* Header Controls */}
            <View style={styles.fullscreenHeader}>
              <View style={styles.fullscreenCounterBadge}>
                <Text style={styles.fullscreenCounterText}>
                  {previewIndex + 1} / {photos.length}
                </Text>
              </View>

              <View style={styles.fullscreenActionsRow}>
                {/* Share Photo Button */}
                <TouchableOpacity
                  onPress={() => handleSharePhoto(photos[previewIndex])}
                  disabled={isSharingPhoto}
                  style={styles.fullscreenIconBtn}
                  activeOpacity={0.7}
                >
                  {isSharingPhoto ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Share2 size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                {/* Delete Photo Button */}
                <TouchableOpacity
                  onPress={() => handleDeletePhoto(photos[previewIndex])}
                  style={[styles.fullscreenIconBtn, styles.fullscreenDeleteBtn]}
                  activeOpacity={0.7}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>

                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => setPreviewIndex(null)}
                  style={styles.fullscreenIconBtn}
                  activeOpacity={0.7}
                >
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Horizontal Slider (FlatList with Paging) */}
            <View style={styles.fullscreenSliderContainer}>
              <FlatList
                ref={previewFlatListRef}
                data={photos}
                keyExtractor={(item) => String(item.fdId)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={previewIndex}
                getItemLayout={(_, index) => ({
                  length: SCREEN_WIDTH,
                  offset: SCREEN_WIDTH * index,
                  index,
                })}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    previewFlatListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: false,
                    })
                  }, 50)
                }}
                onMomentumScrollEnd={(e) => {
                  const nextIndex = Math.round(
                    e.nativeEvent.contentOffset.x / SCREEN_WIDTH
                  )
                  if (nextIndex >= 0 && nextIndex < photos.length) {
                    setPreviewIndex(nextIndex)
                  }
                }}
                renderItem={({ item }) => (
                  <View style={styles.fullscreenSlideItem}>
                    <Image
                      source={{ uri: getFullPhotoUrl(item.fdPhotoUrl) }}
                      style={styles.fullscreenImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
              />
            </View>

            {/* Footer with Metadata & Pagination Dots */}
            <View style={styles.fullscreenFooter}>
              {photos.length > 1 && (
                <View style={styles.dotsRow}>
                  {photos.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dotItem,
                        i === previewIndex && styles.dotItemActive,
                      ]}
                    />
                  ))}
                </View>
              )}
              <Text style={styles.fullscreenCaption}>
                Diupload oleh: {photos[previewIndex].fdUploadedBy} •{' '}
                {new Date(photos[previewIndex].fdCreatedAt).toLocaleString('id-ID')}
              </Text>
              {photos[previewIndex].fdCaption ? (
                <Text style={styles.fullscreenSubCaption}>
                  "{photos[previewIndex].fdCaption}"
                </Text>
              ) : null}
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '85%',
    height: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12.5,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
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
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailActionRow: {
    position: 'absolute',
    top: 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBadgeBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  deleteBadgeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  uploadingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  uploadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
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
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: '100%',
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
    fontSize: 12,
    fontWeight: '500',
  },
  fullscreenSubCaption: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontStyle: 'italic',
    textAlign: 'center',
  },
})
