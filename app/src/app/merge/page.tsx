'use client'

import { useState, useEffect, useRef, useMemo, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Loader2, PauseCircle, PlayCircle, AlertCircle, CheckCircle2, RefreshCcw, Monitor, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MergeGraphVisualization } from '@/components/merge-graph-viz'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { cn } from '@/lib/utils'
import type { ChatMessage, ConflictListItem, ConflictMessage } from '@/types/merge'
import { MergeStatus } from '@/types/merge'
import { useUser } from '@clerk/nextjs'
import { useMergeVisualization } from '@/hooks/useMergeVisualization'
import { MergeProgress } from '@/components/merge-progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { ConflictList } from '@/components/conflict-list'
import { MergeCompletionBanner } from '@/components/merge-completion-banner'
import { Activity, AlertTriangle, Network, BarChart3 } from 'lucide-react'
import { EnhancedWorkflowLayout, WorkflowStep } from '@/components/enhanced-workflow-layout'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import type { GraphData } from '@/types/graph'
import { Alert, AlertDescription } from '@/components/ui/alert'

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[MergePage]', ...args)
  }
}
const debugWarn = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.warn('[MergePage]', ...args)
  }
}

// Define workflow steps for merge page
const workflowSteps: WorkflowStep[] = [
  { 
    id: 'ontology', 
    title: 'Ontology', 
    description: 'Define your graph structure',
    status: 'completed'
  },
  { 
    id: 'transform', 
    title: 'Extract & Transform', 
    description: 'Upload documents and extract knowledge',
    status: 'completed'
  },
  { 
    id: 'merge', 
    title: 'Merge to Prod', 
    description: 'Merge data into production database',
    status: 'current'
  }
]

function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

