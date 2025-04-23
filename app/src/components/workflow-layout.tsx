'use client'

import React from 'react'
import { ReactNode, useEffect } from 'react'
import { useBeforeUnload } from '@/hooks/use-before-unload'
import { cn } from '@/lib/utils'
import { Check, Home } from 'lucide-react'
import Link from 'next/link'

export type WorkflowStep = {
  id: string
  title: string
  description?: string
}

export interface WorkflowLayoutProps {
  children: React.ReactNode
  steps: WorkflowStep[]
  currentStepId?: string
  currentStepIndex?: number
  hasUnsavedChanges?: boolean
}

export function WorkflowLayout({
  children,
  steps = [],
  currentStepId,
  currentStepIndex: propStepIndex,
  hasUnsavedChanges = false,
}: WorkflowLayoutProps) {
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

  return (
    <div className="flex flex-col h-full">
      <div className="bg-background border-b px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto relative">
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
            <Link href="/">
              <div className="flex items-center text-muted-foreground hover:text-foreground transition-colors pr-4">
                <Home className="h-5 w-5 mr-1.5" />
                <span className="text-sm font-medium">Home</span>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center justify-center flex-grow">
            {Array.isArray(steps) && steps.length > 0 ? steps.map((step, index) => {
              const isCompleted = index < currentStepIndex
              const isCurrent = index === currentStepIndex
              const isUpcoming = index > currentStepIndex
              
              return (
                <div key={step.id} className="flex items-center">
                  {index > 0 && (
                    <div className="flex items-center mx-2 sm:mx-4">
                      <div 
                        className={cn(
                          "h-[2px] w-14 sm:w-20 transition-all duration-500",
                          isCompleted ? "bg-primary" : 
                          isCurrent ? "bg-gradient-to-r from-primary to-muted" : 
                          "bg-muted"
                        )}
                      />
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center relative group">
                    <div 
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all duration-300",
                        isCompleted && "bg-primary border-primary text-primary-foreground shadow-md",
                        isCurrent && "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
                        isUpcoming && "border-muted bg-background text-muted-foreground hover:border-muted/80"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className={cn(
                          "font-semibold",
                          isCurrent && "text-primary"
                        )}>{index + 1}</span>
                      )}
                    </div>
                    
                    <span 
                      className={cn(
                        "text-sm mt-2 font-medium transition-colors duration-300 whitespace-nowrap",
                        isCurrent && "text-primary",
                        isCompleted && "text-primary",
                        isUpcoming && "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                    
                    {step.description && (
                      <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg max-w-[140px] text-center pointer-events-none">
                        {step.description}
                      </div>
                    )}
                  </div>
                </div>
              )
            }) : (
              <div className="text-sm text-muted-foreground">No workflow steps defined</div>
            )}
          </div>
        </div>
      </div>
      
      {/* {hasUnsavedChanges && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-800 text-sm flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse mr-2"></div>
          You have unsaved changes
        </div>
      )} */}
      
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
