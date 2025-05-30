'use client'

import React, { useEffect, useState } from 'react'
import { useBeforeUnload } from '@/hooks/use-before-unload'
import { cn } from '@/lib/utils'
import { Check, Home, ChevronRight, Clock, AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'

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
  const [isCollapsed, setIsCollapsed] = useState(false)
  
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
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Enhanced Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
            {/* Left: Home Navigation */}
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              <div className="h-6 w-px bg-slate-300" />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">G</span>
                </div>
                <span className="font-semibold text-slate-900">{projectTitle}</span>
              </div>
            </div>

            {/* Right: Status Indicators */}
            <div className="flex items-center space-x-3">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
              
              {/* Configuration Link */}
              <Link href="/config">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                  <Settings className="h-4 w-4 mr-2" />
                  Config
                </Button>
              </Link>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-slate-600 hover:text-slate-900"
              >
                {isCollapsed ? 'Expand Steps' : 'Collapse Steps'}
              </Button>
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        {!isCollapsed && (
          <div className="border-t border-slate-100 bg-slate-50/50">
            <div className="px-6 py-6">
              <div className="max-w-screen-2xl mx-auto">
                <div className="flex items-center justify-center space-x-2">
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
                                "h-4 w-4 transition-colors",
                                isCompleted ? "text-emerald-500" : 
                                isCurrent ? "text-blue-500" : 
                                "text-slate-300"
                              )}
                            />
                          </div>
                        )}
                        
                        <Tooltip
                          content={
                            <div className="space-y-1">
                              <div className="font-medium">{step.title}</div>
                              {step.description && (
                                <div className="text-sm text-slate-600">{step.description}</div>
                              )}
                              {step.estimatedTime && (
                                <div className="text-xs text-slate-500">
                                  Estimated time: {step.estimatedTime}
                                </div>
                              )}
                            </div>
                          }
                          side="bottom"
                        >
                          <button
                            onClick={() => handleStepClick(step, index)}
                            disabled={!isClickable}
                            className={cn(
                              "flex flex-col items-center space-y-2 p-4 rounded-xl transition-all duration-200 min-w-[140px]",
                              isClickable && "hover:bg-white hover:shadow-sm cursor-pointer",
                              !isClickable && "cursor-not-allowed opacity-60",
                              isCurrent && "bg-white shadow-sm ring-2 ring-blue-100"
                            )}
                          >
                            <div 
                              className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-200",
                                isCompleted && "bg-emerald-500 border-emerald-500 text-white shadow-sm",
                                isCurrent && "border-blue-500 bg-blue-50 text-blue-600",
                                isUpcoming && "border-slate-300 bg-slate-50 text-slate-400",
                                isBlocked && "border-red-300 bg-red-50 text-red-500"
                              )}
                            >
                              {isCompleted ? (
                                <Check className="h-5 w-5" />
                              ) : isBlocked ? (
                                <AlertCircle className="h-5 w-5" />
                              ) : (
                                <span>{index + 1}</span>
                              )}
                            </div>
                            
                            <div className="text-center">
                              <div 
                                className={cn(
                                  "text-sm font-medium transition-colors",
                                  isCurrent && "text-blue-600",
                                  isCompleted && "text-emerald-600",
                                  isUpcoming && "text-slate-500",
                                  isBlocked && "text-red-500"
                                )}
                              >
                                {step.title}
                              </div>
                              {step.estimatedTime && (
                                <div className="flex items-center justify-center mt-1 text-xs text-slate-400">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {step.estimatedTime}
                                </div>
                              )}
                            </div>
                          </button>
                        </Tooltip>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {children}
      </main>
    </div>
  )
} 