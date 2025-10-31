'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Logo } from '@/components/ui/logo'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  logo?: boolean
  badge?: string
  actions?: React.ReactNode
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
  className?: string
}

export function PageHeader({
  title,
  description,
  icon,
  logo,
  badge,
  actions,
  breadcrumbs,
  className
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70 shadow-sm mb-section p-4',
        className
      )}
    >
      <div className="page-shell pt-section-sm pb-section-sm flex flex-col gap-section-sm">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-body-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-foreground font-medium">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className="text-muted-foreground/50">/</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Main Header */}
        <div className="flex flex-col gap-content lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            {(icon || logo) && (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-medium">
                {logo ? (
                  <Logo
                    width={56}
                    height={56}
                    className="h-full w-full"
                  />
                ) : (
                  icon
                )}
              </div>
            )}

            <div className="space-y-content-sm">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-heading font-semibold text-foreground tracking-tight">
                  {title}
                </h1>
                {badge && (
                  <Badge variant="info">
                    {badge}
                  </Badge>
                )}
              </div>

              {description && (
                <p className="max-w-3xl text-body text-muted-foreground leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
