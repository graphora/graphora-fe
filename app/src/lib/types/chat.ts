export type MessageType = 'welcome' | 'question' | 'suggestion' | 'confirmation'

export interface Message {
  id: string
  type: MessageType
  content: string
  sender: 'user' | 'assistant'
  timestamp: number
  choices?: Choice[]
  skippable?: boolean
  helpLink?: string
  preview?: ReactNode
  typing?: boolean
  actions?: string[]
}

export interface Choice {
  label: string
  value: string
  description?: string
  icon?: string
}

export interface BuildingStep {
  type: 'entity' | 'relationship' | 'property'
  question: string
  visualization?: ReactNode
  suggestions: string[]
  validation: (answer: string) => boolean
  nextStep: (answer: string) => BuildingStep
}

export interface Progress {
  stages: {
    domainIdentified: boolean
    templateSelected: boolean
    entitiesDefined: boolean
    relationshipsDefined: boolean
    validationComplete: boolean
  }
  metrics: {
    completeness: number
    complexity: number
    confidence: number
  }
  visualFeedback: {
    type: 'progress' | 'success' | 'warning'
    message: string
    action?: () => void
  }
}

export interface ErrorState {
  type: 'noUnderstanding' | 'lowConfidence' | 'timeout'
  message: string
  suggestions?: string[]
  requireConfirmation?: boolean
  action?: 'resume' | 'restart'
  fallbackAction?: () => void
}

export const welcomeFlow = {
  initial: {
    message: "Hi! I'm Graph Guru! 👋 Let's build your knowledge graph together!",
    typing: true,
    delay: 1000
  },
  dataType: {
    message: "First, what kind of data are you working with?",
    choices: [
      {
        label: "Financial Documents",
        value: "financial",
        description: "Form 13, 10K, 8K"
      },
      {
        label: "Patient Records",
        value: "patient",
        description: "Patient notes, lab results, prescriptions"
      },
      {
        label: "Inventory Lists",
        value: "inventory",
        description: "Excel, Google Sheets"
      }
    ]
  }
}

export interface DomainDetection {
  confidence: number
  domain: string
  subDomains: string[]
  suggestedTemplates: string[]
  domains: {
    financial: string[]
    healthcare: string[]
    legal: string[]
  }
}
