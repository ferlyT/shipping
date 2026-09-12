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
    surface: '#151D2A',
    surfaceElevated: '#1C2638',
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    tertiary: '#38BDF8',
    border: '#1E293B',
    borderStrong: '#334155',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    badgeNeutralBg: 'rgba(255, 255, 255, 0.05)',
    badgeNeutralText: '#94A3B8',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    tabBarBg: '#101622',
    tabBarBorder: '#1E293B',
    tabBarActive: '#38BDF8',
    tabBarInactive: '#64748B',
  },
  heritage: {
    neutral: '#F7F5F2',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    primary: '#1A1C1E',
    secondary: '#6C7278',
    tertiary: '#B8422E',
    border: '#E8E6E3',
    borderStrong: '#C8C4C0',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    badgeNeutralBg: '#F1EFEA',
    badgeNeutralText: '#6C7278',
    cardBorder: '#E8E6E3',
    tabBarBg: '#FFFFFF',
    tabBarBorder: '#E8E6E3',
    tabBarActive: '#B8422E',
    tabBarInactive: '#9CA3AF',
  },
}
