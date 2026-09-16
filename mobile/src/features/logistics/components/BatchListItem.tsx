import React from 'react'
import { View, Text } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useThemeStore } from '@/theme/themeStore'
import { formatNumber, formatDecimal, formatDate } from '@/lib/utils'
import { getBatchDateDisplay } from '../utils/logistics.utils'

interface BatchListItemProps {
  item: any
  onPress: (item: any) => void
}

export function BatchListItem({ item, onPress }: BatchListItemProps) {
  const { colors } = useThemeStore()
  const dateInfo = getBatchDateDisplay(item)
  const batchNumber = item.fdListType === 1 ? item.fdAWB?.trim() : item.fdContNo?.trim()

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
              {item.fdMarkingCode?.trim()}
            </Text>
            <Badge
              label={item.fdListType === 1 ? 'Udara' : 'Laut'}
              variant={item.fdListType === 1 ? 'air' : 'sea'}
              style={{ flexShrink: 0 }}
            />
          </View>
          {batchNumber ? (
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.tertiary, marginTop: 3 }}>
              {batchNumber}
            </Text>
          ) : null}
          {item.fdKet?.trim() ? (
            <Text style={{ fontSize: 11, marginTop: 2, color: colors.secondary }} numberOfLines={1}>
              {item.fdKet.trim()}
            </Text>
          ) : null}
        </View>
        <Badge label={item.fdBranchCode?.trim() || item.fdBranch?.trim() || 'Pusat'} variant="neutral" style={{ flexShrink: 0 }} />
      </View>

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
        <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.secondary, fontVariant: ['tabular-nums'] }}>
          {formatNumber(item.fdJmlPack)} Pack • {formatDecimal(item.fdJmlBerat, 1)} kg
        </Text>
        {dateInfo ? (
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.tertiary, fontVariant: ['tabular-nums'] }}>
            {dateInfo.label} {formatDate(dateInfo.date)}
          </Text>
        ) : (
          <Text style={{ fontSize: 11.5, color: colors.secondary }}>—</Text>
        )}
      </View>

      <View style={{ marginTop: 6 }}>
        <Text style={{ fontSize: 11, color: colors.tertiary, fontWeight: '600' }}>
          Lihat Data Manifest ➔
        </Text>
      </View>
    </Card>
  )
}
