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
    <div className={cn("bg-white border-b border-slate-200", className)}>
      <div className="px-6 py-6">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-slate-500 mb-4">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {crumb.href ? (
                  <a 
                    href={crumb.href}
                    className="hover:text-slate-700 transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-slate-900 font-medium">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className="text-slate-300">/</span>
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
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {title}
                </h1>
                {badge && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {badge}
                  </Badge>
                )}
              </div>
              
              {description && (
                <p className="text-slate-600 max-w-2xl leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

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