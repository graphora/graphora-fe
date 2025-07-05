'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bot, 
  User, 
  Send, 
  Loader2, 
  Database, 
  ArrowRight,
  CheckCircle,
  Circle,
  FileText,
  Search,
  Sparkles,
  Eye,
  Edit3,
  ExternalLink
} from 'lucide-react'
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


// Progress steps for the stepper
const PROGRESS_STEPS = [
  { id: 'data_collection', label: 'Data Collection', icon: FileText },
  { id: 'schema_search', label: 'Schema Search', icon: Search },
  { id: 'schema_generation', label: 'Schema Generation', icon: Sparkles },
  { id: 'schema_review', label: 'Review & Refine', icon: Eye },
  { id: 'finalization', label: 'Finalize', icon: CheckCircle }
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
    setChatState,
    addMessage,
    setIsTyping,
    setError
  } = useSchemaGenerationChat()
  
  const {
    currentQuestionSet,
    currentQuestion,
    userResponses,
    isProcessing,
    setCurrentQuestionSet,
    setCurrentQuestion,
    addUserResponse,
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize chat
  useEffect(() => {
    if (messages.length === 0) {
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
  }, [messages.length, addMessage])

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

  const handleUserResponse = (response: string) => {
    const currentQ = getCurrentQuestionData()
    if (!currentQ) return
    
    // Add user message
    addMessage({
      role: 'user',
      content: response
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
      }, 500)
      
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
      }, 500)
      
    } else {
      // All questions completed - move to schema search
      setChatState('schema_search')
      setTimeout(() => {
        handleSchemaSearch()
      }, 500)
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
    }, 2000)
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

  const handleSchemaRefinement = (input: string) => {
    // Add user message
    addMessage({
      role: 'user',
      content: input
    })

    // Simulate AI response for schema refinement
    setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: `I understand you want to modify the schema. Let me help you with that.

*Processing your request...*

Based on your feedback, I'll update the schema accordingly. The changes will be reflected in the preview.`
      })
    }, 1000)
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
    >
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="bg-background border-b border-border shadow-sm">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">AI Schema Generator</h2>
                  <p className="text-sm text-muted-foreground">
                    Create custom knowledge graph schemas with guided AI assistance
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {chatState === 'schema_review' && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleShowPreview}
                      disabled={!generatedSchema}
                    >
                      <Eye className="h-4 w-4 mr-1.5" />
                      Preview
                    </Button>
                    <Button 
                      onClick={handleExportToEditor}
                      disabled={!generatedSchema}
                      size="sm"
                    >
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      Export to Editor
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-muted/30 border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {PROGRESS_STEPS.map((step, index) => {
                const isActive = index <= getCurrentProgress()
                const isCurrent = index === getCurrentProgress()
                const Icon = step.icon
                
                return (
                  <div key={step.id} className="flex items-center space-x-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2",
                      isActive 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "border-muted-foreground/30 text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                    {index < PROGRESS_STEPS.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-4" />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="text-sm text-muted-foreground">
              Step {getCurrentProgress() + 1} of {PROGRESS_STEPS.length}
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
        <div className="flex-1 overflow-hidden">
          {viewMode === 'chat' ? (
            <div className="flex flex-col h-full">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="max-w-4xl mx-auto space-y-6">
                  {messages.map((message) => (
                    <div key={message.id} className={cn(
                      "flex items-start space-x-3",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}>
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                      
                      <div className={cn(
                        "max-w-[70%] p-4 rounded-2xl",
                        message.role === 'user' 
                          ? "bg-primary text-primary-foreground ml-auto" 
                          : "bg-muted"
                      )}>
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </div>
                        
                        {message.type === 'schema_preview' && (
                          <div className="mt-4 space-y-2">
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={handleShowPreview}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Show Preview
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {message.role === 'user' && (
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="bg-muted p-4 rounded-2xl">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                        </div>
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
                      <Button onClick={handleBegin} size="lg">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Begin Schema Generation
                      </Button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <div className="flex-1 relative">
                        <Textarea
                          value={currentInput}
                          onChange={(e) => setCurrentInput(e.target.value)}
                          placeholder="Type your response..."
                          className="min-h-[60px] pr-12 resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute right-2 bottom-2"
                          onClick={handleSendMessage}
                          disabled={!currentInput.trim() || isProcessing}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 h-full">
              {/* Chat Panel */}
              <div className="border-r flex flex-col">
                <div className="flex-1 overflow-auto p-4">
                  <div className="space-y-4">
                    {messages.slice(-5).map((message) => (
                      <div key={message.id} className={cn(
                        "flex items-start space-x-2",
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}>
                        <div className={cn(
                          "max-w-[80%] p-3 rounded-lg text-sm",
                          message.role === 'user' 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        )}>
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t p-3">
                  <div className="flex space-x-2">
                    <Input
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder="Ask about the schema..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage()
                        }
                      }}
                    />
                    <Button size="icon" onClick={handleSendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Schema Preview Panel */}
              <div className="flex flex-col">
                <div className="border-b p-3">
                  <h3 className="font-semibold">Schema Preview</h3>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {generatedSchema ? (
                    <div className="space-y-4">
                      <div className="h-64 border rounded-lg overflow-hidden">
                        <VisualEditor />
                      </div>
                      <div className="h-64 border rounded-lg overflow-hidden">
                        <YAMLEditor 
                          value={generatedSchema} 
                          onChange={(value) => setGeneratedSchema(value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Schema preview will appear here</p>
                      </div>
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