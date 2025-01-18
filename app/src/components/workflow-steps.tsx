'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type WorkflowStep = {
  id: string
  label: string
  path: string
  status: 'completed' | 'current' | 'upcoming'
}

interface WorkflowStepsProps {
  steps: WorkflowStep[]
  className?: string
}

export function WorkflowSteps({ steps, className }: WorkflowStepsProps) {
  const router = useRouter()

  const handleStepClick = (step: WorkflowStep) => {
    if (step.status === 'completed') {
      router.push(step.path)
    }
  }

  return (
    <div className={cn('w-full bg-white shadow-sm', className)}>
      <div className="container mx-auto px-4">
        <div className="flex items-center py-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => handleStepClick(step)}
                disabled={step.status === 'upcoming'}
                className={cn(
                  'flex items-center gap-2 px-3 py-1 rounded-full transition-colors',
                  step.status === 'completed' && 'text-green-600 hover:bg-green-50 cursor-pointer',
                  step.status === 'current' && 'text-blue-600',
                  step.status === 'upcoming' && 'text-gray-400 cursor-not-allowed'
                )}
              >
                {step.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : step.status === 'current' ? (
                  <Circle className="h-5 w-5 fill-current" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-400 mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
