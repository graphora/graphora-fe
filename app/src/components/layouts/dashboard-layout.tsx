'use client'

import React, { useEffect, useState } from 'react'
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
            {showAmbientGraph && <DeferredAmbientGraph />}
            <div className="relative z-[1] flex min-h-full flex-col">
              {children}
            </div>
          </div>
        </main>
      </div>
    </EnhancedConfigCheck>
  )
}

/**
 * Defers mounting the AmbientGraph until after first paint so the page
 * content renders immediately on navigation. AmbientGraph has a
 * requestAnimationFrame loop and a ResizeObserver that add noticeable
 * startup cost when the layout re-mounts per-page (which happens when
 * DashboardLayout is used from each page.tsx rather than a segment layout).
 *
 * Fade-in via opacity so the ambient graph appearance feels intentional
 * rather than like a delayed render.
 */
function DeferredAmbientGraph() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // `requestIdleCallback` where available, otherwise `setTimeout` at paint
    // boundary. Either way: defer to the next idle frame after mount.
    const schedule =
      typeof window !== 'undefined' &&
      'requestIdleCallback' in window
        ? (cb: () => void) => (window as any).requestIdleCallback(cb, { timeout: 200 })
        : (cb: () => void) => window.setTimeout(cb, 80)
    const cancel =
      typeof window !== 'undefined' &&
      'cancelIdleCallback' in window
        ? (id: any) => (window as any).cancelIdleCallback(id)
        : (id: any) => window.clearTimeout(id)
    const id = schedule(() => setMounted(true))
    return () => cancel(id)
  }, [])

  if (!mounted) return null
  return (
    <div style={{ animation: 'gxFadeInAmbient 480ms ease-out both' }}>
      <AmbientGraph density={18} speed={0.4} opacity={0.18} />
      <style jsx>{`
        @keyframes gxFadeInAmbient {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
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
