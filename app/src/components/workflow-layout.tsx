'use client'

import { usePathname } from 'next/navigation'
import { NavigationSystem } from '@/components/navigation/navigation-system'
import { ProgressBar } from '@/components/progress-bar'
import type { WorkflowStep } from '@/components/navigation/workflow-header'

interface WorkflowLayoutProps {
  children: React.ReactNode
  progress?: number
  currentStep?: string
  toolbarContent?: React.ReactNode
  hasUnsavedChanges?: boolean
}

export function WorkflowLayout({ 
  children, 
  progress, 
  currentStep, 
  toolbarContent,
  hasUnsavedChanges = false 
}: WorkflowLayoutProps) {
  const pathname = usePathname()

  const workflowSteps: WorkflowStep[] = [
    {
      id: 'ontology',
      label: 'Ontology Entry',
      path: '/ontology',
      status: pathname === '/ontology' ? 'current' : 
             pathname === '/transform' || pathname === '/merge' ? 'completed' : 'upcoming'
    },
    {
      id: 'transform',
      label: 'Document Upload',
      path: '/transform',
      status: pathname === '/transform' && !progress ? 'current' : 
             pathname === '/merge' ? 'completed' : 
             pathname === '/ontology' ? 'upcoming' : 'completed'
    },
    {
      id: 'edit',
      label: 'Graph Editing',
      path: '/transform',
      status: pathname === '/transform' && progress ? 'current' : 
             pathname === '/merge' ? 'completed' : 'upcoming'
    },
    {
      id: 'merge',
      label: 'Merge Process',
      path: '/merge',
      status: pathname === '/merge' ? 'current' : 'upcoming'
    }
  ]

  const currentStepIndex = workflowSteps.findIndex(step => step.status === 'current')

  return (
    <div className="h-screen flex flex-col">
      {/* Navigation System */}
      <NavigationSystem
        steps={workflowSteps}
        currentStep={currentStepIndex}
        progress={progress}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Toolbar Content */}
      {toolbarContent && (
        <div className="border-b bg-white">
          <div className="container mx-auto px-4 py-2">
            {toolbarContent}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden page-transition">
        {children}
      </div>
    </div>
  )
}
