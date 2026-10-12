import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import {
  X,
  Tag,
  Share2,
  Copy,
  Check,
  User,
  Calendar,
  CreditCard,
  Package,
  Clock,
  ShieldAlert,
  MapPin,
  Printer,
  Paperclip,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SkeletonShimmer } from '@/components/ui/SkeletonShimmer'
import { useThemeStore } from '@/theme/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { useTranslation } from '@/hooks/useTranslation'
import { useBiometricGuard } from '@/hooks/useBiometricGuard'
import apiClient from '@/api/client'
import {
  formatCurrency,
  formatWithCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatDecimal,
  displayCustName,
  copyToClipboard,
} from '@/lib/utils'
import { statusConfig } from '@/features/master/utils/master.utils'
import { canViewConsignee } from '@/lib/permissions'
import { formatQtyDecimal, isVfcItem, isMktCustomer } from '../utils/finance.utils'
import { printInvoicePdf, shareInvoicePdf } from '../utils/billing-pdf.utils'
import { BillingAttachmentSheet } from './BillingAttachmentSheet'
import { useBillingAttachments } from '../hooks/useBillingAttachments'

interface InvoiceDetailSheetProps {
  selectedInvoice: any | null
  onClose: () => void
  onCopyInvoiceNo: (invNo: string) => void
}

