import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

export interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-[var(--color-secondary)] mb-2 select-none overflow-x-auto scrollbar-none py-1">
      <Link
        to={ROUTES.DASHBOARD}
        className="flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div key={index} className="flex items-center gap-1.5 shrink-0">
            <ChevronRight className="w-3 h-3 text-[var(--color-muted)]" />
            {item.path && !isLast ? (
              <Link to={item.path} className="hover:text-[var(--color-primary)] transition-colors font-medium">
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-[var(--color-primary)]">{item.label}</span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
