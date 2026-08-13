import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface FadeInProps {
  show: boolean
  children: React.ReactNode
  className?: string
  duration?: number
}

export default function FadeIn({ show, children, className, duration = 300 }: FadeInProps) {
  const [render, setRender] = useState(show)

  useEffect(() => {
    if (show) setRender(true)
  }, [show])

  const onAnimationEnd = () => {
    if (!show) setRender(false)
  }

  return (
    render && (
      <div
        className={cn(
          'transition-all',
          show ? `opacity-100 translate-y-0` : 'opacity-0 translate-y-2',
          className
        )}
        style={{ transitionDuration: `${duration}ms` }}
        onTransitionEnd={onAnimationEnd}
      >
        {children}
      </div>
    )
  )
}
