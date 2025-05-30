'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, PauseCircle, PlayCircle, AlertCircle, CheckCircle2, RefreshCcw, Monitor, Clock, X, GitMerge } from 'lucide-react'
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
import { PageHeader } from '@/components/layouts/page-header'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import type { GraphData } from '@/types/graph'

// Define workflow steps for merge page
const workflowSteps: WorkflowStep[] = [
  { 
    id: 'ontology', 
    title: 'Ontology Entry', 
    description: 'Define your graph structure',
    estimatedTime: '15-30 min',
    status: 'completed'
  },
  { 
    id: 'upload', 
    title: 'Document Upload', 
    description: 'Upload documents to process',
    estimatedTime: '5-10 min',
    status: 'completed'
  },
  { 
    id: 'edit', 
    title: 'Graph Editing', 
    description: 'Refine extracted graph',
    estimatedTime: '20-45 min',
    status: 'completed'
  },
  { 
    id: 'merge', 
    title: 'Merge Process', 
    description: 'Combine data into final graph',
    estimatedTime: '10-20 min',
    status: 'current'
  },
  { 
    id: 'domain-apps', 
    title: 'Domain Apps', 
    description: 'Visualize domain-specific insights',
    estimatedTime: '5-15 min',
    status: 'upcoming'
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
  useEffect(() => {
    if (initialMergeId) {
      console.log(`Setting initial merge ID: ${initialMergeId}`)
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
    console.log('MergeVisualization response structure:', mergeVisualization);
    
    // Use a type assertion to treat it as a generic object for safe access
    const visualizationData = mergeVisualization as any;
    
    // Transform to GraphData format with safe fallbacks
    const graphData = {
      nodes: Array.isArray(visualizationData.nodes) 
        ? visualizationData.nodes 
        : Array.isArray(visualizationData.data?.nodes)
          ? visualizationData.data.nodes
          : [],
      
      edges: Array.isArray(visualizationData.edges) 
        ? visualizationData.edges 
        : Array.isArray(visualizationData.data?.edges)
          ? visualizationData.data.edges
          : [],
      
      _reset: Date.now() // Add reset key to force re-render if needed
    };
    
    console.log('Transformed GraphData:', graphData);
    return graphData as GraphData; // Explicitly cast to GraphData type
  }, [mergeVisualization]);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
    }
  }, [isLoaded, user, router])

  // Effect to handle tab activation based on status changes
  useEffect(() => {
    // When status changes to COMPLETED, activate the graph tab
    if (status === MergeStatus.COMPLETED) {
      console.log('Status is COMPLETED, activating graph tab and refreshing visualization')
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
        console.log("Timer interval cleared.");
      }
    };

    // Start timer only if startTime is set and status is not terminal
    if (startTime && 
        status !== MergeStatus.COMPLETED && 
        status !== MergeStatus.FAILED && 
        status !== MergeStatus.CANCELLED) {
      console.log("Starting timer interval (not in terminal state).");
      // Clear any existing interval first
      clearTimerInterval(); 
      
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      // Stop timer if status is terminal or startTime is null
      console.log("Timer should stop or not start. Status:", status, "Start time:", startTime);
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
             console.log("Polling check: No merge ID or polling already active.");
             return;
         }

        console.log(`Checking initial status for merge ID: ${currentMergeId}`);
        try {
          const response = await fetch(`/api/merge/merges/${currentMergeId}/status`)
          if (response.ok) {
            const data = await response.json()
            const statusValue = typeof data === 'string' ? data : data.status as MergeStatus

            console.log(`Initial status for ${currentMergeId}: ${statusValue}`);

            setStatus(statusValue as MergeStatus) // Cast to MergeStatus

            if (statusValue === MergeStatus.COMPLETED) {
              console.log('Merge already completed, setting graph view.')
              setActiveTab('visualization')
              setIsLoadingGraph(true)
              refreshVisualization().finally(() => setIsLoadingGraph(false))
              // Don't start polling for completed merges
              return
            } else if (statusValue === MergeStatus.FAILED || statusValue === MergeStatus.CANCELLED) {
              console.log(`Merge already in terminal state (${statusValue}), not polling.`);
               // Update progress/step if available
               if (typeof data === 'object' && data.progress !== undefined) setProgress(data.progress);
               if (typeof data === 'object' && data.currentStep) setCurrentStep(data.currentStep);
              // Don't start polling for failed/cancelled merges
              return
            }

            // If not in a terminal state, start polling
            console.log(`Merge status is ${statusValue}, starting regular polling.`);
            startStatusPolling(currentMergeId)

          } else {
            console.warn(`Initial status check failed (${response.status}), starting polling anyway.`);
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
        console.log("Cleaning up polling interval due to mergeId change or unmount.");
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current)
          statusIntervalRef.current = null
        }
      }
    } else {
         // Explicitly stop polling if mergeId becomes null
         console.log("Merge ID is null, ensuring polling is stopped.");
         if (statusIntervalRef.current) {
             clearInterval(statusIntervalRef.current);
             statusIntervalRef.current = null;
         }
     }
  }, [currentMergeId, refreshVisualization]) // Depend only on currentMergeId and refreshVisualization

  const startMergeProcess = async () => {
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
        // Set the state, which will trigger the useEffect hook to handle polling
        setCurrentMergeId(data.merge_id)

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
  }

  const startStatusPolling = (id: string | null) => {
     // Ensure ID is valid before proceeding
     if (!id) {
         console.log("Attempted to start polling with null ID, aborting.");
         return;
     }

    // Clear any potentially existing interval *before* starting a new one
    if (statusIntervalRef.current) {
      console.log("Clearing existing polling interval before starting new one.");
      clearInterval(statusIntervalRef.current)
      statusIntervalRef.current = null; // Explicitly set to null
    }

    console.log(`Starting status polling for merge ID: ${id}`);

    const pollStatus = async () => {
       // Double check id inside the interval function closure
       if (!id) {
         console.warn("Polling function called with null ID, stopping interval.");
         if (statusIntervalRef.current) {
           clearInterval(statusIntervalRef.current);
           statusIntervalRef.current = null;
         }
         return;
       }
      
      console.log(`Polling status for merge ID: ${id}`) // Added logging

      try {
        const response = await fetch(`/api/merge/merges/${id}/status`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        // Update status - handle both response formats
        const statusValue = typeof data === 'string' ? data : data.status as MergeStatus
        
        // Check if we're in a terminal state BEFORE updating React state
        const isTerminalState = statusValue === MergeStatus.COMPLETED || 
                               statusValue === MergeStatus.FAILED || 
                               statusValue === MergeStatus.CANCELLED;
        
        console.log(`Status for ${id}: ${statusValue}, Terminal: ${isTerminalState}`);
        
        // If we're in a terminal state, stop polling immediately
        if (isTerminalState) {
          console.log(`Merge ${id} reached terminal state (${statusValue}), stopping polling immediately.`);
          if (statusIntervalRef.current) {
            clearInterval(statusIntervalRef.current);
            statusIntervalRef.current = null;
          }
        }
        
        setStatus(statusValue as MergeStatus) // Cast to MergeStatus

        // Update progress if available (for object response format)
        if (typeof data === 'object' && data.progress !== undefined) {
          setProgress(data.progress)
        }

        // Update current step if available (for object response format)
        if (typeof data === 'object' && data.currentStep) {
          setCurrentStep(data.currentStep)
        }

        // Handle conflicts or questions if any (for object response format)
        if (typeof data === 'object' && data.questions && data.questions.length > 0) {
          handleNewQuestions(data.questions)
        }

        // If merge is completed, refresh visualization and switch to graph tab
        if (statusValue === MergeStatus.COMPLETED) {
          // Switch to graph tab
          setActiveTab('visualization')
          
          // Refresh visualization
          refreshVisualization()
        }

        // Check if all conflicts are resolved (only for non-terminal states)
        if (!isTerminalState && typeof data === 'object' && data.has_conflicts && data.conflict_count > 0) {
          console.log(`Polling check for conflicts for merge ID: ${id}`);
          // Fetch conflict stats to check if all are resolved
          try {
            const conflictResponse = await fetch(`/api/merge/merges/${id}/conflicts?limit=1&offset=0`)
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
              setShowMergeCompletionBanner(allResolved)
            }
          } catch (err) {
            console.error('Error fetching conflict stats:', err)
          }
        }

      } catch (error) {
        console.error(`Error polling merge status for ${id}:`, error) // Added logging
        // On error, continue polling unless it's a 404 (merge not found)
        if (error instanceof Error && error.message.includes('404')) {
          console.log(`Merge ${id} not found (404), stopping polling.`);
          if (statusIntervalRef.current) {
            clearInterval(statusIntervalRef.current);
            statusIntervalRef.current = null;
          }
        }
      }
    }

    // Poll immediately and then at intervals
    pollStatus() // Perform initial poll immediately after starting
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

      // Reset state
      setStatus(MergeStatus.STARTED) // Use MergeStatus.STARTED
      setProgress(0)
      setCurrentStep('')
      setMessages([])
      setCurrentConflict(null)
      setCurrentMergeId(null); // Reset merge ID to trigger potential restart
      hasStartedMergeProcess.current = false;

      // Start the merge process again (which will set a new mergeId and trigger polling via useEffect)
      await startMergeProcess()

    } catch (error) {
      console.error('Error retrying merge:', error)
      setError(error instanceof Error ? error.message : 'Failed to retry merge')
      setStatus(MergeStatus.FAILED); // Set status to failed on retry error
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
        console.log(`Merge ${currentMergeId} cancelled, stopping polling.`); // Added logging
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
    console.log(`Handling auto-resolve completion for merge ID: ${currentMergeId}`); // Added logging
    // Refresh the conflict list and status
    try {
      const response = await fetch(`/api/merge/merges/${currentMergeId}/status`) // Use state variable
      if (response.ok) {
        const data = await response.json()
        const statusValue = typeof data === 'string' ? data : data.status as MergeStatus
        console.log(`Status after auto-resolve for ${currentMergeId}: ${statusValue}`); // Added logging
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
      console.warn('NEXT_PUBLIC_MERGE_PREFECT_STATUS_URL is not defined.');
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
      console.log("No initial merge ID found, starting new merge process.");
      // Start the merge process when the component mounts without an initial mergeId
      hasStartedMergeProcess.current = true; 
      startMergeProcess()
    } else {
        console.log("Initial merge ID exists or merge already started/loaded, skipping automatic start.");
    }

    // Cleanup is handled by the other useEffect hook tied to currentMergeId
    // No return function needed here anymore for interval cleanup.
  }, [sessionId, transformId, initialMergeId]) // Remove currentMergeId from dependencies

  // Scroll to bottom of messages when new ones are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Cleanup effect to ensure polling stops on unmount or terminal states
  useEffect(() => {
    return () => {
      console.log("Component unmounting or cleanup triggered, stopping all intervals");
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, []);

  // Effect to stop polling when status reaches terminal state
  useEffect(() => {
    const isTerminalState = status === MergeStatus.COMPLETED || 
                           status === MergeStatus.FAILED || 
                           status === MergeStatus.CANCELLED;
    
    if (isTerminalState && statusIntervalRef.current) {
      console.log(`Status is terminal (${status}), stopping polling interval`);
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
  }, [status]);

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
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <PageHeader
        title="Graph Merge Process"
        description="Merge your transformed graphs and resolve any conflicts"
        icon={<GitMerge className="h-6 w-6" />}
        actions={
          <div className="flex items-center space-x-3">
            {currentMergeId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancelMerge}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Merge'
                )}
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/domain-apps')}
            >
              <Network className="h-4 w-4 mr-2" />
              Domain Apps
            </Button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="p-6 h-full flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100 p-1 rounded-lg h-12 flex-shrink-0">
              <TabsTrigger 
                value="progress" 
                className="flex items-center gap-2 font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-md"
              >
                <Activity className="h-4 w-4" />
                Progress
              </TabsTrigger>
              <TabsTrigger 
                value="conflicts" 
                className="flex items-center gap-2 font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-md"
              >
                <AlertTriangle className="h-4 w-4" />
                Conflicts
              </TabsTrigger>
              <TabsTrigger 
                value="visualization" 
                className="flex items-center gap-2 font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-md"
              >
                <Network className="h-4 w-4" />
                Graph View
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent value="progress" className="h-full overflow-hidden">
                <div className="h-full overflow-y-auto space-y-6 pr-2">
                  {currentMergeId ? (
                    <div className="enhanced-card">
                      <div className="enhanced-card-header">
                        <h3 className="text-lg font-semibold text-slate-900">Merge Progress</h3>
                      </div>
                      <div className="enhanced-card-content">
                        <MergeProgress
                          mergeId={currentMergeId || ''}
                          sessionId={sessionId}
                          transformId={transformId}
                          onViewConflicts={handleViewConflicts}
                          onCancel={handleCancelMerge}
                          onFinalize={handleAutoResolveComplete}
                        />

                        {/* Show the merge completion banner when all conflicts are resolved */}
                        {showMergeCompletionBanner && currentMergeId && (
                          <div className="mt-6 p-4 border rounded-lg bg-emerald-50 border-emerald-200">
                            <MergeCompletionBanner
                              mergeId={currentMergeId}
                              onViewFinalGraph={handleViewFinalGraph}
                              onViewProgress={handleViewProgress}
                              takeToFinalize={false}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="enhanced-card">
                      <div className="enhanced-card-content">
                        <div className="flex flex-col items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-600" />
                          <p className="text-slate-600">Initializing merge process...</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="conflicts" className="h-full overflow-hidden">
                <div className="h-full flex flex-col min-h-0">
                  <div className="enhanced-card flex-1 flex flex-col min-h-0">
                    <div className="enhanced-card-header flex-shrink-0">
                      <h3 className="text-lg font-semibold text-slate-900">Conflict Resolution</h3>
                      <p className="text-sm text-slate-600">Review and resolve any conflicts in your graph merge</p>
                    </div>
                    <div className="enhanced-card-content flex-1 min-h-0 overflow-y-auto">
                      {currentMergeId ? (
                        <ConflictList
                          mergeId={currentMergeId}
                          onConflictSelect={handleConflictSelect}
                          selectedConflicts={selectedConflicts}
                          onSelectionChange={setSelectedConflicts}
                          onAutoResolveComplete={handleAutoResolveComplete}
                          onViewFinalGraph={handleViewFinalGraph}
                        />
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <p>No merge process active</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="visualization" className="h-full overflow-hidden">
                <div className="h-full overflow-y-auto">
                  <div className="enhanced-card">
                    <div className="enhanced-card-header">
                      <h3 className="text-lg font-semibold text-slate-900">Graph Visualization</h3>
                      <p className="text-sm text-slate-600">Interactive view of your merged knowledge graph</p>
                    </div>
                    <div className="enhanced-card-content h-[600px] relative">
                      {graphDataMemo ? (
                        <MergeGraphVisualization
                          transformId={transformId}
                          mergeId={currentMergeId || undefined}
                          currentConflict={currentConflict}
                          graphData={graphDataMemo}
                        />
                      ) : visualizationLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                          <div className="text-center space-y-6 max-w-md">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg border border-blue-100">
                              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                            </div>
                            <div className="space-y-3">
                              <h3 className="text-xl font-semibold text-slate-900">Loading Graph</h3>
                              <p className="text-sm text-slate-600">Preparing your merged knowledge graph...</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                          <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                              <AlertCircle className="h-8 w-8 text-amber-500" />
                            </div>
                            <div>
                              <p className="text-lg font-medium text-slate-900">No Graph Data</p>
                              <p className="text-sm text-slate-500">Complete the merge process to view your knowledge graph</p>
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
                </div>
              </TabsContent>
            </div>
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
      'upload': '/transform',
      'edit': '/transform',
      'merge': '/merge',
      'domain-apps': '/domain-apps'
    }
    
    if (routes[stepId] && typeof window !== 'undefined') {
      window.location.href = routes[stepId]
    }
  }

  return (
    <EnhancedWorkflowLayout 
      steps={workflowSteps}
      currentStepId="merge"
      projectTitle="Graph Merge Process"
      onStepClick={handleStepNavigation}
    >
      <Suspense fallback={<div>Loading...</div>}>
        <MergePageContent />
      </Suspense>
    </EnhancedWorkflowLayout>
  )
}