export function InvoiceDetailSheet({
  selectedInvoice,
  onClose,
  onCopyInvoiceNo,
}: InvoiceDetailSheetProps) {
  const { user } = useAuthStore()
  const { colors, mode } = useThemeStore()
  const { t } = useTranslation()
  const isDark = mode === 'midnight'
  const { showToast } = useToastStore()
  const [isCopiedMarking, setIsCopiedMarking] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [isAttachmentSheetVisible, setIsAttachmentSheetVisible] = useState(false)
  const { guardedAction } = useBiometricGuard()
  const userCanViewConsignee = canViewConsignee(user)

  const invNo = (selectedInvoice?.fdInvNo || '').trim()
  const { data: attachments = [] } = useBillingAttachments(invNo, Boolean(selectedInvoice))

  // Fetch full billing detail (tbBilling + tbBillingDetail + cashier + employee + customer)
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['billingDetail', invNo],
    queryFn: async () => {
      if (!invNo) return null
      const res = await apiClient.get(`/billing/${encodeURIComponent(invNo)}`)
      return res.data?.data
    },
    enabled: Boolean(invNo),
    staleTime: 60000,
  })

  const invoice = detailData || selectedInvoice
  const custName = displayCustName(
    invoice?.customer?.fdCustName || invoice?.fdCustName || invoice?.fdCustCode || invoice?.fdBillTo
  )

  const details = [...(invoice?.details || [])].sort((a: any, b: any) =>
    String(a.fdID || '').localeCompare(String(b.fdID || ''))
  )

  const unitTotals = details.reduce<Record<string, number>>((acc, row) => {
    const nameUpper = (row.fdItemName || '').toUpperCase()
    if (isVfcItem(row.fdItemName)) {
      acc['VOLUME FREIGHT CHARGES'] = (acc['VOLUME FREIGHT CHARGES'] || 0) + Number(row.fdQty || 0)
      return acc
    }
    const unit = row.fdListCode?.trim()
    if (!unit) return acc
    if (unit.toUpperCase() === 'M3' && !nameUpper.includes('PARCEL')) return acc
    acc[unit] = (acc[unit] || 0) + Number(row.fdQty || 0)
    return acc
  }, {})

  const isPaid = (invoice?.fdStatusKasir || '').toUpperCase() === 'LUNAS' || invoice?.fdStatusKasir === '1'
  const isPartial = (invoice?.fdStatusKasir || '').toUpperCase() === 'SEBAGIAN'

  const blockedCode = Number(invoice?.customer?.fdStatus || invoice?.customer?.fdBlocked || invoice?.fdCustStatus || 0)
  const custStatus = statusConfig[blockedCode as keyof typeof statusConfig] || statusConfig[0]
  const isMkt = isMktCustomer(invoice?.customer, invoice?.customer?.fdSalesNM)

  const [isCopiedInv, setIsCopiedInv] = useState(false)

  const handleCopyInvoiceNo = async () => {
    const targetInvNo = (invoice?.fdInvNo || invNo || '').trim()
    if (!targetInvNo) return
    await copyToClipboard(targetInvNo)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setIsCopiedInv(true)
    showToast(`No. Invoice ${targetInvNo} berhasil disalin`, 'success')
    onCopyInvoiceNo?.(targetInvNo)
    setTimeout(() => setIsCopiedInv(false), 2000)
  }

  const handleCopyMarkingInfo = async () => {
    const markingCode = invoice?.fdMarkingCode?.trim() || '—'
    const markingNo = invoice?.fdMarkingNo?.trim() || '—'
    const resiList = invoice?.resiSummary?.resiList?.join(', ') || ''
    const textToCopy = `Customer: ${custName}\nMarking Code: ${markingCode}\nMarking No: ${markingNo}${resiList ? `\nResi: ${resiList}` : ''}`

    await copyToClipboard(textToCopy)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setIsCopiedMarking(true)
    showToast('Data marking & resi disalin', 'info')
    setTimeout(() => setIsCopiedMarking(false), 2000)
  }

  const handlePrint = async () => {
    if (!invoice) return
    setIsPrinting(true)
    try {
      await guardedAction(async () => {
        showToast(t('finance.generatingPdf', 'Menyiapkan dokumen PDF...'), 'info')
        await printInvoicePdf(invoice, user)
        showToast(t('finance.pdfPrinted', 'Dokumen siap dicetak!'), 'success')
      }, t('finance.biometricPromptPrint', 'Verifikasi untuk mencetak invoice'))
    } catch (err: any) {
      showToast(err?.message || 'Gagal mencetak dokumen', 'error')
    } finally {
      setIsPrinting(false)
    }
  }

  const handleShare = async () => {
    if (!invoice) return
    setIsSharing(true)
    try {
      await guardedAction(async () => {
        showToast(t('finance.generatingPdf', 'Menyiapkan dokumen PDF...'), 'info')
        await shareInvoicePdf(invoice, user)
        showToast(t('finance.pdfShared', 'PDF berhasil dibagikan!'), 'success')
      }, t('finance.biometricPromptShare', 'Verifikasi untuk membagikan invoice'))
    } catch (err: any) {
      showToast(err?.message || 'Gagal membagikan PDF', 'error')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Modal
      visible={Boolean(selectedInvoice)}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Sheet Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.title, { color: colors.primary }]}>
                  {t('finance.invoice', 'Invoice:')} {invoice?.fdInvNo || '—'}
                </Text>
                {invoice?.fdInvNo && (
                  <TouchableOpacity
                    onPress={handleCopyInvoiceNo}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[styles.miniHeaderCopyBtn, { borderColor: colors.border }]}
                    accessibilityLabel="Salin No. Invoice"
                  >
                    {isCopiedInv ? (
                      <Check size={13} color={colors.success} />
                    ) : (
                      <Copy size={13} color={colors.secondary} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <Text
                style={[styles.subtitle, { color: colors.secondary }]}
                numberOfLines={1}
              >
                {t('finance.detailTitle', 'Detail Tagihan')} ({custName})
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { borderColor: colors.border }]}
            >
              <X size={18} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading && !detailData ? (
              <View style={{ gap: 12 }}>
                <SkeletonShimmer height={90} />
                <SkeletonShimmer height={90} />
                <SkeletonShimmer height={120} />
                <SkeletonShimmer height={150} />
              </View>
            ) : (
              <>
                {/* 4 CARDS GRID (Sesuai DetailPage.tsx) */}
                <View style={styles.cardsGrid}>
                  {/* Card 1: Pelanggan (Customer) */}
                  <Card style={[styles.kpiCard, { borderColor: colors.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={[styles.cardLabel, { color: colors.secondary }]}>
                        {t('finance.customer', 'Pelanggan')}
                      </Text>
                      {invoice?.fdCustCode && (
                        <Text style={[styles.monoCode, { color: colors.tertiary }]}>
                          {invoice.fdCustCode.trim()}
                        </Text>
                      )}
                    </View>

                    <View style={styles.customerNameRow}>
                      <Text style={[styles.customerName, { color: colors.primary }]}>
                        {custName}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.customBadge,
                            {
                              backgroundColor: custStatus.bg,
                              borderColor: custStatus.border,
                            },
                          ]}
                        >
                          <Text style={[styles.customBadgeText, { color: custStatus.text }]}>
                            {custStatus.label}
                          </Text>
                        </View>
                        {isMkt && (
                          <Badge
                            label={invoice?.customer?.fdBroker === 1 ? 'BROKER (MKT)' : 'MKT'}
                            variant="warning"
                          />
                        )}
                      </View>
                    </View>

                    {invoice?.customer?.fdSalesNM?.trim() ? (
                      <Text style={[styles.cardMetaText, { color: colors.secondary }]}>
                        Sales:{' '}
                        <Text style={{ fontWeight: '700', color: colors.primary }}>
                          {invoice.customer.fdSalesNM.trim()}
                        </Text>
                      </Text>
                    ) : null}

                    {invoice?.customer?.fdBillAddr1 &&
                    invoice.customer.fdBillAddr1.trim() !== '0' ? (
                      <View style={[styles.addrRow, { borderTopColor: colors.border }]}>
                        <MapPin size={11} color={colors.secondary} style={{ marginTop: 2 }} />
                        <Text
                          style={[styles.addrText, { color: colors.secondary }]}
                          numberOfLines={2}
                        >
                          {invoice.customer.fdBillAddr1.trim()}
                        </Text>
                      </View>
                    ) : null}
                  </Card>

                  {/* Card 2: Status & Waktu Invoice */}
                  <Card style={[styles.kpiCard, { borderColor: colors.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={[styles.cardLabel, { color: colors.secondary }]}>
                        {t('finance.timeAuthor', 'Waktu & Pembuat')}
                      </Text>
                      <Calendar size={13} color={colors.secondary} />
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.secondary }]}>
                        {t('finance.invoiceDate', 'Tanggal Invoice:')}
                      </Text>
                      <Text style={[styles.infoValue, { color: colors.primary }]}>
                        {formatDate(invoice?.fdInvDate)}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.secondary }]}>
                        {t('finance.issuedDate', 'Tanggal Terbit:')}
                      </Text>
                      {invoice?.fdGiveDate ? (
                        <Text style={[styles.infoValue, { color: colors.primary }]}>
                          {formatDateTime(invoice.fdGiveDate)}
                        </Text>
                      ) : (
                        <Badge label="DRAFT" variant="warning" />
                      )}
                    </View>

                    {invoice?.giveEmployee && (
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.secondary }]}>
                          {t('finance.givenBy', 'Diserahkan:')}
                        </Text>
                        <Text
                          style={[styles.infoValue, { color: colors.success }]}
                          numberOfLines={1}
                        >
                          {invoice.giveEmployee.fdEmpName || invoice.giveEmployee.fdEmpId}
                        </Text>
                      </View>
                    )}

                    <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, marginTop: 4 }]}>
                      <Text style={[styles.infoLabel, { color: colors.secondary }]}>
                        {t('finance.author', 'Pembuat Bill:')}
                      </Text>
                      <Text style={[styles.infoValueBold, { color: colors.primary }]}>
                        {invoice?.employee?.fdEmpName || invoice?.fdEmpCode || '—'}
                      </Text>
                    </View>
                  </Card>

                  {/* Card 3: Status Pembayaran (Kasir) */}
                  <Card style={[styles.kpiCard, { borderColor: colors.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={[styles.cardLabel, { color: colors.secondary }]}>
                        {t('finance.paymentStatus', 'Status Pembayaran')}
                      </Text>
                      {isPaid ? (
                        <Badge label={t('finance.paid', '✓ LUNAS')} variant="success" />
                      ) : isPartial ? (
                        <Badge label={t('finance.partial', 'SEBAGIAN')} variant="warning" />
                      ) : (
                        <Badge label={t('finance.unpaid', 'BELUM BAYAR')} variant="neutral" />
                      )}
                    </View>

                    {isPaid || isPartial ? (
                      <View style={{ gap: 5, marginTop: 2 }}>
                        <View style={styles.infoRow}>
                          <Text style={[styles.infoLabel, { color: colors.secondary }]}>
                            {t('finance.cashierNo', 'No. Kasir:')}
                          </Text>
                          <Text style={[styles.monoCode, { color: colors.primary }]}>
                            {invoice?.cashierID || '—'}
                          </Text>
                        </View>
                        {invoice?.cashierDate && (
                          <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.secondary }]}>
                              {t('finance.cashierDate', 'Tgl Bayar:')}
                            </Text>
                            <Text style={[styles.infoValue, { color: colors.primary }]}>
                              {formatDate(invoice.cashierDate)}
                            </Text>
                          </View>
                        )}
                        {invoice?.totalPaid != null && invoice.totalPaid > 0 && (
                          <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }]}>
                            <Text style={[styles.infoLabel, { color: colors.secondary }]}>
                              {t('finance.totalPaid', 'Total Dibayar:')}
                            </Text>
                            <Text style={[styles.infoValueBold, { color: colors.success }]}>
                              {formatWithCurrency(invoice.totalPaid, invoice.fdCurr1 || 'Rp.')}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <Text style={[styles.emptyNote, { color: colors.secondary }]}>
                        {t('finance.noPayment', 'Belum ada catatan pembayaran kasir untuk invoice ini.')}
                      </Text>
                    )}
                  </Card>

                  {/* Card 4: Marking & Komoditi */}
                  <Card style={[styles.kpiCard, { borderColor: colors.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.cardLabel, { color: colors.secondary }]}>
                          {t('finance.marking', 'Marking')}
                        </Text>
                        {invoice?.resiSummary?.isPartial && (
                          <Badge label="PARSIAL" variant="warning" />
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {userCanViewConsignee && invoice?.fdConsignee ? (
                          <Badge label={invoice.fdConsignee.trim()} variant="info" />
                        ) : null}
                        <TouchableOpacity
                          onPress={handleCopyMarkingInfo}
                          style={[styles.miniActionBtn, { borderColor: colors.border }]}
                        >
                          {isCopiedMarking ? (
                            <Check size={12} color={colors.success} />
                          ) : (
                            <Copy size={12} color={colors.secondary} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={[styles.markingCodeText, { color: colors.primary }]}>
                      {invoice?.fdMarkingCode || '—'}
                    </Text>
                    {invoice?.fdMarkingNo ? (
                      <Text style={[styles.markingNoText, { color: colors.secondary }]}>
                        {invoice.fdMarkingNo}
                      </Text>
                    ) : null}

                    {userCanViewConsignee && (invoice?.fdConsignee || invoice?.consignee) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Badge label="CONSIGNEE" variant="info" />
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.primary }} numberOfLines={1}>
                          {(invoice.fdConsignee || invoice.consignee).trim()}
                        </Text>
                      </View>
                    ) : null}

                    {/* Nomor Resi */}
                    <View style={styles.resiContainer}>
                      <Text style={[styles.infoLabel, { color: colors.secondary }]}>
                        {t('finance.receiptNo', 'No. Resi:')}
                      </Text>
                      <View style={styles.resiChipList}>
                        {invoice?.resiSummary?.resiList &&
                        invoice.resiSummary.resiList.length > 0 ? (
                          invoice.resiSummary.resiList.map((resi: string) => (
                            <View
                              key={resi}
                              style={[
                                styles.resiChip,
                                {
                                  borderColor: colors.border,
                                  backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(0,0,0,0.04)',
                                },
                              ]}
                            >
                              <Text style={[styles.resiChipText, { color: colors.primary }]}>
                                {resi}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={[styles.emptyResiText, { color: colors.secondary }]}>
                            {t('finance.noReceipt', '(Tidak ada resi)')}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Komoditi & Tgl Agent */}
                    {(invoice?.fdComodity || invoice?.fdTypeComodityName || invoice?.fdTglAgent) && (
                      <View style={[styles.commodityBox, { borderTopColor: colors.border }]}>
                        {(invoice?.fdComodity || invoice?.fdTypeComodityName) && (
                          <View style={{ gap: 3 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.infoLabel, { color: colors.secondary }]}>
                                {t('finance.commodity', 'Komoditi:')}
                              </Text>
                              {invoice?.fdTypeComodityName ? (
                                <Badge label={invoice.fdTypeComodityName} variant="neutral" />
                              ) : null}
                            </View>
                            {invoice?.fdComodity ? (
                              <Text style={[styles.commodityText, { color: colors.primary }]}>
                                {invoice.fdComodity.trim()}
                              </Text>
                            ) : null}
                          </View>
                        )}
                        {invoice?.fdTglAgent && (
                          <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.secondary }]}>
                              {t('finance.agentDate', 'Tgl Agent:')}
                            </Text>
                            <Text style={[styles.monoCode, { color: colors.primary }]}>
                              {formatDate(invoice.fdTglAgent)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </Card>
                </View>

                {/* RINCIAN ITEM (Sesuai DetailPage.tsx) */}
                <Card style={[styles.itemDetailsCard, { borderColor: colors.border }]}>
                  <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                      {t('finance.itemDetails', 'Rincian Item')}
                    </Text>
                    <Text style={[styles.sectionBadgeText, { color: colors.secondary }]}>
                      {details.length} {t('finance.items', 'Item')}
                    </Text>
                  </View>

                  {details.length > 0 ? (
                    <View style={styles.itemsList}>
                      {details.map((detail: any, idx: number) => (
                        <View
                          key={detail.fdID || String(idx)}
                          style={[
                            styles.itemRow,
                            idx < details.length - 1 && {
                              borderBottomWidth: 1,
                              borderBottomColor: colors.border,
                            },
                          ]}
                        >
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text
                              style={[styles.itemName, { color: colors.primary }]}
                              numberOfLines={2}
                            >
                              {detail.fdItemName || '—'}
                            </Text>
                            <Text style={[styles.itemSub, { color: colors.secondary }]}>
                              {formatQtyDecimal(detail.fdQty, detail.fdListCode, detail.fdItemName)}{' '}
                              {detail.fdListCode || ''} ×{' '}
                              {formatWithCurrency(detail.fdItemPrice, detail.fdCurr)}
                            </Text>
                          </View>
                          <Text style={[styles.itemAmount, { color: colors.primary }]}>
                            {formatWithCurrency(detail.fdTotal, detail.fdCurr)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.noItemsBox}>
                      <Text style={{ color: colors.secondary, fontSize: 12 }}>
                        {t('finance.noItems', 'Tidak ada rincian item untuk invoice ini.')}
                      </Text>
                    </View>
                  )}

                  {/* FOOTER RINGKASAN & TOTAL */}
                  <View style={[styles.footerSummary, { borderTopColor: colors.border }]}>
                    {Object.entries(unitTotals).map(([unit, qty]) => {
                      const isVfc = unit === 'VOLUME FREIGHT CHARGES'
                      return (
                        <View key={unit} style={styles.unitTotalRow}>
                          <Text style={[styles.unitTotalLabel, { color: colors.secondary }]}>
                            {isVfc ? 'TOTAL VOLUME FREIGHT CHARGES' : `TOTAL ${unit}`}
                          </Text>
                          <Text style={[styles.unitTotalValue, { color: colors.primary }]}>
                            {formatQtyDecimal(qty, isVfc ? 'KG' : unit)} {isVfc ? 'KG (VFC)' : unit}
                          </Text>
                        </View>
                      )
                    })}

                    <View
                      style={[
                        styles.grandTotalRow,
                        {
                          borderTopColor: colors.border,
                          borderTopWidth: Object.keys(unitTotals).length > 0 ? 1 : 0,
                        },
                      ]}
                    >
                      <Text style={[styles.grandTotalLabel, { color: colors.secondary }]}>
                        {t('finance.totalAmount', 'TOTAL TAGIHAN')}
                      </Text>
                      <Text style={[styles.grandTotalValue, { color: colors.tertiary }]}>
                        {Number(invoice?.fdJumlah2 || 0) > 0
                          ? formatWithCurrency(invoice.fdJumlah2, invoice.fdCurr1)
                          : formatCurrency(invoice?.fdJumlah1 ?? invoice?.totalJumlah ?? 0)}
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* ACTION BUTTONS */}
                <View style={styles.actionButtons}>
                  <View style={styles.actionRow}>
                    <Button
                      title={t('finance.printPdf', 'Cetak PDF')}
                      variant="primary"
                      icon={<Printer size={15} color="#FFFFFF" />}
                      loading={isPrinting}
                      disabled={isPrinting || isSharing}
                      onPress={handlePrint}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={t('finance.sharePdf', 'Bagikan PDF')}
                      variant="outline"
                      icon={<Share2 size={15} color={colors.tertiary} />}
                      loading={isSharing}
                      disabled={isPrinting || isSharing}
                      onPress={handleShare}
                      style={{ flex: 1 }}
                    />
                  </View>
                  <Button
                    title={`Lampiran Dokumen ${attachments.length > 0 ? `(${attachments.length})` : ''}`}
                    variant="outline"
                    icon={<Paperclip size={15} color={colors.tertiary} />}
                    onPress={() => setIsAttachmentSheetVisible(true)}
                    style={{ width: '100%' }}
                  />
                  <Button
                    title={isCopiedInv ? 'Nomor Invoice Tersalin!' : t('finance.copyInvoiceNo', 'Salin Nomor Invoice')}
                    variant="secondary"
                    icon={isCopiedInv ? <Check size={15} color={colors.success} /> : <Copy size={15} color={colors.primary} />}
                    onPress={handleCopyInvoiceNo}
                    style={{ width: '100%' }}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Sheet Lampiran Invoice */}
      <BillingAttachmentSheet
        invNo={invNo}
        visible={isAttachmentSheetVisible}
        onClose={() => setIsAttachmentSheetVisible(false)}
        custName={custName}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '90%',
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniHeaderCopyBtn: {
    padding: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 12,
  },
  cardsGrid: {
    gap: 10,
  },
  kpiCard: {
    padding: 12,
    gap: 7,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  customerNameRow: {
    gap: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  customBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardMetaText: {
    fontSize: 11.5,
  },
  addrRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 2,
  },
  addrText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11.5,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoValueBold: {
    fontSize: 12,
    fontWeight: '700',
  },
  monoCode: {
    fontFamily: 'monospace',
    fontSize: 11.5,
    fontWeight: '700',
  },
  emptyNote: {
    fontSize: 11.5,
    fontStyle: 'italic',
    paddingVertical: 2,
  },
  markingCodeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  markingNoText: {
    fontSize: 11.5,
  },
  resiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  resiChipList: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flex: 1,
  },
  resiChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  resiChipText: {
    fontSize: 10.5,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  emptyResiText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  commodityBox: {
    borderTopWidth: 1,
    paddingTop: 6,
    gap: 4,
  },
  commodityText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    flexWrap: 'wrap',
  },
  miniActionBtn: {
    padding: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  itemDetailsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemsList: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  itemName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  noItemsBox: {
    padding: 24,
    alignItems: 'center',
  },
  footerSummary: {
    borderTopWidth: 1,
    padding: 12,
    gap: 6,
  },
  unitTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitTotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unitTotalValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 8,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  actionButtons: {
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
})
