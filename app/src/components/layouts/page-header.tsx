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
    <div className={cn("bg-background border-b border-border", className)}>
      <div className="px-6 sm:px-8 py-8">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center space-x-2 text-body-sm text-muted-foreground mb-content-sm">
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
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            {(icon || logo) && (
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                {logo ? (
                  <Logo 
                    width={64}
                    height={64}
                    className="w-full h-full"
                  />
                ) : (
                  icon
                )}
              </div>
            )}
            
            <div className="space-y-1.5">
              <div className="flex items-center space-x-3">
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
                <p className="text-body text-muted-foreground max-w-2xl leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Only show actions, no theme toggle or avatar */}
          {actions && (
            <div className="flex items-center space-x-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
