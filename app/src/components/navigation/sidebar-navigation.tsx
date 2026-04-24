'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Database,
  Zap,
  Bot,
  Settings,
  Sigma,
  LogOut,
  Search,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { UserButton } from '@/components/ui/user-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Tooltip } from '@/components/ui/tooltip'
import { useUser, useAuth, isAuthBypassEnabled } from '@/hooks/useAuth'

interface NavigationItem {
  id: string
  name: string
  icon: React.ReactNode
  path: string
  description?: string
  count?: string
}

interface NavigationSection {
  label: string
  items: NavigationItem[]
}

interface SidebarNavigationProps {
  className?: string
  defaultCollapsed?: boolean
}

const STORAGE_KEY = 'graphora-sidebar-collapsed'
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0-dev'

const NAV_SECTIONS: NavigationSection[] = [
  {
    label: 'Workspace',
    items: [
      { id: 'dashboard', name: 'Dashboard', path: '/dashboard', icon: <Home className="h-[14px] w-[14px]" />, description: 'Pipeline overview and KPIs' },
      { id: 'ontologies', name: 'Ontologies', path: '/ontologies', icon: <Database className="h-[14px] w-[14px]" />, description: 'Knowledge graph schemas' },
      { id: 'run-workflow', name: 'Run workflow', path: '/ontology', icon: <Zap className="h-[14px] w-[14px]" />, description: 'Start a new graph build — Ontology → Transform → Merge' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'schema-chat', name: 'Schema chat', path: '/schema-chat', icon: <Bot className="h-[14px] w-[14px]" />, description: 'Author schemas with AI' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'usage', name: 'Usage', path: '/usage', icon: <Sigma className="h-[14px] w-[14px]" />, description: 'LLM usage and cost' },
      { id: 'config', name: 'Configuration', path: '/config', icon: <Settings className="h-[14px] w-[14px]" />, description: 'System settings and preferences' },
    ],
  },
]

