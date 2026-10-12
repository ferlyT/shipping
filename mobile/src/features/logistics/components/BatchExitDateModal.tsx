import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Badge } from '@/components/ui/Badge'
import { useThemeStore } from '@/theme/themeStore'
import { formatDate } from '@/lib/utils'
import { useUpdateBatchExitDate } from '../hooks/useUpdateBatchExitDate'

interface BatchExitDateModalProps {
  visible: boolean
  batch: any | null
  onClose: () => void
  onSuccess?: () => void
}

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function formatYMD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseYMD(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export function BatchExitDateModal({
  visible,
  batch,
  onClose,
  onSuccess,
}: BatchExitDateModalProps) {
  const { colors, mode } = useThemeStore()
  const insets = useSafeAreaInsets()
  const isDark = mode === 'midnight'
  const updateMutation = useUpdateBatchExitDate()

  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => formatYMD(today), [today])

  // Tanggal yang dipilih (format YYYY-MM-DD) - Default = Hari ini
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr)
  const [notes, setNotes] = useState<string>('')
  const [showCalendar, setShowCalendar] = useState<boolean>(false)
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date())

  // Reset state saat modal dibuka
  useEffect(() => {
    if (visible && batch) {
      if (batch.fdExitDate) {
        try {
          const existing = new Date(batch.fdExitDate)
          if (!isNaN(existing.getTime())) {
            setSelectedDateStr(formatYMD(existing))
            setCalendarMonth(new Date(existing.getFullYear(), existing.getMonth(), 1))
          } else {
            setSelectedDateStr(todayStr)
            setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))
          }
        } catch {
          setSelectedDateStr(todayStr)
          setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))
        }
      } else {
        setSelectedDateStr(todayStr)
        setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))
      }
      setNotes('')
      setShowCalendar(false)
    }
  }, [visible, batch, todayStr, today])

  const selectedDate = useMemo(() => parseYMD(selectedDateStr), [selectedDateStr])

  // Hitung perbedaan hari dibanding hari ini
  const diffDaysFromToday = useMemo(() => {
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const s0 = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
    return Math.round((s0.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24))
  }, [selectedDate, today])

  // Batas masa lalu: fdLoadDate atau fdETD
  const minAllowedDate = useMemo(() => {
    if (!batch) return null
    let minD: Date | null = null
    if (batch.fdLoadDate) {
      const d = new Date(batch.fdLoadDate)
      if (!isNaN(d.getTime())) minD = d
    }
    if (batch.fdETD) {
      const d = new Date(batch.fdETD)
      if (!isNaN(d.getTime())) {
        if (!minD || d > minD) minD = d
      }
    }
    return minD
  }, [batch])

  // Validasi
  const validation = useMemo(() => {
    // 1. Cek sebelum load date / ETD
    if (minAllowedDate) {
      const min0 = new Date(minAllowedDate.getFullYear(), minAllowedDate.getMonth(), minAllowedDate.getDate())
      const sel0 = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      if (sel0 < min0) {
        return {
          valid: false,
          type: 'error',
          message: `Tanggal exit tidak boleh lebih awal dari tanggal muat/keberangkatan (${formatDate(minAllowedDate)}).`,
        }
      }
    }

    // 2. Cek future date > 3 hari (Keputusan User: Max 3 hari)
    if (diffDaysFromToday > 3) {
      return {
        valid: false,
        type: 'error',
        message: 'Tanggal exit tidak boleh lebih dari 3 hari ke depan dari hari ini.',
      }
    }

    // 3. Cek future date 1..3 hari
    if (diffDaysFromToday > 0 && diffDaysFromToday <= 3) {
      return {
        valid: true,
        type: 'future_warning',
        message: `Perhatian: Anda memilih tanggal ${diffDaysFromToday} hari ke depan (${formatDate(selectedDateStr)}). Batch akan langsung berstatus EXIT di sistem.`,
      }
    }

    // 4. Back date
    if (diffDaysFromToday < 0) {
      return {
        valid: true,
        type: 'backdate_info',
        message: `Mode Back Date: Tanggal exit diinput mundur ${Math.abs(diffDaysFromToday)} hari yang lalu (${formatDate(selectedDateStr)}).`,
      }
    }

    // 5. Hari ini
    return {
      valid: true,
      type: 'today_success',
      message: 'Tanggal exit hari ini (sesuai realisasi kargo keluar).',
    }
  }, [selectedDate, selectedDateStr, diffDaysFromToday, minAllowedDate])

  // Kalender Grid Cells
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDayIndex = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const list: Array<{ date: Date; dateStr: string; inMonth: boolean }> = []

    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i)
      list.push({ date: d, dateStr: formatYMD(d), inMonth: false })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      list.push({ date: d, dateStr: formatYMD(d), inMonth: true })
    }

    const remaining = (7 - (list.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      list.push({ date: d, dateStr: formatYMD(d), inMonth: false })
    }

    return list
  }, [calendarMonth])

  const handleSelectPreset = (offsetDays: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const target = new Date()
    target.setDate(target.getDate() + offsetDays)
    setSelectedDateStr(formatYMD(target))
  }

  const handleSubmit = () => {
    if (!batch || !validation.valid) return

    // Konfirmasi khusus jika future date (1-3 hari ke depan)
    if (diffDaysFromToday > 0) {
      Alert.alert(
        'Konfirmasi Tanggal Masa Depan',
        `Tanggal yang dipilih adalah ${formatDate(selectedDateStr)} (+${diffDaysFromToday} hari ke depan).\n\nBatch ini akan langsung ditandai berstatus EXIT di sistem dan keluar dari antrean ETA NOT EXIT. Lanjutkan?`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Ya, Simpan Exit',
            onPress: doSubmit,
          },
        ]
      )
    } else {
      doSubmit()
    }
  }

  const doSubmit = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      await updateMutation.mutateAsync({
        markingCode: batch.fdMarkingCode,
        payload: {
          exitDate: `${selectedDateStr}T00:00:00.000Z`,
          notes: notes.trim() || undefined,
        },
      })
      if (onSuccess) onSuccess()
      onClose()
    } catch {
      // Ditangani oleh hook onError toast
    }
  }

  if (!visible || !batch) return null

  const markingCode = (batch.fdMarkingCode || '').trim()
  const contOrAwb = (batch.fdContNo || batch.fdAWB || batch.fdBLNo || '—').trim()
  const branch = batch.fdBranchCode?.trim() || batch.fdBranch?.trim() || 'Pusat'
  const isAir = batch.fdListType === 1

  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 24) + 12
      : Math.max(insets.bottom, 12) + 8

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
              paddingBottom: bottomPadding,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CalendarIcon size={16} color={colors.tertiary} />
                <Text style={[styles.headerTitle, { color: colors.primary }]}>
                  Catat Exit Date Batch
                </Text>
              </View>
              <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
                {markingCode} • {isAir ? 'Udara' : 'Laut'} ({contOrAwb})
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.closeBtn, { borderColor: colors.border }]}
            >
              <X size={18} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Kartu Ringkasan Batch */}
            <View
              style={[
                styles.batchInfoCard,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.secondary }]}>Kode Marking</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.infoValueBold, { color: colors.primary }]}>{markingCode}</Text>
                  <Badge label={isAir ? 'Udara' : 'Laut'} variant={isAir ? 'air' : 'sea'} />
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.secondary }]}>
                  {isAir ? 'No. AWB' : 'No. Kontainer'}
                </Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>{contOrAwb}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.secondary }]}>Cabang Gudang</Text>
                <Badge label={branch} variant="neutral" />
              </View>

              {batch.fdETA ? (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.secondary }]}>Estimasi ETA</Text>
                  <Text style={[styles.infoValue, { color: colors.primary }]}>
                    {formatDate(batch.fdETA)}
                  </Text>
                </View>
              ) : null}

              {batch.fdExitDate ? (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.secondary }]}>Exit Sebelumnya</Text>
                  <Text style={[styles.infoValue, { color: '#10B981', fontWeight: '700' }]}>
                    {formatDate(batch.fdExitDate)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Quick Preset Buttons */}
            <Text style={[styles.sectionLabel, { color: colors.secondary }]}>
              PILIHAN CEPAT TANGGAL EXIT
            </Text>

            <View style={styles.presetsRow}>
              {/* Hari Ini (Default) */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelectPreset(0)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor:
                      diffDaysFromToday === 0
                        ? isDark ? 'rgba(56, 189, 248, 0.18)' : '#E0F2FE'
                        : colors.surface,
                    borderColor: diffDaysFromToday === 0 ? colors.tertiary : colors.border,
                  },
                ]}
              >
                <Clock size={13} color={diffDaysFromToday === 0 ? colors.tertiary : colors.secondary} />
                <Text
                  style={[
                    styles.presetChipText,
                    {
                      color: diffDaysFromToday === 0 ? colors.tertiary : colors.primary,
                      fontWeight: diffDaysFromToday === 0 ? '700' : '500',
                    },
                  ]}
                >
                  Hari Ini
                </Text>
              </TouchableOpacity>

              {/* Kemarin (-1) */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelectPreset(-1)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor:
                      diffDaysFromToday === -1
                        ? isDark ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7'
                        : colors.surface,
                    borderColor: diffDaysFromToday === -1 ? '#F59E0B' : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    {
                      color: diffDaysFromToday === -1 ? '#F59E0B' : colors.primary,
                      fontWeight: diffDaysFromToday === -1 ? '700' : '500',
                    },
                  ]}
                >
                  Kemarin
                </Text>
              </TouchableOpacity>

              {/* 2 Hari Lalu (-2) */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelectPreset(-2)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor:
                      diffDaysFromToday === -2
                        ? isDark ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7'
                        : colors.surface,
                    borderColor: diffDaysFromToday === -2 ? '#F59E0B' : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    {
                      color: diffDaysFromToday === -2 ? '#F59E0B' : colors.primary,
                      fontWeight: diffDaysFromToday === -2 ? '700' : '500',
                    },
                  ]}
                >
                  -2 Hari
                </Text>
              </TouchableOpacity>

              {/* Kalender Toggle */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setShowCalendar(!showCalendar)
                }}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: showCalendar
                      ? isDark ? 'rgba(56, 189, 248, 0.18)' : '#E0F2FE'
                      : colors.surface,
                    borderColor: showCalendar ? colors.tertiary : colors.border,
                  },
                ]}
              >
                <CalendarIcon size={13} color={showCalendar ? colors.tertiary : colors.secondary} />
                <Text
                  style={[
                    styles.presetChipText,
                    {
                      color: showCalendar ? colors.tertiary : colors.primary,
                      fontWeight: showCalendar ? '700' : '500',
                    },
                  ]}
                >
                  Kalender
                </Text>
              </TouchableOpacity>
            </View>

            {/* Display Tanggal Terpilih */}
            <View
              style={[
                styles.selectedDateBox,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.selectedDateLabel, { color: colors.secondary }]}>
                TANGGAL EXIT YANG DIPILIH
              </Text>
              <Text style={[styles.selectedDateValue, { color: colors.primary }]}>
                {formatDate(selectedDateStr)}
              </Text>
              <Text style={[styles.selectedDateSub, { color: colors.secondary }]}>
                {selectedDateStr} ({diffDaysFromToday === 0 ? 'Hari ini' : diffDaysFromToday > 0 ? `+${diffDaysFromToday} hari ke depan` : `${Math.abs(diffDaysFromToday)} hari lalu`})
              </Text>
            </View>

            {/* Kalender Grid Mini */}
            {showCalendar && (
              <View
                style={[
                  styles.calendarContainer,
                  {
                    backgroundColor: isDark ? '#111827' : '#F9FAFB',
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Month navigation */}
                <View style={styles.calMonthNav}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
                    }}
                    style={[styles.calNavBtn, { borderColor: colors.border }]}
                  >
                    <ChevronLeft size={16} color={colors.secondary} />
                  </TouchableOpacity>

                  <Text style={[styles.calMonthText, { color: colors.primary }]}>
                    {calendarMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
                    }}
                    style={[styles.calNavBtn, { borderColor: colors.border }]}
                  >
                    <ChevronRight size={16} color={colors.secondary} />
                  </TouchableOpacity>
                </View>

                {/* Weekday headers */}
                <View style={styles.calWeekdaysRow}>
                  {WEEKDAYS.map((wd) => (
                    <Text key={wd} style={[styles.calWeekdayText, { color: colors.secondary }]}>
                      {wd}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.calDaysGrid}>
                  {calendarDays.map((item, idx) => {
                    const isSelected = item.dateStr === selectedDateStr
                    const isCurrentDay = isSameDay(item.date, today)

                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          setSelectedDateStr(item.dateStr)
                        }}
                        style={[
                          styles.calDayCell,
                          isSelected && {
                            backgroundColor: colors.tabBarActive,
                            borderRadius: 8,
                          },
                          !item.inMonth && { opacity: 0.35 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.calDayText,
                            {
                              color: isSelected
                                ? '#FFFFFF'
                                : isCurrentDay
                                ? colors.tertiary
                                : colors.primary,
                              fontWeight: isSelected || isCurrentDay ? '700' : '400',
                            },
                          ]}
                        >
                          {item.date.getDate()}
                        </Text>
                        {isCurrentDay && !isSelected && (
                          <View
                            style={[
                              styles.todayDot,
                              { backgroundColor: colors.tertiary },
                            ]}
                          />
                        )}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Validation Banner / Callout */}
            <View
              style={[
                styles.validationBanner,
                validation.type === 'error'
                  ? {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                      borderColor: '#EF4444',
                    }
                  : validation.type === 'future_warning'
                  ? {
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
                      borderColor: '#F59E0B',
                    }
                  : validation.type === 'backdate_info'
                  ? {
                      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : '#F0F9FF',
                      borderColor: colors.tertiary,
                    }
                  : {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#F0FDF4',
                      borderColor: '#10B981',
                    },
              ]}
            >
              {validation.type === 'error' ? (
                <AlertCircle size={15} color="#EF4444" style={{ flexShrink: 0 }} />
              ) : validation.type === 'future_warning' ? (
                <AlertTriangle size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
              ) : validation.type === 'backdate_info' ? (
                <Clock size={15} color={colors.tertiary} style={{ flexShrink: 0 }} />
              ) : (
                <CheckCircle2 size={15} color="#10B981" style={{ flexShrink: 0 }} />
              )}
              <Text
                style={[
                  styles.validationText,
                  {
                    color:
                      validation.type === 'error'
                        ? isDark ? '#FCA5A5' : '#DC2626'
                        : validation.type === 'future_warning'
                        ? isDark ? '#FCD34D' : '#D97706'
                        : validation.type === 'backdate_info'
                        ? colors.tertiary
                        : isDark ? '#6EE7B7' : '#059669',
                  },
                ]}
              >
                {validation.message}
              </Text>
            </View>

            {/* Catatan Tambahan (Opsional) */}
            <Text style={[styles.sectionLabel, { color: colors.secondary, marginTop: 12 }]}>
              CATATAN OPERASIONAL (OPSIONAL)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Contoh: Bongkar selesai sore, kargo diambil kurir..."
              placeholderTextColor={colors.secondary}
              multiline
              numberOfLines={2}
              style={[
                styles.notesInput,
                {
                  color: colors.primary,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
            />
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              disabled={updateMutation.isPending}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.secondary }]}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={!validation.valid || updateMutation.isPending}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: !validation.valid
                    ? isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'
                    : colors.tabBarActive,
                },
              ]}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={16} color="#FFFFFF" />
                  <Text
                    style={[
                      styles.submitBtnText,
                      { color: !validation.valid ? colors.secondary : '#FFFFFF' },
                    ]}
                  >
                    Simpan Exit Date
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scrollArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  batchInfoCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  infoValueBold: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
  },
  selectedDateBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedDateLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  selectedDateValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  selectedDateSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  calendarContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  calMonthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calNavBtn: {
    padding: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  calMonthText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  calWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  calWeekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
  },
  calDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayCell: {
    width: '14.28%',
    aspectRatio: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayText: {
    fontSize: 11.5,
  },
  todayDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    marginTop: 1,
  },
  validationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  validationText: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    minHeight: 46,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
})
