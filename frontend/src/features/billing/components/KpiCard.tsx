import { isValidElement, type ComponentType, type ReactNode } from 'react'
import { StatCard } from '@/components/ui/StatCard'
import type { Trend } from '../types/billing.types'

interface KpiCardProps {
  label: string
  value: string | number
  subValue?: ReactNode
  icon?: ComponentType<{ className?: string }> | ReactNode
  accent?: string
  accentColor?: string
  size?: string
  isLoading?: boolean
  trend?: Trend | null
  onClick?: () => void
}

export function KpiCard({
  label,
  value,
  subValue,
  icon: Icon,
  accent = 'text-[var(--color-secondary)]',
  accentColor = '#3B82F6',
  isLoading,
  trend,
  onClick,
}: KpiCardProps) {
  const renderIcon = () => {
    if (!Icon) return null
    if (isValidElement(Icon)) return Icon
    const Component = Icon as ComponentType<{ className?: string }>
    return <Component className={`w-5 h-5 ${accent}`} />
  }

  return (
    <StatCard
      label={label}
      value={value}
      subValue={subValue}
      icon={renderIcon()}
      accentColor={accentColor}
      isLoading={isLoading}
      trend={trend ? { value: `${trend.value}%`, direction: trend.direction === 'flat' ? 'neutral' : trend.direction, label: 'vs bulan lalu' } : null}
      onClick={onClick}
    />
  )
}
