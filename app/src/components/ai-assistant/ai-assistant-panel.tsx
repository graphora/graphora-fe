'use client'

import { useState } from 'react'
import { type AIAssistantState, type Suggestion } from '@/lib/types/ai-assistant'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SuggestionCard } from './suggestion-card'
import { ChevronLeft, ChevronRight, Gauge, Sparkles, Zap } from 'lucide-react'
import { CircularProgress } from './circular-progress'

interface AIAssistantPanelProps {
  state: AIAssistantState
  onStateChange: (state: Partial<AIAssistantState>) => void
  onApplySuggestion: (id: string) => void
  onDismissSuggestion: (id: string) => void
  onExplainSuggestion: (id: string) => void
  onCustomizeSuggestion: (id: string) => void
}

export function AIAssistantPanel({
  state,
  onStateChange,
  onApplySuggestion,
  onDismissSuggestion,
  onExplainSuggestion,
  onCustomizeSuggestion
}: AIAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'patterns' | 'quality'>('suggestions')

  const getQualityLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Improvement'
  }

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  return (
    <div 
      className={cn(
        'flex flex-col h-full bg-gray-900 border-l border-gray-800',
        'transition-all duration-300',
        state.isCompact ? 'w-[60px]' : 'w-[320px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {!state.isCompact && <h2 className="text-sm font-medium">AI Assistant</h2>}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onStateChange({ isCompact: !state.isCompact })}
          className="ml-auto"
        >
          {state.isCompact ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Tabs */}
      {!state.isCompact && (
        <div className="flex border-b border-gray-800">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'flex-1 rounded-none border-b-2 border-transparent',
              activeTab === 'suggestions' && 'border-blue-500'
            )}
            onClick={() => setActiveTab('suggestions')}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Suggestions
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'flex-1 rounded-none border-b-2 border-transparent',
              activeTab === 'patterns' && 'border-blue-500'
            )}
            onClick={() => setActiveTab('patterns')}
          >
            <Zap className="h-4 w-4 mr-2" />
            Patterns
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'flex-1 rounded-none border-b-2 border-transparent',
              activeTab === 'quality' && 'border-blue-500'
            )}
            onClick={() => setActiveTab('quality')}
          >
            <Gauge className="h-4 w-4 mr-2" />
            Quality
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {state.isCompact ? (
          <div className="flex flex-col items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={() => setActiveTab('suggestions')}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={() => setActiveTab('patterns')}
            >
              <Zap className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={() => setActiveTab('quality')}
            >
              <Gauge className="h-4 w-4" />
            </Button>
          </div>
        ) : activeTab === 'suggestions' ? (
          <div className="space-y-4">
            {state.suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApply={onApplySuggestion}
                onDismiss={onDismissSuggestion}
                onExplain={onExplainSuggestion}
                onCustomize={onCustomizeSuggestion}
                isSelected={suggestion.id === state.selectedSuggestion}
              />
            ))}
          </div>
        ) : activeTab === 'patterns' ? (
          <div className="space-y-4">
            {state.activePatterns.map((pattern) => (
              <div
                key={pattern.id}
                className="p-4 rounded-lg border border-gray-800 bg-gray-800/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-sm">{pattern.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {pattern.description}
                    </p>
                  </div>
                  <div className="confidence-indicator">
                    {[1, 2, 3].map((level) => (
                      <span
                        key={level}
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          level <= Math.round(pattern.confidence * 3)
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <CircularProgress
                value={state.qualityMetrics.score}
                size={120}
                strokeWidth={10}
                color={getQualityColor(state.qualityMetrics.score)}
              />
              <div className="mt-4 text-center">
                <div className={cn('text-2xl font-semibold', getQualityColor(state.qualityMetrics.score))}>
                  {state.qualityMetrics.score}%
                </div>
                <div className="text-sm text-gray-500">
                  {getQualityLabel(state.qualityMetrics.score)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Completeness</label>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${state.qualityMetrics.components.completeness}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Consistency</label>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${state.qualityMetrics.components.consistency}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Optimization</label>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all duration-300"
                    style={{ width: `${state.qualityMetrics.components.optimization}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-500">Best Practices</label>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${state.qualityMetrics.components.bestPractices}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
