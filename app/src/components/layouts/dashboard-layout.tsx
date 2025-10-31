'use client'

import React, { useState } from 'react'
import { SidebarNavigation } from '@/components/navigation/sidebar-navigation'
import { cn } from '@/lib/utils'
import { EnhancedConfigCheck } from '@/components/setup/enhanced-config-check'

interface DashboardLayoutProps {
  children: React.ReactNode
  className?: string
  sidebarCollapsed?: boolean
  showSidebar?: boolean
}

export function DashboardLayout({ 
  children, 
  className,
  sidebarCollapsed = false,
  showSidebar = true 
}: DashboardLayoutProps) {
  return (
    <EnhancedConfigCheck showSetupModal={true} lightweight={true} requireDbConfig={false} requireAiConfig={false}>
      <div className={cn(
        "relative flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20",
        className
      )}>
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.12),transparent_55%),radial-gradient(circle_at_100%_0%,rgba(129,140,248,0.1),transparent_45%),radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.12),transparent_50%)]" aria-hidden />

        {showSidebar && (
          <SidebarNavigation
            defaultCollapsed={sidebarCollapsed}
            className="relative z-20 flex-shrink-0"
          />
        )}

        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="flex min-h-screen flex-col bg-background/92 backdrop-blur-sm">
            {children}
          </div>
        </div>
      </div>
    </EnhancedConfigCheck>
  )
}

export function DashboardLayoutWithAI({ children }: { children: React.ReactNode }) {
  return (
    <EnhancedConfigCheck 
      requireDbConfig={true} 
      requireAiConfig={true} 
      showSetupModal={true}
    >
      {children}
    </EnhancedConfigCheck>
  )
}
