import React from 'react'
import { View, Text } from 'react-native'
import { Package, Weight, Box, Hash, Barcode, Tag, Calendar, Truck, FileText } from 'lucide-react-native'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useThemeStore } from '@/theme/themeStore'
import { formatNumber, formatDecimal, formatDate, cleanFoxProString } from '@/lib/utils'

interface ShipmentInfoTabProps {
  activeShipment: any
}

export function ShipmentInfoTab({ activeShipment }: ShipmentInfoTabProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  return (
    <View style={{ gap: 12 }}>
      {/* 3 Metric Cards */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {/* Total Koli */}
        <View style={{
          flex: 1, padding: 10, borderRadius: 10, borderWidth: 1,
          borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.25)',
          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.06)' : 'rgba(245, 158, 11, 0.05)',
          alignItems: 'center',
        }}>
          <Package size={14} color="#F59E0B" />
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase', marginTop: 4 }}>
            Total Koli
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'], marginTop: 2 }}
            numberOfLines={1} adjustsFontSizeToFit>
            {formatNumber(activeShipment?.fdJmlPack ?? activeShipment?.fdColy ?? 0)}
          </Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary, marginTop: 1 }}>
            {activeShipment?.fdSatuan?.trim() || 'Colly'}
          </Text>
        </View>

        {/* Total Berat */}
        <View style={{
          flex: 1, padding: 10, borderRadius: 10, borderWidth: 1,
          borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(37, 99, 235, 0.25)',
          backgroundColor: isDark ? 'rgba(56, 189, 248, 0.06)' : 'rgba(37, 99, 235, 0.05)',
          alignItems: 'center',
        }}>
          <Weight size={14} color={isDark ? '#38BDF8' : '#2563EB'} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase', marginTop: 4 }}>
            Total Berat
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'], marginTop: 2 }}
            numberOfLines={1} adjustsFontSizeToFit>
            {formatDecimal(activeShipment?.fdJmlBerat ?? activeShipment?.fdWeight ?? 0, 1)}
          </Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary, marginTop: 1 }}>kg</Text>
        </View>

        {/* Total Volume */}
        <View style={{
          flex: 1, padding: 10, borderRadius: 10, borderWidth: 1,
          borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(147, 51, 234, 0.25)',
          backgroundColor: isDark ? 'rgba(168, 85, 247, 0.06)' : 'rgba(147, 51, 234, 0.05)',
          alignItems: 'center',
        }}>
          <Box size={14} color="#A855F7" />
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase', marginTop: 4 }}>
            Total Volume
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'], marginTop: 2 }}
            numberOfLines={1} adjustsFontSizeToFit>
            {formatDecimal(activeShipment?.fdM3 ?? 0, 4)}
          </Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary, marginTop: 1 }}>m³</Text>
        </View>
      </View>

      {/* Primary Key-Values Panel */}
      <Card style={{ padding: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Hash size={13} color={colors.secondary} />
            <Text style={{ fontSize: 12, color: colors.secondary }}>No. Resi (Terima)</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.tertiary }}>{activeShipment?.fdTerima || '—'}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Barcode size={13} color={colors.secondary} />
            <Text style={{ fontSize: 12, color: colors.secondary }}>Tracking No.</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{activeShipment?.fdLocalTrackingNo || '—'}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Tag size={13} color={colors.secondary} />
            <Text style={{ fontSize: 12, color: colors.secondary }}>Marking & No.</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
            {[activeShipment?.fdMarkingCode, activeShipment?.fdMarkingNo].filter(Boolean).join(' ') || '—'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Calendar size={13} color={colors.secondary} />
            <Text style={{ fontSize: 12, color: colors.secondary }}>Tanggal Agent</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{formatDate(activeShipment?.fdTglAgent)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Truck size={13} color={colors.secondary} />
            <Text style={{ fontSize: 12, color: colors.secondary }}>Moda / Cabang</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
            {activeShipment?.fdListType === 1 ? 'Udara' : 'Laut'} • {activeShipment?.fdBranch || activeShipment?.fdBranchCode || 'Pusat'}
          </Text>
        </View>
      </Card>

      {/* Commodity Panel */}
      {(activeShipment?.fdComodity || activeShipment?.fdComodityName) && (
        <Card style={{ padding: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Package size={13} color={colors.secondary} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase' }}>
                Komoditas
              </Text>
            </View>
            {activeShipment?.fdComodityName ? (
              <Badge label={activeShipment.fdComodityName} variant="info" />
            ) : null}
          </View>
          <Text style={{ fontSize: 12.5, color: colors.primary, fontWeight: '600', lineHeight: 18 }}>
            {cleanFoxProString(activeShipment?.fdComodity) || 'Tidak ada nama komoditas spesifik'}
          </Text>
        </Card>
      )}

      {/* Notes / Description Panel */}
      {activeShipment?.fdDesc && (
        <Card style={{ padding: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <FileText size={13} color={colors.secondary} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase' }}>
              Keterangan
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.secondary, lineHeight: 18 }}>
            {activeShipment.fdDesc}
          </Text>
        </Card>
      )}
    </View>
  )
}
