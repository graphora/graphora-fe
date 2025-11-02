'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  Database,
  Zap,
  Bot
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { UserButton } from '@/components/ui/user-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'

interface NavigationItem {
  id: string
  name: string
  icon: React.ReactNode
  path: string
  badge?: string
  description?: string
  isActive?: boolean
}

interface SidebarNavigationProps {
  className?: string
  defaultCollapsed?: boolean
}

const STORAGE_KEY = 'graphora-sidebar-collapsed'

export function SidebarNavigation({ className, defaultCollapsed = true }: SidebarNavigationProps) {
  const router = useRouter()
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

  const allNavigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: <Home className="w-5 h-5" />,
      path: '/dashboard',
      description: 'Main dashboard overview'
    },
    {
      id: 'ai-schema-generator',
      name: 'AI Schema Generator',
      icon: <Bot className="w-5 h-5" />,
      path: '/schema-chat',
      badge: 'New',
      description: 'Generate schemas using AI conversation'
    },
    {
      id: 'ontologies',
      name: 'Ontology Library',
      icon: <Database className="w-5 h-5" />,
      path: '/ontologies',
      description: 'Manage your knowledge graph ontologies'
    },
    {
      id: 'run-workflow',
      name: 'Run Workflow',
      icon: <Zap className="w-5 h-5" />,
      path: '/ontology',
      description: 'Start the knowledge graph workflow'
    },
    {
      id: 'configuration',
      name: 'Configuration',
      icon: <Settings className="w-5 h-5" />,
      path: '/config',
      description: 'System settings and preferences'
    }
  ]

  // Filter navigation items based on visibility settings
  const navigationItems = allNavigationItems

  const isActivePath = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  const handleNavigation = (path: string) => {
    if (path.startsWith('mailto:')) {
      window.location.href = path
    } else {
      router.push(path)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setIsCollapsed(stored === '1')
    } else {
      window.localStorage.setItem(STORAGE_KEY, defaultCollapsed ? '1' : '0')
    }
  }, [defaultCollapsed])

  const NavItem = ({ item }: { item: NavigationItem }) => {
    const isActive = isActivePath(item.path)
    
    const content = (
      <button
        onClick={() => handleNavigation(item.path)}
        className={cn(
          "flex items-center transition-all duration-200 group border border-transparent",
          isCollapsed
            ? "justify-center px-0 py-2.5 w-12 h-12 mx-auto rounded-2xl"
            : "w-full space-x-3 px-3 py-2.5 rounded-xl text-left",
          isActive
            ? isCollapsed
              ? "bg-gradient-to-br from-white/65 via-white/35 to-transparent text-slate-900 shadow-[0_14px_32px_rgba(14,116,144,0.22)] ring-1 ring-inset ring-white/55 font-semibold dark:from-cyan-300/45 dark:via-cyan-300/20 dark:to-transparent dark:text-slate-50 dark:ring-cyan-100/50 dark:shadow-[0_20px_36px_rgba(12,148,186,0.34)]"
              : "bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.7))] text-slate-900 shadow-[0_20px_44px_rgba(14,116,144,0.26)] ring-1 ring-inset ring-white/60 font-semibold dark:bg-[linear-gradient(135deg,rgba(82,215,255,0.38),rgba(34,211,238,0.22))] dark:text-slate-950 dark:ring-cyan-100/45 dark:shadow-[0_26px_52px_rgba(12,148,186,0.38)]"
            : isCollapsed
              ? "text-muted-foreground hover:text-foreground hover:bg-white/12 dark:hover:bg-white/14"
              : "text-muted-foreground hover:text-foreground hover:bg-white/18 dark:hover:bg-white/10"
        )}
      >
        <div className={cn(
          "flex-shrink-0 transition-colors",
          isActive
            ? "text-slate-900 drop-shadow-[0_0_6px_rgba(94,234,212,0.35)] dark:text-slate-50"
            : "text-muted-foreground group-hover:text-foreground"
        )}>
          {item.icon}
        </div>

        {!isCollapsed && (
          <>
            <span
              className={cn(
                "flex-1 font-medium text-body-sm transition-colors",
                isActive ? "text-slate-900 dark:text-white" : "text-muted-foreground"
              )}
            >
              {item.name}
            </span>
            {item.badge && (
              <Badge variant="info" className="text-body-xs">
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </button>
    )

    if (isCollapsed && item.description) {
      return (
        <Tooltip
          content={
            <div className="space-y-1">
              <div className="font-medium">{item.name}</div>
              <div className="text-body-sm text-muted-foreground">{item.description}</div>
            </div>
          }
          side="right"
        >
          {content}
        </Tooltip>
      )
    }

    return content
  }

  const handleToggleCollapse = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    }
  }

  return (
    <aside
      className={cn(
        "relative group/sidebar sticky top-0 flex h-screen flex-col overflow-y-auto bg-background/90 backdrop-blur-panel shadow-[0_38px_68px_rgba(8,47,73,0.28)] transition-all duration-300 before:absolute before:top-0 before:right-0 before:h-full before:w-px before:bg-gradient-to-b before:from-white/15 before:via-white/8 before:to-transparent before:opacity-70",
        isCollapsed ? "w-[4.25rem]" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-4 after:pointer-events-none after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/15 after:to-transparent">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
              <Logo 
                width={96}
                height={96}
                className="w-full h-full"
              />
            </div>
            <div>
              <div className="font-semibold text-foreground">Graphora</div>
              <div className="text-body-xs text-muted-foreground">Knowledge Graph Platform</div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleCollapse}
            className="text-muted-foreground hover:text-foreground p-1.5"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex flex-1 flex-col px-3 pb-6 pt-4">
        <div className="flex-1 space-y-1.5">
          {navigationItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>

        {/* Need Help Section - integrated into main flow */}
        {!isCollapsed && (
          <div className="mt-6 rounded-xl bg-gradient-to-br from-white/12 via-white/6 to-transparent p-3 shadow-[0_18px_42px_rgba(8,47,73,0.18)] ring-1 ring-white/8">
            <div className="text-body-sm font-medium text-foreground mb-1">
              Need Help?
            </div>
            <div className="text-body-xs text-muted-foreground mb-2">
              Check our documentation or contact support
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-body-xs"
              onClick={() => window.open('https://docs.graphora.io/', '_blank')}
            >
              View Docs
            </Button>
            <div className="mt-2 text-body-xs text-muted-foreground">
              Email: <a href="mailto:support@graphora.io" className="text-primary hover:underline">support@graphora.io</a>
            </div>
          </div>
        )}
      </div>

      {/* User Section */}
      <div className="relative px-4 py-4 before:pointer-events-none before:absolute before:top-0 before:left-4 before:right-4 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/12 before:to-transparent">
        <div className={cn(
          'flex items-center',
          isCollapsed ? 'justify-center' : 'justify-between gap-2'
        )}>
          {!isCollapsed ? (
            <>
              <div className="flex flex-1 items-center space-x-2">
                <UserButton />
                <div className="flex-1 min-w-0">
                  <div className="text-body-sm font-medium text-foreground truncate">
                    Welcome back
                  </div>
                </div>
              </div>
              <ThemeToggle />
            </>
          ) : (
            <UserButton />
          )}
        </div>

        {isCollapsed ? (
          <div className="mt-3 flex flex-col items-center gap-2 text-body-xs text-muted-foreground">
            <ThemeToggle />
            <span>Version 2.0.1</span>
          </div>
        ) : (
          <div className="mt-3 text-body-xs text-muted-foreground">
            <span>Version 2.0.1</span>
          </div>
        )}
      </div>

    </aside>
  )
} 
