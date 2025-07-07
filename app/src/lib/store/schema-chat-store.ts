import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// Chat State Machine Types
export type ChatState = 
  | 'welcome'
  | 'data_collection'
  | 'schema_search'
  | 'schema_generation'
  | 'schema_review'
  | 'finalization'

// Question Configuration Types
export interface Question {
  id: string
  type: 'text' | 'select' | 'multiselect' | 'file' | 'textarea'
  prompt: string
  required: boolean
  options?: string[]
  placeholder?: string
  helpText?: string
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
  }
}

export interface QuestionSet {
  id: string
  title: string
  description: string
  questions: Question[]
  conditions?: string[]
}

// Chat Message Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  type?: 'message' | 'question' | 'schema_preview' | 'progress' | 'error'
  metadata?: {
    questionId?: string
    schemaPreview?: string
    progress?: {
      current: number
      total: number
      label: string
    }
    error?: string
    refined_schema?: string
    changes_made?: string[]
    confidence?: number
    [key: string]: any // Allow additional fields
  }
}

// User Response Types
export interface UserResponse {
  questionId: string
  value: string | string[]
  timestamp: Date
  metadata?: {
    questionSetId?: string
    questionIndex?: number
  }
}

// Schema Generation Context
export interface SchemaGenerationContext {
  userResponses: UserResponse[]
  domainContext: string
  useCase: string
  dataTypes: string[]
  complexity: 'simple' | 'moderate' | 'complex' | 'very_complex'
  scale: 'small' | 'medium' | 'large' | 'very_large'
  relatedSchemas?: {
    id: string
    content: string
    similarity: number
  }[]
}

// Schema Generation State
export interface SchemaGenerationState {
  // Chat state
  chatState: ChatState
  messages: ChatMessage[]
  isTyping: boolean
  error: string | null
  
  // Session management
  sessionId: string | null
  isSessionActive: boolean
  
  // Question flow
  currentQuestionSet: number
  currentQuestion: number
  userResponses: UserResponse[]
  isProcessing: boolean
  
  // Schema generation
  generatedSchema: string
  schemaPreview: string
  schemaHistory: { content: string; timestamp: Date }[]
  generationContext: SchemaGenerationContext | null
  
  // UI state
  viewMode: 'chat' | 'split' | 'schema'
  showSchemaPreview: boolean
  isGenerating: boolean
  
  // Progress tracking
  progress: {
    current: number
    total: number
    label: string
  } | null
}

// Store actions
export interface SchemaGenerationActions {
  // Chat actions
  setChatState: (state: ChatState) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void
  clearMessages: () => void
  setIsTyping: (isTyping: boolean) => void
  setError: (error: string | null) => void
  
  // Session actions
  setSessionId: (sessionId: string | null) => void
  setIsSessionActive: (isActive: boolean) => void
  startSession: (contextType: string, initialContext?: any) => Promise<string>
  loadSessionHistory: (sessionId: string) => Promise<void>
  sendChatMessage: (sessionId: string, message: string) => Promise<void>
  
  // Question flow actions
  setCurrentQuestionSet: (index: number) => void
  setCurrentQuestion: (index: number) => void
  addUserResponse: (response: Omit<UserResponse, 'timestamp'>) => void
  updateUserResponse: (questionId: string, value: string | string[]) => void
  clearUserResponses: () => void
  setIsProcessing: (isProcessing: boolean) => void
  
  // Schema generation actions
  setGeneratedSchema: (schema: string) => void
  setSchemaPreview: (preview: string) => void
  addToSchemaHistory: (content: string) => void
  setGenerationContext: (context: SchemaGenerationContext) => void
  
  // UI actions
  setViewMode: (mode: 'chat' | 'split' | 'schema') => void
  setShowSchemaPreview: (show: boolean) => void
  setIsGenerating: (generating: boolean) => void
  
  // Progress actions
  setProgress: (progress: { current: number; total: number; label: string } | null) => void
  
  // Schema refinement actions
  refineSchema: (sessionId: string | null, userRequest: string, initialSchema?: string) => Promise<any>
  
  // Utility actions
  reset: () => void
  canProceedToNextQuestion: () => boolean
  getCurrentQuestionSetData: () => QuestionSet | null
  getCurrentQuestionData: () => Question | null
  getResponsesForCurrentSet: () => UserResponse[]
  getAllResponsesAsContext: () => Record<string, string | string[]>
}

