'use client'

import React, { useEffect, useState } from 'react'
import { useBeforeUnload } from '@/hooks/use-before-unload'
import { cn } from '@/lib/utils'
import { Check, ChevronRight, Clock, AlertCircle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
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
  showSidebar?: boolean
  sidebarCollapsed?: boolean
  headerActions?: React.ReactNode
}

export function EnhancedWorkflowLayout({
  children,
  steps = [],
  currentStepId,
  currentStepIndex: propStepIndex,
  hasUnsavedChanges = false,
  projectTitle = "Graphora Workflow",
  onStepClick,
  showSidebar = true,
  sidebarCollapsed = true,
  headerActions,
}: EnhancedWorkflowLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const router = useRouter()
  
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
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.14),transparent_55%),radial-gradient(circle_at_85%_15%,rgba(45,212,191,0.12),transparent_50%),radial-gradient(circle_at_50%_90%,rgba(37,99,235,0.12),transparent_45%)]" aria-hidden />
      {showSidebar && (
        <SidebarNavigation
          defaultCollapsed={sidebarCollapsed}
          className="relative z-20 flex-shrink-0"
        />
      )}

      {/* Main Content */}
      <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-screen flex-col bg-background/92 backdrop-blur-sm">
        {/* Enhanced Header */}
        <div className="sticky top-0 z-30 border-b border-border/40 bg-background/95 shadow-sm backdrop-blur-md">
          <div className="page-shell py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-semibold text-foreground truncate">
                  {projectTitle}
                </h1>
                {hasUnsavedChanges && (
                  <Badge variant="warning" className="px-2 py-0.5 text-xs">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Unsaved
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {headerActions}
                <button
                  type="button"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground hover:bg-background hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span>{isCollapsed ? 'Show steps' : 'Hide steps'}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !isCollapsed && 'rotate-180')} />
                </button>
              </div>
            </div>
          </div>

          {/* Workflow Steps */}
          {!isCollapsed && (
            <div className="border-t border-border/40 bg-muted/20">
              <div className="page-shell py-4">
                <div className="flex items-center justify-center gap-2 overflow-x-auto">
                  {steps.map((step, index) => {
                    const isCompleted = index < currentStepIndex || step.status === 'completed'
                    const isCurrent = index === currentStepIndex || step.status === 'current'
                    const isUpcoming = index > currentStepIndex || step.status === 'upcoming'
                    const isBlocked = step.status === 'blocked'
                    const isClickable = isCompleted || isCurrent
                    
                    return (
                      <div key={step.id} className="flex items-center">
                        {index > 0 && (
                          <div className="flex items-center mx-1.5">
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 transition-colors",
                                isCompleted ? "text-emerald-500" : "text-muted-foreground/40"
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
                              "flex min-w-[100px] flex-col items-center gap-1.5 rounded-lg border px-3 py-2 text-center transition-all",
                              isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                              isCurrent && "border-primary bg-primary/5 shadow-sm",
                              isCompleted && !isCurrent && "border-border/40 bg-background hover:bg-muted/50",
                              !isCompleted && !isCurrent && "border-border/30 bg-muted/30"
                            )}
                            onClick={() => handleStepClick(step, index)}
                          >
                            <div className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                              isCompleted
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : isCurrent
                                  ? "bg-primary/10 border-primary text-primary"
                                  : isBlocked
                                    ? "bg-red-100 border-red-500 text-red-600"
                                    : "bg-muted border-muted-foreground/30 text-muted-foreground"
                            )}>
                              {isCompleted ? (
                                <Check className="h-4 w-4" />
                              ) : isBlocked ? (
                                <AlertCircle className="h-4 w-4" />
                              ) : (
                                <span className="text-xs font-semibold">{index + 1}</span>
                              )}
                            </div>

                            <div className="text-center">
                              <div className={cn(
                                "text-xs font-medium",
                                isCurrent ? "text-primary" :
                                isCompleted ? "text-emerald-600" :
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
  </div>
  )
}
