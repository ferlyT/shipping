import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Tag, Calendar, Paperclip } from 'lucide-react-native'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useThemeStore } from '@/theme/themeStore'
import { formatCurrency, formatDate, displayCustName } from '@/lib/utils'

interface BillingListItemProps {
  item: any
  onPress: (item: any) => void
  onPressAttachment?: (item: any) => void
}

export function BillingListItem({ item, onPress, onPressAttachment }: BillingListItemProps) {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'
  const amount = item.totalJumlah ?? item.fdTotalAmount ?? item.fdJumlah1 ?? 0
  const attachmentCount = item.attachmentCount ?? item.attachments?.length ?? item._count?.attachments ?? 0
  const hasAttachments = attachmentCount > 0
  const lineColor = isDark ? '#222C38' : '#E3E7EC'
  const isIssued = item.fdGive === 1

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.row, { borderTopColor: lineColor }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress(item)
      }}
    >
      {/* Baris 1: No Invoice di kiri, Tag Issued / Draft di kanan */}
      <View style={styles.b1}>
        <Text style={[styles.invNoText, { color: colors.primary }]} numberOfLines={1}>
          {item.fdInvNo}
        </Text>
        <View
          style={[
            styles.statusTag,
            {
              borderColor: isIssued ? '#4CC38A' : lineColor,
            },
          ]}
        >
          <Text
            style={[
              styles.statusTagText,
              { color: isIssued ? '#4CC38A' : colors.secondary },
            ]}
          >
            {isIssued ? 'Issued' : 'Draft'}
          </Text>
        </View>
      </View>

      {/* Baris 2: Nama Customer */}
      <View style={styles.b2}>
        <Text style={[styles.custNameText, { color: colors.primary }]} numberOfLines={1}>
          {displayCustName(item.customer?.fdCustName || item.fdCustName || item.fdBillTo)}
        </Text>
      </View>

      {/* Baris Marking Code & Marking No (Baris Terpisah) */}
      {(item.fdMarkingCode || item.fdMarkingNo) ? (
        <View style={styles.bMarking}>
          <Text style={[styles.markingLabel, { color: colors.secondary }]}>Marking:</Text>
          <Text style={[styles.markingText, { color: colors.primary }]} numberOfLines={1}>
            {item.fdMarkingCode?.trim() || ''}{item.fdMarkingNo ? ` #${item.fdMarkingNo.trim()}` : ''}
          </Text>
        </View>
      ) : null}

      {/* Baris 3: Tanggal & Lampiran di kiri; Nominal Rp di kanan */}
      <View style={styles.b3}>
        <View style={styles.metaLeft}>
          <Text style={[styles.dateText, { color: colors.secondary }]}>
            {formatDate(item.fdInvDate)}
          </Text>

          {hasAttachments && (
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              onPress={(e) => {
                e.stopPropagation()
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                if (onPressAttachment) {
                  onPressAttachment(item)
                } else {
                  onPress(item)
                }
              }}
              style={[styles.attachmentBtn, { borderColor: lineColor }]}
            >
              <Text style={[styles.attachmentBtnText, { color: colors.secondary }]}>
                {attachmentCount} lampiran
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.amountText, { color: colors.primary }]}>
          {formatCurrency(amount)}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  b1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  invNoText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  statusTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 0.5,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  b2: {
    marginVertical: 2,
  },
  custNameText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bMarking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  markingLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  markingText: {
    fontSize: 12.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  b3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  attachmentBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  attachmentBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
})