// Configuration for deterministic question flow
export const QUESTION_SETS: QuestionSet[] = [
  {
    id: 'basic_info',
    title: 'Basic Information',
    description: 'Understanding your data and use case',
    questions: [
      {
        id: 'use_case',
        type: 'textarea',
        prompt: 'What is your primary use case for this knowledge graph?',
        required: true,
        placeholder: 'e.g., Analyzing customer relationships, tracking research citations, mapping business processes...',
        helpText: 'Describe what insights you want to gain from your graph',
        validation: {
          minLength: 10,
          maxLength: 1000
        }
      },
      {
        id: 'data_sources',
        type: 'textarea',
        prompt: 'What types of data will you be processing?',
        required: true,
        placeholder: 'e.g., Customer records, financial reports, research papers, emails...',
        helpText: 'List the main data sources and document types',
        validation: {
          minLength: 10,
          maxLength: 1000
        }
      },
      {
        id: 'domain',
        type: 'select',
        prompt: 'Which domain best describes your use case?',
        required: true,
        options: [
          'Business/Enterprise',
          'Healthcare/Medical',
          'Financial/Banking',
          'Research/Academic',
          'Legal/Compliance',
          'Technology/Software',
          'E-commerce/Retail',
          'Manufacturing/Supply Chain',
          'Government/Public Sector',
          'Other'
        ]
      }
    ]
  },
  {
    id: 'graph_requirements',
    title: 'Graph Requirements',
    description: 'Understanding your graph structure needs',
    questions: [
      {
        id: 'key_entities',
        type: 'textarea',
        prompt: 'What are the main entities (people, objects, concepts) in your data?',
        required: true,
        placeholder: 'e.g., Customer, Product, Order, Company, Person, Document...',
        helpText: 'List the main things you want to represent as nodes',
        validation: {
          minLength: 10,
          maxLength: 1000
        }
      },
      {
        id: 'relationships',
        type: 'textarea',
        prompt: 'What are the key relationships between these entities?',
        required: true,
        placeholder: 'e.g., Customer PURCHASED Product, Person WORKS_FOR Company, Document CITES Document...',
        helpText: 'Describe how your entities connect to each other',
        validation: {
          minLength: 10,
          maxLength: 1000
        }
      },
      {
        id: 'query_patterns',
        type: 'textarea',
        prompt: 'What types of questions will you ask your graph?',
        required: true,
        placeholder: 'e.g., Which customers bought similar products? How are these companies connected? What documents cite this research?',
        helpText: 'Examples of queries you plan to run',
        validation: {
          minLength: 10,
          maxLength: 1000
        }
      }
    ]
  },
  {
    id: 'data_specifics',
    title: 'Data Specifics',
    description: 'Details about your data characteristics',
    questions: [
      {
        id: 'data_volume',
        type: 'select',
        prompt: 'What is the approximate scale of your data?',
        required: true,
        options: [
          'Small (< 1K records)',
          'Medium (1K - 100K records)',
          'Large (100K - 1M records)',
          'Very Large (> 1M records)'
        ]
      },
      {
        id: 'data_complexity',
        type: 'select',
        prompt: 'How complex is your data structure?',
        required: true,
        options: [
          'Simple (Few entity types, basic relationships)',
          'Moderate (Multiple entity types, some complex relationships)',
          'Complex (Many entity types, hierarchical relationships, metadata)',
          'Very Complex (Highly interconnected, temporal data, multiple contexts)'
        ]
      },
      {
        id: 'temporal_requirements',
        type: 'select',
        prompt: 'Do you need to track changes over time?',
        required: true,
        options: [
          'No temporal tracking needed',
          'Basic timestamps (created/updated)',
          'Version tracking (track all changes)',
          'Time-series data (events over time)',
          'Bi-temporal (valid time + transaction time)'
        ]
      },
      {
        id: 'sample_data',
        type: 'file',
        prompt: 'Upload a sample of your data (optional)',
        required: false,
        helpText: 'This helps us understand your data format and structure'
      }
    ]
  }
]

// Initial state
const initialState: SchemaGenerationState = {
  chatState: 'welcome',
  messages: [],
  isTyping: false,
  error: null,
  sessionId: null,
  isSessionActive: false,
  currentQuestionSet: 0,
  currentQuestion: 0,
  userResponses: [],
  isProcessing: false,
  generatedSchema: '',
  schemaPreview: '',
  schemaHistory: [],
  generationContext: null,
  viewMode: 'chat',
  showSchemaPreview: false,
  isGenerating: false,
  progress: null
}

