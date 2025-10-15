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
      <div className={cn("flex h-screen bg-background", className)}>
        {showSidebar && (
          <SidebarNavigation
            defaultCollapsed={sidebarCollapsed}
            className="flex-shrink-0"
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
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
