'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PauseCircle, PlayCircle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GraphVisualization } from '@/components/graph-visualization'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { MockMergeWebSocket } from '@/lib/mock-merge-websocket'
import { WorkflowLayout } from '@/components/workflow-layout'
import { cn } from '@/lib/utils'
import type { ChatMessage, MergeEvent, MergeStatus } from '@/types/merge'

export default function MergePage() {
  const router = useRouter()
  const [isPaused, setIsPaused] = useState(false)
  const [status, setStatus] = useState<MergeStatus>('IN_PROGRESS')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [graphData, setGraphData] = useState<any>(null)
  const [canSubmit, setCanSubmit] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const wsRef = useRef<MockMergeWebSocket | null>(null)
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
    // Initialize WebSocket connection
    const ws = new MockMergeWebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/merge`)
    wsRef.current = ws

    ws.addEventListener('message', handleWebSocketMessage)

    return () => {
      ws.close()
    }
  }, [])

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

  const handleOptionSelect = async (questionId: string, option: { label: string; value: string }) => {
    // Update selected option for this question
    setSelectedOptions(prev => ({
      ...prev,
      [questionId]: option.value
    }))

    // Send the selection to the API
    try {
      const response = await fetch('/api/merge/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          answer: option.value
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer. Please try again.');
    }
  }

  const handleSubmit = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'SUBMIT',
        payload: {
          timestamp: new Date().toISOString()
        }
      }))
    }
    
    addMessage({
      id: `msg_${Date.now()}`,
      role: 'agent',
      content: 'Changes have been successfully persisted to the production database.',
      timestamp: new Date().toISOString()
    })

    // Disable submit button after successful submission
    setCanSubmit(false)
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
    // In a real implementation, we would send a pause/resume command to the server
  }

  return (
    <WorkflowLayout progress={progress} currentStep={currentStep}>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Graph Merge Process</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePause}
              disabled={status === 'COMPLETED' || status === 'FAILED'}
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
              >
                <CheckCircle2 className="h-4 w-4" />
                Save to DB
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex-1 min-h-0"> 
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full rounded-lg border bg-background"
          >
            {/* Chat Panel */}
            <ResizablePanel defaultSize={40} minSize={30}>
              <div className="h-full flex flex-col">
                <div className="p-2 border-b font-medium">Agent Chat</div>
                <div className="flex-1 overflow-y-auto min-h-0"> 
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
                                    onClick={() => handleOptionSelect(message.questionId!, option)}
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
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Graph Panel */}
            <ResizablePanel defaultSize={60} minSize={30}>
              <div className="h-full flex flex-col">
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
