'use client'

import { type Suggestion } from '@/lib/types/ai-assistant'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Check, X, MessageCircle, Settings2 } from 'lucide-react'

interface SuggestionCardProps {
  suggestion: Suggestion
  onApply: (id: string) => void
  onDismiss: (id: string) => void
  onExplain: (id: string) => void
  onCustomize: (id: string) => void
  isSelected?: boolean
}

export function SuggestionCard({
  suggestion,
  onApply,
  onDismiss,
  onExplain,
  onCustomize,
  isSelected
}: SuggestionCardProps) {
  const { id, priority, type, content } = suggestion

  return (
    <div
      className={cn(
        'p-4 rounded-lg border-l-4 mb-3',
        'transition-all duration-200',
        'hover:shadow-md',
        priority === 'high' && 'border-l-red-500 bg-red-50/10',
        priority === 'medium' && 'border-l-amber-500 bg-amber-50/10',
        priority === 'low' && 'border-l-blue-500 bg-blue-50/10',
        isSelected && 'ring-2 ring-gray-100'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-sm">{content.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{content.description}</p>
        </div>
        <div className="flex gap-1">
          <div className="confidence-indicator">
            {[1, 2, 3].map((level) => (
              <span
                key={level}
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  level <= Math.round(content.confidence * 3)
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => onApply(id)}
        >
          <Check className="h-3 w-3 mr-1" />
          Apply
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => onDismiss(id)}
        >
          <X className="h-3 w-3 mr-1" />
          Dismiss
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => onExplain(id)}
        >
          <MessageCircle className="h-3 w-3 mr-1" />
          Explain
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => onCustomize(id)}
        >
          {/* <Settings2 className="h-3 w-3 mr-1" />
          Customize */}
        </Button>
      </div>

      {isSelected && (
        <div className="impact-preview mt-2 p-3 rounded-md bg-gray-100 border border-gray-10">
          <p className="text-xs text-gray-500">Expected Impact</p>
          <p className="text-sm mt-1">{content.impact}</p>
        </div>
      )}
    </div>
  )
}
