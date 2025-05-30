'use client'

import React, { useState } from 'react'
import { SidebarNavigation } from '@/components/navigation/sidebar-navigation'
import { cn } from '@/lib/utils'

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
    <div className={cn("flex h-screen bg-slate-50", className)}>
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
  )
} 