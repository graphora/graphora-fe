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
  Pause
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

const statusConfig = {
  success: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    dotColor: 'bg-emerald-500'
  },
  pending: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500'
  },
  warning: {
    icon: AlertCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-500'
  },
  error: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-500'
  },
  loading: {
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500'
  },
  inactive: {
    icon: Circle,
    color: 'text-slate-400',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    dotColor: 'bg-slate-400'
  },
  paused: {
    icon: Pause,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    dotColor: 'bg-orange-500'
  }
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
  const config = statusConfig[status]
  const sizeStyles = sizeConfig[size]
  const Icon = config.icon

  return (
    <div className={cn(
      "inline-flex items-center space-x-2 rounded-full border",
      config.bgColor,
      config.borderColor,
      sizeStyles.padding,
      className
    )}>
      {showIcon && (
        <div className={cn(config.color)}>
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
            config.dotColor,
            sizeStyles.dot
          )}
        />
      )}
      
      {label && (
        <span className={cn(
          "font-medium",
          config.color,
          sizeStyles.text
        )}>
          {label}
        </span>
      )}
      
      {description && (
        <span className={cn(
          "text-slate-600",
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