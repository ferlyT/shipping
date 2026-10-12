import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  PanResponder,
} from 'react-native'
import {
  X,
  Check,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeStore } from '@/theme/themeStore'
import { useToastStore } from '@/stores/toastStore'
import { mobileDataRevisionsApi } from '../services/data-revisions.service'
import type { DataRevisionLampiran } from '../types/dataRevisions.types'

interface RevisionCropModalProps {
  visible: boolean
  photo: DataRevisionLampiran | null
  photoUrl: string
  onClose: () => void
  onSuccess: () => void
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const VIEWER_HEIGHT = Math.min(SCREEN_HEIGHT * 0.55, 460)
const VIEWER_WIDTH = SCREEN_WIDTH - 32

type AspectPreset = 'free' | '1:1' | '4:3' | '16:9' | 'a4'

export function RevisionCropModal({
  visible,
  photo,
  photoUrl,
  onClose,
  onSuccess,
}: RevisionCropModalProps) {
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()
  const insets = useSafeAreaInsets()
  const isDark = mode === 'midnight'

  const [rotation, setRotation] = useState<number>(0)
  const [zoomScale, setZoomScale] = useState<number>(1)
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>('free')
  const [isSaving, setIsSaving] = useState(false)

  // Bounding box dalam persentase (0 - 100) terhadap VIEWER_WIDTH dan VIEWER_HEIGHT
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 })

  // PanResponder untuk menggeser crop box
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      // Ubah pixel drag ke persentase
      const deltaXPercent = (gestureState.dx / VIEWER_WIDTH) * 100
      const deltaYPercent = (gestureState.dy / VIEWER_HEIGHT) * 100

      setCropBox((prev) => {
        const newX = Math.max(0, Math.min(100 - prev.width, prev.x + deltaXPercent * 0.05))
        const newY = Math.max(0, Math.min(100 - prev.height, prev.y + deltaYPercent * 0.05))
        return { ...prev, x: newX, y: newY }
      })
    },
    onPanResponderRelease: () => {
      Haptics.selectionAsync()
    },
  })

  if (!visible || !photo) return null

  // Handler putar 90 derajat
  const handleRotateCw = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleRotateCcw = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setRotation((prev) => (prev - 90 + 360) % 360)
  }

  // Handler zoom
  const handleZoomIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setZoomScale((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setZoomScale((prev) => Math.max(prev - 0.25, 0.75))
  }

  const handleZoomReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setZoomScale(1)
    setRotation(0)
    setCropBox({ x: 10, y: 10, width: 80, height: 80 })
    setAspectPreset('free')
  }

  // Preset aspek rasio
  const handleSelectPreset = (preset: AspectPreset) => {
    Haptics.selectionAsync()
    setAspectPreset(preset)
    if (preset === 'free') {
      setCropBox({ x: 10, y: 10, width: 80, height: 80 })
      return
    }

    let ratio = 1
    if (preset === '1:1') ratio = 1
    else if (preset === '4:3') ratio = 4 / 3
    else if (preset === '16:9') ratio = 16 / 9
    else if (preset === 'a4') ratio = 1 / 1.414

    const w = 70
    const h = Math.min(85, Math.max(25, w / ratio))
    setCropBox({
      x: (100 - w) / 2,
      y: (100 - h) / 2,
      width: w,
      height: h,
    })
  }

  // Simpan hasil Crop & Rotate via backend Sharp API
  const handleSaveCrop = async () => {
    if (!photo?.fdId || isSaving) return
    setIsSaving(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      // Normalisasi bounding box ke rentang 0.0 - 1.0 (proporsional desimal)
      const cropPayload = {
        x: Math.max(0, Math.min(1, cropBox.x / 100)),
        y: Math.max(0, Math.min(1, cropBox.y / 100)),
        width: Math.max(0.05, Math.min(1, cropBox.width / 100)),
        height: Math.max(0.05, Math.min(1, cropBox.height / 100)),
      }

      await mobileDataRevisionsApi.cropLampiran(photo.fdId, {
        rotate: rotation,
        crop: cropPayload,
        isRatio: true,
      })

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      showToast('Foto berhasil dipotong & diputar', 'success')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('[RevisionCropModal] Gagal simpan crop:', err)
      const msg = err.response?.data?.message || err.message || 'Gagal memproses crop foto'
      Alert.alert('Gagal Simpan', msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? '#0B0F17' : '#FFFFFF',
              paddingTop: Platform.OS === 'ios' ? insets.top + 8 : insets.top + 12,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn} disabled={isSaving}>
              <X size={20} color={isDark ? '#F1F5F9' : '#0F172A'} />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.headerTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                Crop & Rotate Lampiran
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
                {photo.fdNamaFile || 'Foto Dokumen'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSaveCrop}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.tabBarActive,
                  opacity: isSaving ? 0.6 : 1,
                },
              ]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={16} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Terapkan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Viewfinder Canvas Area */}
          <View style={styles.viewerWrapper}>
            <View style={styles.viewerBox}>
              {/* Gambar dengan Transform Scale & Rotation */}
              <View
                style={[
                  styles.imageTransformContainer,
                  {
                    transform: [{ rotate: `${rotation}deg` }, { scale: zoomScale }],
                  },
                ]}
              >
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              </View>

              {/* Dark Overlays di Luar Crop Area */}
              <View
                style={[
                  styles.cropOverlay,
                  {
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${cropBox.y}%`,
                  },
                ]}
                pointerEvents="none"
              />
              <View
                style={[
                  styles.cropOverlay,
                  {
                    top: `${cropBox.y + cropBox.height}%`,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  },
                ]}
                pointerEvents="none"
              />
              <View
                style={[
                  styles.cropOverlay,
                  {
                    top: `${cropBox.y}%`,
                    left: 0,
                    width: `${cropBox.x}%`,
                    height: `${cropBox.height}%`,
                  },
                ]}
                pointerEvents="none"
              />
              <View
                style={[
                  styles.cropOverlay,
                  {
                    top: `${cropBox.y}%`,
                    left: `${cropBox.x + cropBox.width}%`,
                    right: 0,
                    height: `${cropBox.height}%`,
                  },
                ]}
                pointerEvents="none"
              />

              {/* Crop Bounding Box dengan Grid Line 3x3 */}
              <View
                {...panResponder.panHandlers}
                style={[
                  styles.cropBoundingBox,
                  {
                    left: `${cropBox.x}%`,
                    top: `${cropBox.y}%`,
                    width: `${cropBox.width}%`,
                    height: `${cropBox.height}%`,
                    borderColor: colors.tabBarActive,
                  },
                ]}
              >
                {/* Rule of Thirds Lines */}
                <View style={[styles.gridLineV, { left: '33.33%' }]} pointerEvents="none" />
                <View style={[styles.gridLineV, { left: '66.66%' }]} pointerEvents="none" />
                <View style={[styles.gridLineH, { top: '33.33%' }]} pointerEvents="none" />
                <View style={[styles.gridLineH, { top: '66.66%' }]} pointerEvents="none" />

                {/* Sudut Handle */}
                <View
                  style={[styles.cornerHandle, styles.cornerTL, { borderColor: colors.tabBarActive }]}
                  pointerEvents="none"
                />
                <View
                  style={[styles.cornerHandle, styles.cornerTR, { borderColor: colors.tabBarActive }]}
                  pointerEvents="none"
                />
                <View
                  style={[styles.cornerHandle, styles.cornerBL, { borderColor: colors.tabBarActive }]}
                  pointerEvents="none"
                />
                <View
                  style={[styles.cornerHandle, styles.cornerBR, { borderColor: colors.tabBarActive }]}
                  pointerEvents="none"
                />

                {/* Center Badge Drag Info */}
                <View style={styles.dragBadge} pointerEvents="none">
                  <Text style={styles.dragBadgeText}>Geser Posisi</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Aspect Ratio Presets Toolbar */}
          <View style={styles.presetsRow}>
            <Text style={[styles.presetLabel, { color: colors.secondary }]}>Rasio:</Text>
            {(['free', '1:1', '4:3', '16:9', 'a4'] as AspectPreset[]).map((preset) => {
              const active = aspectPreset === preset
              return (
                <TouchableOpacity
                  key={preset}
                  onPress={() => handleSelectPreset(preset)}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: active
                        ? colors.tabBarActive
                        : isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.05)',
                      borderColor: active ? colors.tabBarActive : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetPillText,
                      {
                        color: active ? '#FFFFFF' : isDark ? '#E2E8F0' : '#334155',
                        fontWeight: active ? '700' : '500',
                      },
                    ]}
                  >
                    {preset === 'free' ? 'Bebas' : preset === 'a4' ? 'A4' : preset}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Bottom Action Controls: Zoom, Rotate, Reset */}
          <View
            style={[
              styles.controlsContainer,
              {
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            {/* Rotate Buttons */}
            <View style={styles.controlGroup}>
              <TouchableOpacity
                onPress={handleRotateCcw}
                style={[styles.toolBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
                activeOpacity={0.7}
              >
                <RotateCcw size={18} color={isDark ? '#F1F5F9' : '#0F172A'} />
              </TouchableOpacity>
              <Text style={[styles.toolLabel, { color: colors.secondary }]}>-90°</Text>
            </View>

            <View style={styles.controlGroup}>
              <TouchableOpacity
                onPress={handleRotateCw}
                style={[styles.toolBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
                activeOpacity={0.7}
              >
                <RotateCw size={18} color={isDark ? '#F1F5F9' : '#0F172A'} />
              </TouchableOpacity>
              <Text style={[styles.toolLabel, { color: colors.secondary }]}>+90°</Text>
            </View>

            {/* Separator */}
            <View
              style={[
                styles.separatorV,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
              ]}
            />

            {/* Zoom Controls */}
            <View style={styles.controlGroup}>
              <TouchableOpacity
                onPress={handleZoomOut}
                disabled={zoomScale <= 0.75}
                style={[
                  styles.toolBtn,
                  {
                    backgroundColor: isDark ? '#334155' : '#E2E8F0',
                    opacity: zoomScale <= 0.75 ? 0.4 : 1,
                  },
                ]}
                activeOpacity={0.7}
              >
                <ZoomOut size={18} color={isDark ? '#F1F5F9' : '#0F172A'} />
              </TouchableOpacity>
              <Text style={[styles.toolLabel, { color: colors.secondary }]}>Perkecil</Text>
            </View>

            <View style={styles.controlGroup}>
              <View style={styles.zoomValueBadge}>
                <Text style={[styles.zoomValueText, { color: colors.primary }]}>
                  {Math.round(zoomScale * 100)}%
                </Text>
              </View>
              <Text style={[styles.toolLabel, { color: colors.secondary }]}>Skala</Text>
            </View>

            <View style={styles.controlGroup}>
              <TouchableOpacity
                onPress={handleZoomIn}
                disabled={zoomScale >= 3}
                style={[
                  styles.toolBtn,
                  {
                    backgroundColor: isDark ? '#334155' : '#E2E8F0',
                    opacity: zoomScale >= 3 ? 0.4 : 1,
                  },
                ]}
                activeOpacity={0.7}
              >
                <ZoomIn size={18} color={isDark ? '#F1F5F9' : '#0F172A'} />
              </TouchableOpacity>
              <Text style={[styles.toolLabel, { color: colors.secondary }]}>Perbesar</Text>
            </View>

            {/* Separator */}
            <View
              style={[
                styles.separatorV,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
              ]}
            />

            {/* Reset Button */}
            <View style={styles.controlGroup}>
              <TouchableOpacity
                onPress={handleZoomReset}
                style={[styles.toolBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
                activeOpacity={0.7}
              >
                <Maximize2 size={16} color={isDark ? '#F1F5F9' : '#0F172A'} />
              </TouchableOpacity>
              <Text style={[styles.toolLabel, { color: colors.secondary }]}>Reset</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  viewerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerBox: {
    width: VIEWER_WIDTH,
    height: VIEWER_HEIGHT,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTransformContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  cropOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  cropBoundingBox: {
    position: 'absolute',
    borderWidth: 1.5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  cornerHandle: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  dragBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dragBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 2,
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  presetPillText: {
    fontSize: 11,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  controlGroup: {
    alignItems: 'center',
    gap: 4,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolLabel: {
    fontSize: 9.5,
    fontWeight: '500',
  },
  separatorV: {
    width: 1,
    height: 28,
  },
  zoomValueBadge: {
    height: 36,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomValueText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
})