export function SidebarNavigation({ className, defaultCollapsed = false }: SidebarNavigationProps) {
  const pathname = usePathname()

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        return stored === '1'
      }
    }
    return defaultCollapsed
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === null) {
      window.localStorage.setItem(STORAGE_KEY, defaultCollapsed ? '1' : '0')
    }
  }, [defaultCollapsed])

  const isActivePath = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  const toggle = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    }
  }

  return (
    <aside
      className={cn(
        'relative sticky top-0 flex h-screen flex-col overflow-hidden transition-[width] duration-200 ease-out',
        isCollapsed ? 'w-[4.25rem]' : 'w-60',
        className,
      )}
      style={{
        background: 'var(--rail-bg)',
        borderRight: '1px solid var(--line)',
      }}
    >
      {/* Header: brand + collapse */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--line)' }}
      >
        {!isCollapsed ? (
          <div className="flex items-center gap-[10px]">
            <Logo width={24} height={24} className="flex-shrink-0" />
            <span className="font-medium" style={{ fontSize: '14.5px', letterSpacing: '-0.01em' }}>
              Graphora
            </span>
            <span className="gx-faint" style={{ fontSize: 11, fontWeight: 400 }}>/ v{APP_VERSION.split('-')[0]}</span>
          </div>
        ) : (
          <div className="mx-auto">
            <Logo width={26} height={26} />
          </div>
        )}
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="h-7 w-7 p-0"
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft className="h-3.5 w-3.5" style={{ color: 'var(--fg-muted)' }} />
          </Button>
        )}
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div
          className="flex items-center"
          style={{
            margin: '12px 14px',
            padding: '7px 10px',
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            gap: 8,
            color: 'var(--fg-subtle)',
            fontSize: '12.5px',
          }}
        >
          <Search className="h-[13px] w-[13px]" />
          <span>Jump to…</span>
          <kbd
            className="gx-mono"
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              padding: '2px 6px',
              border: '1px solid var(--line)',
              borderRadius: 4,
              color: 'var(--fg-faint)',
              background: 'var(--bg-deep)',
            }}
          >
            ⌘K
          </kbd>
        </div>
      )}

      {isCollapsed && (
        <div className="flex justify-center" style={{ margin: '12px 0' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="h-8 w-8 p-0"
            aria-label="Expand sidebar"
          >
            <ChevronsRight className="h-3.5 w-3.5" style={{ color: 'var(--fg-muted)' }} />
          </Button>
        </div>
      )}

      {/* Sections */}
      <div className="flex flex-1 flex-col overflow-y-auto" style={{ paddingBottom: 8 }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!isCollapsed && (
              <div
                style={{
                  padding: '16px 18px 6px',
                  fontSize: '10.5px',
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-faint)',
                }}
              >
                {section.label}
              </div>
            )}
            <nav className="flex flex-col" style={{ padding: isCollapsed ? '8px 10px' : '0 8px' }}>
              {section.items.map((item) => {
                const active = isActivePath(item.path)
                // `<Link prefetch>` triggers route prefetch on hover AND on
                // viewport-enter, dramatically reducing cold-click wait in dev
                // mode — `router.push(path)` only starts compiling after click.
                const btn = (
                  <Link
                    key={item.id}
                    href={item.path}
                    prefetch
                    className={cn('gx-rail-item relative', active && 'is-active')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isCollapsed ? 0 : 10,
                      padding: isCollapsed ? '8px 0' : '7px 10px',
                      borderRadius: 'var(--r-sm)',
                      color: active ? 'var(--fg)' : 'var(--fg-muted)',
                      background: active ? 'var(--bg-elev-2)' : 'transparent',
                      boxShadow: active ? 'inset 0 0 0 1px var(--line-strong)' : 'none',
                      fontSize: '12.5px',
                      fontWeight: 400,
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      width: '100%',
                      transition: 'background var(--dur-1) var(--ease), color var(--dur-1) var(--ease)',
                      textDecoration: 'none',
                    }}
                  >
                    {active && !isCollapsed && (
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute',
                          left: -1,
                          top: 7,
                          bottom: 7,
                          width: 2,
                          background: 'var(--gx-accent)',
                          borderRadius: 2,
                        }}
                      />
                    )}
                    <span style={{ flex: '0 0 14px', display: 'grid', placeItems: 'center', opacity: active ? 1 : 0.9 }}>
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.name}</span>
                        {item.count && (
                          <span
                            className="gx-mono"
                            style={{
                              marginLeft: 'auto',
                              fontSize: 10,
                              color: 'var(--fg-faint)',
                              padding: '1px 5px',
                              border: '1px solid var(--line)',
                              borderRadius: 4,
                              lineHeight: 1.2,
                            }}
                          >
                            {item.count}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                )

                if (isCollapsed && item.description) {
                  return (
                    <Tooltip
                      key={item.id}
                      side="right"
                      content={
                        <div className="space-y-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{item.description}</div>
                        </div>
                      }
                    >
                      {btn}
                    </Tooltip>
                  )
                }
                return btn
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="mt-auto flex items-center"
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--line)',
          gap: 10,
          fontSize: '12.5px',
          color: 'var(--fg-muted)',
        }}
      >
        {!isCollapsed ? (
          <>
            <div className="min-w-0 flex-1">
              <UserFooter />
            </div>
            <ThemeToggle />
          </>
        ) : (
          <div className="mx-auto flex flex-col items-center gap-2">
            <UserButton />
            <ThemeToggle />
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div
          className="gx-mono"
          style={{
            padding: '0 14px 12px',
            fontSize: 10,
            letterSpacing: '0.08em',
            color: 'var(--fg-faint)',
          }}
        >
          v{APP_VERSION}
        </div>
      )}
    </aside>
  )
}

/**
 * Footer user row: solid mono-initials avatar (no gradient — AI-slop tell),
 * name + workspace, sign-out affordance.
 */
function UserFooter() {
  const { user } = useUser()
  const { signOut } = useAuth()

  const name = user?.fullName || user?.firstName || 'Welcome'
  const email = user?.primaryEmailAddress?.emailAddress || 'local@graphora'
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'GX'

  const handleSignOut = () => {
    if (isAuthBypassEnabled) return
    signOut?.()
  }

  return (
    <div className="flex items-center gap-[10px]">
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'var(--bg-elev-2)',
          border: '1px solid var(--line-strong)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--fg)',
          fontWeight: 500,
          fontSize: '10.5px',
          fontFamily: 'var(--font-mono), "IBM Plex Mono", monospace',
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate" style={{ color: 'var(--fg)', fontWeight: 500, fontSize: '12.5px', lineHeight: 1.15 }}>
          {name}
        </div>
        <div className="truncate" style={{ color: 'var(--fg-faint)', fontSize: 11, lineHeight: 1.15 }}>
          {email}
        </div>
      </div>
      {!isAuthBypassEnabled && (
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="transition-colors"
          style={{
            color: 'var(--fg-faint)',
            padding: 4,
            borderRadius: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-faint)')}
        >
          <LogOut className="h-[14px] w-[14px]" />
        </button>
      )}
    </div>
  )
}
