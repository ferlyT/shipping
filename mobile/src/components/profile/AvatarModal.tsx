import React, { useState, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import {
  X,
  Camera,
  RotateCcw,
  Check,
  Trash2,
  Zap,
  ZapOff,
  User as UserIcon,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Button } from '../ui/Button'
import { useThemeStore } from '../../theme/themeStore'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import { useTranslation } from '../../hooks/useTranslation'
import { resolveAvatarUrl, getInitials } from '../../lib/utils'
import apiClient from '../../api/client'

interface AvatarModalProps {
  visible: boolean
  onClose: () => void
}

type Mode = 'menu' | 'camera' | 'preview'

export const AvatarModal: React.FC<AvatarModalProps> = ({ visible, onClose }) => {
  const { colors, mode: themeMode } = useThemeStore()
  const { user, updateUser } = useAuthStore()
  const { showToast } = useToastStore()
  const { t } = useTranslation()

  const [mode, setMode] = useState<Mode>('menu')
  const [facing, setFacing] = useState<'front' | 'back'>('front')
  const [flash, setFlash] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<{ uri: string; base64?: string } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)

  const isDark = themeMode === 'midnight'
  const resolvedUrl = resolveAvatarUrl(user?.avatarUrl)

  const resetState = () => {
    setMode('menu')
    setCapturedPhoto(null)
    setIsUploading(false)
    setIsDeleting(false)
    setFlash(false)
    setFacing('front')
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleOpenCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission()
      if (!res.granted) {
        showToast('Izin kamera ditolak. Aktifkan izin kamera di pengaturan ponsel.', 'error')
        return
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setMode('camera')
  }

  const handleFlipCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'))
  }

  const handleTakePicture = async () => {
    if (!cameraRef.current) return
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      })
      if (photo) {
        setCapturedPhoto(photo)
        setMode('preview')
      }
    } catch (err: any) {
      showToast('Gagal mengambil foto: ' + (err.message || 'Error kamera'), 'error')
    }
  }

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCapturedPhoto(null)
    setMode('camera')
  }

  const handleUploadPhoto = async () => {
    if (!capturedPhoto?.base64) {
      showToast('Foto tidak valid untuk diunggah', 'error')
      return
    }

    try {
      setIsUploading(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      const base64Data = capturedPhoto.base64.startsWith('data:')
        ? capturedPhoto.base64
        : `data:image/jpeg;base64,${capturedPhoto.base64}`

      const res = await apiClient.post('/profile/avatar', {
        avatarBase64: base64Data,
      })

      if (res.data?.success || res.status === 200) {
        const newAvatarUrl = res.data?.data?.avatarUrl || res.data?.data?.user?.avatarUrl
        updateUser({ avatarUrl: newAvatarUrl })
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        showToast(t('profile.avatarUpdated'), 'success')
        handleClose()
      } else {
        throw new Error(res.data?.message || 'Gagal mengunggah foto profil')
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      const msg = err.response?.data?.message || err.message || 'Gagal mengunggah foto profil'
      showToast(msg, 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteAvatar = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert(
      t('profile.deleteAvatar'),
      t('profile.deleteAvatarConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true)
              const res = await apiClient.delete('/profile/avatar')
              if (res.data?.success || res.status === 200) {
                updateUser({ avatarUrl: null })
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                showToast(t('profile.avatarDeleted'), 'info')
                handleClose()
              }
            } catch (err: any) {
              const msg = err.response?.data?.message || 'Gagal menghapus foto profil'
              showToast(msg, 'error')
            } finally {
              setIsDeleting(false)
            }
          },
        },
      ]
    )
  }

  if (!visible) return null

  // Camera & Preview View (Full Screen)
  if (mode === 'camera' || mode === 'preview') {
    return (
      <Modal visible={visible} animationType='slide' transparent={false} onRequestClose={handleClose}>
        <StatusBar barStyle='light-content' />
        <SafeAreaView style={styles.cameraContainer}>
          {/* Top Bar */}
          <View style={styles.cameraHeader}>
            <TouchableOpacity
              onPress={() => (mode === 'preview' ? setMode('camera') : setMode('menu'))}
              style={styles.iconBtn}
            >
              <X size={22} color='#FFFFFF' />
            </TouchableOpacity>

            <Text style={styles.cameraTitle}>
              {mode === 'preview' ? 'Pratinjau Foto' : 'Ambil Foto Profil'}
            </Text>

            {mode === 'camera' ? (
              <TouchableOpacity onPress={() => setFlash(!flash)} style={styles.iconBtn}>
                {flash ? <Zap size={20} color='#FBBF24' /> : <ZapOff size={20} color='#FFFFFF' />}
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36 }} />
            )}
          </View>

          {/* Camera or Preview Viewfinder */}
          <View style={styles.viewfinderWrapper}>
            {mode === 'camera' ? (
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing={facing}
                enableTorch={flash}
              />
            ) : (
              capturedPhoto && (
                <Image
                  source={{ uri: capturedPhoto.uri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode='cover'
                />
              )
            )}

            {/* Circular Guide Mask */}
            <View style={styles.maskOverlay}>
              <View style={styles.circleFrame}>
                <View style={styles.dashedRing} />
              </View>
              <Text style={styles.hintText}>
                {mode === 'camera'
                  ? 'Posisikan wajah Anda di dalam lingkaran'
                  : 'Pastikan wajah terlihat jelas'}
              </Text>
            </View>
          </View>

          {/* Bottom Bar Controls */}
          <View style={styles.cameraBottomBar}>
            {mode === 'camera' ? (
              <View style={styles.shutterRow}>
                {/* Spacer / Left */}
                <View style={{ width: 50 }} />

                {/* Shutter Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleTakePicture}
                  style={styles.shutterBtnOuter}
                >
                  <View style={styles.shutterBtnInner} />
                </TouchableOpacity>

                {/* Flip Camera Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleFlipCamera}
                  style={styles.flipBtn}
                >
                  <RotateCcw size={22} color='#FFFFFF' />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.previewActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleRetake}
                  disabled={isUploading}
                  style={[styles.previewActionBtn, { backgroundColor: '#334155' }]}
                >
                  <RotateCcw size={18} color='#FFFFFF' style={{ marginRight: 8 }} />
                  <Text style={styles.previewBtnText}>{t('profile.retakePhoto')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleUploadPhoto}
                  disabled={isUploading}
                  style={[styles.previewActionBtn, { backgroundColor: colors.tertiary }]}
                >
                  {isUploading ? (
                    <ActivityIndicator color='#FFFFFF' size='small' />
                  ) : (
                    <>
                      <Check size={18} color='#FFFFFF' style={{ marginRight: 8 }} />
                      <Text style={styles.previewBtnText}>{t('profile.usePhoto')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    )
  }

  // Menu Dialog (Choice Sheet)
  return (
    <Modal
      visible={visible}
      animationType='fade'
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.menuCard,
            {
              backgroundColor: isDark ? '#151D2A' : '#FFFFFF',
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.menuTitle, { color: colors.primary }]}>
              {t('profile.changeAvatar')}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
            >
              <X size={18} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* Current Avatar Preview */}
          <View style={styles.avatarPreviewBox}>
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: isDark ? '#1C2638' : '#E2E8F0',
                  borderColor: colors.border,
                },
              ]}
            >
              {resolvedUrl ? (
                <Image source={{ uri: resolvedUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.initialsText, { color: colors.tertiary }]}>
                  {getInitials(user?.fullName || user?.username)}
                </Text>
              )}
            </View>
            <Text style={[styles.avatarNameText, { color: colors.primary }]}>
              {user?.fullName || user?.username}
            </Text>
          </View>

          {/* Option Buttons */}
          <View style={styles.optionsList}>
            {/* Take Photo */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenCamera}
              style={[
                styles.optionItem,
                {
                  backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.optionIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Camera size={20} color='#38BDF8' />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.primary }]}>
                  {t('profile.takePhoto')}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.secondary }]}>
                  Gunakan kamera perangkat untuk mengambil foto baru
                </Text>
              </View>
            </TouchableOpacity>

            {/* Delete Photo (If exists) */}
            {user?.avatarUrl && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleDeleteAvatar}
                disabled={isDeleting}
                style={[
                  styles.optionItem,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEE2E2',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  },
                ]}
              >
                <View style={[styles.optionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                  <Trash2 size={20} color='#EF4444' />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: '#EF4444' }]}>
                    {t('profile.deleteAvatar')}
                  </Text>
                  <Text style={[styles.optionDesc, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                    Kembalikan ke inisial nama akun
                  </Text>
                </View>
                {isDeleting && <ActivityIndicator size='small' color='#EF4444' />}
              </TouchableOpacity>
            )}
          </View>

          {/* Footer Cancel */}
          <View style={styles.menuFooter}>
            <Button
              title={t('common.close')}
              variant='secondary'
              onPress={handleClose}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  menuCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPreviewBox: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initialsText: {
    fontSize: 32,
    fontWeight: '800',
  },
  avatarNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionsList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  menuFooter: {
    padding: 16,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  cameraTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  iconBtn: {
    padding: 8,
  },
  viewfinderWrapper: {
    flex: 1,
    position: 'relative',
  },
  maskOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleFrame: {
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 3,
    borderColor: '#38BDF8',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashedRing: {
    width: 258,
    height: 258,
    borderRadius: 129,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 24,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cameraBottomBar: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  shutterBtnOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  flipBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewActionsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  previewActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  previewBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
})
