export type SuggestionPriority = 'high' | 'medium' | 'low'
export type SuggestionType = 'pattern' | 'improvement' | 'validation'

export interface Suggestion {
  id: string
  priority: SuggestionPriority
  type: SuggestionType
  content: {
    title: string
    description: string
    impact: string
    confidence: number
  }
}

export interface QualityMetrics {
  score: number
  components: {
    completeness: number
    consistency: number
    optimization: number
    bestPractices: number
  }
  improvements: Suggestion[]
  history: Array<{
    timestamp: number
    score: number
  }>
}

export interface Pattern {
  id: string
  name: string
  description: string
  confidence: number
  type: 'domain' | 'structure' | 'semantic'
  matches: Array<{
    path: string
    score: number
  }>
}

export interface AIAssistantState {
  isExpanded: boolean
  isCompact: boolean
  suggestions: Suggestion[]
  activePatterns: Pattern[]
  qualityMetrics: QualityMetrics
  selectedSuggestion?: string
}
