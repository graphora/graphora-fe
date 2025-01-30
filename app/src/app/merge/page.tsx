'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, PauseCircle, PlayCircle, AlertCircle, CheckCircle2, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MergeGraphVisualization } from '@/components/merge-graph-visualization'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { WorkflowLayout } from '@/components/workflow-layout'
import { cn } from '@/lib/utils'
import type { ChatMessage, MergeStatus } from '@/types/merge'
import { useUser } from '@clerk/nextjs'
import { MergeWebSocket } from '@/lib/merge-websocket'
import { ConflictDisplay } from '@/components/conflict-display'
import { useMergeVisualization } from '@/hooks/useMergeVisualization'

export default function MergePage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const searchParams = useSearchParams()

  const [isPaused, setIsPaused] = useState(false)
  const [status, setStatus] = useState<MergeStatus>('IN_PROGRESS')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [canSubmit, setCanSubmit] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [isRetrying, setIsRetrying] = useState(false)
  const [currentConflict, setCurrentConflict] = useState<any>(null)
  const wsRef = useRef<MergeWebSocket | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const sessionId = searchParams.get('session_id')
  const transformId = searchParams.get('transform_id')

  const { 
    data: mergeVisualization, 
    loading: visualizationLoading, 
    error: visualizationError, 
    fetchData: refreshVisualization,
    graphData,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
    undo,
    redo,
    canUndo,
    canRedo,
    getChanges
  } = useMergeVisualization(sessionId || '', wsRef.current)

  const graphDataMemo = useMemo(() => {
    if (!mergeVisualization?.data) return null

    return {
      nodes: mergeVisualization.data.nodes.map(node => ({
        id: node.id,
        labels: node.labels,
        properties: {
          ...node.properties,
          __status: node.status,
          __conflicts: node.conflicts
        }
      })),
      edges: mergeVisualization.data.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        properties: {
          ...edge.properties,
          __status: edge.status
        }
      }))
    }
  }, [mergeVisualization])

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
    }
  }, [isLoaded, user, router])

  const startMergeProcess = async () => {
    if (!sessionId || !transformId) {
      const error = 'Missing required parameters: sessionId or transformId'
      console.error(error)
      setError(error)
      return
    }

    try {
      setError(null)

      // Double check WebSocket connection
      if (!wsRef.current) {
        throw new Error('WebSocket instance not initialized')
      }

      // Ensure WebSocket is connected and retry if needed
      let retries = 0
      while (!wsRef.current.isConnected() && retries < 3) {
        console.log(`Waiting for WebSocket connection... Attempt ${retries + 1}/3`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        retries++
      }

      if (!wsRef.current.isConnected()) {
        throw new Error('WebSocket connection not established after retries')
      }

      console.log('Starting merge process...')
      const response = await fetch(`/api/merge/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transform_id: transformId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Merge process started successfully:', data)
    } catch (error) {
      console.error('Error starting merge process:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to start merge process'
      setError(errorMessage)
      throw error
    }
  }

  useEffect(() => {
    if (!sessionId || !transformId) {
      setError('Missing required parameters')
      return
    }

    const setupWebSocket = async () => {
      try {
        // Create WebSocket instance using Next.js proxy
        const ws = new MergeWebSocket('/api/v1', sessionId)
        wsRef.current = ws

        // Set up event handlers before connecting
        ws.on('QUESTION', (payload: any) => {
          // Handle conflict type questions
          if (payload.conflict_type) {
            setCurrentConflict(payload)
            setMessages(prev => [...prev, {
              type: 'conflict',
              role: 'agent',
              content: 'Conflict detected. Please review the changes below.',
              questionId: payload.questionId,
              requiresAction: true,
              timestamp: new Date().toISOString(),
              conflict: payload
            }])
          } else {
            // Handle regular questions
            setMessages(prev => [...prev, {
              type: 'question',
              role: 'agent',
              content: payload.content,
              questionId: payload.questionId,
              options: payload.options,
              requiresAction: true,
              timestamp: new Date().toISOString()
            }])
          }
          setCanSubmit(true)
          // Refresh visualization after question
          refreshVisualization()
        })

        ws.on('STATUS', (payload: any) => {
          setStatus(payload.status)
          // Refresh visualization after status update
          refreshVisualization()
        })

        ws.on('PROGRESS', (payload: any) => {
          setProgress(payload.progress)
          if (payload.currentStep) {
            setCurrentStep(payload.currentStep)
          }
          // Refresh visualization after progress update
          refreshVisualization()
        })

        ws.on('ERROR', (payload: any) => {
          console.error('Received error from WebSocket:', payload.message)
          setError(payload.message)
        })

        // Connect to WebSocket first
        console.log('Connecting to WebSocket...')
        await ws.connect()
        console.log('WebSocket connected successfully')

        // Wait for a short time to ensure all handlers are properly registered
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Then start the merge process
        await startMergeProcess()
      } catch (error) {
        console.error('Error in WebSocket setup:', error)
        setError(error instanceof Error ? error.message : 'Failed to initialize WebSocket connection')
      }
    }

    setupWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect()
        wsRef.current = null
      }
    }
  }, [sessionId, transformId])

  const handleAnswerSubmit = async (answer: string, questionId: string) => {
    if (!wsRef.current || !wsRef.current.isConnected()) {
      setError('WebSocket connection lost')
      return
    }

    try {
      wsRef.current.sendAnswer(questionId, answer)
      setMessages(prev => [...prev, {
        type: 'answer',
        content: answer,
        questionId
      }])
      setCanSubmit(false)
    } catch (error) {
      console.error('Error sending answer:', error)
      setError('Failed to send answer')
    }
  }

  const handleRetry = async () => {
    setIsRetrying(true)
    setError(null)
    
    try {
      if (wsRef.current) {
        wsRef.current.disconnect()
      }
      
      const ws = new MergeWebSocket('/api/v1', sessionId)
      wsRef.current = ws
      await ws.connect()
      await startMergeProcess()
      
      setIsRetrying(false)
    } catch (error) {
      console.error('Error retrying connection:', error)
      setError(error instanceof Error ? error.message : 'Failed to retry connection')
      setIsRetrying(false)
    }
  }

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (scrollRef.current) {
      const scrollElement = scrollRef.current
      scrollElement.scrollTop = scrollElement.scrollHeight
    }
  }, [messages])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const workflowSteps: WorkflowStep[] = [
    {
      id: 'transform',
      label: 'Document Upload',
      path: '/transform',
      status: 'completed'
    },
    {
      id: 'edit',
      label: 'Graph Editing',
      path: '/transform',
      status: 'completed'
    },
    {
      id: 'merge',
      label: 'Merge Process',
      path: '/merge',
      status: 'current'
    }
  ]

  return (
    <WorkflowLayout steps={workflowSteps}>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Graph Merge Process</h1>
            {(status === 'IN_PROGRESS' || progress > 0) && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  {currentStep} ({progress}%)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setIsPaused(!isPaused)
                if (wsRef.current) {
                  if (isPaused) {
                    wsRef.current.sendResume()
                  } else {
                    wsRef.current.sendPause()
                  }
                }
              }}
            >
              {isPaused ? (
                <PlayCircle className="h-5 w-5" />
              ) : (
                <PauseCircle className="h-5 w-5" />
              )}
            </Button>
            {canSubmit && (
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700 gap-2"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isRetrying ? 'Retrying...' : 'Merge to Prod DB'}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between ml-2">
              <span>{error}</span>
              {isRetrying && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="ml-4"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 p-4 min-h-0">
          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-[500px] h-full rounded-lg border bg-background"
          >
            {/* Chat Panel */}
            <ResizablePanel defaultSize={40} minSize={30}>
              <div className="flex flex-col h-full">
                <div className="p-2 border-b font-medium">Agent Chat</div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4" ref={scrollRef}>
                    {messages.map((message) => (
                      <Card
                        key={`${message.questionId || ''}-${message.timestamp}`}
                        className={cn(
                          'w-full',
                          message.role === 'agent' ? 'bg-gray-50' : ''
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium capitalize">
                              {message.role}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          {message.type === 'conflict' && message.conflict && (
                            <div className="mt-4">
                              <ConflictDisplay
                                {...message.conflict}
                                onSuggestionSelect={(suggestion) => {
                                  handleAnswerSubmit(
                                    JSON.stringify({
                                      suggestion_type: suggestion.suggestion_type,
                                      affected_properties: suggestion.affected_properties
                                    }),
                                    message.questionId!
                                  )
                                }}
                              />
                            </div>
                          )}
                          {message.type === 'question' && message.options && message.requiresAction && (
                            <div className="mt-4 space-y-2">
                              {message.options.map((option) => {
                                const isSelected =
                                  selectedOptions[message.questionId!] ===
                                  option.id
                                return (
                                  <Button
                                    key={option.id}
                                    variant="outline"
                                    className={cn(
                                      'w-full justify-between',
                                      isSelected &&
                                        'border-green-500 bg-green-50 text-green-700'
                                    )}
                                    onClick={() =>
                                      handleAnswerSubmit(
                                        option.id,
                                        message.questionId!
                                      )
                                    }
                                    disabled={
                                      selectedOptions[message.questionId!] !==
                                      undefined
                                    }
                                  >
                                    <span>{option.label}</span>
                                    {isSelected && (
                                      <CheckCircle2 className="h-4 w-4 ml-2" />
                                    )}
                                  </Button>
                                )
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {status === 'FAILED' && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="ml-2">
                          Merge process failed. Please try again.
                        </AlertDescription>
                      </Alert>
                    )}
                    {status === 'COMPLETED' && (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="ml-2 text-green-600">
                          Merge process completed successfully!
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle className="w-2 bg-muted hover:bg-muted/90 transition-colors" />

            {/* Graph Panel */}
            <ResizablePanel defaultSize={60} minSize={30}>
              <div className="flex flex-col h-full">
                <div className="p-2 border-b font-medium flex justify-between items-center">
                  <span>Graph Preview</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={undo}
                      disabled={!canUndo || visualizationLoading}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={redo}
                      disabled={!canRedo || visualizationLoading}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    {visualizationLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={refreshVisualization}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <RefreshCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  {visualizationLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <MergeGraphVisualization 
                      sessionId={sessionId} 
                      wsInstance={wsRef.current}
                      graphData={graphData} 
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </WorkflowLayout>
  )
}
