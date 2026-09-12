import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react-native'
import { useToastStore, ToastItem } from '../../stores/toastStore'
import { useThemeStore } from '../../theme/themeStore'

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore()
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  if (toasts.length === 0) return null

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
      <View pointerEvents="box-none" style={styles.toastList}>
        {toasts.map((toast) => {
          let IconComponent = CheckCircle2
          let iconColor = colors.success
          let borderColor = isDark ? 'rgba(52, 211, 153, 0.5)' : '#10B981'

          if (toast.type === 'error') {
            IconComponent = AlertCircle
            iconColor = colors.danger
            borderColor = isDark ? 'rgba(248, 113, 113, 0.5)' : '#EF4444'
          } else if (toast.type === 'warning') {
            IconComponent = AlertTriangle
            iconColor = colors.warning
            borderColor = isDark ? 'rgba(251, 191, 36, 0.5)' : '#F59E0B'
          } else if (toast.type === 'info') {
            IconComponent = Info
            iconColor = colors.tertiary
            borderColor = isDark ? 'rgba(56, 189, 248, 0.5)' : '#3B82F6'
          }

          return (
            <TouchableOpacity
              key={toast.id}
              activeOpacity={0.9}
              onPress={() => removeToast(toast.id)}
              style={[
                styles.toastCard,
                {
                  backgroundColor: isDark ? '#151D2A' : '#FFFFFF',
                  borderColor,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 5,
                },
              ]}
            >
              <IconComponent size={18} color={iconColor} style={styles.icon} />
              <Text
                style={[
                  styles.message,
                  {
                    color: colors.primary,
                  },
                ]}
                numberOfLines={2}
              >
                {toast.message}
              </Text>
              <TouchableOpacity onPress={() => removeToast(toast.id)} style={styles.closeBtn}>
                <X size={14} color={colors.secondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  toastList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 6,
  },
})
