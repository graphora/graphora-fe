'use client'

import { usePathname } from 'next/navigation'
import { WorkflowSteps, type WorkflowStep } from '@/components/workflow-steps'
import { ProgressBar } from '@/components/progress-bar'

interface WorkflowLayoutProps {
  children: React.ReactNode
  progress?: number
  currentStep?: string
}

export function WorkflowLayout({ children, progress, currentStep }: WorkflowLayoutProps) {
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

  return (
    <div className="h-screen flex flex-col">
      {/* Workflow Steps */}
      <WorkflowSteps steps={workflowSteps} className="border-b" />

      {/* Progress Bar - only show if progress is provided */}
      {typeof progress === 'number' && currentStep && (
        <ProgressBar
          progress={progress}
          status={currentStep}
          className="px-4 py-2 border-b bg-white"
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
