'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, PauseCircle, PlayCircle, AlertCircle, CheckCircle2, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GraphVisualization } from '@/components/graph-visualization'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { MergeWebSocket } from '@/lib/merge-websocket'
import { WorkflowLayout } from '@/components/workflow-layout'
import { cn } from '@/lib/utils'
import type { ChatMessage, MergeEvent, MergeStatus } from '@/types/merge'

export default function MergePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const transformId = searchParams.get('transform_id')
  const [isPaused, setIsPaused] = useState(false)
  const [status, setStatus] = useState<MergeStatus>('IN_PROGRESS')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [graphData, setGraphData] = useState<any>(null)
  const [canSubmit, setCanSubmit] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [isRetrying, setIsRetrying] = useState(false)
  const wsRef = useRef<MergeWebSocket | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!transformId || !sessionId) {
      setError('Missing required parameters');
      return;
    }

    const startMerge = async () => {
      try {
        setError(null);
        
        // First call the start merge endpoint
        const response = await fetch(`/api/merge/${sessionId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transform_id: transformId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to start merge process');
        }

        // Then establish WebSocket connection
        const ws = new MergeWebSocket(
          `${process.env.NEXT_PUBLIC_WS_URL}/api/v1/merge/ws/${sessionId}`
        );
        wsRef.current = ws;

        ws.addEventListener('message', handleWebSocketMessage);
        ws.addEventListener('error', (error) => {
          console.error('WebSocket error:', error);
          setError('Failed to connect to merge service');
        });

        ws.addEventListener('open', () => {
          console.log('WebSocket connection established');
        });

        ws.addEventListener('close', () => {
          console.log('WebSocket connection closed');
        });
      } catch (error) {
        console.error('Error starting merge:', error);
        setError(error instanceof Error ? error.message : 'Failed to start merge process');
      }
    };

    startMerge();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [transformId, sessionId]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

  const handleWebSocketMessage = (event: MessageEvent) => {
    const wsEvent: MergeEvent = JSON.parse(event.data)

    switch (wsEvent.type) {
      case 'PROGRESS':
        setProgress(wsEvent.payload.data.progress)
        setCurrentStep(wsEvent.payload.data.currentStep)
        // Update graph data if available
        if (wsEvent.payload.data.graphData) {
          setGraphData(wsEvent.payload.data.graphData)
        }
        break

      case 'QUESTION':
        setStatus('WAITING_INPUT')
        setCanSubmit(false)
        addMessage({
          id: `msg_${Date.now()}`,
          role: 'agent',
          content: wsEvent.payload.data.content,
          timestamp: wsEvent.payload.timestamp,
          requiresAction: true,
          questionId: wsEvent.payload.data.questionId,
          options: wsEvent.payload.data.options
        })
        // Show preview of changes in graph
        if (wsEvent.payload.data.previewGraphData) {
          setGraphData(wsEvent.payload.data.previewGraphData)
        }
        break

      case 'ERROR':
        setError(wsEvent.payload.data.message)
        setStatus('FAILED')
        setCanSubmit(false)
        break

      case 'COMPLETE':
        setStatus('COMPLETED')
        setCanSubmit(true)
        addMessage({
          id: `msg_${Date.now()}`,
          role: 'agent',
          content: 'Merge completed successfully! Here are the statistics:\n' +
            `- Nodes Processed: ${wsEvent.payload.data.stats.nodesProcessed}\n` +
            `- Edges Processed: ${wsEvent.payload.data.stats.edgesProcessed}\n` +
            `- Conflicts Resolved: ${wsEvent.payload.data.stats.conflictsResolved}`,
          timestamp: wsEvent.payload.timestamp
        })
        // Update final graph data
        if (wsEvent.payload.data.finalGraphData) {
          setGraphData(wsEvent.payload.data.finalGraphData)
        }
        break
    }
  }

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }

  const handleAnswer = async (questionId: string, answer: string) => {
    try {
      setError(null);
      
      // Send answer through WebSocket
      wsRef.current?.sendMessage('ANSWER', {
        question_id: questionId,
        answer: answer,
      });

      setSelectedOptions((prev) => ({
        ...prev,
        [questionId]: answer,
      }));
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer. Please try again.');
    }
  };

  const handleCancel = async () => {
    try {
      const response = await fetch(`/api/merge/${sessionId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel merge process');
      }

      if (wsRef.current) {
        wsRef.current.close();
      }
      
      router.push('/transform');
    } catch (error) {
      console.error('Error canceling merge:', error);
      setError('Failed to cancel merge process');
    }
  };

  const handleSubmit = useCallback(async () => {
    try {
      setIsRetrying(false)
      setError(null)
      const response = await fetch('/api/merge/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transform_id: transformId,
          session_id: sessionId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit merge')
      }

      const data = await response.json()
      setStatus('COMPLETED')
      router.push('/transform')
    } catch (error) {
      console.error('Error submitting merge:', error)
      setError('Failed to submit merge. Please try again.')
    }
  }, [transformId, sessionId, router])

  const togglePause = () => {
    setIsPaused(!isPaused)
    // In a real implementation, we would send a pause/resume command to the server
  }

  return (
    <WorkflowLayout steps={workflowSteps}>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Graph Merge Process</h1>
            {status === 'IN_PROGRESS' && (
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
                    wsRef.current.resume()
                  } else {
                    wsRef.current.pause()
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
                onClick={handleSubmit}
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
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              {isRetrying && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSubmit}
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
                      <Card key={message.id} className={cn(
                        "w-full",
                        message.role === 'agent' ? 'bg-gray-50' : ''
                      )}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium capitalize">{message.role}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          {message.requiresAction && message.options && (
                            <div className="mt-4 space-y-2">
                              {message.options.map(option => {
                                const isSelected = selectedOptions[message.questionId!] === option.value;
                                return (
                                  <Button
                                    key={option.value}
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-between",
                                      isSelected && "border-green-500 bg-green-50 text-green-700"
                                    )}
                                    onClick={() => handleAnswer(message.questionId!, option.value)}
                                    disabled={selectedOptions[message.questionId!] !== undefined}
                                  >
                                    <span>{option.label}</span>
                                    {isSelected && <CheckCircle2 className="h-4 w-4 ml-2" />}
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {status === 'FAILED' && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Merge process failed. Please try again.
                        </AlertDescription>
                      </Alert>
                    )}
                    {status === 'COMPLETED' && (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-600">
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
                <div className="p-2 border-b font-medium">Graph Preview</div>
                <div className="flex-1 min-h-0">
                  <GraphVisualization graphData={graphData} />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </WorkflowLayout>
  )
}
