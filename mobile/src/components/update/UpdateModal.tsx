import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native'
import {
  Sparkles,
  ArrowDownCircle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  X,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useUpdateStore } from '../../stores/updateStore'
import { useThemeStore } from '../../theme/themeStore'
import { useTranslation } from '../../hooks/useTranslation'

export function UpdateModal() {
  const {
    currentVersion,
    isModalVisible,
    updateInfo,
    dismissModal,
    startDownload,
    openWebDownload,
  } = useUpdateStore()

  const { colors, mode } = useThemeStore()
  const { t } = useTranslation()
  const isDark = mode === 'midnight'

  if (!isModalVisible || !updateInfo) return null

  const isForceUpdate = Boolean(updateInfo.forceUpdate)

  const handleDownload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    startDownload()
  }

  const handleWebLink = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    openWebDownload()
  }

  const handleDismiss = () => {
    if (isForceUpdate) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    dismissModal()
  }

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleDismiss} disabled={isForceUpdate}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? '#151D2A' : '#FFFFFF',
                  borderColor: isDark ? '#1E293B' : '#E8E6E3',
                },
              ]}
            >
              {/* Close button (if not mandatory) */}
              {!isForceUpdate && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleDismiss}
                  style={[
                    styles.closeBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                    },
                  ]}
                >
                  <X size={16} color={colors.secondary} />
                </TouchableOpacity>
              )}

              {/* Header Icon */}
              <View style={styles.header}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isDark
                        ? 'rgba(56, 189, 248, 0.12)'
                        : 'rgba(37, 99, 235, 0.1)',
                      borderColor: colors.tertiary,
                    },
                  ]}
                >
                  {isForceUpdate ? (
                    <ShieldAlert size={28} color="#EF4444" />
                  ) : (
                    <Sparkles size={28} color={colors.tertiary} />
                  )}
                </View>

                <Text
                  style={[
                    styles.title,
                    { color: colors.primary },
                  ]}
                >
                  {isForceUpdate ? 'Pembaruan Wajib' : 'Pembaruan Tersedia'}
                </Text>

                {/* Version comparison row */}
                <View style={styles.versionRow}>
                  <View
                    style={[
                      styles.versionBadge,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
                        borderColor: isDark ? '#334155' : '#CBD5E1',
                      },
                    ]}
                  >
                    <Text style={[styles.versionOldText, { color: colors.secondary }]}>
                      v{currentVersion}
                    </Text>
                  </View>

                  <Text style={[styles.arrowText, { color: colors.secondary }]}>➔</Text>

                  <View
                    style={[
                      styles.versionBadge,
                      {
                        backgroundColor: isDark
                          ? 'rgba(56, 189, 248, 0.15)'
                          : 'rgba(37, 99, 235, 0.1)',
                        borderColor: colors.tertiary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.versionNewText,
                        { color: colors.tertiary },
                      ]}
                    >
                      v{updateInfo.version}
                    </Text>
                  </View>
                </View>

                {/* File size & date */}
                {updateInfo.formattedSize && (
                  <Text style={[styles.metaText, { color: colors.secondary }]}>
                    Ukuran APK: {updateInfo.formattedSize}
                  </Text>
                )}
              </View>

              {/* Release Notes List */}
              <View
                style={[
                  styles.notesBox,
                  {
                    backgroundColor: isDark ? '#0B0F17' : '#F7F5F2',
                    borderColor: isDark ? '#1E293B' : '#E8E6E3',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.notesTitle,
                    { color: colors.primary },
                  ]}
                >
                  Catatan Rilis:
                </Text>

                <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={false}>
                  {updateInfo.releaseNotes && updateInfo.releaseNotes.length > 0 ? (
                    updateInfo.releaseNotes.map((note, index) => (
                      <View key={index} style={styles.noteItem}>
                        <CheckCircle2 size={13} color={colors.tertiary} style={{ marginTop: 2 }} />
                        <Text
                          style={[
                            styles.noteText,
                            { color: colors.secondary },
                          ]}
                        >
                          {note}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.noteText, { color: colors.secondary }]}>
                      Pembaruan stabilitas dan performa sistem.
                    </Text>
                  )}
                </ScrollView>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsBox}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleDownload}
                  style={[
                    styles.downloadBtn,
                    {
                      backgroundColor: colors.tertiary,
                    },
                  ]}
                >
                  <ArrowDownCircle size={18} color="#FFFFFF" />
                  <Text style={styles.downloadBtnText}>Perbarui Sekarang</Text>
                </TouchableOpacity>

                {!isForceUpdate && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleDismiss}
                    style={[
                      styles.cancelBtn,
                      {
                        borderColor: isDark ? '#334155' : '#CBD5E1',
                      },
                    ]}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.secondary }]}>
                      Nanti Saja
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Alternative Web Link */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleWebLink}
                  style={styles.webLinkBtn}
                >
                  <Text style={[styles.webLinkText, { color: colors.tertiary }]}>
                    Unduh via Halaman Web QR
                  </Text>
                  <ExternalLink size={12} color={colors.tertiary} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  versionOldText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  arrowText: {
    fontSize: 12,
    fontWeight: '700',
  },
  versionNewText: {
    fontSize: 12,
    fontWeight: '800',
  },
  metaText: {
    fontSize: 11,
    marginTop: 2,
  },
  notesBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 18,
  },
  notesTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  notesScroll: {
    maxHeight: 120,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  actionsBox: {
    gap: 10,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  webLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 4,
  },
  webLinkText: {
    fontSize: 11,
    fontWeight: '600',
  },
})
