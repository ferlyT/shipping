import React from 'react'
import { View, Text } from 'react-native'
import { Tag, Calendar } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useThemeStore } from '@/theme/themeStore'
import { useTranslation } from '@/hooks/useTranslation'
import { formatNumber, formatDecimal, formatDate } from '@/lib/utils'

interface ExitBatchListItemProps {
  batch: any
  activeScope: 'today' | 'yesterday' | 'tomorrow' | 'recent' | 'eta_not_exit' | 'missed_sla'
  onPress: (batch: any) => void
}

export function ExitBatchListItem({ batch: b, activeScope, onPress }: ExitBatchListItemProps) {
  const { colors } = useThemeStore()
  const { t } = useTranslation()

  const code = (b.fdMarkingCode || '').trim()
  const contOrAwb = (b.fdContNo || b.fdAWB || b.fdBLNo || '—').trim()
  const isTomorrow = activeScope === 'tomorrow'
  const isEtaNotExit = activeScope === 'eta_not_exit'
  const isMissedSla = activeScope === 'missed_sla'

  let dateLabel = ''
  let dateColor = colors.secondary
  if (isTomorrow) {
    dateLabel = `${t('overview.predicted', 'Prediksi:')} ${formatDate(b.predictedExitDate || b.fdETA)}`
    dateColor = '#F59E0B'
  } else if (isEtaNotExit) {
    dateLabel = `${t('overview.eta', 'ETA:')} ${formatDate(b.fdETA)}`
    dateColor = '#F59E0B'
  } else if (isMissedSla) {
    dateLabel = `${t('overview.eta', 'ETA:')} ${formatDate(b.fdETA)}`
    dateColor = '#EF4444'
  } else if (activeScope === 'today') {
    dateLabel = `${t('overview.exit', 'Exit:')} ${formatDate(b.fdExitDate)}`
    dateColor = '#10B981'
  } else {
    dateLabel = `${t('overview.exit', 'Exit:')} ${formatDate(b.fdExitDate)}`
    dateColor = colors.secondary
  }

  return (
    <Card
      style={{ padding: 12, gap: 6 }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress(b)
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
          <Tag size={13} color={colors.tertiary} style={{ flexShrink: 0 }} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary, flex: 1 }} numberOfLines={1}>
            {code || '—'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {b.fdBranchCode?.trim() ? (
            <Badge label={b.fdBranchCode.trim()} variant="neutral" />
          ) : null}
          <Badge
            label={b.fdListType === 1 ? t('overview.air', 'Udara') : t('overview.sea', 'Laut')}
            variant={b.fdListType === 1 ? 'air' : 'sea'}
          />
        </View>
      </View>

      <Text style={{ fontSize: 11.5, color: colors.secondary }} numberOfLines={1}>
        Cont/AWB: {contOrAwb} • {b.fdConsignee?.trim() || 'No Consignee'}
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, marginTop: 2 }}>
        <Text style={{ fontSize: 11, color: colors.secondary, flex: 1, marginRight: 6 }} numberOfLines={1}>
          {formatNumber(b.fdJmlTerima || b.fdJmlPack || 0)} {b.fdSatuan?.trim() || 'Koli'} • {formatDecimal(b.fdJmlBerat || 0, 1)} kg
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <Calendar size={11} color={dateColor} />
          <Text style={{ fontSize: 11, color: dateColor, fontWeight: '700' }} numberOfLines={1}>
            {dateLabel}
          </Text>
        </View>
      </View>
    </Card>
  )
}
