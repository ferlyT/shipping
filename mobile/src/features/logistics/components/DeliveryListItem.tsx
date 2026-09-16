import React from 'react'
import { View, Text } from 'react-native'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useThemeStore } from '@/theme/themeStore'
import { formatDate } from '@/lib/utils'
import { getDeliveryOrderStatus } from '../utils/logistics.utils'

interface DeliveryListItemProps {
  item: any
}

export function DeliveryListItem({ item }: DeliveryListItemProps) {
  const { colors } = useThemeStore()
  const status = getDeliveryOrderStatus(item)

  return (
    <Card style={{ padding: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }} numberOfLines={1}>
            {item.fdSJNo || item.fdDeliveryNo}
          </Text>
        </View>
        <Badge label={status.label} variant={status.variant} style={{ flexShrink: 0 }} />
      </View>

      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginVertical: 4 }}>
        {item.fdCustNameSJ || item.fdCustName || 'Customer'}
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
        <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.secondary, fontVariant: ['tabular-nums'] }}>
          Supir: {item.fdSupir || item.fdDriverName || '—'} ({item.fdCarID || item.fdPoliceNo || '—'})
        </Text>
        <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.secondary, fontVariant: ['tabular-nums'] }}>
          {item.fdEstimasi ? `Estimasi: ${formatDate(item.fdEstimasi)}` : formatDate(item.fdSJDate || item.fdDeliveryDate)}
        </Text>
      </View>

      {item.fdGiveDate && (
        <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.tertiary, marginTop: 4, fontVariant: ['tabular-nums'] }}>
          Serah Kantor: {formatDate(item.fdGiveDate)}
        </Text>
      )}
    </Card>
  )
}
