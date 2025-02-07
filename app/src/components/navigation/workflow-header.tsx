'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface WorkflowStep {
  id: string
  label: string
  path: string
  status: 'upcoming' | 'current' | 'completed'
}

interface WorkflowHeaderProps {
  steps: WorkflowStep[]
  currentStep: number
  progress?: number
}

export function WorkflowHeader({ steps, currentStep, progress }: WorkflowHeaderProps) {
  const pathname = usePathname()

  return (
    <nav className="h-12 px-6 bg-white border-b border-gray-100 flex items-center gap-1 sticky top-14 z-40">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {index > 0 && (
              <div className="w-8 h-px bg-gray-300 mx-2" />
            )}
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150',
                step.status === 'current' && 'bg-blue-50 text-blue-700',
                step.status === 'completed' && 'text-green-700',
                step.status === 'upcoming' && 'text-gray-400'
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  step.status === 'current' && 'bg-blue-500',
                  step.status === 'completed' && 'bg-green-500',
                  step.status === 'upcoming' && 'bg-gray-300'
                )}
              />
              {step.label}
              {step.status === 'current' && progress !== undefined && (
                <span className="text-xs text-gray-500 ml-1">
                  ({Math.round(progress)}%)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}
