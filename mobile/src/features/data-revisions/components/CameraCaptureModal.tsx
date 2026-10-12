import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { Camera, X, RotateCcw, Zap, ZapOff } from 'lucide-react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'

interface Props {
  visible: boolean
  onClose: () => void
  onCapture: (photoUri: string) => void
}

export function CameraCaptureModal({ visible, onClose, onCapture }: Props) {
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back')
  const [cameraFlash, setCameraFlash] = useState<boolean>(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const cameraRef = useRef<CameraView>(null)

  if (!visible) return null

  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.centerModal}>
          <ActivityIndicator size="large" color="#38BDF8" />
        </View>
      </Modal>
    )
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.permissionContainer}>
          <View style={styles.permissionCard}>
            <Camera size={36} color="#38BDF8" />
            <Text style={styles.permissionTitle}>Izin Kamera Diperlukan</Text>
            <Text style={styles.permissionDesc}>
              Aplikasi membutuhkan akses kamera untuk mengambil foto fisik formulir atau dokumen pendukung.
            </Text>
            <View style={styles.permissionActionRow}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.permBtn, { backgroundColor: '#334155' }]}
              >
                <Text style={styles.permBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={requestPermission}
                style={[styles.permBtn, { backgroundColor: '#0284C7' }]}
              >
                <Text style={styles.permBtnText}>Izinkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  const takePhoto = async () => {
    if (!cameraRef.current || isCapturing) return
    setIsCapturing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      })

      if (photo?.base64) {
        onCapture(`data:image/jpeg;base64,${photo.base64}`)
        onClose()
      } else if (photo?.uri) {
        onCapture(photo.uri)
        onClose()
      }
    } catch (err) {
      console.error('[Camera] Gagal memotret:', err)
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.cameraContainer}>
        {/* Fullscreen Camera Viewfinder */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={cameraFacing}
          enableTorch={cameraFlash}
        />

        {/* Top Bar Controls (Persis seperti BAP) */}
        <View
          style={[
            styles.cameraTopBar,
            { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : insets.top + 16 },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.cameraIconBtn} activeOpacity={0.8}>
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

        {/* Bottom Bar Shutter (Persis seperti BAP & Terproteksi Safe Area Android) */}
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
            onPress={takePhoto}
            disabled={isCapturing}
            style={styles.shutterBtn}
            activeOpacity={0.8}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#0B0F17" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
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
  centerModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  permissionDesc: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  permissionActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  permBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  permBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
})
