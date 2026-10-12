export interface HeroBreakdownItem {
  icon?: string
  value: number
  label: string
}

export interface HeroSection {
  id: string
  label: string
  value: number
  subLabel: string
  subLabelColor?: string
  breakdown?: HeroBreakdownItem[]
  visible: boolean
  onPress?: () => void
}

export interface HeroStat {
  id: string
  icon?: string
  value: number
  label: string
  color?: string
  visible: boolean
  onPress?: () => void
}

export interface HeroCardProps {
  sections: HeroSection[]
  stats: HeroStat[]
  isLoading?: boolean
}
