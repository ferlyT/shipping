import React, { useState, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  Platform,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { File } from 'expo-file-system'
import * as FileSystem from 'expo-file-system/legacy'
import * as Haptics from 'expo-haptics'
import {
  X,
  Zap,
  ZapOff,
  RotateCcw,
  Camera as CameraIcon,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Hash,
} from 'lucide-react-native'
import { Button } from '../ui/Button'
import apiClient from '../../api/client'
import { useToastStore } from '../../stores/toastStore'
import { useThemeStore } from '../../theme/themeStore'

interface ContainerCandidate {
  containerNo: string
  formatted: string
  isValidIso: boolean
  confidenceScore: number
}

interface ContainerScannerModalProps {
  visible: boolean
  onClose: () => void
  onScanned: (containerNo: string) => void
  title?: string
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const FRAME_WIDTH = SCREEN_WIDTH * 0.85
const FRAME_HEIGHT = 140

export const ContainerScannerModal: React.FC<ContainerScannerModalProps> = ({
  visible,
  onClose,
  onScanned,
  title = 'Deteksi Nomor Kontainer',
}) => {
  const [permission, requestPermission] = useCameraPermissions()
  const [flash, setFlash] = useState(false)
  const [facing, setFacing] = useState<'back' | 'front'>('back')
  const [isProcessing, setIsProcessing] = useState(false)
  const cameraRef = useRef<CameraView>(null)

  // Hasil deteksi untuk dialog review/edit
  const [detectedNo, setDetectedNo] = useState<string>('')
  const [isValidIso, setIsValidIso] = useState<boolean>(false)
  const [candidates, setCandidates] = useState<ContainerCandidate[]>([])
  const [showResultDialog, setShowResultDialog] = useState<boolean>(false)

  const insets = useSafeAreaInsets()
  const { showToast } = useToastStore()
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  // Jarak bawah kontrol kamera & galeri: terangkat nyaman di atas navigasi Android / iOS
  const bottomControlsOffset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16) + 36

  if (!visible) return null

  const resetState = () => {
    setIsProcessing(false)
    setShowResultDialog(false)
    setDetectedNo('')
    setCandidates([])
    setIsValidIso(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  // Kirim gambar ke backend OCR
  const processImageForOcr = async (base64Image: string) => {
    try {
      setIsProcessing(true)
      const res = await apiClient.post('/marking/ocr-container', {
        image: base64Image,
      })

      const data = res.data?.data
      if (data && data.containerNo) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setDetectedNo(data.containerNo)
        setIsValidIso(data.isValidIso ?? false)
        setCandidates(data.candidates || [])
        setShowResultDialog(true)
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        showToast(
          'Tidak dapat mendeteksi nomor kontainer. Pastikan plat terlihat jelas atau input manual.',
          'warning'
        )
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      showToast(err.response?.data?.message || err.message || 'Gagal memproses gambar OCR', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // Ambil foto dari kamera
  const handleCapturePhoto = async () => {
    if (!cameraRef.current || isProcessing) return

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setIsProcessing(true)

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
      })

      if (photo?.base64) {
        await processImageForOcr(`data:image/jpeg;base64,${photo.base64}`)
      } else {
        showToast('Gagal memotret gambar dari kamera', 'error')
        setIsProcessing(false)
      }
    } catch (err: any) {
      setIsProcessing(false)
      showToast(err.message || 'Terjadi kesalahan saat memotret', 'error')
    }
  }

  // Helper konversi Uint8Array ke base64 (murni vanilla, aman untuk Hermes)
  const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const bytesToBase64 = (bytes: Uint8Array): string => {
    let result = ''
    const len = bytes.length
    let i = 0
    for (; i + 2 < len; i += 3) {
      result += BASE64_CHARS[bytes[i] >> 2]
      result += BASE64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)]
      result += BASE64_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)]
      result += BASE64_CHARS[bytes[i + 2] & 63]
    }
    if (i < len) {
      result += BASE64_CHARS[bytes[i] >> 2]
      if (i + 1 < len) {
        result += BASE64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)]
        result += BASE64_CHARS[(bytes[i + 1] & 15) << 2]
        result += '='
      } else {
        result += BASE64_CHARS[(bytes[i] & 3) << 4]
        result += '=='
      }
    }
    return result
  }

  // Helper membaca base64 dari File (mendukung Android SAF content:// URIs)
  const readFileAsBase64 = async (file: File): Promise<string> => {
    // Jalur 1: File.base64() native Expo FileSystem
    try {
      if (typeof file.base64 === 'function') {
        const b64 = await file.base64()
        if (b64 && b64.length > 0) return b64
      }
    } catch (err) {
      console.warn('[Gallery] file.base64() failed:', err)
    }

    // Jalur 2: File.bytes() native Expo FileSystem
    try {
      if (typeof file.bytes === 'function') {
        const bytes = await file.bytes()
        if (bytes && bytes.length > 0) {
          return bytesToBase64(bytes)
        }
      }
    } catch (err) {
      console.warn('[Gallery] file.bytes() failed:', err)
    }

    // Jalur 3: File.arrayBuffer() (Blob interface)
    try {
      if (typeof file.arrayBuffer === 'function') {
        const buf = await file.arrayBuffer()
        const bytes = new Uint8Array(buf)
        return bytesToBase64(bytes)
      }
    } catch (err) {
      console.warn('[Gallery] file.arrayBuffer() failed:', err)
    }

    // Jalur 4: Salin ke cache app internal lalu baca via legacy FileSystem
    try {
      const tempDest = `${FileSystem.cacheDirectory}ocr_${Date.now()}.jpg`
      await FileSystem.copyAsync({
        from: file.uri,
        to: tempDest,
      })
      const b64 = await FileSystem.readAsStringAsync(tempDest, {
        encoding: FileSystem.EncodingType.Base64,
      })
      FileSystem.deleteAsync(tempDest, { idempotent: true }).catch(() => {})
      if (b64) return b64
    } catch (err) {
      console.warn('[Gallery] FileSystem.copyAsync failed:', err)
    }

    throw new Error('Gagal membaca data gambar dari berkas terpilih')
  }

  // Pilih foto dari galeri HP via File picker native (SAF)
  const handlePickFromGallery = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const res = await File.pickFileAsync({
        mimeTypes: ['image/*'],
      })

      if (!res.canceled && res.result) {
        setIsProcessing(true)
        const base64 = await readFileAsBase64(res.result)
        if (base64) {
          await processImageForOcr(`data:image/jpeg;base64,${base64}`)
        } else {
          showToast('Gagal membaca data gambar dari file yang dipilih', 'error')
          setIsProcessing(false)
        }
      }
    } catch (err: any) {
      setIsProcessing(false)
      showToast(err.message || 'Gagal memilih gambar dari galeri', 'error')
    }
  }

  // Konfirmasi penggunaan nomor kontainer
  const handleConfirmContainer = () => {
    const finalNo = (detectedNo || '').trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    if (!finalNo) {
      showToast('Nomor kontainer tidak boleh kosong', 'warning')
      return
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onScanned(finalNo)
    handleClose()
  }

  // Top padding aman agar header tidak bertabrakan dengan status bar / jam perangkat
  const topPadding = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight ?? 24) + 6
    : Math.max(insets.top, 16) + 4

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.container, { backgroundColor: '#0C1118' }]}>
        {/* Header Bar dengan Safe Padding Top Status Bar */}
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.iconBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <X size={20} color="#EEF2F6" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.overlineText}>Pemindaian batch marking</Text>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          </View>
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <RotateCcw size={18} color="#EEF2F6" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFlash(!flash)}
              style={[styles.iconBtn, flash && styles.iconBtnActive]}
              activeOpacity={0.7}
            >
              {flash ? <Zap size={18} color="#E0644E" /> : <ZapOff size={18} color="#8A97A6" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Camera Viewport */}
        {!permission?.granted ? (
          <View style={styles.permissionContainer}>
            <AlertCircle size={44} color="#38BDF8" style={{ marginBottom: 12 }} />
            <Text style={styles.permissionTitle}>Izin Kamera Diperlukan</Text>
            <Text style={styles.permissionText}>
              Aplikasi memerlukan akses kamera untuk mendeteksi nomor stensil kontainer fisik di lapangan.
            </Text>
            <Button
              title="Berikan Izin Kamera"
              onPress={requestPermission}
              style={{ marginTop: 20 }}
            />
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              enableTorch={flash}
            />

            {/* Dark Mask with Guideline Frame */}
            <View style={styles.overlay}>
              <View style={styles.targetFrame}>
                {/* 4 Corner Accents */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />

                {/* Center scan line / watermark */}
                <View style={styles.frameCenterTextContainer}>
                  <Hash size={18} color="rgba(255, 255, 255, 0.6)" />
                  <Text style={styles.frameCenterText}>Posisikan Plat Nomor Kontainer di Sini</Text>
                </View>
              </View>

              <Text style={styles.hintText}>
                Format ISO 6346: 4 Huruf + 7 Angka (Contoh: MSCU 123456-7)
              </Text>
            </View>

            {/* Processing State Indicator */}
            {isProcessing && (
              <View style={styles.loadingBackdrop}>
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="large" color="#38BDF8" />
                  <Text style={styles.loadingTitle}>Menganalisis Plat Kontainer...</Text>
                  <Text style={styles.loadingSubtitle}>Mengekstrak teks & memvalidasi ISO 6346</Text>
                </View>
              </View>
            )}

            {/* Bottom Controls */}
            <View style={[styles.bottomControls, { bottom: bottomControlsOffset }]}>
              <TouchableOpacity
                onPress={handlePickFromGallery}
                disabled={isProcessing}
                style={styles.galleryBtn}
                activeOpacity={0.7}
              >
                <ImageIcon size={22} color="#FFFFFF" />
                <Text style={styles.controlBtnLabel}>Galeri</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCapturePhoto}
                disabled={isProcessing}
                style={[styles.shutterBtn, isProcessing && { opacity: 0.5 }]}
                activeOpacity={0.8}
              >
                <View style={styles.shutterInner}>
                  <CameraIcon size={30} color="#0F172A" />
                </View>
              </TouchableOpacity>

              <View style={styles.spacerBtn} />
            </View>
          </View>
        )}

        {/* Modal Konfirmasi & Quick Edit Nomor Kontainer */}
        <Modal
          visible={showResultDialog}
          transparent
          animationType="fade"
          onRequestClose={() => setShowResultDialog(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.resultHeader}>
                <Text style={[styles.resultTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                  Nomor Kontainer Terdeteksi
                </Text>
                <View
                  style={[
                    styles.isoBadge,
                    {
                      backgroundColor: isValidIso ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                      borderColor: isValidIso ? '#10B981' : '#38BDF8',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.isoBadgeText,
                      { color: isValidIso ? '#10B981' : '#38BDF8' },
                    ]}
                  >
                    {isValidIso ? '✓ ISO 6346 Valid' : 'Format Kontainer'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.resultSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Periksa kembali karakter nomor kontainer sebelum diterapkan:
              </Text>

              {/* Editable Container Input */}
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: isDark ? '#38BDF8' : '#0284C7',
                  },
                ]}
              >
                <TextInput
                  value={detectedNo}
                  onChangeText={(text) => {
                    const clean = text.toUpperCase()
                    setDetectedNo(clean)
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="Ketik / ubah nomor kontainer..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={[
                    styles.inputField,
                    {
                      color: isDark ? '#F8FAFC' : '#0F172A',
                    },
                  ]}
                />
              </View>

              {/* Kandidat Lainnya Jika Ada */}
              {candidates.length > 1 && (
                <View style={styles.candidatesSection}>
                  <Text style={[styles.candidatesTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Kandidat Lain Terdeteksi:
                  </Text>
                  <View style={styles.candidateChips}>
                    {candidates.slice(1, 4).map((c, idx) => (
                      <TouchableOpacity
                        key={`${c.containerNo}-${idx}`}
                        onPress={() => {
                          setDetectedNo(c.containerNo)
                          setIsValidIso(c.isValidIso)
                          Haptics.selectionAsync()
                        }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isDark ? '#334155' : '#F1F5F9',
                            borderColor: isDark ? '#475569' : '#CBD5E1',
                          },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                          {c.containerNo}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  onPress={() => {
                    setShowResultDialog(false)
                    Keyboard.dismiss()
                  }}
                  style={[
                    styles.secondaryBtn,
                    {
                      borderColor: isDark ? '#475569' : '#CBD5E1',
                    },
                  ]}
                >
                  <RefreshCw size={15} color={isDark ? '#E2E8F0' : '#475569'} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryBtnText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                    Pindai Ulang
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleConfirmContainer}
                  style={styles.primaryBtn}
                >
                  <CheckCircle2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>Gunakan Nomor</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C1118',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#131A23',
    borderBottomWidth: 1,
    borderBottomColor: '#222C38',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  overlineText: {
    fontSize: 11,
    color: '#8A97A6',
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    color: '#EEF2F6',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#131A23',
    borderWidth: 1,
    borderColor: '#222C38',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnActive: {
    borderColor: '#E0644E',
    backgroundColor: 'rgba(224, 100, 78, 0.12)',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#0F172A',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  targetFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.5)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#38BDF8',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  frameCenterTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  frameCenterText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  hintText: {
    color: '#E2E8F0',
    fontSize: 12,
    marginTop: 20,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loadingBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  loadingCard: {
    backgroundColor: '#1E293B',
    paddingVertical: 24,
    paddingHorizontal: 28,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  loadingTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
  },
  loadingSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  bottomControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  galleryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#475569',
    width: 80,
  },
  controlBtnLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  shutterBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacerBtn: {
    width: 80,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  resultCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  isoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  isoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resultSubtitle: {
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 16,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    marginBottom: 16,
  },
  inputField: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  candidatesSection: {
    marginBottom: 16,
  },
  candidatesTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  candidateChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
})
