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
  Share2,
  Paperclip,
  RotateCcw,
  Zap,
  ZapOff,
  FileText,
} from 'lucide-react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeStore } from '@/theme/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { DEFAULT_API_URL } from '@/api/client'
import { canManageBillingAttachments, canDeleteBillingAttachment } from '@/lib/permissions'
import {
  useBillingAttachments,
  useUploadBillingAttachment,
  useDeleteBillingAttachment,
  type BillingAttachment,
} from '../hooks/useBillingAttachments'

interface Props {
  invNo: string | null
  visible: boolean
  onClose: () => void
  custName?: string
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 32 - 16) / 3 // 3 columns with padding and gap

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function BillingAttachmentSheet({ invNo, visible, onClose, custName }: Props) {
  const { colors, mode } = useThemeStore()
  const { user } = useAuthStore()
  const { showToast } = useToastStore()
  const insets = useSafeAreaInsets()
  const isDark = mode === 'midnight'

  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSharingFile, setIsSharingFile] = useState(false)
  const previewFlatListRef = useRef<FlatList<BillingAttachment>>(null)

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back')
  const [cameraFlash, setCameraFlash] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)

  const cleanInv = (invNo || '').trim()
  const canManage = canManageBillingAttachments(user)
  const canDelete = canDeleteBillingAttachment(user)

  const { data: attachments = [], isLoading } = useBillingAttachments(cleanInv, visible)
  const uploadMutation = useUploadBillingAttachment()
  const deleteMutation = useDeleteBillingAttachment()

  // Adjust preview index if items count changes
  useEffect(() => {
    if (previewIndex !== null) {
      if (attachments.length === 0) {
        setPreviewIndex(null)
      } else if (previewIndex >= attachments.length) {
        setPreviewIndex(attachments.length - 1)
      }
    }
  }, [attachments.length, previewIndex])

  if (!cleanInv) return null

  const getFullUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    const baseUrl = DEFAULT_API_URL.replace(/\/api$/, '')
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
  }

  const handleOpenCamera = async () => {
    if (attachments.length >= 10) {
      showToast('Batas maksimal 10 lampiran tercapai', 'warning')
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
        quality: 0.75,
        base64: true,
      })

      if (photo?.base64) {
        setIsCameraActive(false)
        const timestamp = Date.now()
        const fileName = `foto_invoice_${cleanInv}_${timestamp}.jpg`

        await uploadMutation.mutateAsync({
          invNo: cleanInv,
          fileBase64: photo.base64,
          fileName,
          fileType: 'image/jpeg',
          caption: `Foto invoice ${cleanInv}`,
        })
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengambil foto dari kamera', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleShareFile = async (att: BillingAttachment) => {
    if (isSharingFile) return
    try {
      const fullUrl = getFullUrl(att.fdFileUrl)
      if (!fullUrl) return

      setIsSharingFile(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      showToast('Menyiapkan berkas untuk dibagikan...', 'info')

      const isAvailable = await Sharing.isAvailableAsync()
      if (!isAvailable) {
        showToast('Fitur berbagi tidak didukung di perangkat ini', 'warning')
        return
      }

      const isPdf = att.fdFileType?.toLowerCase() === 'application/pdf' || att.fdFileName?.toLowerCase().endsWith('.pdf')
      const ext = isPdf ? 'pdf' : 'jpg'
      const sanitizedName = att.fdFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const localUri = `${FileSystem.cacheDirectory}${sanitizedName}`

      const downloadResult = await FileSystem.downloadAsync(fullUrl, localUri)
      if (downloadResult.status !== 200) {
        throw new Error(`Gagal mengunduh berkas (HTTP ${downloadResult.status})`)
      }

      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
        dialogTitle: `Bagikan Lampiran Invoice: ${cleanInv}`,
        UTI: isPdf ? 'com.adobe.pdf' : 'public.jpeg',
      })
    } catch (err: any) {
      showToast(err.message || 'Gagal membagikan berkas', 'error')
    } finally {
      setIsSharingFile(false)
    }
  }

  const handleDeleteAttachment = (att: BillingAttachment) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert(
      'Hapus Lampiran',
      `Yakin ingin menghapus berkas ${att.fdFileName}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync({
                invNo: cleanInv,
                attachmentId: att.fdId,
              })
              if (previewIndex !== null) {
                setPreviewIndex(null)
              }
            } catch (err: any) {
              // Handled by mutation onError
            }
          },
        },
      ]
    )
  }

  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 48) + 12
      : Math.max(insets.bottom, 16) + 12

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Paperclip size={16} color={colors.tertiary} />
                <Text style={[styles.title, { color: colors.primary }]} numberOfLines={1}>
                  Lampiran ({attachments.length}/10)
                </Text>
              </View>
              <Text style={[styles.subtitle, { color: colors.secondary }]} numberOfLines={1}>
                {cleanInv} {custName ? `• ${custName}` : ''}
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
                  Memuat lampiran invoice...
                </Text>
              </View>
            ) : attachments.length === 0 ? (
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
                  <Paperclip size={32} color={colors.secondary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.primary }]}>
                  Belum Ada Lampiran
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.secondary }]}>
                  {canManage
                    ? 'Ambil foto bukti bayar atau kuitansi menggunakan kamera ponsel.'
                    : 'Tidak ada berkas lampiran untuk invoice ini.'}
                </Text>
              </View>
            ) : (
              <View style={styles.gridContainer}>
                {attachments.map((att, idx) => {
                  const fullUrl = getFullUrl(att.fdFileUrl)
                  const isPdf =
                    att.fdFileType?.toLowerCase() === 'application/pdf' ||
                    att.fdFileName?.toLowerCase().endsWith('.pdf')

                  return (
                    <View
                      key={att.fdId}
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
                        {isPdf ? (
                          <View style={styles.pdfPlaceholder}>
                            <FileText size={28} color="#EF4444" />
                            <Text style={styles.pdfBadgeText}>PDF</Text>
                          </View>
                        ) : (
                          <Image
                            source={{ uri: fullUrl }}
                            style={styles.thumbnailImage}
                            resizeMode="cover"
                          />
                        )}
                        <View style={styles.sizeBadge}>
                          <Text style={styles.sizeBadgeText}>
                            {formatFileSize(att.fdFileSize)}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.thumbnailActionRow}>
                        <TouchableOpacity
                          onPress={() => handleShareFile(att)}
                          disabled={isSharingFile}
                          style={styles.actionBadgeBtn}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Share2 size={11} color="#FFFFFF" />
                        </TouchableOpacity>

                        {canDelete && (
                          <TouchableOpacity
                            onPress={() => handleDeleteAttachment(att)}
                            style={[styles.actionBadgeBtn, styles.deleteBadgeBtn]}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Trash2 size={11} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
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
                  Sedang mengunggah berkas ke server...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Footer Buttons */}
          {canManage && (
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
                disabled={isProcessing || attachments.length >= 10}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: colors.tabBarActive,
                    opacity: attachments.length >= 10 || isProcessing ? 0.6 : 1,
                  },
                ]}
              >
                <Camera size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>
                  {attachments.length >= 10
                    ? 'Maksimal 10 Lampiran Tercapai'
                    : '+ Foto Lampiran Invoice'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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

      {/* Fullscreen Photo / PDF Preview Modal */}
      {previewIndex !== null && attachments[previewIndex] && (
        <Modal
          visible={previewIndex !== null}
          animationType="fade"
          transparent
          onRequestClose={() => setPreviewIndex(null)}
        >
          <View style={styles.fullscreenBackdrop}>
            {/* Header Controls */}
            <View style={styles.fullscreenHeader}>
              <View style={styles.fullscreenCounterBadge}>
                <Text style={styles.fullscreenCounterText}>
                  {previewIndex + 1} / {attachments.length}
                </Text>
              </View>

              <View style={styles.fullscreenActionsRow}>
                {/* Share File Button */}
                <TouchableOpacity
                  onPress={() => handleShareFile(attachments[previewIndex])}
                  disabled={isSharingFile}
                  style={styles.fullscreenIconBtn}
                  activeOpacity={0.7}
                >
                  {isSharingFile ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Share2 size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                {/* Delete File Button */}
                {canDelete && (
                  <TouchableOpacity
                    onPress={() => handleDeleteAttachment(attachments[previewIndex])}
                    style={[styles.fullscreenIconBtn, styles.fullscreenDeleteBtn]}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}

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
                data={attachments}
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
                  const nextIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
                  if (nextIndex >= 0 && nextIndex < attachments.length) {
                    setPreviewIndex(nextIndex)
                  }
                }}
                renderItem={({ item }) => {
                  const fullUrl = getFullUrl(item.fdFileUrl)
                  const isPdf =
                    item.fdFileType?.toLowerCase() === 'application/pdf' ||
                    item.fdFileName?.toLowerCase().endsWith('.pdf')

                  return (
                    <View style={styles.fullscreenSlideItem}>
                      {isPdf ? (
                        <View style={styles.fullscreenPdfBox}>
                          <FileText size={56} color="#EF4444" />
                          <Text style={styles.fullscreenPdfTitle}>{item.fdFileName}</Text>
                          <Text style={styles.fullscreenPdfSub}>
                            Ukuran: {formatFileSize(item.fdFileSize)}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleShareFile(item)}
                            style={styles.fullscreenPdfShareBtn}
                          >
                            <Share2 size={16} color="#FFFFFF" />
                            <Text style={styles.fullscreenPdfShareBtnText}>Buka / Bagikan Dokumen</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Image
                          source={{ uri: fullUrl }}
                          style={styles.fullscreenImage}
                          resizeMode="contain"
                        />
                      )}
                    </View>
                  )
                }}
              />
            </View>

            {/* Footer with Metadata */}
            <View style={styles.fullscreenFooter}>
              <Text style={styles.fullscreenCaption}>
                {attachments[previewIndex].fdFileName}
              </Text>
              <Text style={styles.fullscreenSubCaption}>
                Diupload oleh: {attachments[previewIndex].fdUploadedBy} •{' '}
                {new Date(attachments[previewIndex].fdCreatedAt).toLocaleDateString('id-ID')}
              </Text>
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
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyBox: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
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
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  pdfPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
    marginTop: 2,
  },
  sizeBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sizeBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '600',
  },
  thumbnailActionRow: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
  },
  actionBadgeBtn: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 5,
    borderRadius: 14,
  },
  deleteBadgeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
  },
  uploadingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 8,
  },
  uploadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    paddingHorizontal: 20,
    zIndex: 10,
  },
  cameraIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingBottom: 12,
    zIndex: 10,
  },
  fullscreenCounterBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fullscreenCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fullscreenActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fullscreenIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenDeleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  fullscreenSliderContainer: {
    flex: 1,
  },
  fullscreenSlideItem: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenPdfBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    maxWidth: SCREEN_WIDTH - 48,
  },
  fullscreenPdfTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  fullscreenPdfSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  fullscreenPdfShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  fullscreenPdfShareBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  fullscreenFooter: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    alignItems: 'center',
  },
  fullscreenCaption: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  fullscreenSubCaption: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
})
