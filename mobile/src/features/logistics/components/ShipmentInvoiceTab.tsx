import React from 'react'
import { View, Text } from 'react-native'
import { Calendar, FileText, CheckCircle2, Receipt, AlertCircle } from 'lucide-react-native'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useThemeStore } from '@/theme/themeStore'
import { formatCurrency, formatDate, formatDecimal } from '@/lib/utils'

interface ShipmentInvoiceTabProps {
  invoice: any
  fdListCode?: string
}

export function ShipmentInvoiceTab({ invoice, fdListCode }: ShipmentInvoiceTabProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  if (!invoice) return null

  const pStat = invoice.paymentStatus
  const isLunas = pStat === 'LUNAS' || invoice.isPaid

  return (
    <View style={{ gap: 12 }}>
      {/* Invoice Header Card */}
      <Card style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Nomor Invoice
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'], marginTop: 2 }}>
              {invoice.fdInvNo}
            </Text>
          </View>
          <Badge
            label={isLunas ? 'LUNAS' : pStat === 'PARTIAL' ? 'SEBAGIAN' : pStat === 'OVERDUE' ? 'JATUH TEMPO' : 'TERBIT'}
            variant={isLunas ? 'success' : pStat === 'PARTIAL' ? 'warning' : pStat === 'OVERDUE' ? 'danger' : 'info'}
          />
        </View>

        {/* Info Rows */}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Calendar size={13} color={colors.secondary} />
              <Text style={{ fontSize: 12, color: colors.secondary }}>Tgl. Invoice</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{formatDate(invoice.fdInvDate)}</Text>
          </View>

          {invoice.fdGiveDate && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={13} color={colors.secondary} />
                <Text style={{ fontSize: 12, color: colors.secondary }}>Tgl. Terbit</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{formatDate(invoice.fdGiveDate)}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <FileText size={13} color={colors.secondary} />
              <Text style={{ fontSize: 12, color: colors.secondary }}>Ditagihkan Ke</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary, maxWidth: 180 }} numberOfLines={1}>
              {invoice.fdBillTo || invoice.fdCustName || '—'}
            </Text>
          </View>
        </View>
      </Card>

      {/* 3 Metric KPI Cards */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {/* Total Tagihan */}
        <View style={{
          flex: 1, padding: 10, borderRadius: 10, borderWidth: 1,
          borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(37, 99, 235, 0.25)',
          backgroundColor: isDark ? 'rgba(56, 189, 248, 0.06)' : 'rgba(37, 99, 235, 0.05)',
          alignItems: 'center',
        }}>
          <Receipt size={14} color={colors.tertiary} />
          <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase', marginTop: 4 }}>
            Total Tagihan
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'], marginTop: 2 }}
            numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(invoice.totalAmount)}
          </Text>
        </View>

        {/* Sudah Dibayar */}
        <View style={{
          flex: 1, padding: 10, borderRadius: 10, borderWidth: 1,
          borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)',
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.05)',
          alignItems: 'center',
        }}>
          <CheckCircle2 size={14} color="#10B981" />
          <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase', marginTop: 4 }}>
            Terbayar
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981', fontVariant: ['tabular-nums'], marginTop: 2 }}
            numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(invoice.totalPaid)}
          </Text>
        </View>

        {/* Sisa */}
        <View style={{
          flex: 1, padding: 10, borderRadius: 10, borderWidth: 1,
          borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.25)',
          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.06)' : 'rgba(245, 158, 11, 0.05)',
          alignItems: 'center',
        }}>
          <AlertCircle size={14} color="#F59E0B" />
          <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase', marginTop: 4 }}>
            Sisa
          </Text>
          <Text style={{
            fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 2,
            color: invoice.balance <= 0 ? '#10B981' : '#F59E0B',
          }} numberOfLines={1} adjustsFontSizeToFit>
            {invoice.balance <= 0 ? 'LUNAS' : formatCurrency(invoice.balance)}
          </Text>
        </View>
      </View>

      {/* Item Details List */}
      <Card style={{ padding: 14, gap: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Rincian Item Tagihan ({invoice.details?.length || 0})
        </Text>

        {invoice.details && invoice.details.length > 0 ? (
          <View style={{ gap: 8 }}>
            {invoice.details.map((item: any, idx: number) => (
              <View key={item.fdID || idx} style={{
                padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', gap: 4,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, flex: 1, marginRight: 6 }} numberOfLines={1}>
                    {item.fdItemName || `Item #${idx + 1}`}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'] }}>
                    {formatCurrency(item.fdTotal)}
                  </Text>
                </View>
                <Text style={{ fontSize: 10.5, color: colors.secondary, fontVariant: ['tabular-nums'] }}>
                  {formatDecimal(item.fdQty, 2)} unit • No. List: {item.fdListCode || fdListCode || '—'} @ {formatCurrency(item.fdItemPrice)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 11.5, color: colors.secondary, textAlign: 'center', paddingVertical: 12 }}>
            Tidak ada rincian item tagihan.
          </Text>
        )}
      </Card>
    </View>
  )
}
