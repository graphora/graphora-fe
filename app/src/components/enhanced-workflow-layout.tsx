'use client'

import React, { useEffect, useState } from 'react'
import { useBeforeUnload } from '@/hooks/use-before-unload'
import { cn } from '@/lib/utils'
import { Check, Clock, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { PageHeader } from '@/components/layouts/page-header'
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
  description?: string
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
  description,
  onStepClick,
  showSidebar = true,
  sidebarCollapsed = true,
  headerActions,
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
    <div className="flex h-screen overflow-hidden bg-background">
      {showSidebar && (
        <SidebarNavigation
          defaultCollapsed={sidebarCollapsed}
          className="flex-shrink-0"
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full flex-col">
          <PageHeader
            title={projectTitle}
            description={description}
            badge={hasUnsavedChanges ? "Unsaved Changes" : undefined}
            actions={
              <div className="flex items-center gap-3">
                {headerActions}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="text-xs"
                >
                  <span>{isCollapsed ? 'Show steps' : 'Hide steps'}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 ml-1.5 transition-transform', !isCollapsed && 'rotate-180')} />
                </Button>
              </div>
            }
          />

          {/* Workflow Steps */}
          {!isCollapsed && (
            <div className="bg-muted/30">
              <div className="page-shell py-4">
                <div className="flex items-center justify-center gap-2 overflow-x-auto">
                  {steps.map((step, index) => {
                    const isCompleted = index < currentStepIndex || step.status === 'completed'
                    const isCurrent = index === currentStepIndex || step.status === 'current'
                    const isBlocked = step.status === 'blocked'
                    const isClickable = isCompleted || isCurrent
                    
                    return (
                      <div key={step.id} className="flex items-center gap-4">
                        <Tooltip
                          content={
                            <div className="space-y-1">
                              <div className="font-medium">{step.title}</div>
                              {step.description && (
                                <div className="text-sm text-muted-foreground">{step.description}</div>
                              )}
                              {step.estimatedTime && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {step.estimatedTime}
                                </div>
                              )}
                            </div>
                          }
                        >
                          <button
                            type="button"
                            disabled={!isClickable}
                            onClick={() => handleStepClick(step, index)}
                            className={cn(
                              'flex min-w-[100px] flex-col items-center gap-1 rounded-lg px-3 py-2 text-center transition-all',
                              'disabled:cursor-not-allowed disabled:opacity-60',
                              isCompleted && 'bg-emerald-500/10 text-emerald-600',
                              isCurrent && 'bg-primary/10 text-primary',
                              !isCompleted && !isCurrent && !isBlocked && 'bg-muted/50 text-muted-foreground',
                              isBlocked && 'bg-destructive/10 text-destructive'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
                                isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : isCurrent
                                    ? 'bg-primary text-primary-foreground'
                                    : isBlocked
                                      ? 'bg-destructive/20 text-destructive'
                                      : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                            </span>
                            <span className="text-[11px] font-medium leading-tight text-current">
                              {step.title}
                            </span>
                          </button>
                        </Tooltip>
                        {index < steps.length - 1 && (
                          <span className="h-px w-8 flex-shrink-0 bg-muted-foreground/20" aria-hidden />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-auto min-h-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
