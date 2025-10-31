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
    bgColor: 'bg-success/12',
    textColor: 'text-success',
    borderColor: 'border-success/25',
    shadow: 'shadow-soft',
    icon: CheckCircle,
  },
  warning: {
    bgColor: 'bg-warning/12',
    textColor: 'text-warning',
    borderColor: 'border-warning/25',
    shadow: 'shadow-soft',
    icon: AlertTriangle,
  },
  error: {
    bgColor: 'bg-destructive/12',
    textColor: 'text-destructive',
    borderColor: 'border-destructive/25',
    shadow: 'shadow-soft',
    icon: XCircle,
  },
  info: {
    bgColor: 'bg-info/12',
    textColor: 'text-info',
    borderColor: 'border-info/25',
    shadow: 'shadow-soft',
    icon: Info,
  },
  loading: {
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    borderColor: 'border-border',
    shadow: 'shadow-soft',
    icon: Loader2,
  },
  pending: {
    bgColor: 'bg-info/12',
    textColor: 'text-info',
    borderColor: 'border-info/25',
    shadow: 'shadow-soft',
    icon: Clock,
  },
  inactive: {
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    borderColor: 'border-border',
    shadow: 'shadow-soft',
    icon: Circle,
  },
  paused: {
    bgColor: 'bg-warning/10',
    textColor: 'text-warning',
    borderColor: 'border-warning/20',
    shadow: 'shadow-soft',
    icon: Pause,
  },
}

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
    <div className={cn(
      "inline-flex items-center space-x-2 rounded-full border backdrop-blur-glass",
      config.bgColor,
      config.borderColor,
      config.shadow,
      sizeStyles.padding,
      className
    )}>
      {showIcon && (
        <div className={cn(config.textColor)}>
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
            config.textColor,
            sizeStyles.dot
          )}
        />
      )}
      
      {label && (
        <span className={cn(
          "font-medium",
          config.textColor,
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
