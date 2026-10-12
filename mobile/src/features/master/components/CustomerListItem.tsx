import React from 'react'
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '@/theme/themeStore'
import { displayCustName, formatCompactRupiah } from '@/lib/utils'
import { formatCustomerTenure, tierBadgeConfig, statusConfig } from '../utils/master.utils'
import { useToastStore } from '@/stores/toastStore'

interface CustomerListItemProps {
  item: any
  onPress: (item: any) => void
}

export function CustomerListItem({ item, onPress }: CustomerListItemProps) {
  const { colors, mode } = useThemeStore()
  const { showToast } = useToastStore()
  const isDark = mode === 'midnight'
  const lineColor = isDark ? '#222C38' : '#E3E7EC'

  const statusCfg = statusConfig[(item.fdBlocked || 0) as keyof typeof statusConfig] || statusConfig[0]
  const tierKey = String(item.tier || item.currentTier || item.fdTier || 'none').toLowerCase()
  const tierCfg = tierBadgeConfig[tierKey] || tierBadgeConfig.none
  const tenure = formatCustomerTenure(item.fdCreatedDate)
  const mainPhone = item.fdHP || item.fdTelp || item.fdPhone || item.fdHpPengiriman
  const isBlocked = (item.fdBlocked || 0) > 0

  const handleCall = (phone?: string) => {
    if (!phone) {
      showToast('Nomor telepon tidak tersedia', 'warning')
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Linking.openURL(`tel:${phone}`)
  }

  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
      showToast('Nomor telepon tidak tersedia', 'warning')
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const cleanNumber = phone.replace(/\D/g, '')
    const waNumber = cleanNumber.startsWith('0') ? '62' + cleanNumber.slice(1) : cleanNumber
    Linking.openURL(`https://wa.me/${waNumber}`)
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.row, { borderTopColor: lineColor }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress(item)
      }}
    >
      {/* Baris 1: Kode Customer + Badges di kiri; Status di kanan */}
      <View style={styles.b1}>
        <View style={styles.idGroup}>
          <Text style={[styles.codeText, { color: colors.primary }]}>
            {item.fdCustCode}
          </Text>
          {tierKey !== 'none' && (
            <View style={[styles.tag, { borderColor: lineColor }]}>
              <Text style={[styles.tagText, { color: colors.secondary }]}>
                {tierCfg.label}
              </Text>
            </View>
          )}
          {item.fdBroker === 1 && (
            <View style={[styles.tag, { borderColor: lineColor }]}>
              <Text style={[styles.tagText, { color: colors.secondary }]}>Broker</Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.statusTag,
            {
              borderColor: isBlocked ? '#EF6B5B' : '#4CC38A',
            },
          ]}
        >
          <Text
            style={[
              styles.statusTagText,
              { color: isBlocked ? '#EF6B5B' : '#4CC38A' },
            ]}
          >
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Baris 2: Nama Customer & Omzet Tahunan */}
      <View style={styles.b2}>
        <Text style={[styles.nameText, { color: colors.primary }]} numberOfLines={1}>
          {displayCustName(item.fdCustName, 'Customer Tanpa Nama')}
        </Text>
        {item.annualRevenue != null && item.annualRevenue > 0 && (
          <Text style={[styles.revenueText, { color: colors.secondary }]}>
            {formatCompactRupiah(item.annualRevenue)}/thn
          </Text>
        )}
      </View>

      {/* Baris 3: Lokasi & Kontak di kiri; Action Call/WA di kanan */}
      <View style={styles.b3}>
        <Text style={[styles.metaText, { color: colors.secondary }]} numberOfLines={1}>
          {item.fdContact ? `${item.fdContact} · ` : ''}
          {item.fdCityName || item.fdCity || '—'}
          {mainPhone ? ` (${mainPhone})` : ''}
        </Text>

        <View style={styles.actionGroup}>
          {mainPhone && (
            <>
              <TouchableOpacity
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => handleCall(mainPhone)}
                style={[styles.chipBtn, { borderColor: lineColor }]}
              >
                <Text style={[styles.chipBtnText, { color: colors.primary }]}>Telp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => handleWhatsApp(mainPhone)}
                style={[styles.chipBtn, { borderColor: lineColor }]}
              >
                <Text style={[styles.chipBtnText, { color: '#4CC38A' }]}>WA</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.1,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 0.5,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  nameText: {
    fontSize: 14.5,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  revenueText: {
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  b3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  chipBtnText: {
    fontSize: 11,
    fontWeight: '500',
  },
})
