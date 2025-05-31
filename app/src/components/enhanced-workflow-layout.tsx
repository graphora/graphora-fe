'use client'

import React, { useEffect, useState } from 'react'
import { useBeforeUnload } from '@/hooks/use-before-unload'
import { cn } from '@/lib/utils'
import { Check, ChevronRight, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { SidebarNavigation } from '@/components/navigation/sidebar-navigation'

export type WorkflowStep = {
  id: string
  title: string
  description?: string
  estimatedTime?: string
  status?: 'completed' | 'current' | 'upcoming' | 'blocked'
}

export interface EnhancedWorkflowLayoutProps {
  children: React.ReactNode
  steps: WorkflowStep[]
  currentStepId?: string
  currentStepIndex?: number
  hasUnsavedChanges?: boolean
  projectTitle?: string
  onStepClick?: (stepId: string) => void
}

export function EnhancedWorkflowLayout({
  children,
  steps = [],
  currentStepId,
  currentStepIndex: propStepIndex,
  hasUnsavedChanges = false,
  projectTitle = "Graphora Workflow",
  onStepClick,
}: EnhancedWorkflowLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  
  // Calculate current step index based on either currentStepId or currentStepIndex prop
  const currentStepIndex = currentStepId 
    ? steps.findIndex(step => step.id === currentStepId) 
    : propStepIndex !== undefined 
      ? propStepIndex 
      : 0;

  useBeforeUnload(
    hasUnsavedChanges,
    'You have unsaved changes. Are you sure you want to leave?'
  )

  // Change favicon when there are unsaved changes
  useEffect(() => {
    const originalFavicon = document.querySelector('link[rel="icon"]')?.getAttribute('href') || '/favicon.ico'
    
    if (hasUnsavedChanges) {
      const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement || document.createElement('link')
      link.type = 'image/x-icon'
      link.rel = 'icon'
      link.href = '/favicon-unsaved.ico'
      document.head.appendChild(link)
    } else {
      const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      if (link) link.href = originalFavicon
    }
    
    return () => {
      const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      if (link) link.href = originalFavicon
    }
  }, [hasUnsavedChanges])

  const handleStepClick = (step: WorkflowStep, index: number) => {
    if (step.status === 'blocked' || step.status === 'upcoming') return
    if (onStepClick) {
      onStepClick(step.id)
    }
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Collapsed Sidebar */}
      <SidebarNavigation />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Header */}
        <div className="bg-background border-b border-border shadow-sm">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Project Info */}
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-foreground">{projectTitle}</span>
              </div>

              {/* Right: Status Indicators and Controls */}
              <div className="flex items-center space-x-3">
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unsaved Changes
                  </Badge>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isCollapsed ? 'Expand Steps' : 'Collapse Steps'}
                </Button>
              </div>
            </div>
          </div>

          {/* Workflow Steps */}
          {!isCollapsed && (
            <div className="border-t border-border bg-muted/30">
              <div className="px-4 py-6">
                <div className="flex items-center justify-center space-x-2 overflow-x-auto">
                  {steps.map((step, index) => {
                    const isCompleted = index < currentStepIndex || step.status === 'completed'
                    const isCurrent = index === currentStepIndex || step.status === 'current'
                    const isUpcoming = index > currentStepIndex || step.status === 'upcoming'
                    const isBlocked = step.status === 'blocked'
                    const isClickable = isCompleted || isCurrent
                    
                    return (
                      <div key={step.id} className="flex items-center">
                        {index > 0 && (
                          <div className="flex items-center mx-3">
                            <ChevronRight 
                              className={cn(
                                "h-5 w-5 transition-colors",
                                isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                              )} 
                            />
                          </div>
                        )}
                        
                        <Tooltip
                          content={
                            <div className="space-y-1">
                              <div className="font-medium">{step.title}</div>
                              {step.description && (
                                <div className="text-sm text-muted-foreground">{step.description}</div>
                              )}
                              {step.estimatedTime && (
                                <div className="text-xs text-muted-foreground flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {step.estimatedTime}
                                </div>
                              )}
                            </div>
                          }
                        >
                          <div
                            className={cn(
                              "flex flex-col items-center space-y-2 p-3 rounded-lg transition-all min-w-[120px]",
                              isClickable ? "cursor-pointer" : "cursor-not-allowed",
                              isCurrent && "bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800/50",
                              isCompleted && !isCurrent && "hover:bg-muted/50"
                            )}
                            onClick={() => handleStepClick(step, index)}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                              isCompleted 
                                ? "bg-emerald-100 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400"
                                : isCurrent 
                                  ? "bg-blue-100 dark:bg-blue-950/30 border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-400"
                                  : isBlocked
                                    ? "bg-red-100 dark:bg-red-950/30 border-red-500 dark:border-red-600 text-red-700 dark:text-red-400"
                                    : "bg-muted border-muted-foreground/30 text-muted-foreground"
                            )}>
                              {isCompleted ? (
                                <Check className="h-5 w-5" />
                              ) : isBlocked ? (
                                <AlertCircle className="h-5 w-5" />
                              ) : (
                                <span className="text-sm font-semibold">{index + 1}</span>
                              )}
                            </div>
                            
                            <div className="text-center">
                              <div className={cn(
                                "text-sm font-medium",
                                isCurrent ? "text-blue-700 dark:text-blue-400" : 
                                isCompleted ? "text-emerald-700 dark:text-emerald-400" : 
                                "text-muted-foreground"
                              )}>
                                {step.title}
                              </div>
                            </div>
                          </div>
                        </Tooltip>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
} 