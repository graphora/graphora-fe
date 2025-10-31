"use client"

import * as React from 'react'
import { cn } from '@/lib/utils'

type IconBadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'info' | 'neutral'
type IconBadgeSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<IconBadgeSize, string> = {
  sm: 'h-9 w-9 rounded-xl',
  md: 'h-11 w-11 rounded-2xl',
  lg: 'h-14 w-14 rounded-3xl',
}

const variantClasses: Record<IconBadgeVariant, string> = {
  default: 'border-white/15 bg-white/10 text-foreground shadow-soft',
  primary: 'border-primary/30 bg-gradient-to-br from-primary/40 via-primary/25 to-info/20 text-primary-foreground shadow-glass',
  success: 'border-emerald-300/40 bg-gradient-to-br from-emerald-400/40 via-emerald-300/25 to-emerald-200/20 text-emerald-900 dark:text-emerald-200 shadow-glass',
  warning: 'border-amber-300/40 bg-gradient-to-br from-amber-400/40 via-amber-300/25 to-amber-200/20 text-amber-900 dark:text-amber-200 shadow-glass',
  info: 'border-sky-300/40 bg-gradient-to-br from-sky-400/35 via-cyan-300/25 to-emerald-200/20 text-sky-900 dark:text-sky-200 shadow-glass',
  neutral: 'border-border/50 bg-muted/60 text-muted-foreground shadow-soft',
}

export interface IconBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: IconBadgeVariant
  size?: IconBadgeSize
}

export function IconBadge({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}: IconBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center border backdrop-blur-sm transition-transform duration-200',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
