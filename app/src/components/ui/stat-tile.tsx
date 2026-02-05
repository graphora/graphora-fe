"use client"

import * as React from 'react'
import { cn } from '@/lib/utils'
import { IconBadge, type IconBadgeProps } from '@/components/ui/icon-badge'

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode
  label: string
  description?: string
  icon?: React.ReactNode
  iconBadgeProps?: Omit<IconBadgeProps, 'children'>
  trend?: React.ReactNode
  footer?: React.ReactNode
}

export function StatTile({
  value,
  label,
  description,
  icon,
  iconBadgeProps,
  trend,
  footer,
  className,
  ...props
}: StatTileProps) {
  return (
    <div
      className={cn(
        'enhanced-card',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {icon && (
              <IconBadge variant="primary" size="sm" {...iconBadgeProps}>
                {icon}
              </IconBadge>
            )}
            <div className="space-y-0.5">
              <div className="text-xl font-semibold text-foreground">
                {value}
              </div>
              <div className="text-xs text-muted-foreground">
                {label}
              </div>
            </div>
          </div>
          {trend && (
            <div className="flex items-center text-muted-foreground">
              {trend}
            </div>
          )}
        </div>
        {description && (
          <div className="text-xs text-muted-foreground">
            {description}
          </div>
        )}
        {footer}
      </div>
    </div>
  )
}
