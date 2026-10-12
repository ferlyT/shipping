export type ThemeMode = 'midnight' | 'heritage'

export interface ThemeColors {
  neutral: string
  surface: string
  surfaceElevated: string
  primary: string
  secondary: string
  tertiary: string
  border: string
  borderStrong: string
  divider: string
  success: string
  warning: string
  danger: string
  badgeNeutralBg: string
  badgeNeutralText: string
  cardBorder: string
  tabBarBg: string
  tabBarBorder: string
  tabBarActive: string
  tabBarInactive: string
}

export const THEME_COLORS: Record<ThemeMode, ThemeColors> = {
  midnight: {
    neutral: '#0B0F17',
    surface: '#111827',
    surfaceElevated: '#172033',
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    tertiary: '#38BDF8',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    divider: 'rgba(255, 255, 255, 0.06)',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    badgeNeutralBg: 'rgba(255, 255, 255, 0.05)',
    badgeNeutralText: '#94A3B8',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    tabBarBg: '#0D131F',
    tabBarBorder: 'rgba(255, 255, 255, 0.08)',
    tabBarActive: '#38BDF8',
    tabBarInactive: '#64748B',
  },
  heritage: {
    neutral: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    primary: '#0F172A',
    secondary: '#64748B',
    tertiary: '#B8422E',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    divider: '#F1F5F9',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    badgeNeutralBg: '#F1F5F9',
    badgeNeutralText: '#64748B',
    cardBorder: '#E2E8F0',
    tabBarBg: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarActive: '#B8422E',
    tabBarInactive: '#94A3B8',
  },
}