// Create the store
export const useSchemaGenerationStore = create<SchemaGenerationState & SchemaGenerationActions>()(
  immer((set, get) => ({
    ...initialState,
    
    // Chat actions
    setChatState: (state) => 
      set((draft) => {
        draft.chatState = state
      }),
    
    addMessage: (message) => 
      set((draft) => {
        const newMessage: ChatMessage = {
          ...message,
          id: Date.now().toString() + Math.random().toString(36),
          timestamp: new Date()
        }
        draft.messages.push(newMessage)
      }),
    
    updateMessage: (messageId, updates) =>
      set((draft) => {
        const messageIndex = draft.messages.findIndex(m => m.id === messageId)
        if (messageIndex !== -1) {
          Object.assign(draft.messages[messageIndex], updates)
        }
      }),
    
    clearMessages: () => 
      set((draft) => {
        draft.messages = []
      }),
    
    setIsTyping: (isTyping) => 
      set((draft) => {
        draft.isTyping = isTyping
      }),
    
    setError: (error) => 
      set((draft) => {
        draft.error = error
      }),
    
    // Session actions
    setSessionId: (sessionId) => 
      set((draft) => {
        draft.sessionId = sessionId
      }),
    
    setIsSessionActive: (isActive) => 
      set((draft) => {
        draft.isSessionActive = isActive
      }),
    
    startSession: async (contextType, initialContext) => {
      try {
        const response = await fetch('/api/v1/chat/sessions/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            context_type: contextType,
            initial_context: initialContext,
            title: `Schema ${contextType} Session`
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to start session')
        }
        
        const data = await response.json()
        
        set((draft) => {
          draft.sessionId = data.session_id
          draft.isSessionActive = true
        })
        
        return data.session_id
      } catch (error) {
        console.error('Error starting session:', error)
        set((draft) => {
          draft.error = error instanceof Error ? error.message : 'Failed to start session'
        })
        throw error
      }
    },
    
    loadSessionHistory: async (sessionId) => {
      try {
        const response = await fetch(`/api/v1/chat/sessions/${sessionId}/history`)
        
        if (!response.ok) {
          throw new Error('Failed to load session history')
        }
        
        const data = await response.json()
        
        set((draft) => {
          draft.sessionId = sessionId
          draft.isSessionActive = true
          draft.messages = data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.type.includes('user') ? 'user' : 'assistant',
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            type: 'message',
            metadata: msg.metadata
          }))
        })
      } catch (error) {
        console.error('Error loading session history:', error)
        set((draft) => {
          draft.error = error instanceof Error ? error.message : 'Failed to load session history'
        })
        throw error
      }
    },
    
    sendChatMessage: async (sessionId, message) => {
      // This is handled by the chat interface directly
      // Just a placeholder for future use
    },
    
    // Question flow actions
    setCurrentQuestionSet: (index) => 
      set((draft) => {
        draft.currentQuestionSet = index
      }),
    
    setCurrentQuestion: (index) => 
      set((draft) => {
        draft.currentQuestion = index
      }),
    
    addUserResponse: (response) => 
      set((draft) => {
        const newResponse: UserResponse = {
          ...response,
          timestamp: new Date()
        }
        draft.userResponses.push(newResponse)
      }),
    
    updateUserResponse: (questionId, value) =>
      set((draft) => {
        const responseIndex = draft.userResponses.findIndex(r => r.questionId === questionId)
        if (responseIndex !== -1) {
          draft.userResponses[responseIndex].value = value
          draft.userResponses[responseIndex].timestamp = new Date()
        }
      }),
    
    clearUserResponses: () => 
      set((draft) => {
        draft.userResponses = []
      }),
    
    setIsProcessing: (isProcessing) => 
      set((draft) => {
        draft.isProcessing = isProcessing
      }),
    
    // Schema generation actions
    setGeneratedSchema: (schema) => 
      set((draft) => {
        draft.generatedSchema = schema
        draft.schemaHistory.push({
          content: schema,
          timestamp: new Date()
        })
      }),
    
    setSchemaPreview: (preview) => 
      set((draft) => {
        draft.schemaPreview = preview
      }),
    
    addToSchemaHistory: (content) => 
      set((draft) => {
        draft.schemaHistory.push({
          content,
          timestamp: new Date()
        })
      }),
    
    setGenerationContext: (context) => 
      set((draft) => {
        draft.generationContext = context
      }),
    
    // UI actions
    setViewMode: (mode) => 
      set((draft) => {
        draft.viewMode = mode
      }),
    
    setShowSchemaPreview: (show) => 
      set((draft) => {
        draft.showSchemaPreview = show
      }),
    
    setIsGenerating: (generating) => 
      set((draft) => {
        draft.isGenerating = generating
      }),
    
    // Progress actions
    setProgress: (progress) => 
      set((draft) => {
        draft.progress = progress
      }),
    
    // Schema refinement actions
    refineSchema: async (sessionId, userRequest, initialSchema) => {
      try {
        set((draft) => {
          draft.isProcessing = true
          draft.error = null
        })
        
        const response = await fetch('/api/v1/chat/schema-refinement', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            initial_schema: initialSchema,
            user_request: userRequest
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to refine schema')
        }
        
        const data = await response.json()
        
        set((draft) => {
          draft.isProcessing = false
          if (data.success) {
            draft.sessionId = data.session_id
            draft.isSessionActive = true
            draft.generatedSchema = data.refined_schema || draft.generatedSchema
            
            // Add the assistant response as a message
            if (data.response_content) {
              const newMessage: ChatMessage = {
                id: data.message_id || Date.now().toString(),
                role: 'assistant',
                content: data.response_content,
                timestamp: new Date(),
                type: 'message',
                metadata: {
                  refined_schema: data.refined_schema,
                  changes_made: data.changes_made,
                  confidence: data.confidence
                }
              }
              draft.messages.push(newMessage)
            }
          } else {
            draft.error = data.error || 'Failed to refine schema'
          }
        })
        
        return data
      } catch (error) {
        console.error('Error refining schema:', error)
        set((draft) => {
          draft.isProcessing = false
          draft.error = error instanceof Error ? error.message : 'Failed to refine schema'
        })
        throw error
      }
    },
    
    // Utility actions
    reset: () => 
      set((draft) => {
        Object.assign(draft, initialState)
      }),
    
    canProceedToNextQuestion: () => {
      const state = get()
      const currentSet = QUESTION_SETS[state.currentQuestionSet]
      const currentQ = currentSet?.questions[state.currentQuestion]
      
      if (!currentQ) return false
      
      const response = state.userResponses.find(r => r.questionId === currentQ.id)
      if (!response) return false
      
      if (currentQ.required && (!response.value || response.value === '')) {
        return false
      }
      
      // Validate based on question type and validation rules
      if (currentQ.validation) {
        if (typeof response.value === 'string') {
          if (currentQ.validation.minLength && response.value.length < currentQ.validation.minLength) {
            return false
          }
          if (currentQ.validation.maxLength && response.value.length > currentQ.validation.maxLength) {
            return false
          }
          if (currentQ.validation.pattern && !new RegExp(currentQ.validation.pattern).test(response.value)) {
            return false
          }
        }
      }
      
      return true
    },
    
    getCurrentQuestionSetData: () => {
      const state = get()
      return QUESTION_SETS[state.currentQuestionSet] || null
    },
    
    getCurrentQuestionData: () => {
      const state = get()
      const currentSet = QUESTION_SETS[state.currentQuestionSet]
      return currentSet?.questions[state.currentQuestion] || null
    },
    
    getResponsesForCurrentSet: () => {
      const state = get()
      const currentSet = QUESTION_SETS[state.currentQuestionSet]
      if (!currentSet) return []
      
      const questionIds = currentSet.questions.map(q => q.id)
      return state.userResponses.filter(r => questionIds.includes(r.questionId))
    },
    
    getAllResponsesAsContext: () => {
      const state = get()
      const context: Record<string, string | string[]> = {}
      
      state.userResponses.forEach(response => {
        context[response.questionId] = response.value
      })
      
      return context
    }
  }))
)

