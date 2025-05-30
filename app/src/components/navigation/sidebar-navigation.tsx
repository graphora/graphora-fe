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
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'

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

export function SidebarNavigation({ className, defaultCollapsed = false }: SidebarNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  const navigationItems: NavigationItem[] = [
    {
      id: 'home',
      name: 'Dashboard',
      icon: <Home className="w-5 h-5" />,
      path: '/',
      description: 'Main dashboard overview'
    },
    {
      id: 'ontology',
      name: 'Ontology',
      icon: <Database className="w-5 h-5" />,
      path: '/ontology',
      description: 'Define your graph structure'
    },
    {
      id: 'transform',
      name: 'Transform',
      icon: <Zap className="w-5 h-5" />,
      path: '/transform',
      description: 'Upload and process documents'
    },
    {
      id: 'merge',
      name: 'Merge',
      icon: <GitMerge className="w-5 h-5" />,
      path: '/merge',
      description: 'Combine data into final graph'
    },
    {
      id: 'domain-apps',
      name: 'Domain Apps',
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/domain-apps',
      description: 'Visualize domain-specific insights'
    },
    {
      id: 'chat',
      name: 'AI Assistant',
      icon: <MessageSquare className="w-5 h-5" />,
      path: '/chat',
      badge: 'Beta',
      description: 'Chat with AI about your data'
    }
  ]

  const secondaryItems: NavigationItem[] = [
    {
      id: 'config',
      name: 'Configuration',
      icon: <Settings className="w-5 h-5" />,
      path: '/config',
      description: 'System settings and preferences'
    },
    {
      id: 'help',
      name: 'Help & Support',
      icon: <HelpCircle className="w-5 h-5" />,
      path: '/help',
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
    router.push(path)
  }

  const NavItem = ({ item }: { item: NavigationItem }) => {
    const isActive = isActivePath(item.path)
    
    const content = (
      <button
        onClick={() => handleNavigation(item.path)}
        className={cn(
          "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left group",
          isActive 
            ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" 
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
          isCollapsed && "justify-center px-2"
        )}
      >
        <div className={cn(
          "flex-shrink-0 transition-colors",
          isActive ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"
        )}>
          {item.icon}
        </div>
        
        {!isCollapsed && (
          <>
            <span className="flex-1 font-medium text-sm">{item.name}</span>
            {item.badge && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
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
              <div className="text-sm text-slate-600">{item.description}</div>
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
      "flex flex-col bg-white border-r border-slate-200 transition-all duration-300 h-full",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">G</span>
            </div>
            <div>
              <div className="font-semibold text-slate-900">Graphora</div>
              <div className="text-xs text-slate-500">Knowledge Graph Platform</div>
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-500 hover:text-slate-700 p-1.5"
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
        <div className="my-4 border-t border-slate-200" />

        {/* Secondary Items */}
        <div className="space-y-1">
          {secondaryItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-200">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm font-medium text-slate-900 mb-1">
              Need Help?
            </div>
            <div className="text-xs text-slate-600 mb-2">
              Check our documentation or contact support
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs">
              View Docs
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 