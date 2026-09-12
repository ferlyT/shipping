import React, { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  Modal,
  ScrollView,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  Phone,
  MessageCircle,
  MapPin,
  UserCheck,
  X,
  ExternalLink,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Card } from '../../src/components/ui/Card'
import { Badge } from '../../src/components/ui/Badge'
import { SearchBar } from '../../src/components/ui/SearchBar'
import { SkeletonShimmer } from '../../src/components/ui/SkeletonShimmer'
import { useThemeStore } from '../../src/theme/themeStore'
import { useToastStore } from '../../src/stores/toastStore'
import apiClient from '../../src/api/client'

export default function MasterDataScreen() {
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()

  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)

  // Fetch Customers
  const {
    data: customersData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['master-customers', search],
    queryFn: async () => {
      const params: any = { limit: 25 }
      if (search.trim()) params.search = search.trim()
      const res = await apiClient.get('/customers', { params })
      return res.data.data || []
    },
  })

  const isDark = mode === 'midnight'

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2' }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.topSection}>
          <Text style={[styles.pageTitle, { color: colors.primary }]}>Direktori Customer</Text>
          <Text style={[styles.pageSub, { color: colors.secondary }]}>
            Master data pelanggan resmi & kontak langsung
          </Text>

          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nama customer, kode, kota, sales..."
            style={{ marginTop: 12 }}
          />
        </View>

        {/* Customer List */}
        <FlatList
          data={customersData}
          keyExtractor={(item) => item.fdCustCode || item.id || Math.random().toString()}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ gap: 10 }}>
                <SkeletonShimmer height={90} />
                <SkeletonShimmer height={90} />
                <SkeletonShimmer height={90} />
              </View>
            ) : (
              <Card style={styles.emptyCard}>
                <Text style={{ color: colors.secondary }}>Tidak ada customer ditemukan</Text>
              </Card>
            )
          }
          renderItem={({ item }) => (
            <Card
              style={styles.custCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                setSelectedCustomer(item)
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.custName, { color: colors.primary }]}>
                    {item.fdCustName}
                  </Text>
                  <Text style={[styles.custCode, { color: colors.secondary }]}>
                    Kode: {item.fdCustCode} • {item.fdCity || 'Indonesia'}
                  </Text>
                </View>
                <Badge label={item.fdTier || 'REGULAR'} variant="neutral" />
              </View>

              <View style={styles.salesRow}>
                <UserCheck size={13} color={colors.secondary} />
                <Text style={[styles.salesText, { color: colors.secondary }]}>
                  Sales: {item.fdSalesNM || '—'}
                </Text>
              </View>

              {/* Quick Communication Actions */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => handleCall(item.fdPhone || item.fdTelp)}
                  style={[
                    styles.contactBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : '#E0F2FE',
                    },
                  ]}
                >
                  <Phone size={13} color="#38BDF8" />
                  <Text style={[styles.contactBtnText, { color: '#38BDF8' }]}>Telepon</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleWhatsApp(item.fdPhone || item.fdTelp)}
                  style={[
                    styles.contactBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#D1FAE5',
                    },
                  ]}
                >
                  <MessageCircle size={13} color="#10B981" />
                  <Text style={[styles.contactBtnText, { color: '#10B981' }]}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />

        {/* Customer Detail Bottom Sheet */}
        <Modal
          visible={Boolean(selectedCustomer)}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedCustomer(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.sheetContent,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={[styles.sheetTitle, { color: colors.primary }]}>PROFIL CUSTOMER</Text>
                  <Text style={[styles.sheetSubtitle, { color: colors.secondary }]}>
                    {selectedCustomer?.fdCustName}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedCustomer(null)}
                  style={[styles.closeBtn, { borderColor: colors.border }]}
                >
                  <X size={18} color={colors.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.secondary }]}>Kode Customer</Text>
                  <Text style={[styles.infoVal, { color: colors.primary }]}>
                    {selectedCustomer?.fdCustCode}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.secondary }]}>Nama Kontak / PIC</Text>
                  <Text style={[styles.infoVal, { color: colors.primary }]}>
                    {selectedCustomer?.fdContact || '—'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.secondary }]}>No. Telepon</Text>
                  <Text style={[styles.infoVal, { color: colors.primary }]}>
                    {selectedCustomer?.fdPhone || selectedCustomer?.fdTelp || '—'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.secondary }]}>Kota / Alamat</Text>
                  <Text style={[styles.infoVal, { color: colors.primary }]}>
                    {selectedCustomer?.fdAddress || selectedCustomer?.fdCity || '—'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.secondary }]}>Sales In-Charge</Text>
                  <Text style={[styles.infoVal, { color: colors.primary }]}>
                    {selectedCustomer?.fdSalesNM || '—'}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  topSection: {
    padding: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  pageSub: {
    fontSize: 12,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 10,
  },
  custCard: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  custName: {
    fontSize: 14,
    fontWeight: '700',
  },
  custCode: {
    fontSize: 11,
    marginTop: 2,
  },
  salesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  salesText: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  contactBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
  },
})
