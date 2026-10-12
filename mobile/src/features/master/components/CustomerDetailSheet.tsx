import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SkeletonShimmer } from '@/components/ui/SkeletonShimmer'
import { useThemeStore } from '@/theme/themeStore'
import { useToastStore } from '@/stores/toastStore'
import {
  formatCurrency,
  formatCompactRupiah,
  displayCustName,
} from '@/lib/utils'
import {
  formatCustomerSince,
  tierBadgeConfig,
  statusConfig,
} from '../utils/master.utils'
import apiClient from '@/api/client'
import { CustomerCommodityTab } from './CustomerCommodityTab'

type DetailTabType = 'ringkasan' | 'finansial' | 'komoditas' | 'alamat'

interface CustomerDetailSheetProps {
  customer: any | null
  onClose: () => void
}

function parsePhoneList(str?: string | null): string[] {
  if (!str) return []
  return str
    .split(/[/,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function toSentenceCase(str?: string | null): string {
  if (!str) return 'Alamat'
  const clean = str.trim()
  if (!clean) return 'Alamat'
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()
}

function isHpNumber(num: string): boolean {
  const clean = num.replace(/\D/g, '')
  return clean.startsWith('08') || clean.startsWith('628') || clean.startsWith('8')
}

export function CustomerDetailSheet({ customer, onClose }: CustomerDetailSheetProps) {
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()
  const isDark = mode === 'midnight'
  const insets = useSafeAreaInsets()

  const lineColor = isDark ? '#222C38' : '#E3E7EC'
  const accentColor = isDark ? '#E0644E' : '#B8402C'
  const okColor = isDark ? '#4CC38A' : '#17855A'

  const topPadding =
    Platform.OS === 'android'
      ? Math.max(insets.top, 28) + 8
      : Math.max(insets.top, 12) + 4

  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, 28) + 12
      : Math.max(insets.bottom, 12) + 12

  const [activeTab, setActiveTab] = useState<DetailTabType>('ringkasan')

  // Fetch Full Customer Detail (including addresses, financial stats & delivery info)
  const {
    data: customerDetail,
    isLoading: isDetailLoading,
  } = useQuery({
    queryKey: ['master-customer-detail', customer?.fdCustCode],
    queryFn: async () => {
      if (!customer?.fdCustCode) return null
      const res = await apiClient.get(`/customers/${encodeURIComponent(customer.fdCustCode)}`)
      return res.data.data || null
    },
    enabled: Boolean(customer?.fdCustCode),
  })

  const cust = customerDetail || customer

  // Fetch Commodity Stats (2 bar proporsi & grafik tren bulanan)
  const {
    data: commodityStats,
    isLoading: isCommodityLoading,
  } = useQuery({
    queryKey: ['master-customer-commodity-stats', customer?.fdCustCode],
    queryFn: async () => {
      if (!customer?.fdCustCode) return null
      const res = await apiClient.get(`/customers/${encodeURIComponent(customer.fdCustCode)}/commodity-stats`)
      return res.data.data || null
    },
    enabled: Boolean(customer?.fdCustCode),
  })

  const handleCall = (phone?: string) => {
    if (!phone) {
      showToast('Nomor telepon tidak tersedia', 'warning')
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const cleanNumber = phone.replace(/[^0-9+]/g, '')
    Linking.openURL(`tel:${cleanNumber}`)
  }

  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
      showToast('Nomor telepon tidak tersedia', 'warning')
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const cleanNumber = phone.replace(/\D/g, '')
    const waNumber = cleanNumber.startsWith('0') ? '62' + cleanNumber.slice(1) : cleanNumber
    Linking.openURL(`https://wa.me/${waNumber}`)
  }

  const handleEmail = (email?: string) => {
    if (!email) return
    Haptics.selectionAsync()
    Linking.openURL(`mailto:${email.trim()}`)
  }

  const copyCustomerCode = (code?: string) => {
    if (!code) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    showToast(`Kode Customer ${code} disalin`, 'success')
  }

  if (!customer) return null

  const activeTierKey = String(cust?.currentTier || cust?.tier || 'none').toLowerCase()
  const activeTierCfg = tierBadgeConfig[activeTierKey] || tierBadgeConfig.none
  const custStatusCfg = statusConfig[(cust?.fdBlocked || 0) as keyof typeof statusConfig] || statusConfig[0]
  const isBlocked = (cust?.fdBlocked ?? 0) === 1

  const annualRevenue = cust?.annualRevenue || cust?.financialStats?.[0]?.totalRevenue || 0
  const totalInvoices = cust?.totalInvoices || cust?.financialStats?.[0]?.totalInvoices || 0
  const addrList = cust?.addresses || []

  const officePhones = parsePhoneList(cust?.fdTelp || cust?.fdPhone)
  const mobilePhones = parsePhoneList(cust?.fdHP)

  return (
    <Modal
      visible={Boolean(customer)}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0C1118' : '#F6F7F9' }]}>
        {/* Sticky Header Bar (.bar) */}
        <View
          style={[
            styles.bar,
            {
              backgroundColor: isDark ? 'rgba(12,17,24,0.94)' : 'rgba(246,247,249,0.94)',
              borderBottomColor: lineColor,
              paddingTop: topPadding,
            },
          ]}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.name, { color: colors.primary }]} numberOfLines={1}>
              {displayCustName(cust?.fdCustName, 'PROFIL CUSTOMER')}
            </Text>
            <View style={styles.t2}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => copyCustomerCode(cust?.fdCustCode)}
                style={[styles.tag, { borderColor: lineColor }]}
              >
                <Text style={[styles.tagText, { color: colors.secondary }]}>
                  {cust?.fdCustCode || '–'}
                </Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.tag,
                  isBlocked
                    ? { borderColor: isDark ? '#EF6B5B' : '#C4402F' }
                    : { borderColor: lineColor },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    isBlocked
                      ? { color: isDark ? '#EF6B5B' : '#C4402F', fontWeight: '600' }
                      : { color: colors.secondary },
                  ]}
                >
                  {custStatusCfg.label || 'Tanpa status'}
                </Text>
              </View>

              {cust?.fdCreatedDate && (
                <Text style={[styles.tenureText, { color: colors.secondary }]}>
                  Bergabung sejak {formatCustomerSince(cust.fdCreatedDate)}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={[
              styles.iconBtn,
              {
                borderColor: lineColor,
                backgroundColor: colors.surface,
              },
            ]}
            aria-label="Tutup"
          >
            <X size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tab Strip (.tabs) */}
        <View style={[styles.tabs, { borderBottomColor: lineColor }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync()
              setActiveTab('ringkasan')
            }}
            style={[
              styles.tabBtn,
              activeTab === 'ringkasan' && [styles.tabBtnActive, { borderBottomColor: accentColor }],
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabText,
                {
                  color: activeTab === 'ringkasan' ? colors.primary : colors.secondary,
                  fontWeight: activeTab === 'ringkasan' ? '600' : '500',
                },
              ]}
            >
              Ringkasan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync()
              setActiveTab('finansial')
            }}
            style={[
              styles.tabBtn,
              activeTab === 'finansial' && [styles.tabBtnActive, { borderBottomColor: accentColor }],
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabText,
                {
                  color: activeTab === 'finansial' ? colors.primary : colors.secondary,
                  fontWeight: activeTab === 'finansial' ? '600' : '500',
                },
              ]}
            >
              Finansial
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync()
              setActiveTab('komoditas')
            }}
            style={[
              styles.tabBtn,
              activeTab === 'komoditas' && [styles.tabBtnActive, { borderBottomColor: accentColor }],
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabText,
                {
                  color: activeTab === 'komoditas' ? colors.primary : colors.secondary,
                  fontWeight: activeTab === 'komoditas' ? '600' : '500',
                },
              ]}
            >
              Komoditas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.selectionAsync()
              setActiveTab('alamat')
            }}
            style={[
              styles.tabBtn,
              styles.tabBtnWide,
              activeTab === 'alamat' && [styles.tabBtnActive, { borderBottomColor: accentColor }],
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.tabText,
                {
                  color: activeTab === 'alamat' ? colors.primary : colors.secondary,
                  fontWeight: activeTab === 'alamat' ? '600' : '500',
                },
              ]}
            >
              Alamat ({addrList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scroll Content Body */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* TAB 1: RINGKASAN */}
          {activeTab === 'ringkasan' && (
            <View>
              {/* 2-Col Stats (Contact Person & Sales) */}
              <View style={styles.sectionFirst}>
                <View style={styles.statsGrid}>
                  <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
                    <Text style={[styles.statDt, { color: colors.secondary }]}>Contact person</Text>
                    <Text
                      style={[
                        styles.statDd,
                        { color: cust?.fdContact ? colors.primary : colors.secondary },
                        !cust?.fdContact && styles.none,
                      ]}
                      numberOfLines={1}
                    >
                      {cust?.fdContact?.trim() || '–'}
                    </Text>
                  </View>

                  <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
                    <Text style={[styles.statDt, { color: colors.secondary }]}>Sales penanggung jawab</Text>
                    <Text
                      style={[
                        styles.statDd,
                        { color: cust?.fdSalesNM ? colors.primary : colors.secondary },
                        !cust?.fdSalesNM && styles.none,
                      ]}
                      numberOfLines={1}
                    >
                      {cust?.fdSalesNM?.trim() || '–'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* KV List (Kontak Channels) */}
              <View style={[styles.sectionFirst, { paddingTop: 0 }]}>
                <View style={styles.kvList}>
                  {/* Telepon kantor */}
                  <View style={styles.kvItem}>
                    <Text style={[styles.kvDt, { color: colors.secondary }]}>Telepon kantor</Text>
                    <View style={styles.kvDdCol}>
                      {officePhones.length > 0 ? (
                        officePhones.map((phone, idx) => (
                          <View key={idx} style={[styles.callRow, idx > 0 && { marginTop: 2 }]}>
                            <Text style={[styles.callNum, { color: colors.primary }]}>{phone}</Text>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleCall(phone)}
                              style={styles.callLink}
                              aria-label={`Panggil ${phone}`}
                            >
                              <Text style={[styles.callLinkText, { color: accentColor }]}>Panggil</Text>
                            </TouchableOpacity>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.kvDd, { color: colors.secondary }, styles.none]}>–</Text>
                      )}
                    </View>
                  </View>

                  {/* Handphone / WA */}
                  <View style={[styles.kvItem, { borderTopColor: lineColor }]}>
                    <Text style={[styles.kvDt, { color: colors.secondary }]}>Handphone / WA</Text>
                    <View style={styles.kvDdCol}>
                      {mobilePhones.length > 0 ? (
                        mobilePhones.map((phone, idx) => (
                          <View key={idx} style={[styles.callRow, idx > 0 && { marginTop: 2 }]}>
                            <Text style={[styles.callNum, { color: colors.primary }]}>{phone}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                              <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => handleCall(phone)}
                                style={styles.callLink}
                                aria-label={`Panggil ${phone}`}
                              >
                                <Text style={[styles.callLinkText, { color: accentColor }]}>Panggil</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => handleWhatsApp(phone)}
                                style={styles.callLink}
                                aria-label={`WA ${phone}`}
                              >
                                <Text style={[styles.callLinkText, { color: okColor }]}>WA</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.kvDd, { color: colors.secondary }, styles.none]}>–</Text>
                      )}
                    </View>
                  </View>

                  {/* Email */}
                  <View style={[styles.kvItem, { borderTopColor: lineColor }]}>
                    <Text style={[styles.kvDt, { color: colors.secondary }]}>Email</Text>
                    {cust?.fdEmail?.trim() ? (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleEmail(cust.fdEmail)}
                        style={styles.callLink}
                      >
                        <Text style={[styles.kvDd, { color: accentColor, fontWeight: '600' }]}>
                          {cust.fdEmail.trim()}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={[styles.kvDd, { color: colors.secondary }, styles.none]}>–</Text>
                    )}
                  </View>

                  {/* Kota operasional */}
                  <View style={[styles.kvItem, { borderTopColor: lineColor }]}>
                    <Text style={[styles.kvDt, { color: colors.secondary }]}>Kota operasional</Text>
                    <Text style={[styles.kvDd, { color: colors.primary }]}>
                      {cust?.fdCityName?.trim() || cust?.fdCity?.trim() || '–'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Alamat kantor / utama */}
              <View style={[styles.sectionBlock, { borderTopColor: lineColor }]}>
                <Text style={[styles.sectionHeading, { color: colors.primary }]}>
                  Alamat kantor / utama
                </Text>
                <Text style={[styles.descText, { color: colors.primary }]}>
                  {cust?.fdAddr1
                    ? `${cust.fdAddr1.trim()}${cust.fdAddr2 ? ` ${cust.fdAddr2.trim()}` : ''}`
                    : '–'}
                </Text>
              </View>

              {/* Catatan keterangan */}
              {cust?.fdKeterangan?.trim() ? (
                <View style={[styles.sectionBlock, { borderTopColor: lineColor }]}>
                  <Text style={[styles.sectionHeading, { color: colors.primary }]}>
                    Catatan keterangan
                  </Text>
                  <Text style={[styles.descText, { color: colors.secondary }]}>
                    {cust.fdKeterangan.trim()}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* TAB 2: FINANSIAL */}
          {activeTab === 'finansial' && (
            <View>
              {/* Total: Active Tier */}
              <View style={styles.sectionFirst}>
                <View style={styles.totalRow}>
                  <Text style={[styles.sectionHeading, { color: colors.primary }]}>
                    Tier customer aktif
                  </Text>
                  <View
                    style={[
                      styles.tag,
                      activeTierKey !== 'none'
                        ? { borderColor: okColor }
                        : { borderColor: lineColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        activeTierKey !== 'none'
                          ? { color: okColor, fontWeight: '600' }
                          : { color: colors.secondary },
                      ]}
                    >
                      {activeTierCfg.label || 'Unranked'}
                    </Text>
                  </View>
                </View>

                {/* 2-Col Stats (Omset & Total Inv) */}
                <View style={[styles.statsGrid, { marginTop: 18 }]}>
                  <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
                    <Text style={[styles.statDt, { color: colors.secondary }]}>Omset tahun berjalan</Text>
                    <Text
                      style={[styles.statDd, { color: colors.primary }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatCompactRupiah(annualRevenue)}
                    </Text>
                  </View>

                  <View style={[styles.statCol, { borderLeftColor: lineColor }]}>
                    <Text style={[styles.statDt, { color: colors.secondary }]}>Total invoice</Text>
                    <Text style={[styles.statDd, { color: colors.primary }]}>
                      {totalInvoices}
                      <Text style={[styles.statUnit, { color: colors.secondary }]}> inv</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* Riwayat Finansial & Omzet */}
              <View style={[styles.sectionBlock, { borderTopColor: lineColor }]}>
                <Text style={[styles.sectionHeading, { color: colors.primary }]}>
                  Riwayat finansial & omzet
                </Text>

                {cust?.financialStats && cust.financialStats.length > 0 ? (
                  <View style={[styles.kvList, { marginTop: 12 }]}>
                    {cust.financialStats.map((stat: any, idx: number) => (
                      <View
                        key={idx}
                        style={[
                          styles.kvItem,
                          idx > 0 && { borderTopColor: lineColor },
                        ]}
                      >
                        <View>
                          <Text style={[styles.statYear, { color: colors.primary }]}>
                            Tahun {stat.year}
                          </Text>
                          <Text style={[styles.statSub, { color: colors.secondary }]}>
                            {stat.totalInvoices || 0} invoice
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.statRev, { color: colors.primary }]}>
                            {formatCurrency(stat.totalRevenue)}
                          </Text>
                          <Text style={[styles.statTier, { color: okColor }]}>
                            Tier: {String(stat.tier || 'NONE').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.emptyText, { color: colors.secondary }]}>
                    Belum ada catatan riwayat omzet billing.
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* TAB 3: KOMODITAS */}
          {activeTab === 'komoditas' && (
            <CustomerCommodityTab
              stats={commodityStats}
              isLoading={isCommodityLoading}
            />
          )}

          {/* TAB 4: DAFTAR ALAMAT */}
          {activeTab === 'alamat' && (
            <View style={styles.sectionFirst}>
              {isDetailLoading ? (
                <View style={{ gap: 14, paddingTop: 8 }}>
                  <SkeletonShimmer height={80} />
                  <SkeletonShimmer height={80} />
                </View>
              ) : addrList.length > 0 ? (
                addrList.map((addr: any, idx: number) => {
                  const isAktif = addr.fdAktif === 1 || addr.fdAktif === null || addr.fdAktif === undefined
                  const jenisStr = toSentenceCase(addr.fdJenis)
                  const fallbackAddr = [cust?.fdAddr1, cust?.fdAddr2]
                    .filter(Boolean)
                    .map((s: string) => s.trim())
                    .join(' ')
                  const fullAddr = [addr.fdAddr || addr.fdAddr1, addr.fdCity || addr.fdCityName]
                    .filter(Boolean)
                    .map((s: string) => s.trim())
                    .join(', ') || fallbackAddr || '–'

                  const rawPhoneStr = addr.fdHP?.trim() || addr.fdTelp?.trim() || cust?.fdHP?.trim() || cust?.fdTelp?.trim() || cust?.fdPhone?.trim()
                  const phoneList = parsePhoneList(rawPhoneStr)

                  return (
                    <View
                      key={addr.fdID || String(idx)}
                      style={[
                        styles.addrItem,
                        idx > 0 && [styles.addrItemBorder, { borderTopColor: lineColor }],
                      ]}
                    >
                      {/* Baris 1: Tipe Alamat & Status */}
                      <View style={styles.a1}>
                        <Text style={[styles.ty, { color: colors.primary }]} numberOfLines={1}>
                          {jenisStr}
                        </Text>
                        <View
                          style={[
                            styles.tag,
                            isAktif ? { borderColor: okColor } : { borderColor: lineColor },
                            { flexShrink: 0 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tagText,
                              isAktif
                                ? { color: okColor, fontWeight: '600' }
                                : { color: colors.secondary },
                            ]}
                          >
                            {isAktif ? 'Aktif' : 'Non-Aktif'}
                          </Text>
                        </View>
                      </View>

                      {/* Baris 2: PIC */}
                      <Text style={[styles.a2, { color: colors.secondary }]} numberOfLines={1}>
                        PIC <Text style={[styles.a2Bold, { color: colors.primary }]}>{addr.fdContact?.trim() || cust?.fdContact?.trim() || '–'}</Text>
                      </Text>

                      {/* Baris 3: Alamat Lengkap */}
                      <Text style={[styles.a3, { color: colors.primary }]}>
                        {fullAddr}
                      </Text>

                      {/* Baris 4: Telepon / HP */}
                      <View style={styles.a4}>
                        <Text style={[styles.a4Label, { color: colors.secondary }]}>Telepon / HP</Text>
                        {phoneList.length > 0 ? (
                          <View style={{ marginTop: 2, gap: 2 }}>
                            {phoneList.map((phone, pIdx) => {
                              const isHp = isHpNumber(phone)
                              return (
                                <View key={pIdx} style={styles.addrCallRow}>
                                  <Text
                                    style={[styles.addrCallNum, { color: colors.primary }]}
                                    numberOfLines={1}
                                  >
                                    {phone}
                                  </Text>
                                  <View style={styles.addrCallActions}>
                                    <TouchableOpacity
                                      activeOpacity={0.7}
                                      onPress={() => handleCall(phone)}
                                      style={styles.callLink}
                                      aria-label={`Panggil ${phone}`}
                                    >
                                      <Text style={[styles.callLinkText, { color: accentColor }]}>Panggil</Text>
                                    </TouchableOpacity>
                                    {isHp && (
                                      <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => handleWhatsApp(phone)}
                                        style={styles.callLink}
                                        aria-label={`WA ${phone}`}
                                      >
                                        <Text style={[styles.callLinkText, { color: okColor }]}>WA</Text>
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                </View>
                              )
                            })}
                          </View>
                        ) : (
                          <View style={styles.addrCallRow}>
                            <Text style={[styles.addrCallNum, { color: colors.secondary }]}>–</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )
                })
              ) : (
                <Text style={[styles.emptyText, { color: colors.secondary }]}>
                  Tidak ada daftar alamat tersimpan.
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bar: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  name: {
    fontSize: 19,
    fontWeight: '600',
  },
  t2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderWidth: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 12,
  },
  tenureText: {
    fontSize: 14,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
    paddingHorizontal: 4,
  },
  tabBtnWide: {
    flex: 1.4,
  },
  tabBtnActive: {
    // borderBottomColor set dynamically
  },
  tabText: {
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionFirst: {
    paddingVertical: 22,
  },
  sectionBlock: {
    paddingVertical: 22,
    borderTopWidth: 1,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCol: {
    flex: 1,
    borderLeftWidth: 2,
    paddingLeft: 12,
  },
  statDt: {
    fontSize: 12,
  },
  statDd: {
    fontSize: 20,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '400',
  },
  none: {
    fontWeight: '400',
  },
  kvList: {
    // List container
  },
  kvItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  kvDt: {
    fontSize: 15,
  },
  kvDdCol: {
    alignItems: 'flex-end',
    flex: 1,
  },
  kvDd: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
  },
  callNum: {
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  callLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  callLinkText: {
    fontSize: 15,
    fontWeight: '600',
  },
  descText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  statYear: {
    fontSize: 15,
    fontWeight: '600',
  },
  statSub: {
    fontSize: 13,
    marginTop: 2,
  },
  statRev: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statTier: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14.5,
    marginTop: 6,
  },
  addrItem: {
    paddingVertical: 18,
  },
  addrItemBorder: {
    borderTopWidth: 1,
  },
  a1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  a2: {
    fontSize: 14,
    marginTop: 2,
  },
  a2Bold: {
    fontWeight: '500',
  },
  a3: {
    fontSize: 14.5,
    lineHeight: 21,
    marginTop: 8,
  },
  a4: {
    marginTop: 8,
  },
  a4Label: {
    fontSize: 13,
    marginBottom: 2,
  },
  ty: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  addrCallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    gap: 12,
  },
  addrCallNum: {
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  addrCallActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
  },
})
