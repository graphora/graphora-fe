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

/**
 * StatTile — legacy stat card used by the dashboard's old code paths.
 * Styled to match the Graphora design: graphora surface + kicker label +
 * 28/500 value. Kept the API backwards-compatible (value, label,
 * description, icon, trend, footer props all still accepted).
 */
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
      className={cn(className)}
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <IconBadge variant="primary" size="sm" {...iconBadgeProps}>
              {icon}
            </IconBadge>
          )}
          <div className="min-w-0 space-y-1">
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--fg-faint)',
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
              }}
            >
              {value}
            </div>
          </div>
        </div>
        {trend && (
          <div style={{ color: 'var(--fg-muted)', display: 'flex', alignItems: 'center' }}>
            {trend}
          </div>
        )}
      </div>
      {description && (
        <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
          {description}
        </div>
      )}
      {footer}
    </div>
  )
}
