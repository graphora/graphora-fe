'use client'

import { MainHeader } from './main-header'
import { WorkflowHeader } from './workflow-header'
import type { WorkflowStep } from './workflow-header'

interface NavigationSystemProps {
  steps: WorkflowStep[]
  currentStep: number
  progress?: number
  hasUnsavedChanges?: boolean
}

export function NavigationSystem({ steps, currentStep, progress, hasUnsavedChanges }: NavigationSystemProps) {
  return (
    <div className="navigation-system">
      <MainHeader hasUnsavedChanges={hasUnsavedChanges} />
      <WorkflowHeader steps={steps} currentStep={currentStep} progress={progress} />

      <style jsx global>{`
        .navigation-system {
          position: sticky;
          top: 0;
          z-index: 50;
          background: white;
        }

        /* Dropdown Animation */
        .profile-dropdown {
          @apply origin-top-right;
          animation: dropdownEnter 200ms ease-out;
        }

        @keyframes dropdownEnter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* Page Transition */
        .page-transition {
          animation: pageEnter 300ms ease-out;
        }

        @keyframes pageEnter {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
