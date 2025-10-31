'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Loader2,
  Circle,
  Pause,
  AlertTriangle,
  Info
} from 'lucide-react'

export type StatusType = 
  | 'success' 
  | 'pending' 
  | 'warning' 
  | 'error' 
  | 'loading' 
  | 'inactive'
  | 'paused'

interface StatusIndicatorProps {
  status: StatusType
  label?: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const variants = {
  success: {
    bg: 'bg-success/12',
    text: 'text-success',
    border: 'border-success/25',
    icon: CheckCircle,
  },
  warning: {
    bg: 'bg-warning/12',
    text: 'text-warning',
    border: 'border-warning/25',
    icon: AlertTriangle,
  },
  error: {
    bg: 'bg-destructive/12',
    text: 'text-destructive',
    border: 'border-destructive/25',
    icon: XCircle,
  },
  info: {
    bg: 'bg-info/12',
    text: 'text-info',
    border: 'border-info/25',
    icon: Info,
  },
  loading: {
    bg: 'bg-muted/80',
    text: 'text-muted-foreground',
    border: 'border-border/70',
    icon: Loader2,
  },
  pending: {
    bg: 'bg-info/10',
    text: 'text-info',
    border: 'border-info/20',
    icon: Clock,
  },
  inactive: {
    bg: 'bg-muted/70',
    text: 'text-muted-foreground',
    border: 'border-border/60',
    icon: Circle,
  },
  paused: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
    icon: Pause,
  },
} as const

const sizeConfig = {
  sm: {
    icon: 'h-3 w-3',
    dot: 'h-2 w-2',
    text: 'text-xs',
    padding: 'px-2 py-1'
  },
  md: {
    icon: 'h-4 w-4',
    dot: 'h-2.5 w-2.5',
    text: 'text-sm',
    padding: 'px-3 py-1.5'
  },
  lg: {
    icon: 'h-5 w-5',
    dot: 'h-3 w-3',
    text: 'text-base',
    padding: 'px-4 py-2'
  }
}

export function StatusIndicator({
  status,
  label,
  description,
  size = 'md',
  showIcon = true,
  className
}: StatusIndicatorProps) {
  const config = variants[status]
  const sizeStyles = sizeConfig[size]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border backdrop-blur-panel shadow-soft",
        config.bg,
        config.border,
        sizeStyles.padding,
        className
      )}
    >
      {showIcon && (
        <div className={cn(config.text)}>
          <Icon 
            className={cn(
              sizeStyles.icon,
              status === 'loading' && 'animate-spin'
            )} 
          />
        </div>
      )}
      
      {!showIcon && (
        <div 
          className={cn(
            "rounded-full",
            config.text,
            sizeStyles.dot
          )}
        />
      )}
      
      {label && (
        <span className={cn(
          "font-medium",
          config.text,
          sizeStyles.text
        )}>
          {label}
        </span>
      )}
      
      {description && (
        <span className={cn(
          "text-muted-foreground",
          sizeStyles.text
        )}>
          {description}
        </span>
      )}
    </div>
  )
}

// Preset components for common use cases
export function SuccessStatus({ label, ...props }: Omit<StatusIndicatorProps, 'status'>) {
  return <StatusIndicator status="success" label={label} {...props} />
}

export function PendingStatus({ label, ...props }: Omit<StatusIndicatorProps, 'status'>) {
  return <StatusIndicator status="pending" label={label} {...props} />
}

export function ErrorStatus({ label, ...props }: Omit<StatusIndicatorProps, 'status'>) {
  return <StatusIndicator status="error" label={label} {...props} />
}

export function LoadingStatus({ label, ...props }: Omit<StatusIndicatorProps, 'status'>) {
  return <StatusIndicator status="loading" label={label} {...props} />
} 
