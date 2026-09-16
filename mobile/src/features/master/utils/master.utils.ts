// Utility helpers untuk Master/Customer Screen

export function formatCustomerTenure(createdDate?: string | Date): string {
  if (!createdDate) return ''
  const d = new Date(createdDate)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  if (months < 12) return `${months}bln`
  const years = Math.floor(months / 12)
  return `${years}thn`
}

export function formatCustomerSince(createdDate?: string | Date): string {
  if (!createdDate) return ''
  const d = new Date(createdDate)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short' })
}

// Status configuration (matching frontend web statusConfig fdBlocked)
export const statusConfig: Record<number, { label: string; text: string; bg: string; border: string; dot: string }> = {
  0: { label: 'NO STATUS', text: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.3)', dot: '#94A3B8' },
  1: { label: 'OK', text: '#38BDF8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.3)', dot: '#38BDF8' },
  2: { label: 'COD', text: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', dot: '#10B981' },
  3: { label: 'WARNING', text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', dot: '#F59E0B' },
  4: { label: 'BLOCKED', text: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', dot: '#EF4444' },
  5: { label: 'URGENT', text: '#0284C7', bg: 'rgba(2, 132, 199, 0.1)', border: 'rgba(2, 132, 199, 0.3)', dot: '#0284C7' },
}

// Tier configuration (matching frontend web tierBadgeConfig)
export const tierBadgeConfig: Record<string, { label: string; text: string; bg: string; border: string; dot: string }> = {
  diamond: { label: 'DIAMOND', text: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.4)', dot: '#22D3EE' },
  platinum: { label: 'PLATINUM', text: '#A855F7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)', dot: '#C084FC' },
  gold: { label: 'GOLD', text: '#EAB308', bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)', dot: '#FACC15' },
  silver: { label: 'SILVER', text: '#94A3B8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.4)', dot: '#CBD5E1' },
  bronze: { label: 'BRONZE', text: '#F97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)', dot: '#FB923C' },
  none: { label: 'UNRANKED', text: '#64748B', bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.2)', dot: '#94A3B8' },
}
