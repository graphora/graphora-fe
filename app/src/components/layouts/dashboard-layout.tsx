'use client'

import React from 'react'
import { SidebarNavigation } from '@/components/navigation/sidebar-navigation'
import { cn } from '@/lib/utils'
import { EnhancedConfigCheck } from '@/components/setup/enhanced-config-check'
import { AmbientGraph } from '@/components/graphora'
import { TopBar, type Crumb } from '@/components/layouts/top-bar'

interface DashboardLayoutProps {
  children: React.ReactNode
  className?: string
  sidebarCollapsed?: boolean
  showSidebar?: boolean
  /** If false, suppresses the ambient graph backdrop (use for full-bleed graph canvases). */
  showAmbientGraph?: boolean
  /** If false, hides the topbar entirely. */
  showTopBar?: boolean
  /** Override the derived crumbs. */
  crumbs?: Crumb[]
  /** Right-aligned slot in the topbar. */
  topBarActions?: React.ReactNode
}

export function DashboardLayout({
  children,
  className,
  sidebarCollapsed = false,
  showSidebar = true,
  showAmbientGraph = true,
  showTopBar = true,
  crumbs,
  topBarActions,
}: DashboardLayoutProps) {
  return (
    <EnhancedConfigCheck
      showSetupModal={true}
      lightweight={true}
      requireDbConfig={false}
      requireAiConfig={false}
    >
      <div
        className={cn('relative flex h-screen overflow-hidden', className)}
        style={{ background: 'rgb(var(--background))' }}
      >
        {showSidebar && <SidebarNavigation defaultCollapsed={sidebarCollapsed} className="flex-shrink-0" />}

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {showTopBar && <TopBar crumbs={crumbs} actions={topBarActions} />}

          <div className="relative flex-1 overflow-y-auto overflow-x-hidden">
            {showAmbientGraph && (
              <AmbientGraph density={18} speed={0.4} opacity={0.18} />
            )}
            <div className="relative z-[1] flex min-h-full flex-col">
              {children}
            </div>
          </div>
        </main>
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
