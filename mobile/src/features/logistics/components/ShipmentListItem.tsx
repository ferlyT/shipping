import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Receipt, Tag, ClipboardList } from 'lucide-react-native'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useThemeStore } from '@/theme/themeStore'
import { formatNumber, formatDecimal, displayCustName } from '@/lib/utils'
import { getShipmentStatusBadge } from '../utils/logistics.utils'

interface ShipmentListItemProps {
  item: any
  onPress: (item: any) => void
  onCreateBap?: (item: any) => void
}

export function ShipmentListItem({ item, onPress, onCreateBap }: ShipmentListItemProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const statusBadge = getShipmentStatusBadge(item.shipmentStatus)

  return (
    <Card
      style={{ padding: 14 }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress(item)
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          {/* Nomor Resi (fdTerima) & List Code */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <Receipt size={13} color={colors.tertiary} />
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] }}>
              {item.fdTerima?.trim() || item.fdListCode?.trim() || '—'}
            </Text>
            {item.fdTerima && item.fdListCode && (
              <Text style={{ fontSize: 11, color: colors.secondary, fontVariant: ['tabular-nums'] }}>
                ({item.fdListCode.trim()})
              </Text>
            )}
          </View>

          {/* Marking Code & No */}
          <View style={{ marginTop: 1, gap: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Tag size={11} color={colors.secondary} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.primary }} numberOfLines={1}>
                {item.fdMarkingCode?.trim() || '—'}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.secondary, fontWeight: '500', paddingLeft: 15 }} numberOfLines={1}>
              {item.fdMarkingNo?.trim() || 'No. Marking: —'}
            </Text>
          </View>
        </View>

        {/* Badges */}
        <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <Badge label={statusBadge.label} variant={statusBadge.variant} />
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            {item.fdBranchCode?.trim() ? (
              <Badge label={item.fdBranchCode.trim()} variant="neutral" />
            ) : null}
            <Badge
              label={item.fdListType === 1 ? 'Udara' : 'Laut'}
              variant={item.fdListType === 1 ? 'air' : 'sea'}
            />
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginVertical: 4 }} numberOfLines={1}>
        {displayCustName(item.fdCustName)}
      </Text>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
        paddingTop: 6,
      }}>
        <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.secondary, fontVariant: ['tabular-nums'], flex: 1 }}>
          {formatNumber(item.fdJmlPack ?? item.fdColy)} {item.fdSatuan || 'Koli'} • {formatDecimal(item.fdJmlBerat ?? item.fdWeight, 1)} kg • {formatDecimal(item.fdM3, 4)} m³
        </Text>

        {onCreateBap && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation()
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onCreateBap(item)
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: colors.tabBarActive,
              backgroundColor: isDark
                ? 'rgba(56, 189, 248, 0.12)'
                : 'rgba(2, 132, 199, 0.08)',
            }}
          >
            <ClipboardList size={11} color={colors.tabBarActive} />
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.tabBarActive }}>
              + BAP
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  )
}
