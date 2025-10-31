'use client'

import React, { useState } from 'react'
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

export function SidebarNavigation({ className, defaultCollapsed = true }: SidebarNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

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

  const NavItem = ({ item }: { item: NavigationItem }) => {
    const isActive = isActivePath(item.path)
    
    const content = (
      <button
        onClick={() => handleNavigation(item.path)}
        className={cn(
          "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left group border border-transparent",
          isActive 
            ? "bg-primary/12 text-foreground font-medium shadow-soft border-primary/40 dark:bg-white/10 dark:border-white/15" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          isCollapsed && "justify-center px-2"
        )}
      >
        <div className={cn(
          "flex-shrink-0 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}>
          {item.icon}
        </div>

        {!isCollapsed && (
          <>
            <span className="flex-1 font-medium text-body-sm">{item.name}</span>
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

  return (
    <aside
      className={cn(
        "group/sidebar sticky top-0 flex h-screen flex-col overflow-y-auto border-r border-border/60 bg-background/90 backdrop-blur-panel shadow-soft transition-all duration-300",
        isCollapsed ? "w-[4.25rem]" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
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
          {!isCollapsed && (
            <ThemeToggle />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
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
          <div className="mt-6 rounded-xl border border-border/50 bg-muted/50 p-3 shadow-soft">
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
      <div className="border-t border-border/60 px-4 py-3">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2 flex-1">
              <UserButton />
              <div className="flex-1 min-w-0">
                <div className="text-body-sm font-medium text-foreground truncate">
                  Welcome back
                </div>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex justify-center">
              <UserButton />
            </div>
          )}
          
        </div>

        {isCollapsed ? (
          <div className="mt-2 flex justify-center">
            <ThemeToggle />
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-end text-body-xs text-muted-foreground">
            <span>Version 2.0.1</span>
          </div>
        )}
      </div>

    </aside>
  )
} 
