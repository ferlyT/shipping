import React from 'react'
import { View, Text } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Tag, User } from 'lucide-react-native'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useThemeStore } from '@/theme/themeStore'
import { formatCurrency, formatDate, displayCustName } from '@/lib/utils'
import { getAgingDays, getAgingBadge } from '../utils/finance.utils'

interface ValidationListItemProps {
  item: any
  onPress: (item: any) => void
}

export function ValidationListItem({ item, onPress }: ValidationListItemProps) {
  const { colors } = useThemeStore()
  const aging = getAgingDays(item.fdInvDate)
  const agingBadge = getAgingBadge(aging)
  const amount = item.totalJumlah ?? item.fdTotalAmount ?? item.fdJumlah1 ?? item.fdJumlah2 ?? 0
  const modaStr = item.fdListType === 1 ? 'Udara' : 'Laut'

  return (
    <Card
      style={{ padding: 12 }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress(item)
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '800', fontVariant: ['tabular-nums'], color: colors.primary }}>
            {item.fdInvNo}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <Badge label={agingBadge.label} variant={agingBadge.variant} />
          <Badge label={modaStr} variant={item.fdListType === 1 ? 'air' : 'sea'} />
        </View>
      </View>

      <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.primary }} numberOfLines={1}>
        {displayCustName(item.customer?.fdCustName || item.fdCustName || item.fdBillTo)}
      </Text>

      {/* Marking & Pembuat Info */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, marginRight: 6 }}>
          <Tag size={12} color={colors.secondary} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }} numberOfLines={1}>
            {[item.fdMarkingCode, item.fdMarkingNo].filter(Boolean).map((s: string) => s.trim()).join(' ') || 'Marking: —'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <User size={11} color={colors.secondary} />
          <Text style={{ fontSize: 11, color: colors.secondary, fontWeight: '500' }}>
            {item.employee?.fdEmpName?.trim() || 'UNASSIGNED'}
          </Text>
        </View>
      </View>

      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
        marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 6,
      }}>
        <Text style={{ fontSize: 11.5, color: colors.secondary }}>
          {formatDate(item.fdInvDate)}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'], color: colors.tertiary }}>
          {formatCurrency(amount)}
        </Text>
      </View>
    </Card>
  )
}