// Helper hooks for specific functionality
export const useSchemaGenerationChat = () => {
  const store = useSchemaGenerationStore()
  
  return {
    // Chat state
    chatState: store.chatState,
    messages: store.messages,
    isTyping: store.isTyping,
    error: store.error,
    
    // Actions
    setChatState: store.setChatState,
    addMessage: store.addMessage,
    clearMessages: store.clearMessages,
    setIsTyping: store.setIsTyping,
    setError: store.setError
  }
}

export const useSchemaGenerationFlow = () => {
  const store = useSchemaGenerationStore()
  
  return {
    // Flow state
    currentQuestionSet: store.currentQuestionSet,
    currentQuestion: store.currentQuestion,
    userResponses: store.userResponses,
    isProcessing: store.isProcessing,
    
    // Actions
    setCurrentQuestionSet: store.setCurrentQuestionSet,
    setCurrentQuestion: store.setCurrentQuestion,
    addUserResponse: store.addUserResponse,
    updateUserResponse: store.updateUserResponse,
    clearUserResponses: store.clearUserResponses,
    setIsProcessing: store.setIsProcessing,
    
    // Utilities
    canProceedToNextQuestion: store.canProceedToNextQuestion,
    getCurrentQuestionSetData: store.getCurrentQuestionSetData,
    getCurrentQuestionData: store.getCurrentQuestionData,
    getResponsesForCurrentSet: store.getResponsesForCurrentSet,
    getAllResponsesAsContext: store.getAllResponsesAsContext
  }
}

export const useSchemaGenerationResults = () => {
  const store = useSchemaGenerationStore()
  
  return {
    // Schema state
    generatedSchema: store.generatedSchema,
    schemaPreview: store.schemaPreview,
    schemaHistory: store.schemaHistory,
    generationContext: store.generationContext,
    isGenerating: store.isGenerating,
    
    // Actions
    setGeneratedSchema: store.setGeneratedSchema,
    setSchemaPreview: store.setSchemaPreview,
    addToSchemaHistory: store.addToSchemaHistory,
    setGenerationContext: store.setGenerationContext,
    setIsGenerating: store.setIsGenerating
  }
}