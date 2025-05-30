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
  FileText,
  GitMerge,
  Database,
  Zap,
  MessageSquare,
  BarChart3,
  Users,
  HelpCircle,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { UserButton } from '@/components/ui/user-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

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

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: <Home className="w-5 h-5" />,
      path: '/dashboard',
      description: 'Main dashboard overview'
    },
    {
      id: 'ai-assistant',
      name: 'AI Assistant',
      icon: <MessageSquare className="w-5 h-5" />,
      path: '/chat',
      badge: 'WIP',
      description: 'Chat with AI about your data'
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
      id: 'applications',
      name: 'Applications',
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/domain-apps',
      description: 'Visualize domain-specific insights'
    },
    {
      id: 'configuration',
      name: 'Configuration',
      icon: <Settings className="w-5 h-5" />,
      path: '/config',
      description: 'System settings and preferences'
    }
  ]

  const secondaryItems: NavigationItem[] = [
    {
      id: 'help',
      name: 'Help & Support',
      icon: <HelpCircle className="w-5 h-5" />,
      path: 'mailto:ezhil@graphora.io',
      description: 'Documentation and support'
    }
  ]

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
          "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left group",
          isActive 
            ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-100 dark:border-blue-800" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
          isCollapsed && "justify-center px-2"
        )}
      >
        <div className={cn(
          "flex-shrink-0 transition-colors",
          isActive ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground group-hover:text-foreground"
        )}>
          {item.icon}
        </div>
        
        {!isCollapsed && (
          <>
            <span className="flex-1 font-medium text-sm">{item.name}</span>
            {item.badge && (
              <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
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
              <div className="text-sm text-muted-foreground">{item.description}</div>
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
    <div className={cn(
      "flex flex-col bg-background border-r border-border transition-all duration-300 h-full",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">G</span>
            </div>
            <div>
              <div className="font-semibold text-foreground">Graphora</div>
              <div className="text-xs text-muted-foreground">Knowledge Graph Platform</div>
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-muted-foreground hover:text-foreground p-1.5"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 flex flex-col p-4 space-y-1">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-border" />

        {/* Secondary Items */}
        <div className="space-y-1">
          {secondaryItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Footer */}
      {/* User Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          {!isCollapsed && (
            <div className="flex items-center space-x-2 flex-1">
              <UserButton />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
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
          
          {!isCollapsed && (
            <div className="flex items-center space-x-1">
              <ThemeToggle />
            </div>
          )}
        </div>
        
        {isCollapsed && (
          <div className="flex justify-center mt-2">
            <ThemeToggle />
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <div className="bg-muted rounded-lg p-3">
            <div className="text-sm font-medium text-foreground mb-1">
              Need Help?
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              Check our documentation or contact support
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => window.open('https://docs.graphora.io/', '_blank')}
            >
              View Docs
            </Button>
            <div className="mt-2 text-xs text-muted-foreground">
              Email: <a href="mailto:support@graphora.io" className="text-primary hover:underline">support@graphora.io</a>
            </div>
          </div>
        </div>
      )}

      {/* Version Info */}
      {!isCollapsed && (
        <div className="p-4">
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs text-muted-foreground">
              Version 2.0.1
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 