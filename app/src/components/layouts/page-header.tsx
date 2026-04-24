'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  /** Small all-caps kicker above the title (e.g. "Overview · project") */
  kicker?: string
  /** Retained for backwards compat — icon is no longer rendered in a gradient block */
  icon?: React.ReactNode
  /** Retained for backwards compat (logo block is suppressed in the new aesthetic) */
  logo?: boolean
  /** Retained — rendered inline next to the title */
  badge?: React.ReactNode
  actions?: React.ReactNode
  /** Legacy prop — superseded by the top-level TopBar breadcrumbs */
  breadcrumbs?: Array<{ label: string; href?: string }>
  className?: string
}

/**
 * PageHeader — kicker + title + sub-copy layout matching the Graphora
 * prototype. Actions slot right-aligns on wide screens.
 *
 * Historical compat: `icon`, `logo`, and `breadcrumbs` props remain in the
 * type but are intentionally not rendered — TopBar owns breadcrumbs now,
 * and the design spec removed the gradient icon block as an AI-slop tell.
 */
export function PageHeader({
  title,
  description,
  kicker,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {kicker && (
          <div className="gx-kicker" style={{ marginBottom: 8 }}>
            {kicker}
          </div>
        )}
        <div className="flex flex-wrap items-baseline gap-3">
          <h1
            className="tracking-tight"
            style={{
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
              lineHeight: 1.15,
            }}
          >
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p
            className="mt-[6px]"
            style={{
              color: 'var(--fg-muted)',
              fontSize: '13.5px',
              maxWidth: 680,
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}
