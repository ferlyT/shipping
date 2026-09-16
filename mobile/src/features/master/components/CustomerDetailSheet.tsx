import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  StyleSheet,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  Phone,
  Mail,
  Building2,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
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
  formatCustomerTenure,
  tierBadgeConfig,
  statusConfig,
} from '../utils/master.utils'
import apiClient from '@/api/client'

type DetailTabType = 'info' | 'finansial' | 'pengiriman' | 'penagihan' | 'alamat'

interface CustomerDetailSheetProps {
  customer: any | null
  onClose: () => void
}

export function CustomerDetailSheet({ customer, onClose }: CustomerDetailSheetProps) {
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()
  const isDark = mode === 'midnight'

  const [activeDetailTab, setActiveDetailTab] = useState<DetailTabType>('info')

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

  const detailTabs = useMemo(() => [
    { label: 'Ringkasan', value: 'info' as const },
    { label: 'Finansial', value: 'finansial' as const },
    { label: 'Pengiriman', value: 'pengiriman' as const },
    { label: 'Penagihan', value: 'penagihan' as const },
    {
      label: cust?.addresses && cust.addresses.length > 0
        ? `Daftar Alamat (${cust.addresses.length})`
        : 'Daftar Alamat',
      value: 'alamat' as const,
    },
  ], [cust?.addresses])

  const handleCall = (phone?: string) => {
    if (!phone) {
      showToast('Nomor telepon tidak tersedia', 'warning')
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Linking.openURL(`tel:${phone}`)
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

  const copyCustomerCode = (code?: string) => {
    if (!code) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    showToast(`Kode Customer ${code} disalin`, 'success')
  }

  if (!customer) return null

  const activeTierKey = String(cust?.currentTier || cust?.tier || 'none').toLowerCase()
  const activeTierCfg = tierBadgeConfig[activeTierKey] || tierBadgeConfig.none
  const custStatusCfg = statusConfig[(cust?.fdBlocked || 0) as keyof typeof statusConfig] || statusConfig[0]

  return (
    <Modal
      visible={Boolean(customer)}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.sheetContent,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              height: '86%',
            },
          ]}
        >
          {/* Modal Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                <Text style={[styles.sheetTitle, { color: colors.primary }]} numberOfLines={1}>
                  {displayCustName(cust?.fdCustName, 'PROFIL CUSTOMER')}
                </Text>
                {activeTierKey !== 'none' && (
                  <View style={[styles.tierBadge, { backgroundColor: activeTierCfg.bg, borderColor: activeTierCfg.border }]}>
                    <View style={[styles.tierDot, { backgroundColor: activeTierCfg.dot }]} />
                    <Text style={[styles.tierText, { color: activeTierCfg.text }]}>{activeTierCfg.label}</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {/* Customer Code with copy */}
                <TouchableOpacity
                  onPress={() => copyCustomerCode(cust?.fdCustCode)}
                  style={[styles.codeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', borderColor: colors.border }]}
                >
                  <Text style={[styles.codeText, { color: colors.primary }]}>{cust?.fdCustCode}</Text>
                </TouchableOpacity>

                {/* Status Badge */}
                <View style={[styles.statusBadge, { borderColor: custStatusCfg.border, backgroundColor: custStatusCfg.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: custStatusCfg.dot }]} />
                  <Text style={[styles.statusText, { color: custStatusCfg.text }]}>{custStatusCfg.label}</Text>
                </View>

                {/* Tenure */}
                {formatCustomerTenure(cust?.fdCreatedDate) && (
                  <Text style={{ fontSize: 11, color: colors.secondary }}>
                    Bergabung sejak {formatCustomerSince(cust?.fdCreatedDate)}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { borderColor: colors.border }]}
            >
              <X size={18} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* Segmented Tabs (5 Tabs Sama dengan Frontend Web) */}
          <SegmentedControl
            options={detailTabs}
            selectedValue={activeDetailTab}
            onValueChange={(val: any) => setActiveDetailTab(val)}
            style={{ marginHorizontal: 16, marginTop: 10, marginBottom: 6 }}
          />

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={true}>
            {/* TAB 1: RINGKASAN & KONTAK */}
            {activeDetailTab === 'info' && (
              <View style={{ gap: 12 }}>
                {/* Top 2 Cards: Contact Person & Sales */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Card style={{ flex: 1, padding: 12, gap: 4 }}>
                    <Text style={[styles.infoCardLabel, { color: colors.secondary }]}>Contact Person</Text>
                    <Text style={[styles.infoCardVal, { color: colors.primary }]} numberOfLines={1}>
                      {cust?.fdContact || '—'}
                    </Text>
                  </Card>

                  <Card style={{ flex: 1, padding: 12, gap: 4 }}>
                    <Text style={[styles.infoCardLabel, { color: colors.secondary }]}>Sales In-Charge</Text>
                    <Text style={[styles.infoCardVal, { color: colors.primary }]} numberOfLines={1}>
                      {cust?.fdSalesNM || '—'}
                    </Text>
                  </Card>
                </View>

                {/* Contact Channels */}
                <Card style={{ padding: 14, gap: 10 }}>
                  <View style={styles.infoRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Phone size={13} color={colors.secondary} />
                      <Text style={[styles.infoLabel, { color: colors.secondary }]}>Telepon Kantor</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.infoVal, { color: colors.primary }]}>{cust?.fdTelp || cust?.fdPhone || '—'}</Text>
                      {(cust?.fdTelp || cust?.fdPhone) && (
                        <TouchableOpacity onPress={() => handleCall(cust?.fdTelp || cust?.fdPhone)}>
                          <Text style={{ fontSize: 11, color: '#38BDF8', fontWeight: '700' }}>Panggil</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Phone size={13} color={colors.secondary} />
                      <Text style={[styles.infoLabel, { color: colors.secondary }]}>Handphone / WA</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.infoVal, { color: colors.primary }]}>{cust?.fdHP || '—'}</Text>
                      {cust?.fdHP && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity onPress={() => handleCall(cust?.fdHP)}>
                            <Text style={{ fontSize: 11, color: '#38BDF8', fontWeight: '700' }}>Panggil</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleWhatsApp(cust?.fdHP)}>
                            <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700' }}>WA</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Mail size={13} color={colors.secondary} />
                      <Text style={[styles.infoLabel, { color: colors.secondary }]}>Email</Text>
                    </View>
                    <Text style={[styles.infoVal, { color: colors.primary }]}>{cust?.fdEmail || '—'}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Building2 size={13} color={colors.secondary} />
                      <Text style={[styles.infoLabel, { color: colors.secondary }]}>Kota Operasional</Text>
                    </View>
                    <Text style={[styles.infoVal, { color: colors.primary }]}>{cust?.fdCityName || cust?.fdCity || '—'}</Text>
                  </View>
                </Card>

                {/* Alamat Kantor / Utama */}
                <Card style={{ padding: 14, gap: 6 }}>
                  <Text style={[styles.infoLabel, { color: colors.secondary }]}>Alamat Kantor / Utama</Text>
                  <Text style={{ fontSize: 13, color: colors.primary, lineHeight: 20, fontWeight: '500' }}>
                    {cust?.fdAddr1 ? `${cust.fdAddr1.trim()}${cust.fdAddr2 ? ` ${cust.fdAddr2.trim()}` : ''}` : '—'}
                  </Text>
                </Card>

                {/* Catatan Keterangan */}
                {cust?.fdKeterangan ? (
                  <Card style={{ padding: 14, gap: 6 }}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Catatan Keterangan</Text>
                    <Text style={{ fontSize: 12.5, color: colors.secondary, fontStyle: 'italic', lineHeight: 18 }}>
                      {cust.fdKeterangan}
                    </Text>
                  </Card>
                ) : null}
              </View>
            )}

            {/* TAB 2: TIER & FINANSIAL */}
            {activeDetailTab === 'finansial' && (
              <View style={{ gap: 12 }}>
                {/* Active Tier Card */}
                <Card style={{ padding: 14, gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.infoCardLabel, { color: colors.secondary }]}>Customer Tier Aktif</Text>
                    <View style={[styles.tierBadge, { backgroundColor: activeTierCfg.bg, borderColor: activeTierCfg.border }]}>
                      <View style={[styles.tierDot, { backgroundColor: activeTierCfg.dot }]} />
                      <Text style={[styles.tierText, { color: activeTierCfg.text, fontSize: 10 }]}>{activeTierCfg.label}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 11, color: colors.secondary }}>Omset Tahunan Berjalan</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>
                        {formatCurrency(cust?.annualRevenue || cust?.financialStats?.[0]?.totalRevenue || 0)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 11, color: colors.secondary }}>Total Invoice</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.tertiary }}>
                        {cust?.totalInvoices || cust?.financialStats?.[0]?.totalInvoices || 0} Inv
                      </Text>
                    </View>
                  </View>

                  {/* Progress to Next Tier */}
                  {cust?.financialStats?.[0]?.nextTier && cust?.financialStats?.[0]?.nextTier !== 'none' ? (
                    <View style={{ gap: 4, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: colors.secondary }}>
                          Target ke Tier {String(cust.financialStats[0].nextTier).toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                          {cust.financialStats[0].progressToNextTier}%
                        </Text>
                      </View>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', overflow: 'hidden' }}>
                        <View
                          style={{
                            height: '100%',
                            width: `${Math.min(100, cust.financialStats[0].progressToNextTier)}%`,
                            backgroundColor: colors.tertiary,
                          }}
                        />
                      </View>
                      {cust.financialStats[0].remainingForNextTier > 0 && (
                        <Text style={{ fontSize: 10.5, color: colors.secondary }}>
                          Kurang {formatCompactRupiah(cust.financialStats[0].remainingForNextTier)} lagi untuk naik tier
                        </Text>
                      )}
                    </View>
                  ) : null}
                </Card>

                {/* Historical Financial Billing */}
                <Card style={{ padding: 14, gap: 8 }}>
                  <Text style={[styles.infoCardLabel, { color: colors.secondary }]}>Riwayat Finansial & Omzet</Text>
                  {cust?.financialStats && cust.financialStats.length > 0 ? (
                    cust.financialStats.map((stat: any, idx: number) => (
                      <View
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 8,
                          borderBottomWidth: idx < cust.financialStats.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                            Tahun {stat.year}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.secondary }}>
                            {stat.totalInvoices || 0} Invoice
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.tertiary }}>
                            {formatCurrency(stat.totalRevenue)}
                          </Text>
                          <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#10B981' }}>
                            Tier: {String(stat.tier || 'NONE').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 12, color: colors.secondary, fontStyle: 'italic', paddingVertical: 4 }}>
                      Belum ada catatan riwayat omzet billing
                    </Text>
                  )}
                </Card>
              </View>
            )}

            {/* TAB 3: INFO PENGIRIMAN (ALAMAT KIRIM) */}
            {activeDetailTab === 'pengiriman' && (
              <View style={{ gap: 12 }}>
                <Card style={{ padding: 14, gap: 10 }}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Nama Penerima</Text>
                    <Text style={[styles.infoVal, { color: colors.primary, fontWeight: '700' }]}>
                      {cust?.fdNamaPengiriman || '—'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Nomor HP Pengiriman</Text>
                    <Text style={[styles.infoVal, { color: colors.primary, fontVariant: ['tabular-nums'] }]}>
                      {cust?.fdHpPengiriman || '—'}
                    </Text>
                  </View>

                  {cust?.fdHpPengiriman ? (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                      <TouchableOpacity
                        onPress={() => handleCall(cust.fdHpPengiriman)}
                        style={[
                          styles.contactBtn,
                          {
                            borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : '#BAE6FD',
                            backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : '#F0F9FF',
                          },
                        ]}
                      >
                        <Text style={[styles.contactBtnText, { color: '#38BDF8' }]}>Telepon Penerima</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleWhatsApp(cust.fdHpPengiriman)}
                        style={[
                          styles.contactBtn,
                          {
                            borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5',
                          },
                        ]}
                      >
                        <Text style={[styles.contactBtnText, { color: '#10B981' }]}>WhatsApp Penerima</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Kota Pengiriman</Text>
                    <Text style={[styles.infoVal, { color: colors.primary }]}>
                      {cust?.fdKotaPengiriman || '—'}
                    </Text>
                  </View>
                </Card>

                {/* Alamat Lengkap Pengiriman Box */}
                <Card style={{ padding: 14, gap: 6 }}>
                  <Text style={[styles.infoLabel, { color: colors.secondary }]}>Alamat Lengkap Pengiriman</Text>
                  <View
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: colors.primary, lineHeight: 20, fontWeight: '500' }}>
                      {cust?.fdAlamatPengiriman || '—'}
                    </Text>
                  </View>
                </Card>

                {/* Instruksi Khusus */}
                {cust?.fdKetPengiriman ? (
                  <View
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FEF3C7',
                      gap: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: isDark ? '#FBBF24' : '#D97706',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Instruksi Khusus Pengiriman
                    </Text>
                    <Text style={{ fontSize: 12.5, color: colors.primary, fontWeight: '500', lineHeight: 18 }}>
                      {cust.fdKetPengiriman}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* TAB 4: INFO PENAGIHAN (Detail Penagihan Sesuai Master) */}
            {activeDetailTab === 'penagihan' && (
              <View style={{ gap: 12 }}>
                <Card style={{ padding: 14, gap: 10 }}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Nama</Text>
                    <Text style={[styles.infoVal, { color: colors.primary, fontWeight: '700' }]}>
                      {cust?.penagihanDetail?.nama || cust?.fdBillTo || cust?.fdCustName || '—'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Nama PIC</Text>
                    <Text style={[styles.infoVal, { color: colors.primary, fontWeight: '600' }]}>
                      {cust?.penagihanDetail?.pic || cust?.fdContact || '—'}
                    </Text>
                  </View>

                  <View style={{ gap: 4 }}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Alamat</Text>
                    <View
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <Text style={{ fontSize: 12.5, color: colors.primary, lineHeight: 18, fontWeight: '500' }}>
                        {cust?.penagihanDetail?.alamat || cust?.fdBillAddr1 || cust?.fdAddr1 || '—'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Kota</Text>
                    <Text style={[styles.infoVal, { color: colors.primary }]}>
                      {cust?.penagihanDetail?.kota || cust?.fdBillCityName || cust?.fdCityName || '—'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>HP</Text>
                    {cust?.penagihanDetail?.hp || cust?.fdHpPenagihan || cust?.fdHP ? (
                      <TouchableOpacity onPress={() => handleCall(cust?.penagihanDetail?.hp || cust?.fdHpPenagihan || cust?.fdHP)}>
                        <Text style={[styles.infoVal, { color: colors.tertiary, fontWeight: '700' }]}>
                          {cust?.penagihanDetail?.hp || cust?.fdHpPenagihan || cust?.fdHP}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={[styles.infoVal, { color: colors.secondary }]}>—</Text>
                    )}
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Email</Text>
                    <Text style={[styles.infoVal, { color: colors.primary }]}>
                      {cust?.penagihanDetail?.email && cust.penagihanDetail.email !== '0'
                        ? cust.penagihanDetail.email
                        : cust?.fdEmailPenagihan && cust.fdEmailPenagihan !== '0'
                        ? cust.fdEmailPenagihan
                        : '—'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Finance</Text>
                    <Text style={[styles.infoVal, { color: colors.primary, fontWeight: '600' }]}>
                      {[cust?.penagihanDetail?.finCode, cust?.penagihanDetail?.finName].filter(Boolean).join(' ') || cust?.penagihanDetail?.finCode || '—'}
                    </Text>
                  </View>

                  {/* Notif Penagihan */}
                  <View style={{ gap: 6, marginTop: 2 }}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Notif</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(['HP', 'Email', 'Kolektor'] as const).map((notifOption, idx) => {
                        const currentNotif = cust?.penagihanDetail?.notif ?? cust?.fdNotifPenagihan ?? 0
                        const isSelected = currentNotif === idx
                        return (
                          <View
                            key={notifOption}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                              paddingVertical: 4,
                              paddingHorizontal: 10,
                              borderRadius: 20,
                              borderWidth: 1,
                              borderColor: isSelected ? colors.tertiary : colors.border,
                              backgroundColor: isSelected
                                ? isDark ? 'rgba(56, 189, 248, 0.12)' : '#E0F2FE'
                                : 'transparent',
                            }}
                          >
                            <View
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                borderWidth: 1.5,
                                borderColor: isSelected ? colors.tertiary : colors.secondary,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isSelected && (
                                <View
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: colors.tertiary,
                                  }}
                                />
                              )}
                            </View>
                            <Text
                              style={{
                                fontSize: 11.5,
                                fontWeight: isSelected ? '700' : '500',
                                color: isSelected ? colors.tertiary : colors.secondary,
                              }}
                            >
                              {notifOption}
                            </Text>
                          </View>
                        )
                      })}
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Kolektor</Text>
                    <Text style={[styles.infoVal, { color: colors.primary, fontWeight: '600' }]}>
                      {[cust?.penagihanDetail?.kolektorCode, cust?.penagihanDetail?.kolektorName].filter(Boolean).join(' ') || cust?.penagihanDetail?.kolektorCode || '—'}
                    </Text>
                  </View>

                  {/* Keterangan */}
                  <View style={{ gap: 4, marginTop: 2 }}>
                    <Text style={[styles.infoLabel, { color: colors.secondary }]}>Keterangan</Text>
                    <View
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      }}
                    >
                      <Text style={{ fontSize: 12, color: colors.primary, lineHeight: 18, fontStyle: (cust?.penagihanDetail?.keterangan || cust?.fdKeteranganPenagihan) ? 'normal' : 'italic' }}>
                        {cust?.penagihanDetail?.keterangan || cust?.fdKeteranganPenagihan || 'Tidak ada keterangan khusus'}
                      </Text>
                    </View>
                  </View>

                  {/* Optional extra fields */}
                  {cust?.fdNPWP ? (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.secondary }]}>NPWP</Text>
                      <Text style={[styles.infoVal, { color: colors.primary, fontVariant: ['tabular-nums'] }]}>
                        {cust.fdNPWP}
                      </Text>
                    </View>
                  ) : null}

                  {cust?.fdTerm ? (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.secondary }]}>TOP (Term of Payment)</Text>
                      <Text style={[styles.infoVal, { color: colors.primary, fontWeight: '700' }]}>
                        {cust.fdTerm} Hari
                      </Text>
                    </View>
                  ) : null}

                  {cust?.fdCreditLimit && Number(cust.fdCreditLimit) > 0 ? (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.secondary }]}>Batas Kredit</Text>
                      <Text style={[styles.infoVal, { color: colors.tertiary, fontWeight: '800' }]}>
                        {formatCurrency(cust.fdCreditLimit)}
                      </Text>
                    </View>
                  ) : null}
                </Card>
              </View>
            )}

            {/* TAB 5: DAFTAR ALAMAT */}
            {activeDetailTab === 'alamat' && (
              <View style={{ gap: 10 }}>
                {isDetailLoading ? (
                  <View style={{ gap: 8 }}>
                    <SkeletonShimmer height={75} />
                    <SkeletonShimmer height={75} />
                  </View>
                ) : cust?.addresses && cust.addresses.length > 0 ? (
                  cust.addresses.map((addr: any, idx: number) => {
                    const jenisStr = (addr.fdJenis || '').trim().toUpperCase()
                    const variant: 'info' | 'success' | 'warning' | 'neutral' =
                      jenisStr === 'PENGIRIMAN'
                        ? 'success'
                        : jenisStr === 'PENAGIHAN'
                        ? 'warning'
                        : jenisStr === 'PENGHUBUNG'
                        ? 'info'
                        : 'neutral'
                    const isAktif = addr.fdAktif === 1 || addr.fdAktif === null || addr.fdAktif === undefined

                    return (
                      <Card key={addr.fdID || String(idx)} style={{ padding: 13, gap: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Badge label={jenisStr || 'ALAMAT'} variant={variant} />
                          <Badge
                            label={isAktif ? 'Aktif' : 'Non-Aktif'}
                            variant={isAktif ? 'success' : 'neutral'}
                          />
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 11.5, color: colors.secondary, fontWeight: '600' }}>PIC :</Text>
                          <Text style={{ fontSize: 12.5, color: colors.primary, fontWeight: '700' }}>
                            {addr.fdContact?.trim() || '—'}
                          </Text>
                        </View>

                        <View style={{ gap: 2 }}>
                          <Text style={{ fontSize: 11.5, color: colors.secondary, fontWeight: '600' }}>Alamat :</Text>
                          <Text style={{ fontSize: 12.5, color: colors.primary, fontWeight: '500', lineHeight: 18 }}>
                            {[addr.fdAddr || addr.fdAddr1, addr.fdCity || addr.fdCityName].filter(Boolean).map((s: string) => s.trim()).join(', ') || '—'}
                          </Text>
                        </View>

                        {(addr.fdHP || addr.fdTelp) && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text style={{ fontSize: 11.5, color: colors.secondary, fontWeight: '600' }}>Telepon / HP :</Text>
                            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                              {addr.fdHP?.trim() && (
                                <TouchableOpacity onPress={() => handleCall(addr.fdHP.trim())}>
                                  <Text style={{ fontSize: 12, color: colors.tertiary, fontWeight: '700' }}>
                                    {addr.fdHP.trim()}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              {addr.fdTelp?.trim() && (
                                <TouchableOpacity onPress={() => handleCall(addr.fdTelp.trim())}>
                                  <Text style={{ fontSize: 12, color: '#38BDF8', fontWeight: '600' }}>
                                    {addr.fdTelp.trim()}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        )}
                      </Card>
                    )
                  })
                ) : (
                  <Card style={styles.emptyCard}>
                    <Text style={{ color: colors.secondary, fontSize: 12 }}>Tidak ada daftar alamat tersimpan</Text>
                  </Card>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  codeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  codeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  tierDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  tierText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  infoCardLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoCardVal: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  contactBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
  },
})
