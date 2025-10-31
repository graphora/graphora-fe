'use client'

import React, { useEffect, useState } from 'react'
import { useBeforeUnload } from '@/hooks/use-before-unload'
import { cn } from '@/lib/utils'
import { Check, ChevronRight, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { SidebarNavigation } from '@/components/navigation/sidebar-navigation'
import { ThemeToggle } from '@/components/ui/theme-toggle'

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
    <div className="relative flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_15%_20%,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_85%_15%,rgba(91,33,182,0.12),transparent_50%),radial-gradient(circle_at_50%_90%,rgba(14,165,233,0.1),transparent_45%)]" aria-hidden />
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
        <div className="sticky top-0 z-30 border-b border-border/70 bg-background/90 shadow-sm supports-[backdrop-filter]:bg-background/70 backdrop-blur">
          <div className="page-shell py-section-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left: Project Info */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-foreground hover:bg-muted/60"
                  onClick={() => router.push('/')}
                >
                  <div className="w-7 h-7 flex items-center justify-center overflow-hidden">
                    <Logo 
                      width={28}
                      height={28}
                      className="w-full h-full"
                    />
                  </div>
                  <span className="font-medium text-foreground">{projectTitle}</span>
                </Button>
              </div>

              {/* Right: Status Indicators and Controls */}
              <div className="flex items-center space-x-3">
                {hasUnsavedChanges && (
                  <Badge variant="warning" tone="soft" className="px-2 py-1">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Unsaved Changes
                  </Badge>
                )}
                <ThemeToggle />
                
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
            <div className="border-t border-border/60 bg-gradient-to-b from-background/95 via-background/85 to-background/75">
              <div className="page-shell py-content-lg">
                <div className="flex items-center justify-center gap-3 overflow-x-auto">
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
                              "flex min-w-[130px] flex-col items-center gap-2 rounded-2xl border border-border/50 bg-muted/40 px-4 py-3 text-center transition-all",
                              isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                              isCurrent && "border-primary/40 bg-primary/10 shadow-soft",
                              isCompleted && !isCurrent && "hover:bg-muted/60"
                            )}
                            onClick={() => handleStepClick(step, index)}
                          >
                            <div className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors",
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
  </div>
  )
}