function MergePageContent() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [isPaused, setIsPaused] = useState(false)
  const [status, setStatus] = useState<MergeStatus>(MergeStatus.STARTED)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [canSubmit, setCanSubmit] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [isRetrying, setIsRetrying] = useState(false)
  const [currentConflict, setCurrentConflict] = useState<any>(null)
  const [currentMergeId, setCurrentMergeId] = useState<string | null>(null)
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
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0); // in seconds
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedMergeProcess = useRef<boolean>(false);

  const sessionId = searchParams.get('session_id') || ''
  const transformId = searchParams.get('transform_id') || ''
  const initialMergeId = searchParams.get('merge_id') || ''

  // Set currentMergeId from initialMergeId immediately on component mount
  const handleNewQuestions = useCallback((questions: any[]) => {
    questions.forEach(question => {
      if (question.conflict_type) {
        setCurrentConflict(question)
        setMessages(prev => [
          ...prev,
          {
            type: 'conflict',
            role: 'agent',
            content: 'Conflict detected. Please review the changes below.',
            questionId: question.questionId,
            requiresAction: true,
            timestamp: new Date().toISOString(),
            conflict: question
          }
        ])
      } else {
        setMessages(prev => [
          ...prev,
          {
            type: 'question',
            role: 'agent',
            content: question.content,
            questionId: question.questionId,
            options: question.options,
            requiresAction: true,
            timestamp: new Date().toISOString()
          }
        ])
      }
    })

    if (questions.length > 0) {
      setCanSubmit(true)
    }
  }, [])

  useEffect(() => {
    if (initialMergeId) {
      debug(`Setting initial merge ID: ${initialMergeId}`)
      setCurrentMergeId(initialMergeId)
    }
  }, [initialMergeId])

  const {
    data: mergeVisualization,
    loading: visualizationLoading,
    error: visualizationError,
    fetchData: refreshVisualization
  } = useMergeVisualization(initialMergeId, transformId)

  const graphDataMemo = useMemo(() => {
    if (!mergeVisualization) return null;

    // Log the structure to understand the format
    debug('MergeVisualization response structure:', mergeVisualization)

    // Use a type assertion to treat it as a generic object for safe access
    const visualizationData = mergeVisualization as any;

    // Transform to GraphData format with safe fallbacks
    const nodes = Array.isArray(visualizationData.nodes)
      ? visualizationData.nodes
      : Array.isArray(visualizationData.data?.nodes)
        ? visualizationData.data.nodes
        : []

    const edges = Array.isArray(visualizationData.edges)
      ? visualizationData.edges
      : Array.isArray(visualizationData.data?.edges)
        ? visualizationData.data.edges
        : []

    const graphData = {
      nodes,
      edges,
    }

    debug('Transformed GraphData:', graphData)
    return graphData as GraphData; // Explicitly cast to GraphData type
  }, [mergeVisualization]);

  const startStatusPolling = useCallback((id: string | null) => {
    if (!id) {
      debug('Attempted to start polling with null ID, aborting.')
      return
    }

    if (statusIntervalRef.current) {
      debug('Clearing existing polling interval before starting new one.')
      clearInterval(statusIntervalRef.current)
      statusIntervalRef.current = null
    }

    debug(`Starting status polling for merge ID: ${id}`)

    const pollStatus = async () => {
      if (!id) {
        debugWarn('Polling function called with null ID, stopping interval.')
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current)
          statusIntervalRef.current = null
        }
        return
      }

      try {
        const response = await fetch(`/api/merge/merges/${id}/status`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        const statusValue = typeof data === 'string' ? data : (data.status as MergeStatus)
        setStatus(statusValue as MergeStatus)

        if (typeof data === 'object' && data.progress !== undefined) {
          setProgress(data.progress)
        }

        if (typeof data === 'object' && data.currentStep) {
          setCurrentStep(data.currentStep)
        }

        if (typeof data === 'object' && data.questions && data.questions.length > 0) {
          handleNewQuestions(data.questions)
        }

        if (statusValue === MergeStatus.COMPLETED) {
          if (statusIntervalRef.current) {
            debug(`Merge ${id} completed, stopping polling.`)
            clearInterval(statusIntervalRef.current)
            statusIntervalRef.current = null
          }

          setActiveTab('visualization')
          refreshVisualization()
        }

        if (typeof data === 'object' && data.has_conflicts && data.conflict_count > 0) {
          debug(`Polling check for conflicts for merge ID: ${id}`)
          try {
            const conflictResponse = await fetch(`/api/merge/merges/${id}/conflicts?limit=1&offset=0`)
            if (conflictResponse.ok) {
              const conflictData = await conflictResponse.json()
              const resolvedCount = conflictData.summary?.resolved || 0

              setConflictStats({
                total: conflictData.total_count,
                resolved: resolvedCount
              })

              const allResolved = conflictData.total_count > 0 && resolvedCount === conflictData.total_count

              setAllConflictsResolved(previouslyResolved => {
                const shouldShowToast = !previouslyResolved && allResolved
                if (shouldShowToast) {
                  toast({
                    title: 'All Conflicts Resolved',
                    description: 'All conflicts have been successfully resolved. You can now view the final merged graph.',
                    variant: 'default'
                  })
                }
                return allResolved
              })
              setShowMergeCompletionBanner(allResolved)
            }
          } catch (err) {
            console.error('Error fetching conflict stats:', err)
          }
        }

        if (
          statusValue === MergeStatus.COMPLETED ||
          statusValue === MergeStatus.FAILED ||
          statusValue === MergeStatus.CANCELLED
        ) {
          if (statusIntervalRef.current) {
            debug(`Merge ${id} reached terminal state (${statusValue}), stopping polling.`)
            clearInterval(statusIntervalRef.current)
            statusIntervalRef.current = null
          }
        }
      } catch (error) {
        console.error(`Error polling merge status for ${id}:`, error)
      }
    }

    pollStatus()
    statusIntervalRef.current = setInterval(pollStatus, 5000)
  }, [handleNewQuestions, refreshVisualization])

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
    }
  }, [isLoaded, user, router])

  // Effect to handle tab activation based on status changes
  useEffect(() => {
    // When status changes to COMPLETED, activate the graph tab
    if (status === MergeStatus.COMPLETED) {
      debug('Status is COMPLETED, activating graph tab and refreshing visualization')
      setActiveTab('visualization')
      refreshVisualization().catch(err => {
        console.error('Error refreshing visualization:', err)
      })
    }
  }, [status, refreshVisualization])

  // Timer effect
  useEffect(() => {
    // Function to clear the interval
    const clearTimerInterval = () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        debug('Timer interval cleared.')
      }
    };

    // Start timer only if startTime is set and status is not terminal
    if (startTime && 
        status !== MergeStatus.COMPLETED && 
        status !== MergeStatus.FAILED && 
        status !== MergeStatus.CANCELLED) {
      debug('Starting timer interval (not in terminal state).')
      // Clear any existing interval first
      clearTimerInterval(); 
      
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      // Stop timer if status is terminal or startTime is null
      debug('Timer should stop or not start.', { status, startTime })
      clearTimerInterval();
    }

    // Cleanup on component unmount or when dependencies change causing timer to stop
    return clearTimerInterval;
  }, [startTime, status]);

  useEffect(() => {
    // Consolidated effect to handle initial status check and polling
    if (currentMergeId) {
      const checkAndPollStatus = async () => {
        if (!currentMergeId || (statusIntervalRef.current !== null)) {
             // Don't start if no ID or already polling
            debug('Polling check: No merge ID or polling already active.')
             return;
         }

        debug(`Checking initial status for merge ID: ${currentMergeId}`)
        try {
          const response = await fetch(`/api/merge/merges/${currentMergeId}/status`)
          if (response.ok) {
            const data = await response.json()
            const statusValue = typeof data === 'string' ? data : data.status as MergeStatus

            debug(`Initial status for ${currentMergeId}: ${statusValue}`)

            setStatus(statusValue as MergeStatus) // Cast to MergeStatus
            
            // Set start time for ongoing merges if not already set
            if (statusValue === MergeStatus.STARTED || statusValue === MergeStatus.MERGE_IN_PROGRESS) {
              setStartTime(prev => prev ?? Date.now())
            }

            if (statusValue === MergeStatus.COMPLETED) {
              debug('Merge already completed, setting graph view.')
              setActiveTab('visualization')
              setIsLoadingGraph(true)
              refreshVisualization().finally(() => setIsLoadingGraph(false))
              // Don't start polling for completed merges
              return
            } else if (statusValue === MergeStatus.FAILED || statusValue === MergeStatus.CANCELLED) {
              debug(`Merge already in terminal state (${statusValue}), not polling.`)
               // Update progress/step if available
               if (typeof data === 'object' && data.progress !== undefined) setProgress(data.progress);
               if (typeof data === 'object' && data.currentStep) setCurrentStep(data.currentStep);
              // Don't start polling for failed/cancelled merges
              return
            }

            // If not in a terminal state, start polling
            debug(`Merge status is ${statusValue}, starting regular polling.`)
            startStatusPolling(currentMergeId)

          } else {
            debugWarn(`Initial status check failed (${response.status}), starting polling anyway.`)
            // If status check fails initially, start polling to potentially recover
            startStatusPolling(currentMergeId)
          }
        } catch (error) {
          console.error('Error checking initial status:', error)
          // Start polling even if initial check fails
          startStatusPolling(currentMergeId)
        }
      }

      checkAndPollStatus()

      // Cleanup function for this effect
      return () => {
        debug('Cleaning up polling interval due to mergeId change or unmount.')
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current)
          statusIntervalRef.current = null
        }
      }
    } else {
         // Explicitly stop polling if mergeId becomes null
         debug('Merge ID is null, ensuring polling is stopped.')
         if (statusIntervalRef.current) {
             clearInterval(statusIntervalRef.current);
             statusIntervalRef.current = null;
         }
     }
  }, [currentMergeId, refreshVisualization, startStatusPolling])

  const startMergeProcess = useCallback(async () => {
    if (!sessionId || !transformId) {
      const error = 'Missing required parameters: sessionId or transformId'
      console.error(error)
      setError(error)
      return
    }

    try {
      setError(null)

      // Add initial status message
      setMessages(prev => [...prev, {
        type: 'status',
        role: 'system',
        content: 'Initializing merge process...',
        timestamp: new Date().toISOString()
      }])

      debug('Starting merge process...')
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
      debug('Merge process started successfully:', data)

      if (data.merge_id) {
        // Set the state, which will trigger the useEffect hook to handle polling
        setCurrentMergeId(data.merge_id)
        
        // Start the timer when merge actually begins
        setStartTime(prev => prev ?? Date.now())

        // Update URL with merge_id without navigation
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.set('merge_id', data.merge_id)
        window.history.pushState({}, '', newUrl.toString())

         // Add success message
         setMessages(prev => [...prev, {
           type: 'status',
           role: 'system',
           content: `Merge process started successfully (ID: ${data.merge_id}).`,
           timestamp: new Date().toISOString()
         }])
         // No need to call startStatusPolling here, the useEffect will handle it
      } else {
         throw new Error("Merge started but no merge_id received.");
      }

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

      setStatus(MergeStatus.FAILED) // Use Enum
    }
  }, [sessionId, transformId, initialMergeId])

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

      const response = await fetch(`/api/merge/merges/${sessionId}/answer`, {
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

      // Clear merge_id from URL to allow fresh retry
      const newSearchParams = new URLSearchParams(searchParams.toString())
      newSearchParams.delete('merge_id')
      router.push(`${pathname}?${newSearchParams.toString()}`)

      // Reset ALL state for fresh start
      setStatus(MergeStatus.STARTED)
      setProgress(0)
      setCurrentStep('Initializing merge...')
      setMessages([])
      setCurrentConflict(null)
      setCurrentMergeId(null)
      setStartTime(Date.now()) // Reset start time for proper elapsed time tracking
      setElapsedTime(0)
      setConflictStats({ total: 0, resolved: 0 })
      setAllConflictsResolved(false)
      setShowMergeCompletionBanner(false)
      hasStartedMergeProcess.current = false

      // Start the merge process again
      await startMergeProcess()

    } catch (error) {
      console.error('Error retrying merge:', error)
      setError(error instanceof Error ? error.message : 'Failed to retry merge')
      setStatus(MergeStatus.FAILED)
    } finally {
      setIsRetrying(false)
    }
  }

  const handleCancelMerge = async () => {
    if (!currentMergeId) return; // Use state variable

    try {
      setIsCancelling(true);
      const response = await fetch(`/api/merge/merges/${currentMergeId}/cancel`, { // Use state variable
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel merge: ${response.status}`);
      }

      // Update status to cancelled
      setStatus(MergeStatus.CANCELLED); // Use Enum

      // Stop polling - Explicitly clear here as well for immediate effect
      if (statusIntervalRef.current) {
        debug(`Merge ${currentMergeId} cancelled, stopping polling.`)
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
    if (!currentMergeId) return; // Use state variable
    debug(`Handling auto-resolve completion for merge ID: ${currentMergeId}`)
    // Refresh the conflict list and status
    try {
      const response = await fetch(`/api/merge/merges/${currentMergeId}/status`) // Use state variable
      if (response.ok) {
        const data = await response.json()
        const statusValue = typeof data === 'string' ? data : data.status as MergeStatus
        debug(`Status after auto-resolve for ${currentMergeId}: ${statusValue}`)
        setStatus(statusValue as MergeStatus) // Cast to MergeStatus
        
        // If status is object format
        if (typeof data === 'object') {
          if (data.progress !== undefined) {
            setProgress(data.progress)
          }
          if (data.current_step) {
            setCurrentStep(data.current_step)
          }
        }

        // Check if all conflicts are resolved
        try {
          const conflictResponse = await fetch(`/api/merge/merges/${currentMergeId}/conflicts?limit=1&offset=0`) // Use state variable
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
            setShowMergeCompletionBanner(allResolved)

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

        // Update visualization if status is completed
        if (statusValue === MergeStatus.COMPLETED) {
          setActiveTab('visualization')
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

  const handleViewStatus = () => {
    const url = process.env.NEXT_PUBLIC_MERGE_PREFECT_STATUS_URL;
    if (url) {
      window.open(url, '_blank');
    } else {
      debugWarn('NEXT_PUBLIC_MERGE_PREFECT_STATUS_URL is not defined.')
      // Optionally show a toast or alert to the user
      // toast({ title: "Configuration Error", description: "Status URL is not configured.", variant: "destructive" });
    }
  };

  useEffect(() => {
    // This effect now only starts the merge process if no initial merge ID is provided.
    // Polling is handled by the effect hook dependent on `currentMergeId`.
    if (!sessionId || !transformId) {
      setError('Missing required parameters')
      return
    }

    // If we already have an initial merge_id, polling is handled by the other useEffect.
    // If not, start a new merge process.
    if (!initialMergeId && !hasStartedMergeProcess.current) { 
      debug('No initial merge ID found, starting new merge process.')
      // Start the merge process when the component mounts without an initial mergeId
      hasStartedMergeProcess.current = true; 
      startMergeProcess()
    } else {
        debug('Initial merge ID exists or merge already started/loaded, skipping automatic start.')
    }

    // Cleanup is handled by the other useEffect hook tied to currentMergeId
    // No return function needed here anymore for interval cleanup.
  }, [sessionId, transformId, initialMergeId, startMergeProcess])

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
    <div className="flex-1 flex flex-col h-full">
      {/* Alert Dialog for Cancellation Confirmation */}
      <AlertDialog open={isCancelling} onOpenChange={setIsCancelling}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the merge process? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelMerge}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelMerge}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="page-shell py-section stack-gap">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-10 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <TabsList className="w-full">
                <TabsTrigger value="progress" className="flex-1">
                  <Activity className="h-4 w-4 mr-2" />
                  Progress
                </TabsTrigger>
                <TabsTrigger value="conflicts" className="flex-1">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Conflicts
                  {conflictStats.total > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {conflictStats.resolved}/{conflictStats.total}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="visualization" className="flex-1">
                  <Network className="h-4 w-4 mr-2" />
                  Graph View
                  {allConflictsResolved && (
                    <Badge variant="outline" className="ml-2 bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3" />
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                {/* Timer Display */}
                {startTime &&
                  status !== MergeStatus.COMPLETED &&
                  status !== MergeStatus.FAILED &&
                  status !== MergeStatus.CANCELLED && (
                  <div className="flex items-center text-sm text-muted-foreground bg-muted px-2 py-1 rounded whitespace-nowrap" title="Elapsed Time">
                    <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="font-mono">{formatElapsedTime(elapsedTime)}</span>
                  </div>
                )}
                
                {/* View Status Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleViewStatus}
                  disabled={!currentMergeId}
                  title="View detailed execution status in Prefect"
                >
                  <Monitor className="h-4 w-4 mr-1" />
                  View Status
                </Button>

                {/* Retry Button for Failed Merges */}
                {status === MergeStatus.FAILED && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleRetry}
                    disabled={isRetrying}
                    title="Retry the merge process"
                  >
                    {isRetrying ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4 mr-1" />
                    )}
                    {isRetrying ? 'Retrying...' : 'Retry'}
                  </Button>
                )}
              </div>
            </div>
            <TabsContent value="progress" className="space-y-4">
                {currentMergeId ? (
                  <MergeProgress
                    mergeId={currentMergeId || ''}
                    sessionId={sessionId}
                    transformId={transformId}
                    onViewConflicts={handleViewConflicts}
                    onCancel={handleCancelMerge}
                    onFinalize={handleAutoResolveComplete}
                    onRetry={handleRetry}
                    isRetrying={isRetrying}
                  />
                ) : (
                  <div className="enhanced-card">
                    <div className="enhanced-card-content flex flex-col items-center justify-center gap-3 py-12 min-h-[80vh]">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-muted-foreground">Initializing merge process...</p>
                    </div>
                  </div>
                )}
            </TabsContent>
            
            <TabsContent value="conflicts" className="space-y-4">
              <div className="enhanced-card">
                <div className="enhanced-card-content h-[80vh] relative p-0 overflow-hidden rounded-lg">
                  {currentMergeId ? (
                    <ConflictList
                      mergeId={currentMergeId}
                      onConflictSelect={handleConflictSelect}
                      selectedConflicts={selectedConflicts}
                      onSelectionChange={setSelectedConflicts}
                      onAutoResolveComplete={handleAutoResolveComplete}
                      onViewMergedResults={() => {/* navigate to results */}}
                      onViewFinalGraph={handleViewFinalGraph}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="text-muted-foreground">Loading conflicts...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="visualization" className="space-y-4">
              <div className="enhanced-card">
                <div className="enhanced-card-content h-[80vh] relative p-0 overflow-hidden rounded-lg">

                  
                  {isLoadingGraph && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                        <p className="text-muted-foreground">Loading graph...</p>
                      </div>
                    </div>
                  )}
                  
                  {graphDataMemo ? (
                    <MergeGraphVisualization
                      transformId={transformId}
                      mergeId={currentMergeId || undefined}
                      currentConflict={currentConflict}
                      graphData={graphDataMemo}
                    />
                  ) : visualizationLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="text-muted-foreground">Loading visualization...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                          <Network className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-foreground">No Graph Data</p>
                          <p className="text-sm text-muted-foreground">Graph visualization will appear here after merge completion</p>
                        </div>
                        {(status === MergeStatus.COMPLETED) && (
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
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default function MergePage() {
  const handleStepNavigation = (stepId: string) => {
    const routes: Record<string, string> = {
      'ontology': '/ontology',
      'transform': '/transform',
      'merge': '/merge'
    }
    
    if (routes[stepId] && typeof window !== 'undefined') {
      window.location.href = routes[stepId]
    }
  }

  return (
    <EnhancedWorkflowLayout 
      steps={workflowSteps}
      currentStepId="merge"
      projectTitle="Merge Process"
      onStepClick={handleStepNavigation}
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Initializing merge process...</p>
          </div>
        </div>
      }>
        <MergePageContent />
      </Suspense>
    </EnhancedWorkflowLayout>
  )
}
