import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native'
import {
  Receipt,
  User,
  Tag,
  ChevronRight,
  X,
  Truck,
  FileText,
  Phone,
  Building2,
  Box,
  Search,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useThemeStore } from '../../theme/themeStore'

export interface SuggestionItem {
  type: string
  title: string
  subtitle?: string
  value: string
}

interface SearchSuggestionsDropdownProps {
  visible: boolean
  suggestions: SuggestionItem[]
  isLoading?: boolean
  title?: string
  onSelect: (item: SuggestionItem) => void
  onClose: () => void
  style?: ViewStyle
}

export const SearchSuggestionsDropdown: React.FC<SearchSuggestionsDropdownProps> = ({
  visible,
  suggestions,
  isLoading = false,
  title = 'Saran Pencarian',
  onSelect,
  onClose,
  style,
}) => {
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  if (!visible) return null

  const getIcon = (type: string) => {
    switch (type) {
      case 'resi':
        return <Receipt size={13} color="#D97706" />
      case 'customer':
        return <User size={13} color="#0284C7" />
      case 'marking':
        return <Tag size={13} color="#6366F1" />
      case 'container':
        return <Box size={13} color="#0D9488" />
      case 'bl_awb':
        return <FileText size={13} color="#10B981" />
      case 'consignee':
        return <Building2 size={13} color="#8B5CF6" />
      case 'sj':
        return <FileText size={13} color="#10B981" />
      case 'supir':
        return <User size={13} color="#F59E0B" />
      case 'car':
        return <Truck size={13} color="#0284C7" />
      case 'invoice':
        return <Receipt size={13} color="#10B981" />
      case 'code':
        return <Tag size={13} color="#3B82F6" />
      case 'contact':
        return <Phone size={13} color="#059669" />
      default:
        return <Search size={13} color={colors.secondary} />
    }
  }

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'resi':
        return { bg: 'rgba(217, 119, 6, 0.12)', border: 'rgba(217, 119, 6, 0.3)' }
      case 'customer':
        return { bg: 'rgba(2, 132, 199, 0.12)', border: 'rgba(2, 132, 199, 0.3)' }
      case 'marking':
        return { bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.3)' }
      case 'container':
        return { bg: 'rgba(13, 148, 136, 0.12)', border: 'rgba(13, 148, 136, 0.3)' }
      case 'bl_awb':
      case 'sj':
      case 'invoice':
        return { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' }
      case 'contact':
        return { bg: 'rgba(5, 150, 105, 0.12)', border: 'rgba(5, 150, 105, 0.3)' }
      default:
        return { bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.3)' }
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {/* Header Bar */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.secondary }]}>
          {title} {isLoading ? '• Memuat...' : ''}
        </Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onClose()
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={14} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      {/* List Item */}
      {suggestions.length === 0 && !isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.secondary }]}>
            Tidak ada saran ditemukan
          </Text>
        </View>
      ) : (
        suggestions.map((sug, idx) => {
          const badge = getBadgeStyle(sug.type)
          const isLast = idx === suggestions.length - 1
          return (
            <TouchableOpacity
              key={`${sug.type}-${sug.value}-${idx}`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onSelect(sug)
              }}
              style={[
                styles.itemRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: badge.bg,
                    borderColor: badge.border,
                  },
                ]}
              >
                {getIcon(sug.type)}
              </View>

              <View style={styles.itemContent}>
                <Text
                  style={[styles.itemTitle, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  {sug.title}
                </Text>
                {sug.subtitle ? (
                  <Text
                    style={[styles.itemSubtitle, { color: colors.secondary }]}
                    numberOfLines={1}
                  >
                    {sug.subtitle}
                  </Text>
                ) : null}
              </View>

              <ChevronRight size={13} color={colors.secondary} />
            </TouchableOpacity>
          )
        })
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8.5,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemContent: {
    flex: 1,
    marginRight: 6,
  },
  itemTitle: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  emptyContainer: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 11.5,
    fontStyle: 'italic',
  },
})
