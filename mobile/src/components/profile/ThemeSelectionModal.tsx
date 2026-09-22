import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native'
import { X, Smartphone, Moon, Sun, Check, Sparkles } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore, ThemePreference } from '../../theme/themeStore'
import { useTranslation } from '../../hooks/useTranslation'

interface ThemeSelectionModalProps {
  visible: boolean
  onClose: () => void
}

interface ThemeOption {
  key: ThemePreference
  title: string
  desc: string
  icon: React.ComponentType<{ size: number; color: string }>
  iconColor: string
  iconBg: string
}

export const ThemeSelectionModal: React.FC<ThemeSelectionModalProps> = ({ visible, onClose }) => {
  const { colors, mode, preference, setPreference } = useThemeStore()
  const { t } = useTranslation()

  const isDark = mode === 'midnight'

  const options: ThemeOption[] = [
    {
      key: 'system',
      title: t('profile.themeSystem', 'Ikuti Tema Perangkat'),
      desc: t(
        'profile.themeSystemDesc',
        `Otomatis menyesuaikan tema HP (saat ini: ${isDark ? 'Gelap' : 'Terang'})`
      ),
      icon: Smartphone,
      iconColor: '#38BDF8',
      iconBg: 'rgba(56, 189, 248, 0.15)',
    },
    {
      key: 'midnight',
      title: t('profile.themeMidnight', 'Midnight (Mode Gelap)'),
      desc: t('profile.themeMidnightDesc', 'Tampilan gelap kontras tinggi nyaman di mata & hemat daya'),
      icon: Moon,
      iconColor: '#818CF8',
      iconBg: 'rgba(129, 140, 248, 0.15)',
    },
    {
      key: 'heritage',
      title: t('profile.themeHeritage', 'Heritage (Mode Terang)'),
      desc: t('profile.themeHeritageDesc', 'Tampilan terang bersih profesional standar ERP'),
      icon: Sun,
      iconColor: '#F59E0B',
      iconBg: 'rgba(245, 158, 11, 0.15)',
    },
  ]

  const handleSelect = async (key: ThemePreference) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await setPreference(key)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={styles.headerLeft}>
                  <View style={[styles.headerIconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                    <Sparkles size={18} color={colors.tertiary} />
                  </View>
                  <View>
                    <Text style={[styles.headerTitle, { color: colors.primary }]}>
                      {t('profile.themeTitle', 'Pilih Mode Tampilan')}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
                      {t('profile.themeSubtitle', 'Pengaturan tema visual aplikasi')}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                >
                  <X size={16} color={colors.secondary} />
                </TouchableOpacity>
              </View>

              {/* Options List */}
              <View style={styles.optionsList}>
                {options.map((opt) => {
                  const isSelected = preference === opt.key
                  const IconComp = opt.icon

                  return (
                    <TouchableOpacity
                      key={opt.key}
                      activeOpacity={0.7}
                      onPress={() => handleSelect(opt.key)}
                      style={[
                        styles.optionCard,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(56, 189, 248, 0.08)'
                              : 'rgba(184, 66, 46, 0.06)'
                            : isDark
                              ? 'rgba(255,255,255,0.02)'
                              : 'rgba(0,0,0,0.02)',
                          borderColor: isSelected
                            ? colors.tertiary
                            : colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.optionIconCircle, { backgroundColor: opt.iconBg }]}>
                        <IconComp size={20} color={opt.iconColor} />
                      </View>

                      <View style={styles.optionTextContainer}>
                        <View style={styles.optionTitleRow}>
                          <Text
                            style={[
                              styles.optionTitle,
                              {
                                color: isSelected ? colors.tertiary : colors.primary,
                                fontWeight: isSelected ? '700' : '600',
                              },
                            ]}
                          >
                            {opt.title}
                          </Text>
                          {opt.key === 'system' && (
                            <View
                              style={[
                                styles.badgeDefault,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(56, 189, 248, 0.15)'
                                    : 'rgba(184, 66, 46, 0.1)',
                                  borderColor: isDark
                                    ? 'rgba(56, 189, 248, 0.3)'
                                    : 'rgba(184, 66, 46, 0.2)',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.badgeText,
                                  { color: colors.tertiary },
                                ]}
                              >
                                Default
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.optionDesc, { color: colors.secondary }]}>
                          {opt.desc}
                        </Text>
                      </View>

                      {/* Radio / Check Circle */}
                      <View
                        style={[
                          styles.radioCircle,
                          {
                            borderColor: isSelected ? colors.tertiary : colors.borderStrong,
                            backgroundColor: isSelected ? colors.tertiary : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Footer Note */}
              <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[styles.footerText, { color: colors.secondary }]}>
                  {t(
                    'profile.themeSavedNotice',
                    'Preferensi tema disimpan secara aman di perangkat dan akan selalu digunakan setiap kali membuka aplikasi.'
                  )}
                </Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    padding: 16,
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  optionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  optionTitle: {
    fontSize: 13,
  },
  badgeDefault: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  optionDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 10.5,
    textAlign: 'center',
    lineHeight: 15,
  },
})
