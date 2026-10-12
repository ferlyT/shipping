import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  X,
  Save,
  Search,
  Check,
  Tag,
  Hash,
  Receipt,
  Mic,
  Plane,
  Ship,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { useToastStore } from '@/stores/toastStore'
import { useMarkingLookup } from '../hooks/useMarkingLookup'
import { useDebounce } from '@/hooks/useDebounce'
import type {
  InspectionReport,
  CreateInspectionPayload,
  UpdateInspectionPayload,
  LookupMarkingEntry,
} from '../types/inspectionReport.types'

interface Props {
  visible: boolean
  editItem?: InspectionReport | null
  initialData?: Partial<InspectionReport> | null
  onClose: () => void
  onSubmit: (payload: CreateInspectionPayload | UpdateInspectionPayload) => Promise<any>
  isSaving: boolean
}

export function InspectionFormSheet({
  visible,
  editItem,
  initialData,
  onClose,
  onSubmit,
  isSaving,
}: Props) {
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()
  const isDark = mode === 'midnight'
  const insets = useSafeAreaInsets()
  const bottomInset = Platform.OS === 'android'
    ? Math.max(insets.bottom, 48)
    : Math.max(insets.bottom, 16)

  const isEdit = Boolean(editItem)
  const keteranganRef = useRef<TextInput>(null)
  const scrollViewRef = useRef<ScrollView>(null)

  // Keyboard height tracker to prevent bottom inputs being covered
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height)
      }
    )
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0)
      }
    )
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  // Form states
  const [fdReportDate, setFdReportDate] = useState(new Date().toISOString())
  const [fdListType, setFdListType] = useState<1 | 2>(2) // 1 = Udara, 2 = Laut
  const [markingSearch, setMarkingSearch] = useState('')
  const debouncedMarkingSearch = useDebounce(markingSearch, 250)
  const [showMarkingDropdown, setShowMarkingDropdown] = useState(false)
  const [showVoiceGuide, setShowVoiceGuide] = useState(false)

  const [fdMarkingCode, setFdMarkingCode] = useState('')
  const [fdMarkingNo, setFdMarkingNo] = useState('')
  const [fdListCode, setFdListCode] = useState('')
  const [fdTerima, setFdTerima] = useState('')
  const [fdNamaCustomer, setFdNamaCustomer] = useState('')
  const [fdKeterangan, setFdKeterangan] = useState('')
  const [fdStatus, setFdStatus] = useState<'1' | '2'>('1')

  const { data: suggestions = [], isFetching: isSearching } = useMarkingLookup(
    debouncedMarkingSearch,
    fdListType
  )

  useEffect(() => {
    if (visible) {
      if (editItem) {
        setFdReportDate(editItem.fdReportDate || new Date().toISOString())
        setFdListType(editItem.fdListType ? (editItem.fdListType as 1 | 2) : 2)
        setFdMarkingCode(editItem.fdMarkingCode || '')
        setFdMarkingNo(editItem.fdMarkingNo || '')
        setFdListCode(editItem.fdListCode || '')
        setFdTerima(editItem.fdTerima || '')
        setFdNamaCustomer(editItem.fdNamaCustomer || '')
        setFdKeterangan(editItem.fdKeterangan || '')
        setFdStatus(editItem.fdStatus || '1')
        setMarkingSearch(editItem.fdMarkingCode || '')
      } else if (initialData) {
        setFdReportDate(initialData.fdReportDate || new Date().toISOString())
        setFdListType(initialData.fdListType ? (initialData.fdListType as 1 | 2) : 2)
        setFdMarkingCode(initialData.fdMarkingCode || '')
        setFdMarkingNo(initialData.fdMarkingNo || '')
        setFdListCode(initialData.fdListCode || '')
        setFdTerima(initialData.fdTerima || '')
        setFdNamaCustomer(initialData.fdNamaCustomer || '')
        setFdKeterangan(initialData.fdKeterangan || '')
        setFdStatus(initialData.fdStatus || '1')
        setMarkingSearch(initialData.fdMarkingCode || '')
      } else {
        setFdReportDate(new Date().toISOString())
        setFdListType(2)
        setFdMarkingCode('')
        setFdMarkingNo('')
        setFdListCode('')
        setFdTerima('')
        setFdNamaCustomer('')
        setFdKeterangan('')
        setFdStatus('1')
        setMarkingSearch('')
      }
      setShowMarkingDropdown(false)
      setShowVoiceGuide(false)
    }
  }, [visible, editItem, initialData])

  const handleSelectSuggestion = (entry: LookupMarkingEntry) => {
    Haptics.selectionAsync()
    setFdMarkingCode(entry.fdMarkingCode)
    setFdMarkingNo(entry.fdMarkingNo || '')
    setFdListCode(entry.fdListCode || '')
    if (entry.fdCustName) setFdNamaCustomer(entry.fdCustName)
    if (entry.fdTerima) setFdTerima(entry.fdTerima)
    if (entry.fdListType) setFdListType(entry.fdListType as 1 | 2)
    setMarkingSearch(entry.fdMarkingCode)
    setShowMarkingDropdown(false)
    showToast('Data kargo & customer terisi otomatis', 'success')
  }

  const handleClearMarking = () => {
    setMarkingSearch('')
    setFdMarkingCode('')
    setFdMarkingNo('')
    setFdListCode('')
    setFdTerima('')
    setShowMarkingDropdown(false)
  }

  const handleAppendPhrase = (phrase: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setFdKeterangan((prev) => {
      const clean = prev.trim()
      return clean ? `${clean}. ${phrase}` : phrase
    })
    keteranganRef.current?.focus()
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 150)
  }

  const handleTriggerVoice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowVoiceGuide(true)
    keteranganRef.current?.focus()
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 200)
  }

  const handleSubmit = async () => {
    const cleanCustomer = fdNamaCustomer.trim()
    const cleanKeterangan = fdKeterangan.trim()

    if (!cleanCustomer) {
      showToast('Nama Customer wajib diisi', 'error')
      return
    }

    if (fdStatus === '2' && !cleanKeterangan) {
      showToast('Keterangan pemeriksaan wajib diisi jika status Selesai', 'error')
      keteranganRef.current?.focus()
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const payload: CreateInspectionPayload = {
      fdReportDate,
      fdListType,
      fdMarkingCode: (fdMarkingCode.trim() || markingSearch.trim()) || undefined,
      fdMarkingNo: fdMarkingNo.trim() || undefined,
      fdListCode: fdListCode.trim() || undefined,
      fdTerima: fdTerima.trim() || undefined,
      fdNamaCustomer: cleanCustomer,
      fdKeterangan: cleanKeterangan || undefined,
      fdStatus,
    }

    try {
      await onSubmit(payload)
      onClose()
    } catch {
      // Error handled by mutation
    }
  }

  // Semantic tokens from mobile-design-rules.md
  const lineColor = isDark ? '#222C38' : '#E3E7EC'
  const surfaceColor = isDark ? '#131A23' : '#FFFFFF'
  const textColor = isDark ? '#EEF2F6' : '#141B24'
  const mutedColor = isDark ? '#8A97A6' : '#657080'
  const accentColor = isDark ? '#E0644E' : '#B8402C'
  const airColor = isDark ? '#E2B266' : '#A9741C'
  const seaColor = isDark ? '#5FA3D4' : '#256A9E'
  const okColor = isDark ? '#4CC38A' : '#17855A'
  const warnColor = isDark ? '#E5A93C' : '#A97612'

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: surfaceColor,
              borderColor: lineColor,
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: lineColor },
            ]}
          >
            <View>
              <Text style={[styles.title, { color: textColor }]}>
                {isEdit ? 'Edit BAP' : 'Buat BAP Baru'}
              </Text>
              <Text style={[styles.subtitle, { color: mutedColor }]}>
                {isEdit ? editItem?.fdReportNumber : 'Berita Acara Pemeriksaan'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  borderColor: lineColor,
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(0,0,0,0.04)',
                },
              ]}
            >
              <X size={18} color={textColor} />
            </TouchableOpacity>
          </View>

          {/* Form Body */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 32 : 24 },
            ]}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {/* Moda Switcher */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: mutedColor }]}>
                Moda Pengiriman
              </Text>
              <View
                style={[
                  styles.statusContainer,
                  {
                    borderColor: lineColor,
                    backgroundColor: isDark ? '#0C1118' : '#F6F7F9',
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync()
                    setFdListType(1)
                  }}
                  style={[
                    styles.statusPill,
                    styles.modaPillRow,
                    fdListType === 1 && {
                      backgroundColor: surfaceColor,
                      borderColor: lineColor,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: airColor }]} />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: fdListType === 1 ? textColor : mutedColor,
                        fontWeight: fdListType === 1 ? '600' : '400',
                      },
                    ]}
                  >
                    Udara (Air)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync()
                    setFdListType(2)
                  }}
                  style={[
                    styles.statusPill,
                    styles.modaPillRow,
                    fdListType === 2 && {
                      backgroundColor: surfaceColor,
                      borderColor: lineColor,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: seaColor }]} />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: fdListType === 2 ? textColor : mutedColor,
                        fontWeight: fdListType === 2 ? '600' : '400',
                      },
                    ]}
                  >
                    Laut (Sea)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Switcher */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: mutedColor }]}>
                Status BAP
              </Text>
              <View
                style={[
                  styles.statusContainer,
                  {
                    borderColor: lineColor,
                    backgroundColor: isDark ? '#0C1118' : '#F6F7F9',
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync()
                    setFdStatus('1')
                  }}
                  style={[
                    styles.statusPill,
                    fdStatus === '1' && {
                      backgroundColor: surfaceColor,
                      borderColor: lineColor,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: fdStatus === '1' ? warnColor : mutedColor,
                        fontWeight: fdStatus === '1' ? '600' : '400',
                      },
                    ]}
                  >
                    Draft
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync()
                    setFdStatus('2')
                  }}
                  style={[
                    styles.statusPill,
                    fdStatus === '2' && {
                      backgroundColor: surfaceColor,
                      borderColor: lineColor,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: fdStatus === '2' ? okColor : mutedColor,
                        fontWeight: fdStatus === '2' ? '600' : '400',
                      },
                    ]}
                  >
                    Selesai
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Marking Search / Autocomplete */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.secondary }]}>
                CARI MARKING CODE (AUTO-FILL)
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor: colors.border,
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(0,0,0,0.03)',
                  },
                ]}
              >
                <Search size={15} color={colors.secondary} />
                <TextInput
                  style={[styles.input, { color: colors.primary }]}
                  placeholder="Ketik kode marking untuk mencari..."
                  placeholderTextColor={colors.secondary}
                  value={markingSearch}
                  onChangeText={(val) => {
                    setMarkingSearch(val)
                    setFdMarkingCode(val)
                    if (val.trim().length >= 1) {
                      setShowMarkingDropdown(true)
                    } else {
                      setShowMarkingDropdown(false)
                    }
                  }}
                  onFocus={() => {
                    if (markingSearch.trim().length >= 1) {
                      setShowMarkingDropdown(true)
                    }
                  }}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color={colors.tertiary} />
                )}
                {Boolean(markingSearch) && !isSearching && (
                  <TouchableOpacity
                    onPress={handleClearMarking}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={15} color={colors.secondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Suggestions Dropdown */}
              {showMarkingDropdown &&
                (suggestions.length > 0 ||
                  isSearching ||
                  debouncedMarkingSearch.trim().length >= 1) && (
                  <View
                    style={[
                      styles.dropdown,
                      {
                        backgroundColor: isDark
                          ? (colors.surfaceElevated || '#1C2638')
                          : '#FFFFFF',
                        borderColor: isDark ? colors.borderStrong : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.dropdownHeader,
                        {
                          borderBottomColor: isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.08)',
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.03)'
                            : 'rgba(0,0,0,0.02)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownHeaderTitle,
                          { color: colors.secondary },
                        ]}
                      >
                        {isSearching
                          ? 'Mencari data kargo...'
                          : `${suggestions.length} marking ditemukan (${
                              fdListType === 1 ? 'Udara' : 'Laut'
                            })`}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowMarkingDropdown(false)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={13} color={colors.secondary} />
                      </TouchableOpacity>
                    </View>

                    {isSearching && suggestions.length === 0 ? (
                      <View style={styles.dropdownLoadingBox}>
                        <ActivityIndicator size="small" color={colors.tertiary} />
                        <Text
                          style={[
                            styles.dropdownLoadingText,
                            { color: colors.secondary },
                          ]}
                        >
                          Mencari database kargo...
                        </Text>
                      </View>
                    ) : !isSearching && suggestions.length === 0 ? (
                      <View style={styles.dropdownEmptyBox}>
                        <Text
                          style={[
                            styles.dropdownEmptyText,
                            { color: colors.secondary },
                          ]}
                        >
                          Tidak ada marking "{debouncedMarkingSearch.trim()}" di
                          moda {fdListType === 1 ? 'Udara' : 'Laut'}.
                        </Text>
                      </View>
                    ) : (
                      <ScrollView
                        style={styles.dropdownScroll}
                        contentContainerStyle={styles.dropdownScrollContent}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        persistentScrollbar={true}
                      >
                    {suggestions.map((entry, idx) => (
                      <TouchableOpacity
                        key={`${entry.fdListCode}-${entry.fdMarkingCode}-${idx}`}
                        onPress={() => handleSelectSuggestion(entry)}
                        style={[
                          styles.dropdownItem,
                          {
                            borderBottomColor: isDark
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(0,0,0,0.06)',
                            backgroundColor: isDark
                              ? (colors.surfaceElevated || '#1C2638')
                              : '#FFFFFF',
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                flex: 1,
                              }}
                            >
                              <Tag size={12} color={colors.tertiary} />
                              <Text
                                style={[
                                  styles.dropdownMarking,
                                  { color: colors.primary },
                                ]}
                              >
                                {entry.fdMarkingCode}
                              </Text>
                              {entry.fdMarkingNo ? (
                                <Text
                                  style={[
                                    styles.dropdownSub,
                                    { color: colors.secondary },
                                  ]}
                                >
                                  (No: {entry.fdMarkingNo})
                                </Text>
                              ) : null}
                            </View>

                            <View
                              style={[
                                styles.miniModaBadge,
                                {
                                  backgroundColor:
                                    entry.fdListType === 1
                                      ? isDark
                                        ? 'rgba(56, 189, 248, 0.2)'
                                        : 'rgba(2, 132, 199, 0.15)'
                                      : isDark
                                      ? 'rgba(52, 211, 153, 0.2)'
                                      : 'rgba(5, 150, 105, 0.15)',
                                  borderColor:
                                    entry.fdListType === 1
                                      ? '#0284C7'
                                      : '#10B981',
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: '700',
                                  color:
                                    entry.fdListType === 1
                                      ? '#0284C7'
                                      : '#10B981',
                                }}
                              >
                                {entry.fdListType === 1 ? '✈️ Udara' : '🚢 Laut'}
                              </Text>
                            </View>
                          </View>

                          <Text
                            style={[
                              styles.dropdownCust,
                              {
                                color: colors.primary,
                                fontWeight: '600',
                                marginTop: 4,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            👤 {entry.fdCustName || 'Tanpa Customer'}
                          </Text>

                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                              marginTop: 2,
                            }}
                          >
                            <Text
                              style={[
                                styles.dropdownMeta,
                                { color: colors.secondary },
                              ]}
                            >
                              Resi: {entry.fdTerima || '—'}
                            </Text>
                            <Text
                              style={[
                                styles.dropdownMeta,
                                { color: colors.secondary },
                              ]}
                            >
                              •
                            </Text>
                            <Text
                              style={[
                                styles.dropdownMeta,
                                { color: colors.secondary },
                              ]}
                            >
                              List: {entry.fdListCode || '—'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
            </View>

            {/* Nama Customer */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.secondary }]}>
                NAMA CUSTOMER <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor: colors.border,
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(0,0,0,0.03)',
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.primary }]}
                  placeholder="Nama customer..."
                  placeholderTextColor={colors.secondary}
                  value={fdNamaCustomer}
                  onChangeText={setFdNamaCustomer}
                  onFocus={() => setShowMarkingDropdown(false)}
                />
              </View>
            </View>

            {/* Marking No & List Code row */}
            <View style={styles.rowTwo}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <View style={styles.labelRowWithAction}>
                  <Text style={[styles.label, { color: colors.secondary }]}>
                    MARKING NO
                  </Text>
                  <Text style={[styles.labelHint, { color: colors.secondary }]}>
                    (opsional)
                  </Text>
                </View>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      borderColor: colors.border,
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(0,0,0,0.03)',
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.primary }]}
                    placeholder="No. marking..."
                    placeholderTextColor={colors.secondary}
                    value={fdMarkingNo}
                    onChangeText={setFdMarkingNo}
                    onFocus={() => setShowMarkingDropdown(false)}
                  />
                </View>
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <View style={styles.labelRowWithAction}>
                  <Text style={[styles.label, { color: colors.secondary }]}>
                    LIST CODE
                  </Text>
                  <Text style={[styles.labelHint, { color: colors.secondary }]}>
                    (opsional)
                  </Text>
                </View>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      borderColor: colors.border,
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(0,0,0,0.03)',
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.primary }]}
                    placeholder="List code..."
                    placeholderTextColor={colors.secondary}
                    value={fdListCode}
                    onChangeText={setFdListCode}
                    onFocus={() => setShowMarkingDropdown(false)}
                  />
                </View>
              </View>
            </View>

            {/* No. Resi / Terima */}
            <View style={styles.formGroup}>
              <View style={styles.labelRowWithAction}>
                <Text style={[styles.label, { color: colors.secondary }]}>
                  NO. RESI (TERIMA)
                </Text>
                <Text style={[styles.labelHint, { color: colors.secondary }]}>
                  (opsional)
                </Text>
              </View>
              <View
                style={[
                  styles.inputWrap,
                  {
                    borderColor: colors.border,
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(0,0,0,0.03)',
                  },
                ]}
              >
                <Receipt size={14} color={colors.secondary} />
                <TextInput
                  style={[styles.input, { color: colors.primary }]}
                  placeholder="Nomor resi pengiriman / terima..."
                  placeholderTextColor={colors.secondary}
                  value={fdTerima}
                  onChangeText={setFdTerima}
                  onFocus={() => setShowMarkingDropdown(false)}
                />
              </View>
            </View>

            {/* Keterangan / Hasil Pemeriksaan */}
            <View style={styles.formGroup}>
              <View style={styles.labelRowWithAction}>
                <Text style={[styles.label, { color: colors.secondary }]}>
                  KETERANGAN PEMERIKSAAN{' '}
                  {fdStatus === '2' ? (
                    <Text style={{ color: '#EF4444' }}>*</Text>
                  ) : (
                    <Text style={[styles.labelHint, { color: colors.secondary }]}>
                      (opsional)
                    </Text>
                  )}
                </Text>
                <TouchableOpacity
                  onPress={handleTriggerVoice}
                  style={[
                    styles.voiceBtn,
                    {
                      borderColor: colors.tabBarActive,
                      backgroundColor: isDark
                        ? 'rgba(56, 189, 248, 0.15)'
                        : 'rgba(2, 132, 199, 0.1)',
                    },
                  ]}
                >
                  <Mic size={13} color={colors.tabBarActive} />
                  <Text
                    style={[
                      styles.voiceBtnText,
                      { color: colors.tabBarActive },
                    ]}
                  >
                    Dikte Suara
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Voice Guide & Quick Phrase Chips */}
              {showVoiceGuide && (
                <View
                  style={[
                    styles.voiceGuideBox,
                    {
                      backgroundColor: isDark
                        ? 'rgba(56, 189, 248, 0.08)'
                        : 'rgba(2, 132, 199, 0.06)',
                      borderColor: isDark
                        ? 'rgba(56, 189, 248, 0.3)'
                        : 'rgba(2, 132, 199, 0.25)',
                    },
                  ]}
                >
                  <View style={styles.voiceGuideHeader}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Mic size={14} color={colors.tabBarActive} />
                      <Text
                        style={[
                          styles.voiceGuideTitle,
                          { color: colors.tabBarActive },
                        ]}
                      >
                        Dikte Suara Aktif
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowVoiceGuide(false)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={14} color={colors.secondary} />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[
                      styles.voiceGuideDesc,
                      { color: colors.secondary },
                    ]}
                  >
                    Sentuh ikon mikrofon pada keyboard HP Anda untuk mulai berbicara, atau gunakan template frasa cepat di bawah:
                  </Text>
                  <View style={styles.phraseChipContainer}>
                    {[
                      'Kondisi baik & tersegel',
                      'Kardus basah / lembab',
                      'Kemasan sobek / rusak',
                      'Isi kurang / tidak sesuai',
                      'Lakban ulang / repack',
                      'Barang pecah / penyok',
                    ].map((phrase) => (
                      <TouchableOpacity
                        key={phrase}
                        onPress={() => handleAppendPhrase(phrase)}
                        style={[
                          styles.phraseChip,
                          {
                            borderColor: colors.border,
                            backgroundColor: isDark
                              ? 'rgba(255,255,255,0.06)'
                              : '#FFFFFF',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.phraseChipText,
                            { color: colors.primary },
                          ]}
                        >
                          + {phrase}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View
                style={[
                  styles.textAreaWrap,
                  {
                    borderColor: colors.border,
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(0,0,0,0.03)',
                  },
                ]}
              >
                <TextInput
                  ref={keteranganRef}
                  style={[styles.textArea, { color: colors.primary }]}
                  placeholder="Catat kondisi fisik kargo, barang cacat, selisih kemasan, atau catatan khusus pemeriksaan..."
                  placeholderTextColor={colors.secondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={fdKeterangan}
                  onChangeText={setFdKeterangan}
                  onFocus={() => {
                    setShowMarkingDropdown(false)
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true })
                    }, 180)
                  }}
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: lineColor,
                paddingBottom: bottomInset + 8,
              },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              disabled={isSaving}
              style={[styles.cancelBtn, { borderColor: lineColor }]}
            >
              <Text style={[styles.cancelText, { color: mutedColor }]}>
                Batal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSaving}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: accentColor,
                  opacity: isSaving ? 0.7 : 1,
                },
              ]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Save size={16} color="#FFFFFF" />
                  <Text style={styles.saveText}>
                    {isEdit ? 'Simpan Perubahan' : 'Buat BAP'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    height: '84%',
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
    gap: 14,
  },
  formGroup: {
    gap: 6,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  labelHint: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.75,
  },
  statusContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  statusPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  dropdown: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  dropdownHeaderTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  dropdownLoadingBox: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dropdownLoadingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dropdownEmptyBox: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownEmptyText: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
  },
  dropdownScroll: {
    maxHeight: 240,
  },
  dropdownScrollContent: {
    flexGrow: 0,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
  },
  dropdownMarking: {
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownSub: {
    fontSize: 11,
  },
  dropdownCust: {
    fontSize: 11,
    marginTop: 2,
  },
  textAreaWrap: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minHeight: 88,
  },
  textArea: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  labelRowWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  voiceBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modaPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  miniModaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  dropdownMeta: {
    fontSize: 10.5,
  },
  voiceGuideBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  voiceGuideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceGuideTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  voiceGuideDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  phraseChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  phraseChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  phraseChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
})
