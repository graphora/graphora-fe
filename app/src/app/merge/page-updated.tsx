'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MergeGraphVisualization } from '@/components/merge-graph-visualization'
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { cn } from '@/lib/utils'
import type { ChatMessage, MergeStatus, ConflictListItem, ConflictMessage } from '@/types/merge'
import { useUser } from '@clerk/nextjs'
import { useMergeVisualization } from '@/hooks/useMergeVisualization'
import { MergeProgress } from '@/components/merge-progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { ConflictList } from '@/components/conflict-list'
import { MergeCompletionBanner } from '@/components/merge-completion-banner'
import { Activity, AlertTriangle, Network } from 'lucide-react'
import { WorkflowLayout } from '@/components/workflow-layout'

function MergePageContent() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const searchParams = useSearchParams()

  const [status, setStatus] = useState<MergeStatus>(MergeStatus.STARTED)
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
  const [activeTab, setActiveTab] = useState<string>('progress')
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [selectedConflicts, setSelectedConflicts] = useState<string[]>([])
  const [allConflictsResolved, setAllConflictsResolved] = useState(false)
  const [showMergeCompletionBanner, setShowMergeCompletionBanner] = useState(false)
  const [conflictStats, setConflictStats] = useState<{total: number, resolved: number}>({
    total: 0,
    resolved: 0
  })
  const [isLoadingGraph, setIsLoadingGraph] = useState(false)
  const [isFirstStatusCheck, setIsFirstStatusCheck] = useState(true)

  const sessionId = searchParams.get('session_id') || ''
  const transformId = searchParams.get('transform_id') || ''
  const initialMergeId = searchParams.get('merge_id') || ''

  const { 
    data: mergeVisualization, 
    loading: visualizationLoading, 
    error: visualizationError, 
    fetchData: refreshVisualization
  } = useMergeVisualization(mergeId || initialMergeId, transformId)

  const graphDataMemo = useMemo(() => {
    if (!mergeVisualization?.data) return null
    return mergeVisualization.data
  }, [mergeVisualization?.data])

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
    }
  }, [isLoaded, user, router])

  // Effect to handle tab activation based on status
  useEffect(() => {
    // When status changes to HUMAN_REVIEW, activate the conflicts tab
    if (status === MergeStatus.HUMAN_REVIEW && conflictStats.total > 0) {
      setActiveTab('conflicts')
      
      // Show notification
      toast({
        title: "Conflicts Need Resolution",
        description: `${conflictStats.total} conflicts need your attention.`,
        variant: "default",
      })
    }
    
    // When status changes to COMPLETED, activate the graph tab
    if (status === MergeStatus.COMPLETED) {
      setActiveTab('visualization')
      refreshVisualization() // Refresh graph data
      
      // Show notification
      toast({
        title: "Merge Completed",
        description: "The merge process has been completed successfully.",
        variant: "default",
      })
    }
  }, [status, conflictStats.total, refreshVisualization])

  useEffect(() => {
    // If merge_id is provided in URL, use it
    if (initialMergeId) {
      setMergeId(initialMergeId)
      setMergeStarted(true)
      
      // Start polling for status and conflict updates immediately
      startStatusPolling(initialMergeId)
    }
  }, [initialMergeId])

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
          sessionId: sessionId,
          mergeId: initialMergeId || 'new'
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
        
        // Start polling for status updates with the new merge ID
        startStatusPolling(data.merge_id)
      }
      
      // Add success message
      setMessages(prev => [...prev, {
        type: 'status',
        role: 'system',
        content: 'Merge process started successfully.',
        timestamp: new Date().toISOString()
      }])
      
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
      
      setStatus(MergeStatus.FAILED)
    }
  }
  
  const startStatusPolling = (id: string) => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current)
    }
    
    const pollStatus = async () => {
      if (!id) return
      
      try {
        const response = await fetch(`/api/merge/merges/${id}/status`)
        
        // Don't show 404 errors during initial polling
        if (response.status === 404 && isFirstStatusCheck) {
          console.log('Status not available yet, will retry...')
          setIsFirstStatusCheck(false)
          return
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        setIsFirstStatusCheck(false)
        
        // Update status
        setStatus(data.status)
        
        // Update progress if available
        if (data.progress !== undefined) {
          setProgress(data.progress)
        } else {
          // Calculate progress based on status
          const progressMap: Record<MergeStatus, number> = {
            [MergeStatus.STARTED]: 10,
            [MergeStatus.AUTO_RESOLVE]: 30,
            [MergeStatus.HUMAN_REVIEW]: 50,
            [MergeStatus.READY_TO_MERGE]: 70,
            [MergeStatus.MERGE_IN_PROGRESS]: 85,
            [MergeStatus.COMPLETED]: 100,
            [MergeStatus.FAILED]: 0,
            [MergeStatus.CANCELLED]: 0
          }
          setProgress(progressMap[data.status] || 0)
        }
        
        // Update current step if available
        if (data.current_stage) {
          setCurrentStep(data.current_stage)
        }
        
        // Check if status is HUMAN_REVIEW, then fetch conflicts
        if (data.status === MergeStatus.HUMAN_REVIEW) {
          fetchConflicts(id)
        }
        
        // If status is COMPLETED, refresh the graph
        if (data.status === MergeStatus.COMPLETED) {
          refreshVisualization()
        }
        
        // If merge is completed or failed, stop polling
        if (data.status === MergeStatus.COMPLETED || 
            data.status === MergeStatus.FAILED || 
            data.status === MergeStatus.CANCELLED) {
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
    statusIntervalRef.current = setInterval(pollStatus, 10000) // Poll every 10 seconds
  }
  
  const fetchConflicts = async (id: string) => {
    try {
      const response = await fetch(`/api/merge/merges/${id}/conflicts`)
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Conflicts not available yet, will retry...')
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Update conflict stats
      const resolvedCount = Array.isArray(data) 
        ? data.filter((c: any) => c.resolved).length 
        : (data.summary?.resolved || 0)
      
      const totalCount = Array.isArray(data) 
        ? data.length 
        : (data.total_count || data.length || 0)
      
      setConflictStats({
        total: totalCount,
        resolved: resolvedCount
      })
      
      // Check if all conflicts are resolved
      const allResolved = totalCount > 0 && resolvedCount === totalCount
      
      // If all conflicts are resolved and this is a change, show a toast
      if (allResolved && !allConflictsResolved) {
        toast({
          title: "All Conflicts Resolved",
          description: "All conflicts have been successfully resolved. You can now finalize the merge.",
          variant: "default",
        })
      }
      
      setAllConflictsResolved(allResolved)
      setShowMergeCompletionBanner(allResolved)
    } catch (error) {
      console.error('Error fetching conflicts:', error)
    }
  }

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
    // Refresh the conflict list and status
    if (!mergeId) return
    
    try {
      const response = await fetch(`/api/merge/merges/${mergeId}/status`)
      if (response.ok) {
        const data = await response.json()
        setStatus(data.status)
        
        // If status is READY_TO_MERGE or COMPLETED, refresh the graph
        if (data.status === MergeStatus.READY_TO_MERGE || data.status === MergeStatus.COMPLETED) {
          refreshVisualization()
          setActiveTab('visualization')
          
          toast({
            title: "Merge Ready",
            description: "All conflicts have been resolved. You can now view the final graph.",
            variant: "default",
          })
        }
      }
    } catch (error) {
      console.error('Error updating status after auto-resolution:', error)
    }
  }

  const handleViewProgress = () => {
    setActiveTab('progress')
  }

  const handleViewFinalGraph = () => {
    setActiveTab('visualization')
    setIsLoadingGraph(true)
    
    // Refresh the visualization to show the final state
    refreshVisualization().finally(() => {
      setIsLoadingGraph(false)
    })
    
    // Show a toast notification
    toast({
      title: "Final Merged Graph",
      description: "Showing the final merged graph with all conflicts resolved.",
      variant: "default",
    })
  }

  const handleCancelMerge = async () => {
    if (!mergeId) return;
    
    try {
      setIsCancelling(true);
      const response = await fetch(`/api/merge/cancel/${mergeId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to cancel merge: ${response.status}`);
      }
      
      // Update status to cancelled
      setStatus(MergeStatus.CANCELLED);
      
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
    <WorkflowLayout progress={progress}>
    <div className="h-full flex flex-col">

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full bg-white">
          <div className="container py-4">
            <TabsList>
              <TabsTrigger value="progress">
                <Activity className="h-4 w-4 mr-2" />
                Progress
              </TabsTrigger>
              <TabsTrigger value="conflicts">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Conflicts
                {conflictStats.total > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {conflictStats.resolved}/{conflictStats.total}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="visualization">
                <Network className="h-4 w-4 mr-2" />
                Graph View
                {allConflictsResolved && (
                  <Badge variant="outline" className="ml-2 bg-green-100 text-green-800">
                    <CheckCircle2 className="h-3 w-3" />
                  </Badge>
                )}
              </TabsTrigger>
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
                {showMergeCompletionBanner && mergeId && (
                  <div className="p-4 border-b bg-green-50">
                    <MergeCompletionBanner
                      mergeId={mergeId}
                      onViewFinalGraph={handleViewFinalGraph}
                      onViewProgress={handleViewProgress}
                      takeToFinalize={false}
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
                <div className="h-full flex flex-col">
                  
                  {/* Show the merge completion banner when all conflicts are resolved */}
                  {allConflictsResolved && mergeId && (
                    <div className="p-4 border-b">
                      <MergeCompletionBanner
                        mergeId={mergeId}
                        onViewFinalGraph={handleViewFinalGraph}
                        onViewProgress={handleViewProgress}
                        takeToFinalize={false}
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
                        onViewMergedResults={() => {/* navigate to results */}}
                        onViewFinalGraph={handleViewFinalGraph}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
          </TabsContent>
          <TabsContent value="visualization" className="flex-1 p-0 h-full">
            <div className="h-full relative">
              {/* Show the merge completion banner at the top of the visualization when all conflicts are resolved */}
              {allConflictsResolved && mergeId && (
                <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-white bg-opacity-90 border-b">
                  <MergeCompletionBanner
                    mergeId={mergeId}
                    onViewProgress={handleViewProgress}
                    onViewFinalGraph={handleViewProgress}
                    takeToFinalize={true}
                    className="max-w-3xl mx-auto"
                  />
                </div>
              )}
              {isLoadingGraph && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-20">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Loading graph...</p>
                  </div>
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
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-amber-500 mb-2" />
                  <p className="text-sm text-gray-500">No graph data available yet</p>
                  {(status === MergeStatus.COMPLETED || status === MergeStatus.READY_TO_MERGE) && (
                    <Button 
                      onClick={refreshVisualization}
                      variant="outline"
                      className="mt-4"
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Refresh Graph
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
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
