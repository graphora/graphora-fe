'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function ProgressSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const stages = [
    { label: 'Domain Identified', complete: true },
    { label: 'Template Selected', complete: true },
    { label: 'Entities Defined', complete: false },
    { label: 'Relationships Defined', complete: false },
    { label: 'Validation Complete', complete: false }
  ]

  const metrics = {
    completeness: 40,
    complexity: 60,
    confidence: 80
  }

  return (
    <div
      className={cn(
        'border-r bg-background transition-all duration-300',
        isCollapsed ? 'w-12' : 'w-80'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className={cn('font-semibold', isCollapsed && 'hidden')}>
          Progress
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>

      <div className={cn('p-4', isCollapsed && 'hidden')}>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Stages</h3>
            <ul className="space-y-2">
              {stages.map((stage, index) => (
                <li
                  key={index}
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    stage.complete ? 'text-green-600' : 'text-gray-500'
                  )}
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      stage.complete ? 'bg-green-600' : 'bg-gray-300'
                    )}
                  />
                  {stage.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Metrics</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Completeness</span>
                  <span>{metrics.completeness}%</span>
                </div>
                <Progress value={metrics.completeness} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Complexity</span>
                  <span>{metrics.complexity}%</span>
                </div>
                <Progress value={metrics.complexity} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Confidence</span>
                  <span>{metrics.confidence}%</span>
                </div>
                <Progress value={metrics.confidence} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
