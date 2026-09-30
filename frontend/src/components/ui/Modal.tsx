import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useModalEscape } from '@/hooks/useModalEscape'
import { cn } from '@/lib/utils'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: ModalSize
  className?: string
  closeOnBackdrop?: boolean
  zIndex?: string
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-6xl',
  '3xl': 'max-w-7xl',
  full: 'max-w-[98vw] w-[98vw] max-h-[95vh]',
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  className,
  closeOnBackdrop = true,
  zIndex = 'z-[100]',
}: ModalProps) {
  useModalEscape(isOpen, onClose)

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const content = (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center p-2 sm:p-3 bg-black/60 backdrop-blur-xs animate-fadeIn',
        zIndex
      )}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className={cn(
          'w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-slideUp font-[var(--font-body)]',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export interface ModalHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  badge?: ReactNode
  onClose?: () => void
  className?: string
  children?: ReactNode
}

export function ModalHeader({
  title,
  subtitle,
  icon,
  badge,
  onClose,
  className,
  children,
}: ModalHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-surface)]',
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-3">
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14px] sm:text-[15px] font-bold font-[var(--font-label)] uppercase tracking-wide text-[var(--color-primary)] truncate">
              {title}
            </h3>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-[11px] sm:text-[12px] text-[var(--color-secondary)] mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export interface ModalBodyProps {
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export function ModalBody({ children, className, noPadding = false }: ModalBodyProps) {
  return (
    <div
      className={cn(
        'overflow-y-auto flex-1',
        !noPadding && 'p-4 sm:p-5',
        className
      )}
    >
      {children}
    </div>
  )
}

export interface ModalFooterProps {
  children: ReactNode
  className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2.5 px-4 sm:px-5 py-3 border-t border-[var(--color-border)] shrink-0 bg-[var(--color-surface)]',
        className
      )}
    >
      {children}
    </div>
  )
}

Modal.Header = ModalHeader
Modal.Body = ModalBody
Modal.Footer = ModalFooter
