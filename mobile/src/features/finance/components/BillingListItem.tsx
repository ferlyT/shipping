import React from 'react'
import { View, Text } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Tag } from 'lucide-react-native'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useThemeStore } from '@/theme/themeStore'
import { formatCurrency, formatDate, displayCustName } from '@/lib/utils'

interface BillingListItemProps {
  item: any
  onPress: (item: any) => void
}

export function BillingListItem({ item, onPress }: BillingListItemProps) {
  const { colors } = useThemeStore()
  const amount = item.totalJumlah ?? item.fdTotalAmount ?? item.fdJumlah1 ?? 0

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
        <Badge
          label={item.fdGive === 1 ? 'Issued' : 'Draft'}
          variant={item.fdGive === 1 ? 'success' : 'neutral'}
          style={{ flexShrink: 0 }}
        />
      </View>

      <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.primary }} numberOfLines={1}>
        {displayCustName(item.customer?.fdCustName || item.fdCustName || item.fdBillTo)}
      </Text>

      {(item.fdMarkingCode || item.fdMarkingNo) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Tag size={12} color={colors.secondary} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }} numberOfLines={1}>
            {item.fdMarkingCode?.trim() || '—'}
          </Text>
          {item.fdMarkingNo && (
            <Text style={{ fontSize: 11.5, color: colors.secondary, fontWeight: '500' }}>
              (No. {item.fdMarkingNo.trim()})
            </Text>
          )}
        </View>
      )}

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
