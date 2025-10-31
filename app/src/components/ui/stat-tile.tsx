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
        'enhanced-card shadow-soft transition-transform hover:-translate-y-1 hover:shadow-large',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {icon && (
              <IconBadge variant="primary" size="md" {...iconBadgeProps}>
                {icon}
              </IconBadge>
            )}
            <div className="space-y-1.5">
              <div className="text-4xl font-semibold leading-tight text-foreground">
                {value}
              </div>
              <div className="text-body-sm text-muted-foreground/80">
                {label}
              </div>
            </div>
          </div>
          {trend && (
            <div className="flex items-center gap-2 text-muted-foreground">
              {trend}
            </div>
          )}
        </div>
        {description && (
          <div className="text-body-xs text-muted-foreground/80">
            {description}
          </div>
        )}
        {footer}
      </div>
    </div>
  )
}
