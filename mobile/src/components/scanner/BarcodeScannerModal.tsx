import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { X, Zap, ZapOff } from 'lucide-react-native'
import { Button } from '../ui/Button'
import { useThemeStore } from '../../theme/themeStore'

interface BarcodeScannerModalProps {
  visible: boolean
  onClose: () => void
  onScanned: (data: string) => void
  title?: string
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  onScanned,
  title = 'Pindai Barcode / QR',
}) => {
  const [permission, requestPermission] = useCameraPermissions()
  const [flash, setFlash] = useState(false)
  const [scanned, setScanned] = useState(false)
  const { colors } = useThemeStore()
  const insets = useSafeAreaInsets()

  if (!visible) return null

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return
    setScanned(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onScanned(data)
    setTimeout(() => {
      setScanned(false)
      onClose()
    }, 500)
  }

  const topPadding = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight ?? 24) + 6
    : Math.max(insets.top, 16) + 4

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.container, { backgroundColor: '#0C1118' }]}>
        {/* Header Bar dengan Safe Padding Top Status Bar */}
        <View style={[styles.header, { paddingTop: topPadding }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.iconBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <X size={20} color="#EEF2F6" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.overlineText}>Pemindaian barcode kargo</Text>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setFlash(!flash)}
            style={[styles.iconBtn, flash && styles.iconBtnActive]}
            activeOpacity={0.7}
          >
            {flash ? <Zap size={18} color="#E0644E" /> : <ZapOff size={18} color="#8A97A6" />}
          </TouchableOpacity>
        </View>

        {/* Camera View */}
        {!permission?.granted ? (
          <View style={styles.permissionContainer}>
            <Text style={[styles.permissionText, { color: colors.primary }]}>
              Izin kamera diperlukan untuk memindai barcode resi & surat jalan.
            </Text>
            <Button
              title="Berikan Izin Kamera"
              onPress={requestPermission}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              enableTorch={flash}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'code128',
                  'code39',
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'pdf417',
                  'datamatrix',
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Visual scan frame overlay */}
            <View style={styles.overlay}>
              <View style={styles.targetFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.hintText}>Arahkan kamera tepat ke barcode atau kode QR resi</Text>
            </View>
          </View>
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#131A23',
    borderBottomWidth: 1,
    borderBottomColor: '#222C38',
    zIndex: 10,
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
    padding: 24,
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetFrame: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#38BDF8',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  hintText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 24,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
})
