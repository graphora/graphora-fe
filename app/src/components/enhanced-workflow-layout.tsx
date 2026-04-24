'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useBeforeUnload } from '@/hooks/use-before-unload'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { PageHeader } from '@/components/layouts/page-header'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import type { Crumb } from '@/components/layouts/top-bar'

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
  /** Kicker shown above the title — uppercase micro-label */
  kicker?: string
  /** Breadcrumbs passed through to the TopBar */
  crumbs?: Crumb[]
  /** Suppress the ambient graph backdrop (full-bleed graph pages) */
  showAmbientGraph?: boolean
}

/**
 * EnhancedWorkflowLayout — shared shell for the multi-step workflow routes
 * (/ontology, /transform, /merge). Renders the Graphora aesthetic:
 * TopBar + ambient graph backdrop (via DashboardLayout), kicker+title
 * PageHeader, and the prototype's workflow stepper — numbered mono circles,
 * accent-active, thin separator lines.
 */
export function EnhancedWorkflowLayout({
  children,
  steps = [],
  currentStepId,
  currentStepIndex: propStepIndex,
  hasUnsavedChanges = false,
  projectTitle = 'Graphora workflow',
  description,
  onStepClick,
  showSidebar = true,
  sidebarCollapsed = true,
  headerActions,
  kicker,
  crumbs,
  showAmbientGraph = true,
}: EnhancedWorkflowLayoutProps) {
  const [stepsCollapsed, setStepsCollapsed] = useState(false)

  const currentStepIndex = useMemo(() => {
    if (currentStepId) return steps.findIndex((s) => s.id === currentStepId)
    if (propStepIndex !== undefined) return propStepIndex
    return 0
  }, [currentStepId, propStepIndex, steps])

  useBeforeUnload(hasUnsavedChanges, 'You have unsaved changes. Are you sure you want to leave?')

  // Change favicon when there are unsaved changes (retained behavior)
  useEffect(() => {
    const originalFavicon =
      document.querySelector('link[rel="icon"]')?.getAttribute('href') || '/favicon.ico'

    if (hasUnsavedChanges) {
      const link =
        (document.querySelector('link[rel="icon"]') as HTMLLinkElement | null) ||
        document.createElement('link')
      link.type = 'image/x-icon'
      link.rel = 'icon'
      link.href = '/favicon-unsaved.ico'
      if (!link.parentNode) document.head.appendChild(link)
    } else {
      const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
      if (link) link.href = originalFavicon
    }

    return () => {
      const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
      if (link) link.href = originalFavicon
    }
  }, [hasUnsavedChanges])

  const handleStepClick = (step: WorkflowStep) => {
    if (step.status === 'blocked' || step.status === 'upcoming') return
    onStepClick?.(step.id)
  }

  const derivedKicker = kicker ?? (steps.length ? `Workflow · Step ${currentStepIndex + 1} of ${steps.length}` : undefined)

  return (
    <DashboardLayout
      showSidebar={showSidebar}
      sidebarCollapsed={sidebarCollapsed}
      showAmbientGraph={showAmbientGraph}
      crumbs={crumbs}
    >
      <div style={{ padding: '28px 32px 24px', maxWidth: 1600 }}>
        <PageHeader
          kicker={derivedKicker}
          title={projectTitle}
          description={description}
          badge={
            hasUnsavedChanges ? (
              <span className="gx-badge warn">
                <span className="tick" /> unsaved
              </span>
            ) : undefined
          }
          actions={
            <>
              {headerActions}
              {steps.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStepsCollapsed((c) => !c)}
                  className="text-xs gap-1.5"
                >
                  {stepsCollapsed ? 'Show steps' : 'Hide steps'}
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', stepsCollapsed && 'rotate-180')}
                  />
                </Button>
              )}
            </>
          }
        />
      </div>

      {steps.length > 0 && !stepsCollapsed && (
        <WorkflowStepper
          steps={steps}
          currentStepIndex={currentStepIndex}
          onStepClick={handleStepClick}
        />
      )}

      <div className="flex-1 min-h-0">{children}</div>
    </DashboardLayout>
  )
}

/**
 * Horizontal workflow stepper — numbered mono circles, accent-active state,
 * thin separator lines between steps. Matches the prototype's `.stepper`.
 */
function WorkflowStepper({
  steps,
  currentStepIndex,
  onStepClick,
}: {
  steps: WorkflowStep[]
  currentStepIndex: number
  onStepClick: (step: WorkflowStep) => void
}) {
  return (
    <div
      className="flex items-center overflow-x-auto"
      style={{
        padding: '14px 32px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg-deep)',
        fontSize: '12.5px',
        gap: 0,
      }}
    >
      {steps.map((step, i) => {
        const isCompleted = i < currentStepIndex || step.status === 'completed'
        const isCurrent = i === currentStepIndex || step.status === 'current'
        const isBlocked = step.status === 'blocked'
        const isClickable = (isCompleted || isCurrent) && !isBlocked

        const state: 'done' | 'active' | 'pending' | 'blocked' = isBlocked
          ? 'blocked'
          : isCurrent
            ? 'active'
            : isCompleted
              ? 'done'
              : 'pending'

        const circleBg =
          state === 'active'
            ? 'var(--bg)'
            : state === 'done'
              ? 'var(--bg-elev-2)'
              : state === 'blocked'
                ? 'color-mix(in oklch, var(--danger), transparent 85%)'
                : 'transparent'
        const circleBorder =
          state === 'active'
            ? 'var(--gx-accent)'
            : state === 'blocked'
              ? 'var(--danger)'
              : 'var(--line-strong)'
        const circleColor =
          state === 'active'
            ? 'var(--gx-accent)'
            : state === 'done'
              ? 'var(--fg-muted)'
              : state === 'blocked'
                ? 'var(--danger)'
                : 'var(--fg-muted)'
        const textColor = state === 'pending' ? 'var(--fg-muted)' : 'var(--fg)'

        return (
          <React.Fragment key={step.id}>
            <Tooltip
              content={
                <div className="space-y-1">
                  <div className="font-medium">{step.title}</div>
                  {step.description && (
                    <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                      {step.description}
                    </div>
                  )}
                  {step.estimatedTime && (
                    <div
                      className="text-xs flex items-center gap-1"
                      style={{ color: 'var(--fg-faint)' }}
                    >
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
                onClick={() => onStepClick(step)}
                className={cn('disabled:cursor-not-allowed')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 'var(--r-sm)',
                  color: textColor,
                  whiteSpace: 'nowrap',
                  transition: 'color var(--dur-1) var(--ease)',
                  opacity: !isClickable && state === 'pending' ? 0.75 : 1,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    display: 'grid',
                    placeItems: 'center',
                    border: `1px solid ${circleBorder}`,
                    borderRadius: '50%',
                    background: circleBg,
                    color: circleColor,
                    fontFamily: 'var(--font-mono), "IBM Plex Mono", monospace',
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                >
                  {state === 'done' ? <Check className="h-[10px] w-[10px]" /> : i + 1}
                </span>
                <span style={{ fontWeight: state === 'active' ? 500 : 400 }}>{step.title}</span>
              </button>
            </Tooltip>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                style={{
                  width: 28,
                  height: 1,
                  background: i < currentStepIndex ? 'var(--fg-faint)' : 'var(--line-strong)',
                  display: 'inline-block',
                }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
