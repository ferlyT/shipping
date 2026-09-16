import React from 'react'
import { View, Text, TouchableOpacity, Linking } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Building2, User, Phone, Eye } from 'lucide-react-native'
import { Card } from '@/components/ui/Card'
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

  const statusCfg = statusConfig[(item.fdBlocked || 0) as keyof typeof statusConfig] || statusConfig[0]
  const tierKey = String(item.tier || item.currentTier || item.fdTier || 'none').toLowerCase()
  const tierCfg = tierBadgeConfig[tierKey] || tierBadgeConfig.none
  const tenure = formatCustomerTenure(item.fdCreatedDate)
  const mainPhone = item.fdHP || item.fdTelp || item.fdPhone || item.fdHpPengiriman

  const handleCall = (phone?: string) => {
    if (!phone) {
      showToast('Nomor telepon tidak tersedia', 'warning')
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Linking.openURL(`tel:${phone}`)
  }

  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
      showToast('Nomor telepon tidak tersedia', 'warning')
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const cleanNumber = phone.replace(/\D/g, '')
    const waNumber = cleanNumber.startsWith('0') ? '62' + cleanNumber.slice(1) : cleanNumber
    Linking.openURL(`https://wa.me/${waNumber}`)
  }

  return (
    <Card
      style={{ padding: 14, gap: 8 }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress(item)
      }}
    >
      {/* Top Badge Row: Code + Badges (Tier, Broker, Discontinued, Tenure) + Status */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {/* Customer Code Monospace */}
          <View
            style={{
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 6,
              borderWidth: 1,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: '700', color: colors.primary }}>
              {item.fdCustCode}
            </Text>
          </View>

          {/* Tier Badge */}
          {tierKey !== 'none' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: tierCfg.bg,
                borderColor: tierCfg.border,
              }}
            >
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: tierCfg.dot }} />
              <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3, color: tierCfg.text }}>
                {tierCfg.label}
              </Text>
            </View>
          )}

          {/* Broker Badge */}
          {item.fdBroker === 1 && (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
                borderWidth: 1,
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                borderColor: isDark ? '#4F46E5' : '#C7D2FE',
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '800', color: isDark ? '#A5B4FC' : '#4F46E5' }}>BROKER</Text>
            </View>
          )}

          {/* Discontinued Badge */}
          {item.fdDiscontinued === 1 && (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
                borderWidth: 1,
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                borderColor: isDark ? '#DC2626' : '#FECACA',
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '800', color: isDark ? '#FCA5A5' : '#DC2626' }}>
                DISCONTINUED
              </Text>
            </View>
          )}

          {/* Tenure Badge */}
          {tenure && (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
                borderWidth: 1,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 9.5, fontWeight: '600', color: colors.secondary }}>{tenure}</Text>
            </View>
          )}
        </View>

        {/* Status Badge */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 10,
            borderWidth: 1,
            flexShrink: 0,
            borderColor: statusCfg.border,
            backgroundColor: statusCfg.bg,
          }}
        >
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: statusCfg.dot }} />
          <Text style={{ fontSize: 9.5, fontWeight: '700', color: statusCfg.text }}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* Customer Name & Annual Revenue */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '700', flex: 1, color: colors.primary }} numberOfLines={1}>
          {displayCustName(item.fdCustName, 'Customer Tanpa Nama')}
        </Text>
        {item.annualRevenue != null && item.annualRevenue > 0 && (
          <View
            style={{
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 6,
              borderWidth: 1,
              flexShrink: 0,
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? '#34D399' : '#059669' }}>
              {formatCompactRupiah(item.annualRevenue)}
            </Text>
          </View>
        )}
      </View>

      {/* City & Address preview */}
      {(item.fdCityName || item.fdCity || item.fdKotaPengiriman || item.fdAddr1) && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Building2 size={12} color={colors.secondary} style={{ marginRight: 4, flexShrink: 0 }} />
          <Text style={{ fontSize: 11.5, flex: 1, color: colors.secondary }} numberOfLines={1}>
            {item.fdCityName || item.fdCity || item.fdKotaPengiriman || '—'}
            {item.fdAddr1 ? ` • ${item.fdAddr1.trim()}` : item.fdAlamatPengiriman ? ` • ${item.fdAlamatPengiriman.trim()}` : ''}
          </Text>
        </View>
      )}

      {/* Inner Box: CP, Sales, Phone */}
      <View
        style={{
          padding: 10,
          borderRadius: 10,
          borderWidth: 1,
          gap: 8,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
            <User size={12} color={colors.secondary} style={{ marginRight: 4, flexShrink: 0 }} />
            <Text style={{ fontSize: 11, marginRight: 4, color: colors.secondary }}>CP:</Text>
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.primary }} numberOfLines={1}>
              {item.fdContact || '—'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
            <Text style={{ fontSize: 11, marginRight: 4, color: colors.secondary }}>Sales:</Text>
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.primary }} numberOfLines={1}>
              {item.fdSalesNM || '—'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 6, borderTopColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
            <Phone size={12} color={colors.secondary} style={{ marginRight: 4, flexShrink: 0 }} />
            <Text style={{ fontSize: 11.5, fontFamily: 'monospace', fontWeight: '500', color: colors.primary }} numberOfLines={1}>
              {mainPhone || '—'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.tertiary }}>Detail</Text>
            <Eye size={12} color={colors.tertiary} />
          </View>
        </View>
      </View>

      {/* Quick Communication Actions */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
        <TouchableOpacity
          onPress={() => handleCall(mainPhone)}
          style={{
            flex: 1,
            paddingVertical: 7,
            borderRadius: 8,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : '#BAE6FD',
            backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : '#F0F9FF',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#38BDF8' }}>Telepon</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleWhatsApp(mainPhone)}
          style={{
            flex: 1,
            paddingVertical: 7,
            borderRadius: 8,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </Card>
  )
}
