'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EnhancedWorkflowLayout, WorkflowStep } from '@/components/enhanced-workflow-layout'
import { VisualEditor } from '@/components/ontology/visual-editor'
import { YAMLEditor } from '@/components/ontology/yaml-editor'
import { useOntologyEditorStore } from '@/lib/store/ontology-editor-store'
import { 
  useSchemaGenerationStore,
  useSchemaGenerationChat,
  useSchemaGenerationFlow,
  useSchemaGenerationResults,
  QUESTION_SETS,
  type ChatState,
  type ChatMessage,
  type UserResponse
} from '@/lib/store/schema-chat-store'
import { ChatMessage as ChatMessageComponent } from '@/components/schema-chat/chat-message'
import { QuestionInput } from '@/components/schema-chat/question-input'


// Progress steps for the stepper
const PROGRESS_STEPS = [
  { id: 'data_collection', label: 'Data Collection' },
  { id: 'schema_search', label: 'Schema Search' },
  { id: 'schema_generation', label: 'Schema Generation' },
  { id: 'schema_review', label: 'Review & Refine' },
  { id: 'finalization', label: 'Finalize' }
]

export default function SchemaChatPage() {
  const router = useRouter()
  const { user } = useUser()
  const { updateFromYaml, yaml } = useOntologyEditorStore()
  
  // Schema generation store hooks
  const {
    chatState,
    messages,
    isTyping,
    error,
    sessionId,
    isSessionActive,
    setChatState,
    addMessage,
    updateMessage,
    setIsTyping,
    setError,
    startSession,
    refineSchema
  } = useSchemaGenerationStore()
  
  const {
    currentQuestionSet,
    currentQuestion,
    userResponses,
    isProcessing,
    setCurrentQuestionSet,
    setCurrentQuestion,
    addUserResponse,
    updateUserResponse,
    setIsProcessing,
    canProceedToNextQuestion,
    getCurrentQuestionSetData,
    getCurrentQuestionData,
    getAllResponsesAsContext
  } = useSchemaGenerationFlow()
  
  const {
    generatedSchema,
    schemaPreview,
    isGenerating,
    setGeneratedSchema,
    setIsGenerating
  } = useSchemaGenerationResults()
  
  const {
    viewMode,
    showSchemaPreview,
    setViewMode,
    setShowSchemaPreview
  } = useSchemaGenerationStore()
  
  // Local UI state
  const [currentInput, setCurrentInput] = useState('')
  const [showPreviousResponses, setShowPreviousResponses] = useState(false)
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus chat input when schema is generated and state changes to schema_review
  useEffect(() => {
    if (generatedSchema && chatState === 'schema_review' && chatInputRef.current) {
      // Small delay to ensure the component is rendered
      const timer = setTimeout(() => {
        chatInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [generatedSchema, chatState])

  // Initialize chat - only once on mount
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (messages.length === 0 && !hasInitialized.current) {
      hasInitialized.current = true
      addMessage({
        role: 'assistant',
        content: `Welcome to the AI Schema Generator! 🤖

I'll help you create a knowledge graph schema tailored to your specific use case. This is a guided process where I'll ask you structured questions to understand your data and requirements.

Here's how it works:
1. **Data Collection**: I'll ask about your use case, data sources, and requirements
2. **Schema Search**: I'll find similar schemas from our knowledge base
3. **Schema Generation**: I'll create a custom schema based on your needs
4. **Review & Refine**: You can visualize and modify the schema through chat
5. **Finalize**: Export to the ontology editor for further customization

Ready to get started? Click "Begin" to start the process.`,
        type: 'message'
      })
    }
  }, [])

  const addTypingMessage = () => {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
    }, 1000)
  }

  const handleBegin = () => {
    setChatState('data_collection')
    setCurrentQuestionSet(0)
    setCurrentQuestion(0)
    
    const firstQuestionSet = QUESTION_SETS[0]
    const firstQuestion = firstQuestionSet.questions[0]
    
    addMessage({
      role: 'assistant',
      content: `Great! Let's start by understanding your use case and data.

**${firstQuestionSet.title}**
${firstQuestionSet.description}

${firstQuestion.prompt}

${firstQuestion.helpText ? `💡 ${firstQuestion.helpText}` : ''}`,
      type: 'question',
      metadata: {
        questionId: firstQuestion.id
      }
    })
  }

  const handleUserResponse = (response: string | string[]) => {
    const currentQ = getCurrentQuestionData()
    if (!currentQ) return
    
    // Add user message
    const displayValue = Array.isArray(response) ? response.join(', ') : response
    addMessage({
      role: 'user',
      content: displayValue
    })

    // Store response
    addUserResponse({
      questionId: currentQ.id,
      value: response
    })

    // Move to next question
    const nextQuestion = currentQuestion + 1
    const currentSet = getCurrentQuestionSetData()
    
    if (currentSet && nextQuestion < currentSet.questions.length) {
      // Next question in current set
      setCurrentQuestion(nextQuestion)
      const nextQ = currentSet.questions[nextQuestion]
      
      setTimeout(() => {
        addMessage({
          role: 'assistant',
          content: `${nextQ.prompt}

${nextQ.helpText ? `💡 ${nextQ.helpText}` : ''}`,
          type: 'question',
          metadata: {
            questionId: nextQ.id
          }
        })
      }, 200)
      
    } else if (currentQuestionSet + 1 < QUESTION_SETS.length) {
      // Next question set
      setCurrentQuestionSet(currentQuestionSet + 1)
      setCurrentQuestion(0)
      
      setTimeout(() => {
        const nextSet = QUESTION_SETS[currentQuestionSet + 1]
        addMessage({
          role: 'assistant',
          content: `Perfect! Now let's move to the next section.

**${nextSet.title}**
${nextSet.description}

${nextSet.questions[0].prompt}

${nextSet.questions[0].helpText ? `💡 ${nextSet.questions[0].helpText}` : ''}`,
          type: 'question',
          metadata: {
            questionId: nextSet.questions[0].id
          }
        })
      }, 200)
      
    } else {
      // All questions completed - move to schema search
      setChatState('schema_search')
      setTimeout(() => {
        handleSchemaSearch()
      }, 200)
    }
  }

  const handleSchemaSearch = async () => {
    addMessage({
      role: 'assistant',
      content: `Excellent! I have all the information I need. Now I'll search for similar schemas and generate a custom one for your use case.

🔍 **Searching similar schemas...**`,
      type: 'progress',
      metadata: {
        progress: { current: 1, total: 3, label: 'Searching schemas' }
      }
    })

    setChatState('schema_generation')
    setTimeout(() => {
      handleSchemaGeneration()
    }, 500)
  }

  const handleSchemaGeneration = async () => {
    addMessage({
      role: 'assistant',
      content: `✨ **Generating your custom schema...**

Based on your responses, I'm creating a schema optimized for your use case.`,
      type: 'progress',
      metadata: {
        progress: { current: 2, total: 3, label: 'Generating schema' }
      }
    })

    setIsProcessing(true)
    setIsGenerating(true)
    
    try {
      // Call the schema generation API
      const response = await fetch('/api/v1/schema-generation/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userResponses: userResponses.map(r => ({
            questionId: r.questionId,
            value: r.value
          })),
          context: {
            domain: getAllResponsesAsContext().domain,
            useCase: getAllResponsesAsContext().use_case,
            dataTypes: [],
            complexity: getAllResponsesAsContext().data_complexity,
            scale: getAllResponsesAsContext().data_volume
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate schema')
      }

      const data = await response.json()
      const generatedSchema = data.schema
      
      setGeneratedSchema(generatedSchema)
      updateFromYaml(generatedSchema)
      
      setChatState('schema_review')
      setIsProcessing(false)
      setIsGenerating(false)
      
      // Start a refinement session for multi-turn conversation
      try {
        await startSession('schema_refinement', {
          initial_schema: generatedSchema,
          generation_context: getAllResponsesAsContext()
        })
        
        addMessage({
          role: 'assistant',
          content: `🎉 **Schema generated successfully!**

I've created a custom schema based on your requirements. The schema includes ${data.relatedSchemas?.length || 0} similar schemas for reference.

**Confidence Score**: ${Math.round((data.confidence || 0.85) * 100)}%

Now we can work together to refine it! You can:

✨ **Ask me to modify anything:**
- "Add timestamps to all entities"
- "Create a relationship between Customer and Product"
- "Make email fields required"
- "Remove deprecated properties"

📋 **Or use these options:**
1. **Preview** the schema visually
2. **Export** to the ontology editor
3. **Continue refining** through conversation

What would you like to modify or explore first?`,
          type: 'schema_preview',
          metadata: {
            schemaPreview: generatedSchema
          }
        })
      } catch (error) {
        console.error('Failed to start refinement session:', error)
        // Fallback to original message
        addMessage({
          role: 'assistant',
          content: `🎉 **Schema generated successfully!**

I've created a custom schema based on your requirements. The schema includes ${data.relatedSchemas?.length || 0} similar schemas for reference.

**Confidence Score**: ${Math.round((data.confidence || 0.85) * 100)}%

You can now:

1. **Preview** the schema in the chat
2. **Visualize** it as a graph
3. **Edit** it through natural language
4. **Export** to the ontology editor when ready

Would you like to see the schema preview?`,
          type: 'schema_preview',
          metadata: {
            schemaPreview: generatedSchema
          }
        })
      }
      
    } catch (error) {
      console.error('Schema generation error:', error)
      setError('Failed to generate schema. Please try again.')
      setIsProcessing(false)
      setIsGenerating(false)
    }
  }

  const generateMockSchema = (): string => {
    // Generate a mock schema based on user responses
    const responses = getAllResponsesAsContext()

    return `version: 0.1.0
entities:
  # Generated based on your use case: ${responses.use_case || 'Not specified'}
  
  Entity:
    properties:
      id:
        type: str
        description: Unique identifier
        unique: true
        required: true
      name:
        type: str
        description: Entity name
        required: true
      created_at:
        type: date
        description: Creation timestamp
        required: true
    relationships:
      RELATES_TO:
        target: Entity
        properties:
          relationship_type:
            type: str
            description: Type of relationship
            required: true
          strength:
            type: float
            description: Relationship strength (0-1)
            required: false

  # Add more entities based on your requirements...
  # This is a starting point that you can customize`
  }

  const handleShowPreview = () => {
    setShowSchemaPreview(true)
    setViewMode('split')
  }

  const handleExportToEditor = () => {
    router.push('/ontology')
  }

  const handleSendMessage = () => {
    if (!currentInput.trim()) return
    
    if (chatState === 'data_collection') {
      handleUserResponse(currentInput)
    } else if (chatState === 'schema_review') {
      // Handle schema refinement chat
      handleSchemaRefinement(currentInput)
    }
    
    setCurrentInput('')
  }

  const handleSchemaRefinement = async (input: string) => {
    // Add user message
    addMessage({
      role: 'user',
      content: input
    })

    try {
      setIsProcessing(true)
      
      // Use the real multi-turn refinement API
      await refineSchema(
        sessionId, // Current session ID
        input, // User's refinement request
        generatedSchema || undefined // Current schema state
      )
      
    } catch (error) {
      console.error('Schema refinement error:', error)
      addMessage({
        role: 'assistant',
        content: `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}

Please try rephrasing your request or be more specific about the changes you'd like to make.`
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEditMessage = (messageId: string, newContent: string) => {
    // Update the message in the store
    updateMessage(messageId, { content: newContent })
    
    // If it's a user message in the schema review phase, we might want to re-process it
    const message = messages.find(m => m.id === messageId)
    if (message && message.role === 'user' && chatState === 'schema_review') {
      // Optionally, you could re-send the edited message for processing
      // handleSchemaRefinement(newContent)
    }
  }

  const getCurrentProgress = () => {
    const stateToStep = {
      'welcome': 0,
      'data_collection': 1,
      'schema_search': 2,
      'schema_generation': 3,
      'schema_review': 4,
      'finalization': 5
    }
    return stateToStep[chatState] || 0
  }

  const workflowSteps: WorkflowStep[] = [
    { 
      id: 'schema-generation', 
      title: 'Schema Generation', 
      description: 'AI-powered schema creation',
      status: 'current'
    },
    { 
      id: 'ontology', 
      title: 'Ontology Editor', 
      description: 'Refine your schema',
      status: 'upcoming'
    },
    { 
      id: 'transform', 
      title: 'Extract & Transform', 
      description: 'Process your data',
      status: 'upcoming'
    },
    { 
      id: 'merge', 
      title: 'Merge to Prod', 
      description: 'Deploy to production',
      status: 'upcoming'
    }
  ]

  return (
    <EnhancedWorkflowLayout
      steps={workflowSteps}
      currentStepId="schema-generation"
      hasUnsavedChanges={false}
      projectTitle="AI Schema Generator"
      onStepClick={(stepId) => {
        if (stepId === 'ontology') router.push('/ontology')
      }}
      headerActions={
        chatState === 'schema_review' && generatedSchema ? (
          <div className="flex items-center gap-2">
            {viewMode === 'chat' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowPreview}
              >
                Open preview
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('chat')}
              >
                Hide preview
              </Button>
            )}
            <Button size="sm" onClick={handleExportToEditor}>
              Export to editor
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex-1 flex flex-col h-full">

        {/* Progress Bar */}
        <div className="border-b border-border/60 bg-muted/15">
          <div className="page-shell py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 overflow-x-auto text-xs sm:text-sm">
                {PROGRESS_STEPS.map((step, index) => {
                  const isActive = index <= getCurrentProgress()
                  const isCurrent = index === getCurrentProgress()

                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold sm:text-sm',
                          isActive
                            ? 'border-primary bg-primary/90 text-primary-foreground'
                            : 'border-border/60 text-muted-foreground'
                        )}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          'whitespace-nowrap',
                          isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                        )}
                      >
                        {step.label}
                      </span>
                      {index < PROGRESS_STEPS.length - 1 && (
                        <span className="hidden h-px w-10 bg-border/60 md:block" aria-hidden />
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="text-xs text-muted-foreground sm:text-sm">
                Step {getCurrentProgress() + 1} of {PROGRESS_STEPS.length}
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-0">
          {viewMode === 'chat' ? (
            <div className="flex flex-col h-full">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="max-w-4xl mx-auto space-y-6">
                  {messages.map((message) => (
                    <ChatMessageComponent 
                      key={message.id} 
                      message={message}
                      onAction={(action) => {
                        if (action === 'showPreview') handleShowPreview()
                        if (action === 'exportToEditor') handleExportToEditor()
                      }}
                      onEdit={handleEditMessage}
                      canEdit={message.role === 'user' && chatState === 'schema_review'}
                    />
                  ))}
                  
                  {(isTyping || isProcessing || isGenerating) && (
                    <div className="flex items-start gap-3">
                      <span className="mt-2 inline-flex h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
                      <div className="rounded-2xl bg-muted p-4">
                        {isGenerating ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                            <span className="text-sm text-muted-foreground">Generating schema...</span>
                          </div>
                        ) : isProcessing ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                            <span className="text-sm text-muted-foreground">Processing your request...</span>
                          </div>
                        ) : (
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              {/* Input Area */}
              <div className="border-t p-4">
                <div className="max-w-4xl mx-auto">
                  {chatState === 'welcome' ? (
                    <div className="flex justify-center">
                      <Button onClick={handleBegin} size="lg" variant="cta">
                        Begin Schema Generation
                      </Button>
                    </div>
                  ) : chatState === 'data_collection' ? (
                    // Show structured question input during data collection with edit capability
                    <div className="space-y-4">
                      {/* Previous responses summary */}
                      {userResponses.length > 0 && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">Previous Responses</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowPreviousResponses(!showPreviousResponses)}
                            >
                              {showPreviousResponses ? 'Hide' : 'Show'} ({userResponses.length})
                            </Button>
                          </div>
                          {showPreviousResponses && (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {userResponses.map((response) => {
                                const question = QUESTION_SETS
                                  .flatMap(set => set.questions)
                                  .find(q => q.id === response.questionId)
                                return question ? (
                                  <div key={response.questionId} className="text-xs border rounded p-2 bg-background">
                                    <div className="font-medium text-muted-foreground mb-1">
                                      {question.prompt}
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-foreground">
                                        {Array.isArray(response.value) ? response.value.join(', ') : response.value}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingResponseId(response.questionId)}
                                      >
                                        Edit
                                      </Button>
                                    </div>
                                  </div>
                                ) : null
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Current question or edit mode */}
                      {editingResponseId ? (
                        (() => {
                          const responseToEdit = userResponses.find(r => r.questionId === editingResponseId)
                          const questionToEdit = QUESTION_SETS
                            .flatMap(set => set.questions)
                            .find(q => q.id === editingResponseId)
                          return questionToEdit && responseToEdit ? (
                            <div className="border rounded-lg p-4 bg-accent/20">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Editing Response</h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingResponseId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                              <QuestionInput
                                question={questionToEdit}
                                currentValue={responseToEdit.value}
                                onSubmit={(value) => {
                                  updateUserResponse(editingResponseId, value)
                                  setEditingResponseId(null)
                                }}
                                disabled={isProcessing}
                                submitLabel="Update Response"
                              />
                            </div>
                          ) : null
                        })()
                      ) : (
                        (() => {
                          const currentQ = getCurrentQuestionData()
                          return currentQ ? (
                            <QuestionInput
                              question={currentQ}
                              onSubmit={handleUserResponse}
                              disabled={isProcessing}
                            />
                          ) : (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                              <Textarea
                                value={currentInput}
                                onChange={(e) => setCurrentInput(e.target.value)}
                                placeholder="Type your response..."
                                className="min-h-[72px] flex-1 resize-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSendMessage()
                                  }
                                }}
                              />
                              <Button
                                onClick={handleSendMessage}
                                disabled={!currentInput.trim() || isProcessing}
                                className="sm:self-stretch"
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Send'
                                )}
                              </Button>
                            </div>
                          )
                        })()
                      )}
                    </div>
                  ) : (
                    // Free-form chat for schema review and refinement
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <Textarea
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        placeholder="Ask about the schema or request changes..."
                        className="min-h-[96px] flex-1 resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!currentInput.trim() || isProcessing}
                        className="sm:self-stretch"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Send'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 h-full">
              {/* Chat Panel */}
              <div className="border-r flex flex-col min-h-0">
                <div className="border-b p-3 flex-shrink-0">
                  <h3 className="font-semibold">Conversation</h3>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 space-y-6">
                      {messages.map((message) => (
                        <ChatMessageComponent 
                          key={message.id} 
                          message={message}
                          onAction={(action) => {
                            if (action === 'showPreview') handleShowPreview()
                            if (action === 'exportToEditor') handleExportToEditor()
                          }}
                          onEdit={handleEditMessage}
                          canEdit={message.role === 'user' && chatState === 'schema_review'}
                        />
                      ))}
                      
                      {(isTyping || isProcessing || isGenerating) && (
                        <div className="flex items-start gap-3">
                          <span className="mt-2 inline-flex h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
                          <div className="rounded-2xl bg-muted p-4">
                            {isGenerating ? (
                              <div className="flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                                <span className="text-sm text-muted-foreground">Generating schema...</span>
                              </div>
                            ) : isProcessing ? (
                              <div className="flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                                <span className="text-sm text-muted-foreground">Processing your request...</span>
                              </div>
                            ) : (
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>
                
                <div className="border-t p-3 min-h-[200px] max-h-[300px] flex flex-col gap-3">
                  {chatState === 'welcome' ? (
                    <div className="flex justify-center">
                      <Button onClick={handleBegin} size="lg" variant="cta">
                        Begin Schema Generation
                      </Button>
                    </div>
                  ) : chatState === 'data_collection' ? (
                    (() => {
                      const currentQ = getCurrentQuestionData()
                      return currentQ ? (
                        <QuestionInput
                          question={currentQ}
                          onSubmit={handleUserResponse}
                          disabled={isProcessing}
                        />
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                          <Textarea
                            value={currentInput}
                            onChange={(e) => setCurrentInput(e.target.value)}
                            placeholder="Type your response..."
                            className="min-h-[72px] flex-1 resize-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSendMessage()
                              }
                            }}
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!currentInput.trim() || isProcessing}
                            className="sm:self-stretch"
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Send'
                            )}
                          </Button>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="flex h-full flex-col gap-3">
                      <Textarea
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        placeholder="Ask about the schema, request changes, or ask questions..."
                        className="min-h-[96px] flex-1 resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSendMessage}
                          disabled={!currentInput.trim() || isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Send'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Schema Preview Panel */}
              <div className="flex flex-col h-full">
                <div className="border-b p-3 flex-shrink-0">
                  <h3 className="font-semibold">Schema Preview</h3>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                  {generatedSchema ? (
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                      <div className="h-64 border rounded-lg overflow-hidden">
                        <VisualEditor />
                      </div>
                      <div className="h-64 border rounded-lg overflow-hidden">
                        <YAMLEditor 
                          value={generatedSchema} 
                          onChange={(value) => {
                            setGeneratedSchema(value)
                            updateFromYaml(value)  // Sync with ontology store
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p>Schema preview will appear here once generated.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </EnhancedWorkflowLayout>
  )
}
