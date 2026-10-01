import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { AlertCircle } from 'lucide-react-native'
import { Card } from './Card'
import { Button } from './Button'
import { useThemeStore } from '../../theme/themeStore'
import { useTranslation } from '../../hooks/useTranslation'

interface ErrorRetryCardProps {
  title?: string
  message?: string
  onRetry: () => void
  isRetrying?: boolean
  style?: ViewStyle
}

export const ErrorRetryCard: React.FC<ErrorRetryCardProps> = ({
  title,
  message,
  onRetry,
  isRetrying = false,
  style,
}) => {
  const { colors } = useThemeStore()
  const { t } = useTranslation()

  return (
    <Card style={[styles.card, style]}>
      <View style={[styles.iconWrapper, { backgroundColor: `${colors.danger}15` }]}>
        <AlertCircle size={24} color={colors.danger} />
      </View>
      <Text style={[styles.title, { color: colors.primary }]}>
        {title || t('common.errorLoading', 'Gagal memuat data')}
      </Text>
      <Text style={[styles.message, { color: colors.secondary }]}>
        {message || 'Terjadi kesalahan saat memuat data. Periksa koneksi dan coba lagi.'}
      </Text>
      <Button
        title={t('common.refresh', 'Muat Ulang')}
        onPress={onRetry}
        variant="outline"
        size="sm"
        loading={isRetrying}
        style={styles.retryBtn}
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginVertical: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  message: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
    maxWidth: 260,
  },
  retryBtn: {
    minWidth: 120,
  },
})
