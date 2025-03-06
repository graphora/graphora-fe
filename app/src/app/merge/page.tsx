'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, PauseCircle, PlayCircle, AlertCircle, CheckCircle2, RefreshCcw} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MergeGraphVisualization } from '@/components/merge-graph-visualization'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { WorkflowLayout } from '@/components/workflow-layout'
import { cn } from '@/lib/utils'
import type { ChatMessage, MergeStatus, ConflictListItem, ConflictMessage } from '@/types/merge'
import { useUser } from '@clerk/nextjs'
import { ConflictDisplay } from '@/components/conflict-display'
import { useMergeVisualization } from '@/hooks/useMergeVisualization'
import { MergeProgress } from '@/components/merge-progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { ConflictList } from '@/components/conflict-list'
import { MergeCompletionBanner } from '@/components/merge-completion-banner'

function MergePageContent() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const searchParams = useSearchParams()

  const [isPaused, setIsPaused] = useState(false)
  const [status, setStatus] = useState<MergeStatus>('running')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [canSubmit, setCanSubmit] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [isRetrying, setIsRetrying] = useState(false)
  const [currentConflict, setCurrentConflict] = useState<any>(null)
  const [mergeStarted, setMergeStarted] = useState(false)
  const [mergeId, setMergeId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('visualization')
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [selectedConflicts, setSelectedConflicts] = useState<string[]>([])
  const [allConflictsResolved, setAllConflictsResolved] = useState(false)
  const [conflictStats, setConflictStats] = useState<{total: number, resolved: number}>({
    total: 0,
    resolved: 0
  })

  const sessionId = searchParams.get('session_id') || ''
  const transformId = searchParams.get('transform_id') || ''
  const initialMergeId = searchParams.get('merge_id')

  const { 
    data: mergeVisualization, 
    loading: visualizationLoading, 
    error: visualizationError, 
    fetchData: refreshVisualization
  } = useMergeVisualization(sessionId)

  const graphDataMemo = useMemo(() => {
    if (!mergeVisualization?.data) return null
    return mergeVisualization.data
  }, [mergeVisualization?.data])

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    // If merge_id is provided in URL, use it
    if (initialMergeId) {
      setMergeId(initialMergeId)
      setMergeStarted(true)
      
      // Set active tab to progress by default
      setActiveTab('progress')
      
      // Start polling for status updates
      const pollStatus = async () => {
        if (!initialMergeId) return
        
        try {
          const response = await fetch(`/api/merge/${initialMergeId}/status`)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()
          
          if (data) {
            setStatus(data.overall_status as MergeStatus)
            setProgress(data.overall_progress)
            setCurrentStep(data.current_stage)
            
            // Check if all conflicts are resolved
            if (data.has_conflicts && data.conflict_count > 0) {
              // Fetch conflict stats to check if all are resolved
              try {
                const conflictResponse = await fetch(`/api/merge/${initialMergeId}/conflicts?limit=1&offset=0`)
                if (conflictResponse.ok) {
                  const conflictData = await conflictResponse.json()
                  
                  // Use the resolved count directly from the summary
                  const resolvedCount = conflictData.summary?.resolved || 0
                  
                  setConflictStats({
                    total: conflictData.total_count,
                    resolved: resolvedCount
                  })
                  
                  // Check if all conflicts are resolved
                  const allResolved = conflictData.total_count > 0 && 
                    resolvedCount === conflictData.total_count
                  
                  // If all conflicts are resolved and this is a change, show a toast
                  if (allResolved && !allConflictsResolved) {
                    toast({
                      title: "All Conflicts Resolved",
                      description: "All conflicts have been successfully resolved. You can now view the final merged graph.",
                      variant: "default",
                    })
                  }
                  
                  setAllConflictsResolved(allResolved)
                }
              } catch (err) {
                console.error('Error fetching conflict stats:', err)
              }
            }
          }
          
          // If merge is completed or failed, stop polling
          if (data.overall_status === 'completed' || data.overall_status === 'failed') {
            if (statusIntervalRef.current) {
              clearInterval(statusIntervalRef.current)
              statusIntervalRef.current = null
            }
          }
        } catch (error) {
          console.error('Error polling merge status:', error)
        }
      }
      
      // Poll immediately and then at intervals
      pollStatus()
      statusIntervalRef.current = setInterval(pollStatus, 15000) // Poll every 15 seconds
      
      // Refresh visualization
      refreshVisualization()
      
      return () => {
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current)
          statusIntervalRef.current = null
        }
      }
    }
  }, [initialMergeId, refreshVisualization])

  const startMergeProcess = async () => {
    if (!sessionId || !transformId) {
      const error = 'Missing required parameters: sessionId or transformId'
      console.error(error)
      setError(error)
      return
    }

    try {
      setError(null)
      setMergeStarted(true)
      
      // Add initial status message
      setMessages(prev => [...prev, {
        type: 'status',
        role: 'system',
        content: 'Initializing merge process...',
        timestamp: new Date().toISOString()
      }])

      console.log('Starting merge process...')
      const response = await fetch(`/api/merge/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transformId: transformId,
          sessionId: sessionId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Merge process started successfully:', data)
      
      if (data.merge_id) {
        setMergeId(data.merge_id)
        
        // Update URL with merge_id without navigation
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.set('merge_id', data.merge_id)
        window.history.pushState({}, '', newUrl.toString())
      }
      
      // Add success message
      setMessages(prev => [...prev, {
        type: 'status',
        role: 'system',
        content: 'Merge process started successfully.',
        timestamp: new Date().toISOString()
      }])
      
      // Start polling for status updates
      startStatusPolling()
      
      // Refresh visualization to show initial state
      refreshVisualization()
      
    } catch (error) {
      console.error('Error starting merge process:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to start merge process'
      setError(errorMessage)
      
      // Add error message
      setMessages(prev => [...prev, {
        type: 'status',
        role: 'system',
        content: `Failed to start merge: ${errorMessage}`,
        timestamp: new Date().toISOString()
      }])
      
      setStatus('failed')
    }
  }
  
  const startStatusPolling = () => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current)
    }
    
    const pollStatus = async () => {
      if (!mergeId) return
      
      try {
        const response = await fetch(`/api/merge/${mergeId}/status`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Update status
        setStatus(data.status as MergeStatus)
        
        // Update progress if available
        if (data.progress !== undefined) {
          setProgress(data.progress)
        }
        
        // Update current step if available
        if (data.currentStep) {
          setCurrentStep(data.currentStep)
        }
        
        // Handle conflicts or questions if any
        if (data.questions && data.questions.length > 0) {
          handleNewQuestions(data.questions)
        }
        
        // Refresh visualization on status updates
        if (data.status !== 'failed') {
          refreshVisualization()
        }
        
        // Check if all conflicts are resolved
        if (data.has_conflicts && data.conflict_count > 0) {
          // Fetch conflict stats to check if all are resolved
          try {
            const conflictResponse = await fetch(`/api/merge/${mergeId}/conflicts?limit=1&offset=0`)
            if (conflictResponse.ok) {
              const conflictData = await conflictResponse.json()
              
              // Use the resolved count directly from the summary
              const resolvedCount = conflictData.summary?.resolved || 0
              
              setConflictStats({
                total: conflictData.total_count,
                resolved: resolvedCount
              })
              
              // Check if all conflicts are resolved
              const allResolved = conflictData.total_count > 0 && 
                resolvedCount === conflictData.total_count
              
              // If all conflicts are resolved and this is a change, show a toast
              if (allResolved && !allConflictsResolved) {
                toast({
                  title: "All Conflicts Resolved",
                  description: "All conflicts have been successfully resolved. You can now view the final merged graph.",
                  variant: "default",
                })
              }
              
              setAllConflictsResolved(allResolved)
            }
          } catch (err) {
            console.error('Error fetching conflict stats:', err)
          }
        }
        
        // If merge is completed or failed, stop polling
        if (data.status === 'completed' || data.status === 'failed') {
          if (statusIntervalRef.current) {
            clearInterval(statusIntervalRef.current)
            statusIntervalRef.current = null
          }
        }
      } catch (error) {
        console.error('Error polling merge status:', error)
      }
    }
    
    // Poll immediately and then at intervals
    pollStatus()
    statusIntervalRef.current = setInterval(pollStatus, 5000) // Poll every 5 seconds
  }
  
  const handleNewQuestions = (questions: any[]) => {
    questions.forEach(question => {
      if (question.conflict_type) {
        // Handle conflict type questions
        setCurrentConflict(question)
        setMessages(prev => [...prev, {
          type: 'conflict',
          role: 'agent',
          content: 'Conflict detected. Please review the changes below.',
          questionId: question.questionId,
          requiresAction: true,
          timestamp: new Date().toISOString(),
          conflict: question
        }])
      } else {
        // Handle regular questions
        setMessages(prev => [...prev, {
          type: 'question',
          role: 'agent',
          content: question.content,
          questionId: question.questionId,
          options: question.options,
          requiresAction: true,
          timestamp: new Date().toISOString()
        }])
      }
      setCanSubmit(true)
    })
  }

  const handleAnswerSubmit = async (answer: string, questionId: string) => {
    if (!sessionId || !questionId) return

    try {
      setCanSubmit(false)

      // Add user's answer to messages
      setMessages(prev => [...prev, {
        type: 'answer',
        role: 'user',
        content: answer,
        timestamp: new Date().toISOString()
      }])

      const response = await fetch(`/api/merge/${sessionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId,
          answer
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      // Clear current conflict if it was answered
      setCurrentConflict(null)
      
      // Refresh visualization after answering
      refreshVisualization()
      
    } catch (error) {
      console.error('Error submitting answer:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit answer')
    }
  }

  const handleRetry = async () => {
    if (!sessionId || !transformId) return

    try {
      setIsRetrying(true)
      setError(null)

      // Reset state
      setStatus('running')
      setProgress(0)
      setCurrentStep('')
      setMessages([])
      setCurrentConflict(null)
      
      // Start the merge process again
      await startMergeProcess()
      
    } catch (error) {
      console.error('Error retrying merge:', error)
      setError(error instanceof Error ? error.message : 'Failed to retry merge')
    } finally {
      setIsRetrying(false)
    }
  }

  const handleCancelMerge = async () => {
    if (!mergeId) return;
    
    try {
      setIsCancelling(true);
      const response = await fetch(`/api/merge/${mergeId}/cancel`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to cancel merge: ${response.status}`);
      }
      
      // Update status to cancelled
      setStatus('cancelled');
      
      // Stop polling
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
      
      toast({
        title: "Merge Cancelled",
        description: "The merge process has been cancelled successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error cancelling merge:', error);
      toast({
        title: "Error",
        description: "Failed to cancel the merge process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleViewConflicts = () => {
    setActiveTab('conflicts')
    
    toast({
      title: "Viewing Conflicts",
      description: "Showing the conflicts that need to be resolved.",
      variant: "default",
    })
  }

  const handleConflictSelect = (conflict: ConflictListItem) => {
    setCurrentConflict(conflict)
    
    // Add conflict message if not already in messages
    const conflictMessageExists = messages.some(
      m => m.type === 'conflict' && m.conflict?.id === conflict.id
    )
    
    if (!conflictMessageExists) {
      // Convert ConflictListItem to ConflictMessage
      const conflictMessage: ConflictMessage = {
        id: conflict.id,
        conflict_type: conflict.conflict_type,
        description: conflict.description,
        properties_affected: {},
        suggestions: []
      }
      
      setMessages(prev => [...prev, {
        type: 'conflict',
        role: 'agent',
        content: 'Conflict detected. Please review the changes below.',
        questionId: conflict.id,
        requiresAction: true,
        timestamp: new Date().toISOString(),
        conflict: conflictMessage
      }])
    }
  }

  const handleAutoResolveComplete = async () => {
    // Refresh the conflict list
    try {
      const response = await fetch(`/api/merge/${mergeId}/status`)
      if (response.ok) {
        const data = await response.json()
        setStatus(data.status as MergeStatus)
        setProgress(data.progress)
        setCurrentStep(data.current_step)
        
        // Check if all conflicts are resolved
        try {
          const conflictResponse = await fetch(`/api/merge/${mergeId}/conflicts?limit=1&offset=0`)
          if (conflictResponse.ok) {
            const conflictData = await conflictResponse.json()
            
            // Use the resolved count directly from the summary
            const resolvedCount = conflictData.summary?.resolved || 0
            
            setConflictStats({
              total: conflictData.total_count,
              resolved: resolvedCount
            })
            
            // Check if all conflicts are resolved
            const allResolved = conflictData.total_count > 0 && 
              resolvedCount === conflictData.total_count
            
            setAllConflictsResolved(allResolved)
            
            // If all conflicts are resolved, show a success toast
            if (allResolved) {
              toast({
                title: "All Conflicts Resolved",
                description: "All conflicts have been successfully resolved. You can now view the final merged graph.",
                variant: "default",
              })
            }
          }
        } catch (err) {
          console.error('Error fetching conflict stats:', err)
        }
        
        // Update visualization if needed
        if (activeTab === 'visualization' || activeTab === 'conflicts') {
          refreshVisualization()
        }
        
        // Show success toast
        toast({
          title: "Auto-Resolution Complete",
          description: "Conflicts have been automatically resolved.",
          variant: "default",
        })
      }
    } catch (error) {
      console.error('Error updating status after auto-resolution:', error)
    }
  }

  const handleViewFinalGraph = () => {
    setActiveTab('visualization')
    
    // Refresh the visualization to show the final state
    refreshVisualization()
    
    // Show a toast notification
    toast({
      title: "Final Merged Graph",
      description: "Showing the final merged graph with all conflicts resolved.",
      variant: "default",
    })
  }

  useEffect(() => {
    if (!sessionId || !transformId) {
      setError('Missing required parameters')
      return
    }

    // If we already have a merge_id, don't start a new merge
    if (initialMergeId) {
      return
    }

    // Start the merge process when the component mounts
    startMergeProcess()

    return () => {
      // Clean up interval on unmount
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current)
        statusIntervalRef.current = null
      }
    }
  }, [sessionId, transformId, initialMergeId])

  // Scroll to bottom of messages when new ones are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
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

  return (
    <WorkflowLayout 
      progress={progress} 
      currentStep={currentStep}
      toolbarContent={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Status:</span>
              <div className="flex items-center gap-2">
                {status === 'running' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : status === 'failed' ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : null}
                <span className="text-sm capitalize">
                  {status ? status.toLowerCase().replace('_', ' ') : 'DONE'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Progress:</span>
              <span className="text-gray-500">{progress}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {error ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            ) : status === 'running' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (status === 'running') {
                    setIsPaused(!isPaused)
                    // Call the pause/resume API
                    fetch(`/api/merge/${sessionId}/pause`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        transform_id: transformId,
                        action: isPaused ? 'resume' : 'pause'
                      })
                    }).catch(err => {
                      console.error('Error toggling pause state:', err)
                    })
                  }
                }}
                disabled={status !== 'running'}
              >
                {isPaused ? (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
            ) : null}
            {canSubmit && (
              <Button
                variant="default"
                size="sm"
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
      }
    >
      <div className="h-full flex flex-col">
        <Tabs 
          defaultValue="progress" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="border-b px-4">
            <TabsList className="h-10">
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
              <TabsTrigger value="visualization">Visualization</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="progress" className="flex-1 p-4">
            {mergeId ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b">
                  <MergeProgress
                    mergeId={mergeId || ''}
                    sessionId={sessionId}
                    transformId={transformId}
                    onViewConflicts={handleViewConflicts}
                    onCancel={handleCancelMerge}
                    onFinalize={handleAutoResolveComplete}
                  />
                </div>
                
                {/* Show the merge completion banner when all conflicts are resolved */}
                {allConflictsResolved && mergeId && (
                  <div className="p-4 border-b bg-green-50">
                    <MergeCompletionBanner
                      mergeId={mergeId}
                      onViewFinalGraph={handleViewFinalGraph}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Initializing merge process...</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="conflicts" className="flex-1 p-0 h-full">
            <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={60} minSize={40}>
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-medium">Merge Conflicts</h3>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (status === 'running') {
                            setIsPaused(!isPaused)
                            // Call the pause/resume API
                            fetch(`/api/merge/${sessionId}/pause`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                transform_id: transformId,
                                action: isPaused ? 'resume' : 'pause'
                              })
                            }).catch(err => {
                              console.error('Error toggling pause state:', err)
                            })
                          }
                        }}
                        disabled={status !== 'running'}
                      >
                        {isPaused ? (
                          <>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Resume
                          </>
                        ) : (
                          <>
                            <PauseCircle className="h-4 w-4 mr-2" />
                            Pause
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleCancelMerge}
                        disabled={isCancelling || status === 'completed' || status === 'failed'}
                      >
                        {isCancelling ? 'Cancelling...' : 'Cancel Merge'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Show the merge completion banner when all conflicts are resolved */}
                  {allConflictsResolved && mergeId && (
                    <div className="p-4 border-b">
                      <MergeCompletionBanner
                        mergeId={mergeId}
                        onViewFinalGraph={handleViewFinalGraph}
                      />
                    </div>
                  )}
                  
                  <div className="h-[calc(100vh-14rem)] overflow-hidden">
                    {mergeId ? (
                      <ConflictList
                        mergeId={mergeId}
                        onConflictSelect={handleConflictSelect}
                        selectedConflicts={selectedConflicts}
                        onSelectionChange={setSelectedConflicts}
                        onAutoResolveComplete={handleAutoResolveComplete}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
              
              <ResizableHandle />
              
              <ResizablePanel defaultSize={40} minSize={30}>
                <div className="h-full flex flex-col">
                  <div className="flex-1 relative">
                    {graphDataMemo ? (
                      <MergeGraphVisualization 
                        graphData={graphDataMemo} 
                        currentConflict={currentConflict}
                      />
                    ) : visualizationLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-gray-500">No graph data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
              
            </ResizablePanelGroup>
          </TabsContent>
          
          <TabsContent value="visualization" className="flex-1 p-0 h-full">
            <div className="h-full relative">
              {/* Show the merge completion banner at the top of the visualization when all conflicts are resolved */}
              {allConflictsResolved && mergeId && (
                <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-white bg-opacity-90 border-b">
                  <MergeCompletionBanner
                    mergeId={mergeId}
                    onViewFinalGraph={handleViewFinalGraph}
                    className="max-w-3xl mx-auto"
                  />
                </div>
              )}
              
              {graphDataMemo ? (
                <MergeGraphVisualization 
                  transformId={transformId}
                  mergeId={mergeId || undefined}
                  currentConflict={currentConflict}
                  graphData={graphDataMemo}
                />
              ) : visualizationLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500">No graph data available</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </WorkflowLayout>
  )
}

export default function MergePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Initializing merge process...</p>
        </div>
      </div>
    }>
      <MergePageContent />
    </Suspense>
  )
}
