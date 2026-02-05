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
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0-dev'

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
          "flex items-center transition-colors duration-150 group",
          isCollapsed
            ? "justify-center w-10 h-10 mx-auto rounded-lg"
            : "w-full gap-3 px-3 py-2 rounded-lg text-left",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <div className={cn(
          "flex-shrink-0 transition-colors",
          isActive
            ? "text-primary dark:text-primary"
            : "text-muted-foreground group-hover:text-foreground"
        )}>
          {item.icon}
        </div>

        {!isCollapsed && (
          <>
            <span className="flex-1 text-sm">
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
        "relative group/sidebar sticky top-0 flex h-screen flex-col overflow-y-auto bg-background transition-all duration-200",
        isCollapsed ? "w-[4.25rem]" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
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

        {/* Need Help Section */}
        {!isCollapsed && (
          <div className="mt-6 p-3">
            <div className="text-body-xs text-muted-foreground mb-2">
              Need help? <a href="https://docs.graphora.io/" target="_blank" rel="noreferrer" className="text-primary hover:underline">View docs</a>
            </div>
          </div>
        )}
      </div>

      {/* User Section */}
      <div className="px-4 py-4">
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
            <span>Version {APP_VERSION}</span>
          </div>
        ) : (
          <div className="mt-3 text-body-xs text-muted-foreground">
            <span>Version {APP_VERSION}</span>
          </div>
        )}
      </div>

    </aside>
  )
} 
