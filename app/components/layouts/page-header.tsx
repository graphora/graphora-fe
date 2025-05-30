'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
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
  badge,
  actions,
  breadcrumbs,
  className
}: PageHeaderProps) {
  return (
    <div className={cn("bg-background border-b border-border", className)}>
      <div className="px-6 py-6">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
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
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            {icon && (
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                {icon}
              </div>
            )}
            
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  {title}
                </h1>
                {badge && (
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    {badge}
                  </Badge>
                )}
              </div>
              
              {description && (
                <p className="text-muted-foreground max-w-2xl leading-relaxed">
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