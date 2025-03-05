'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Home
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { MergeCompletion } from '@/components/merge-completion'
import { MergeProgress } from '@/components/merge-progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MergeGraphVisualization } from '@/components/merge-graph-visualization'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AutoMergeFlowProps {
  sessionId: string
  transformId: string
  mergeId?: string
  onComplete?: () => void
}

interface MergeStatus {
  merge_id: string
  overall_status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'WAITING_FOR_INPUT' | 'PAUSED' | 'CANCELLED'
  overall_progress: number
  current_stage: string
  has_conflicts: boolean
  conflict_count: number
  start_time: string
  estimated_end_time?: string
}

export function AutoMergeFlow({ sessionId, transformId, mergeId: initialMergeId, onComplete }: AutoMergeFlowProps) {
  const router = useRouter()
  const [mergeId, setMergeId] = useState<string | null>(initialMergeId || null)
  const [status, setStatus] = useState<MergeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [activeTab, setActiveTab] = useState('progress')
  const [showCompletion, setShowCompletion] = useState(false)
  const [autoMergeInProgress, setAutoMergeInProgress] = useState(false)
  const [autoMergeCompleted, setAutoMergeCompleted] = useState(false)
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Start the merge process
  const startMerge = useCallback(async () => {
    if (!sessionId || !transformId) {
      setError('Missing required parameters: sessionId or transformId')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

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
      
      if (data.merge_id) {
        setMergeId(data.merge_id)
        
        // Update URL with merge_id without navigation
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.set('merge_id', data.merge_id)
        window.history.pushState({}, '', newUrl.toString())
        
        // Start polling for status
        startStatusPolling(data.merge_id)
      } else {
        throw new Error('No merge ID returned from server')
      }
    } catch (error) {
      console.error('Error starting merge process:', error)
      setError(error instanceof Error ? error.message : 'Failed to start merge process')
    } finally {
      setLoading(false)
    }
  }, [sessionId, transformId])

  // Poll for merge status
  const startStatusPolling = useCallback((id: string) => {
    // Clear any existing interval
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current)
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/merge/status/${id}`)
        
        if (!response.ok) {
          console.error('Failed to fetch merge status:', response.status)
          return
        }
        
        const data = await response.json()
        setStatus(data)
        
        // Check if this is a conflict-free merge
        if (data.overall_status === 'IN_PROGRESS' && 
            data.current_stage === 'conflict_detection' && 
            !data.has_conflicts && 
            data.conflict_count === 0 && 
            data.overall_progress >= 50) {
          
          // If we haven't already started auto-merge, start it
          if (!autoMergeInProgress) {
            setAutoMergeInProgress(true)
            toast({
              title: "No conflicts detected",
              description: "Automatically proceeding with merge completion",
              variant: "default",
            })
            
            // Proceed with auto-merge
            proceedWithAutoMerge(id)
          }
        }
        
        // If merge is completed, show completion screen
        if (data.overall_status === 'COMPLETED') {
          if (statusIntervalRef.current) {
            clearInterval(statusIntervalRef.current)
          }
          
          setAutoMergeCompleted(true)
          setShowCompletion(true)
          
          toast({
            title: "Merge completed successfully",
            description: "The merge process has completed without conflicts",
            variant: "default",
          })
        }
        
        // If merge failed, show error
        if (data.overall_status === 'FAILED') {
          if (statusIntervalRef.current) {
            clearInterval(statusIntervalRef.current)
          }
          
          setError('Merge process failed. Please check the logs for details.')
        }
        
        // If merge requires input, redirect to regular merge flow
        if (data.overall_status === 'WAITING_FOR_INPUT' || data.has_conflicts) {
          if (statusIntervalRef.current) {
            clearInterval(statusIntervalRef.current)
          }
          
          // Redirect to regular merge page
          router.push(`/merge?session_id=${sessionId}&transform_id=${transformId}&merge_id=${id}`)
        }
      } catch (error) {
        console.error('Error polling merge status:', error)
      }
    }

    // Poll immediately and then at intervals
    pollStatus()
    statusIntervalRef.current = setInterval(pollStatus, 3000) // Poll every 3 seconds for more responsive updates
    
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current)
      }
    }
  }, [router, sessionId, transformId])

  // Proceed with automatic merge
  const proceedWithAutoMerge = async (id: string) => {
    try {
      // Call apply-strategies endpoint to complete the merge
      const response = await fetch(`/api/merge/${id}/apply-strategies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to apply strategies: ${response.status}`)
      }

      // Continue polling to track progress
    } catch (error) {
      console.error('Error proceeding with auto-merge:', error)
      setError('Failed to complete automatic merge. Please try manual resolution.')
    }
  }

  // Pause/resume the merge process
  const togglePause = async () => {
    if (!mergeId) return

    try {
      const endpoint = isPaused ? 'resume' : 'pause'
      const response = await fetch(`/api/merge/${mergeId}/${endpoint}`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`Failed to ${endpoint} merge: ${response.status}`)
      }

      setIsPaused(!isPaused)
      
      toast({
        title: isPaused ? "Merge Resumed" : "Merge Paused",
        description: isPaused ? "The merge process has been resumed." : "The merge process has been paused.",
        variant: "default",
      })
    } catch (error) {
      console.error(`Error ${isPaused ? 'resuming' : 'pausing'} merge:`, error)
      toast({
        title: "Error",
        description: `Failed to ${isPaused ? 'resume' : 'pause'} the merge process.`,
        variant: "destructive",
      })
    }
  }

  // Cancel the merge process
  const cancelMerge = async () => {
    if (!mergeId) return

    try {
      const response = await fetch(`/api/merge/${mergeId}/cancel`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`Failed to cancel merge: ${response.status}`)
      }

      // Stop polling
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current)
      }

      toast({
        title: "Merge Cancelled",
        description: "The merge process has been cancelled.",
        variant: "default",
      })

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error cancelling merge:', error)
      toast({
        title: "Error",
        description: "Failed to cancel the merge process.",
        variant: "destructive",
      })
    }
  }

  // Initialize merge on component mount
  useEffect(() => {
    if (initialMergeId) {
      setMergeId(initialMergeId)
      startStatusPolling(initialMergeId)
    } else {
      startMerge()
    }

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current)
      }
    }
  }, [initialMergeId, startMerge, startStatusPolling])

  // Show loading state
  if (loading && !mergeId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Initializing merge process...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <div className="mt-4">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  // Show completion screen
  if (showCompletion && mergeId) {
    return <MergeCompletion mergeId={mergeId} onComplete={onComplete} />
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Merge Process</h2>
          <p className="text-muted-foreground">
            {autoMergeInProgress 
              ? "No conflicts detected - automatically completing merge" 
              : "Analyzing and merging your changes"}
          </p>
        </div>
        <div className="flex gap-2">
          {status?.overall_status === 'IN_PROGRESS' && (
            <Button variant="outline" onClick={togglePause} disabled={autoMergeInProgress}>
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
          )}
          {status?.overall_status === 'IN_PROGRESS' && (
            <Button variant="outline" onClick={cancelMerge} disabled={autoMergeInProgress}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Auto-merge notification */}
      {autoMergeInProgress && !autoMergeCompleted && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>No Conflicts Detected</AlertTitle>
          <AlertDescription>
            Your changes can be merged automatically without conflicts.
            The system is now completing the merge process.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="visualization">Visualization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="progress" className="mt-4">
          {mergeId && (
            <MergeProgress 
              mergeId={mergeId}
              sessionId={sessionId}
              transformId={transformId}
              onCancel={cancelMerge}
              onFinalize={() => {
                // Handle completion
                setStatus('COMPLETED');
                
                // Show success toast
                toast({
                  title: "Merge Completed",
                  description: "The automatic merge process has been successfully completed.",
                  variant: "default",
                });
                
                // Call the onComplete callback if provided
                if (onComplete) {
                  onComplete();
                }
              }}
            />
          )}
        </TabsContent>
        
        <TabsContent value="visualization" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Graph Visualization</CardTitle>
              <CardDescription>
                Visual representation of the merge changes
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[600px]">
              <MergeGraphVisualization 
                mergeId={mergeId || undefined} 
                transformId={transformId}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      {status?.overall_status === 'COMPLETED' && (
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <Home className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
          <Button onClick={() => setShowCompletion(true)}>
            <ArrowRight className="h-4 w-4 mr-2" />
            View Merge Results
          </Button>
        </div>
      )}
    </div>
  )
} 