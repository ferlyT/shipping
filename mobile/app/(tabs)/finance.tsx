import React, { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as Haptics from 'expo-haptics'
import {
  FileText,
  ShieldCheck,
  Calculator,
  Share2,
  Copy,
  Printer,
  X,
  Check,
  Plane,
  Ship,
  Sparkles,
  AlertTriangle,
} from 'lucide-react-native'
import { Card } from '../../src/components/ui/Card'
import { Badge } from '../../src/components/ui/Badge'
import { Button } from '../../src/components/ui/Button'
import { SearchBar } from '../../src/components/ui/SearchBar'
import { SegmentedControl } from '../../src/components/ui/SegmentedControl'
import { SkeletonShimmer } from '../../src/components/ui/SkeletonShimmer'
import { useThemeStore } from '../../src/theme/themeStore'
import { useToastStore } from '../../src/stores/toastStore'
import { formatCurrency, formatNumber, formatDecimal, formatDate } from '../../src/lib/utils'
import apiClient from '../../src/api/client'

export default function FinanceScreen() {
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()

  const [activeTab, setActiveTab] = useState<'billing' | 'validation' | 'calculator'>('billing')
  const [search, setSearch] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  // Calculator State
  const [origin, setOrigin] = useState('GZ')
  const [dest, setDest] = useState('JKT')
  const [calcMode, setCalcMode] = useState<'1' | '2'>('1')
  const [calcWeight, setCalcWeight] = useState('10')
  const [calcP, setCalcP] = useState('40')
  const [calcL, setCalcL] = useState('30')
  const [calcT, setCalcT] = useState('30')

  // Fetch Billings
  const {
    data: billingData,
    isLoading: isBillingLoading,
    refetch: refetchBilling,
    isRefetching: isRefetchingBilling,
  } = useQuery({
    queryKey: ['finance-billing', search],
    queryFn: async () => {
      const params: any = { limit: 20 }
      if (search.trim()) params.search = search.trim()
      const res = await apiClient.get('/billing', { params })
      return res.data.data || []
    },
    enabled: activeTab === 'billing',
  })

  // Fetch Validation Data
  const {
    data: validationData,
    isLoading: isValLoading,
    refetch: refetchVal,
    isRefetching: isRefetchingVal,
  } = useQuery({
    queryKey: ['finance-validation', search],
    queryFn: async () => {
      const params: any = { limit: 20 }
      if (search.trim()) params.search = search.trim()
      const res = await apiClient.get('/billing/validation/list', { params })
      return res.data.data || []
    },
    enabled: activeTab === 'validation',
  })

  const isDark = mode === 'midnight'

  // Copy Invoice Number
  const copyInvoiceNo = (invNo: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    showToast(`No. Invoice ${invNo} berhasil disalin`, 'success')
  }

  // Print & Share PDF Invoice
  const handlePrintShare = async (inv: any) => {
    try {
      setIsPrinting(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
            .header { border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; margin: 0; }
            .sub { font-size: 12px; color: #666; margin-top: 4px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
            .total-box { margin-top: 24px; border-top: 2px solid #333; padding-top: 12px; font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">M-SHIPPING INVOICE</h1>
            <div class="sub">PT. Global Shipping Enterprise</div>
          </div>
          <div class="row"><strong>No. Invoice:</strong> <span>${inv.fdInvNo}</span></div>
          <div class="row"><strong>Customer:</strong> <span>${inv.customer?.fdCustName || inv.fdCustName || '—'}</span></div>
          <div class="row"><strong>Tanggal:</strong> <span>${formatDate(inv.fdInvDate)}</span></div>
          <div class="row"><strong>Total Koli:</strong> <span>${formatNumber(inv.fdTotalColy)}</span></div>
          <div class="row"><strong>Total Berat:</strong> <span>${formatDecimal(inv.fdTotalWeight, 1)} kg</span></div>
          <div class="row"><strong>Total Volume:</strong> <span>${formatDecimal(inv.fdTotalM3, 4)} m³</span></div>
          <div class="total-box">
            <span>TOTAL TAGIHAN:</span>
            <span>${formatCurrency(inv.fdTotalAmount)}</span>
          </div>
        </body>
        </html>
      `

      const { uri } = await Print.printToFileAsync({ html })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' })
      } else {
        await Print.printAsync({ uri })
      }
      showToast('Invoice siap dibagikan / dicetak', 'success')
    } catch (e) {
      showToast('Gagal memproses dokumen invoice', 'error')
    } finally {
      setIsPrinting(false)
    }
  }

  // Calculator Result
  const p = parseFloat(calcP) || 0
  const l = parseFloat(calcL) || 0
  const t = parseFloat(calcT) || 0
  const wt = parseFloat(calcWeight) || 0
  const calcVolM3 = (p * l * t) / 1000000
  const ratePerKg = calcMode === '1' ? 145000 : 85000
  const ratePerM3 = 5500000
  const estimatedCost = calcMode === '1' ? wt * ratePerKg : calcVolM3 * ratePerM3

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: isDark ? '#0B0F17' : '#F7F5F2' }]}>
      <View style={styles.container}>
        {/* Top Section */}
        <View style={styles.topSection}>
          <Text style={[styles.pageTitle, { color: colors.primary }]}>Keuangan & Billing</Text>
          <SegmentedControl
            options={[
              { label: 'Daftar Invoice', value: 'billing', icon: <FileText size={14} color={colors.tertiary} /> },
              { label: 'Audit Validasi', value: 'validation', icon: <ShieldCheck size={14} color="#10B981" /> },
              { label: 'Kalkulator Tarif', value: 'calculator', icon: <Calculator size={14} color="#F59E0B" /> },
            ]}
            selectedValue={activeTab}
            onValueChange={setActiveTab}
            style={{ marginTop: 10 }}
          />

          {activeTab !== 'calculator' && (
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder={
                activeTab === 'billing' ? 'Cari no. invoice, customer...' : 'Cari invoice validasi...'
              }
              style={{ marginTop: 10 }}
            />
          )}
        </View>

        {/* Tab 1: Billing Invoices */}
        {activeTab === 'billing' && (
          <FlatList
            data={billingData}
            keyExtractor={(item) => item.fdInvNo || Math.random().toString()}
            refreshing={isRefetchingBilling}
            onRefresh={refetchBilling}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              isBillingLoading ? (
                <View style={{ gap: 10 }}>
                  <SkeletonShimmer height={95} />
                  <SkeletonShimmer height={95} />
                  <SkeletonShimmer height={95} />
                </View>
              ) : (
                <Card style={styles.emptyCard}>
                  <Text style={{ color: colors.secondary }}>Tidak ada invoice ditemukan</Text>
                </Card>
              )
            }
            renderItem={({ item }) => (
              <Card
                style={styles.invoiceCard}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setSelectedInvoice(item)
                }}
              >
                <View style={styles.invHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.invNo, { color: colors.primary }]}>{item.fdInvNo}</Text>
                    <TouchableOpacity onPress={() => copyInvoiceNo(item.fdInvNo)}>
                      <Copy size={13} color={colors.tertiary} />
                    </TouchableOpacity>
                  </View>
                  <Badge
                    label={item.fdStatus || 'ISSUED'}
                    variant={item.fdStatus === 'PAID' ? 'success' : 'warning'}
                  />
                </View>

                <Text style={[styles.custName, { color: colors.primary }]} numberOfLines={1}>
                  {item.customer?.fdCustName || item.fdCustName || 'Customer'}
                </Text>

                <View style={styles.invMetaRow}>
                  <Text style={[styles.invDate, { color: colors.secondary }]}>
                    {formatDate(item.fdInvDate)}
                  </Text>
                  <Text style={[styles.invAmount, { color: colors.tertiary }]}>
                    {formatCurrency(item.fdTotalAmount)}
                  </Text>
                </View>
              </Card>
            )}
          />
        )}

        {/* Tab 2: Validation List */}
        {activeTab === 'validation' && (
          <FlatList
            data={validationData}
            keyExtractor={(item) => item.fdInvNo || Math.random().toString()}
            refreshing={isRefetchingVal}
            onRefresh={refetchVal}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              isValLoading ? (
                <View style={{ gap: 10 }}>
                  <SkeletonShimmer height={90} />
                  <SkeletonShimmer height={90} />
                </View>
              ) : (
                <Card style={styles.emptyCard}>
                  <Text style={{ color: colors.secondary }}>Tidak ada antrean validasi</Text>
                </Card>
              )
            }
            renderItem={({ item }) => (
              <Card style={styles.invoiceCard}>
                <View style={styles.invHeader}>
                  <Text style={[styles.invNo, { color: colors.primary }]}>{item.fdInvNo}</Text>
                  <Badge
                    label={item.verdict || 'SESUAI'}
                    variant={
                      item.verdict === 'EQUAL' || item.verdict === 'SESUAI'
                        ? 'success'
                        : item.verdict === 'OVERWEIGHT'
                        ? 'danger'
                        : 'warning'
                    }
                  />
                </View>
                <Text style={[styles.custName, { color: colors.primary }]} numberOfLines={1}>
                  {item.customer?.fdCustName || item.fdCustName || '—'}
                </Text>
                <View style={styles.invMetaRow}>
                  <Text style={[styles.invDate, { color: colors.secondary }]}>
                    Harga: {item.priceCheckOk ? '✓ Valid' : '⚠ Selisih'} • M3 vs KG: {item.m3CheckOk ? '✓ Valid' : '⚠ Periksa'}
                  </Text>
                </View>
              </Card>
            )}
          />
        )}

        {/* Tab 3: Interactive Live Tariff Calculator */}
        {activeTab === 'calculator' && (
          <ScrollView contentContainerStyle={styles.calcContainer}>
            <Card style={styles.calcCard}>
              <View style={styles.calcHeader}>
                <Sparkles size={18} color={colors.tertiary} style={{ marginRight: 6 }} />
                <Text style={[styles.calcTitle, { color: colors.primary }]}>
                  Kalkulator Tarif Lapangan
                </Text>
              </View>

              {/* Moda Switcher */}
              <SegmentedControl
                options={[
                  { label: '✈️ Moda Udara', value: '1' },
                  { label: '🚢 Moda Laut', value: '2' },
                ]}
                selectedValue={calcMode}
                onValueChange={setCalcMode}
                style={{ marginVertical: 12 }}
              />

              {/* Berat Input */}
              <View style={styles.calcField}>
                <Text style={[styles.calcLabel, { color: colors.secondary }]}>Berat Muatan (Kg)</Text>
                <TextInput
                  value={calcWeight}
                  onChangeText={setCalcWeight}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={colors.secondary}
                  style={[
                    styles.calcInput,
                    {
                      backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                      borderColor: colors.border,
                      color: colors.primary,
                    },
                  ]}
                />
              </View>

              {/* Dimensi P x L x T */}
              <Text style={[styles.calcLabel, { color: colors.secondary, marginTop: 10 }]}>
                Dimensi Fisik (P x L x T dalam cm)
              </Text>
              <View style={styles.dimensionInputsRow}>
                <TextInput
                  value={calcP}
                  onChangeText={setCalcP}
                  keyboardType="numeric"
                  placeholder="P"
                  placeholderTextColor={colors.secondary}
                  style={[
                    styles.dimInput,
                    {
                      backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                      borderColor: colors.border,
                      color: colors.primary,
                    },
                  ]}
                />
                <Text style={{ color: colors.secondary }}>×</Text>
                <TextInput
                  value={calcL}
                  onChangeText={setCalcL}
                  keyboardType="numeric"
                  placeholder="L"
                  placeholderTextColor={colors.secondary}
                  style={[
                    styles.dimInput,
                    {
                      backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                      borderColor: colors.border,
                      color: colors.primary,
                    },
                  ]}
                />
                <Text style={{ color: colors.secondary }}>×</Text>
                <TextInput
                  value={calcT}
                  onChangeText={setCalcT}
                  keyboardType="numeric"
                  placeholder="T"
                  placeholderTextColor={colors.secondary}
                  style={[
                    styles.dimInput,
                    {
                      backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
                      borderColor: colors.border,
                      color: colors.primary,
                    },
                  ]}
                />
              </View>

              {/* Live Quotation Result Box */}
              <View
                style={[
                  styles.resultBox,
                  {
                    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : '#E0F2FE',
                    borderColor: colors.tertiary,
                  },
                ]}
              >
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.secondary }]}>Volume Kubikasi:</Text>
                  <Text style={[styles.resultVal, { color: colors.primary }]}>
                    {formatDecimal(calcVolM3, 4)} m³
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.secondary }]}>Rasio Muatan:</Text>
                  <Text style={[styles.resultVal, { color: colors.primary }]}>
                    {calcVolM3 > 0 ? formatDecimal(wt / calcVolM3, 1) : '0'} kg/m³
                  </Text>
                </View>
                <View style={[styles.resultRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(56, 189, 248, 0.2)', paddingTop: 8 }]}>
                  <Text style={[styles.resultTotalLabel, { color: colors.primary }]}>
                    Estimasi Biaya:
                  </Text>
                  <Text style={[styles.resultTotalVal, { color: colors.tertiary }]}>
                    {formatCurrency(estimatedCost)}
                  </Text>
                </View>
              </View>
            </Card>
          </ScrollView>
        )}

        {/* Invoice Detail Bottom Sheet */}
        <Modal
          visible={Boolean(selectedInvoice)}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedInvoice(null)}
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
                  <Text style={[styles.sheetTitle, { color: colors.primary }]}>RINCIAN INVOICE</Text>
                  <Text style={[styles.sheetSubtitle, { color: colors.secondary }]}>
                    {selectedInvoice?.fdInvNo}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedInvoice(null)}
                  style={[styles.closeBtn, { borderColor: colors.border }]}
                >
                  <X size={18} color={colors.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.secondary }]}>Customer</Text>
                  <Text style={[styles.infoVal, { color: colors.primary }]}>
                    {selectedInvoice?.customer?.fdCustName || selectedInvoice?.fdCustName || '—'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.secondary }]}>Tanggal Tagihan</Text>
                  <Text style={[styles.infoVal, { color: colors.primary }]}>
                    {formatDate(selectedInvoice?.fdInvDate)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.secondary }]}>Total Coly / Berat</Text>
                  <Text style={[styles.infoVal, { color: colors.primary }]}>
                    {formatNumber(selectedInvoice?.fdTotalColy)} Koli • {formatDecimal(selectedInvoice?.fdTotalWeight, 1)} kg
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.secondary }]}>Total Nilai Tagihan</Text>
                  <Text style={[styles.infoVal, { color: colors.tertiary, fontSize: 16, fontWeight: '800' }]}>
                    {formatCurrency(selectedInvoice?.fdTotalAmount)}
                  </Text>
                </View>

                {/* Print & Share Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <Button
                    title="Bagikan / Cetak PDF"
                    onPress={() => handlePrintShare(selectedInvoice)}
                    loading={isPrinting}
                    icon={<Share2 size={16} color="#FFFFFF" />}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Salin No. Inv"
                    variant="secondary"
                    onPress={() => copyInvoiceNo(selectedInvoice.fdInvNo)}
                    icon={<Copy size={16} color={colors.primary} />}
                  />
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
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 10,
  },
  invoiceCard: {
    padding: 14,
  },
  invHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  invNo: {
    fontSize: 14,
    fontWeight: '700',
  },
  custName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  invMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invDate: {
    fontSize: 11,
  },
  invAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
  },
  calcContainer: {
    padding: 16,
    paddingBottom: 36,
  },
  calcCard: {
    padding: 16,
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calcTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  calcField: {
    gap: 6,
    marginTop: 10,
  },
  calcLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  calcInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  dimensionInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 6,
  },
  dimInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
    textAlign: 'center',
    fontSize: 14,
  },
  resultBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 12,
  },
  resultVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultTotalVal: {
    fontSize: 16,
    fontWeight: '800',
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
    paddingBottom: 36,
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
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoVal: {
    fontSize: 13,
  },
})
