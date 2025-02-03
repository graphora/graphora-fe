'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useDropzone } from 'react-dropzone'
import { Loader2, X, Upload, FileText, ChevronLeft, ChevronRight, GitMerge } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { GraphVisualization } from '@/components/graph-visualization'
import type { FileWithPreview, GraphData, TransformResponse } from '@/types/graph'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { WorkflowLayout } from '@/components/workflow-layout'
import { clsx as cn } from 'clsx'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
}

function TransformPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [file, setFile] = useState<FileWithPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [isUploadPanelExpanded, setIsUploadPanelExpanded] = useState(true)
  const [showMergeConfirm, setShowMergeConfirm] = useState(false)
  const [transformId, setTransformId] = useState<string | null>(null)

  useEffect(() => {
    // Redirect back to ontology if no session_id is present
    if (!sessionId) {
      router.push('/ontology')
    }
  }, [sessionId, router])

  useEffect(() => {
    // If we have a transformId, fetch the graph data
    if (transformId) {
      const fetchGraphData = async () => {
        try {
          const response = await fetch(`/api/graph/${transformId}`)
          if (!response.ok) throw new Error('Failed to fetch graph data')
          const data = await response.json()
          setGraphData(data)
        } catch (error) {
          console.error('Error fetching graph data:', error)
          setError('Failed to load graph data')
        }
      }
      fetchGraphData()
    }
  }, [transformId])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    const file = acceptedFiles[0]
    
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 10MB limit')
      return
    }

    setFile(Object.assign(file, {
      preview: URL.createObjectURL(file)
    }))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    multiple: false
  })

  const handleRemoveFile = () => {
    if (file?.preview) {
      URL.revokeObjectURL(file.preview)
    }
    setFile(null)
    setError(null)
    setGraphData(null)
  }

  const handleExtract = async () => {
    if (!file || !sessionId) return

    setIsProcessing(true)
    setError(null)
    setProgress(0)
    setTransformId(null)
    setGraphData(null)  // Reset graph data when starting new transform

    try {
      const formData = new FormData()
      formData.append('files', file)

      const response = await fetch(`/api/transform?session_id=${sessionId}`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process file')
      }

      const data = await response.json()
      
      if (data.status === 'error') {
        throw new Error(data.message || 'Failed to process file')
      }

      // Store transform ID and start status checking
      if (!data.id) {
        throw new Error('No transform ID received from server')
      }
      
      setTransformId(data.id)
      setProgress(10)

    } catch (err) {
      console.error('Error processing file:', err)
      setError(err instanceof Error ? err.message : 'Failed to process file')
      setIsProcessing(false)
      setProgress(0)
    }
  }

  useEffect(() => {
    let statusInterval: NodeJS.Timeout | null = null
    const STATUS_CHECK_INTERVAL = 30000 // 30 seconds

    const checkStatus = async () => {
      if (!transformId || !isProcessing) return

      try {
        console.log('Checking transform status:', transformId)
        const response = await fetch(`/api/transform/status/${transformId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log('Transform not found, continuing processing')
            return
          }
          // Don't throw error, just log it and continue
          console.error('Failed to fetch status:', response.status)
          return
        }
        
        const data = await response.json()
        console.log('Transform status:', data)

        if (data.status === 'completed') {
          setProgress(100)
          setIsProcessing(false)
          setIsUploadPanelExpanded(false)
          console.log('Transform completed, loading graph data')
          
          // Wait a moment before loading graph data
          setTimeout(async () => {
            try {
              await loadGraphData(transformId)
            } catch (err) {
              console.error('Error loading graph data:', err)
              // Don't show graph data load errors in UI while transform is still processing
              if (!isProcessing) {
                setError(err instanceof Error ? err.message : 'Failed to load graph data')
              }
            }
          }, 1000)

          if (statusInterval) {
            clearInterval(statusInterval)
          }
        } else if (data.status === 'failed') {
          setIsProcessing(false)
          setError(data.message || 'Processing failed')
          if (statusInterval) {
            clearInterval(statusInterval)
          }
        } else {
          // Update progress only if we have a valid number
          if (typeof data.progress === 'number') {
            setProgress(Math.max(10, data.progress))
          }
        }
      } catch (err) {
        console.error('Error checking status:', err)
        // Don't show status check errors in UI while transform is still processing
      }
    }

    if (transformId && isProcessing) {
      console.log('Starting status check interval for transform:', transformId)
      // Check immediately
      checkStatus()
      // Then check every 30 seconds
      statusInterval = setInterval(checkStatus, STATUS_CHECK_INTERVAL)
    }

    return () => {
      if (statusInterval) {
        clearInterval(statusInterval)
      }
    }
  }, [transformId, isProcessing])

  const loadGraphData = async (transformId: string) => {
    if (!transformId) {
      console.error('No transform ID provided to loadGraphData')
      return
    }

    try {
      console.log('Loading graph data for transform:', transformId)
      const response = await fetch(`/api/graph/${transformId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Graph data not found, will retry')
          return
        }
        throw new Error('Failed to load graph data')
      }
      
      const data = await response.json()
      console.log('Received graph data:', data)
      
      if (!data.nodes || !data.edges) {
        console.log('Invalid graph data received, will retry')
        return
      }
      
      const processedData = {
        ...data,
        id: transformId,
        nodes: data.nodes.map((node: any) => ({
          ...node,
          label: node.label || node.type,
          properties: node.properties || {}
        })),
        edges: data.edges.map((edge: any) => ({
          ...edge,
          label: edge.type,
          properties: edge.properties || {}
        })),
        total_nodes: data.nodes.length,
        total_edges: data.edges.length
      }
      console.log('Setting processed graph data:', processedData)
      setGraphData(processedData)
    } catch (err) {
      console.error('Error loading graph data:', err)
      // Only show error if we're not still processing
      if (!isProcessing) {
        setError(err instanceof Error ? err.message : 'Failed to load graph data')
      }
    }
  }

  const handleGraphReset = async () => {
    if (!transformId) {
      setError('No transform ID available')
      return
    }

    try {
      // Fetch fresh data from API
      const response = await fetch(`/api/graph/${transformId}`)
      if (!response.ok) throw new Error('Failed to reset graph')
      const data = await response.json()
      
      // Clear local storage and reset state
      localStorage.removeItem(`graph_state_${transformId}`)
      
      // Set fresh data and force a re-render
      setGraphData({
        ...data,
        id: transformId,
        _reset: Date.now() // Force re-mount on reset
      })
    } catch (error) {
      console.error('Error resetting graph:', error)
      setError('Failed to reset graph')
    }
  }

  const handleMergeConfirm = () => {
    setShowMergeConfirm(false)
    router.push(`/merge?session_id=${sessionId}&transform_id=${transformId}`)
  }

  return (
    <WorkflowLayout progress={progress} currentStep={isProcessing ? 'Processing Document...' : undefined}>
      <div className="container mx-auto p-4 max-w-6xl flex-1 flex flex-col">
        <div className="flex flex-1 gap-4 min-h-[600px] overflow-hidden">
          {/* Upload Panel */}
          <div 
            className={cn(
              "transition-all duration-300 ease-in-out flex flex-col bg-background border rounded-lg",
              isUploadPanelExpanded ? "w-1/3" : "w-12"
            )}
          >
            <div className={cn(
              "flex-1 p-4",
              isUploadPanelExpanded ? "opacity-100" : "opacity-0 overflow-hidden w-0"
            )}>
              <div className="space-y-4">
                <h1 className="text-2xl font-bold">Transform Document</h1>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors">
                  <div {...getRootProps()} className="w-full text-center cursor-pointer">
                    <input {...getInputProps()} />
                    {file ? (
                      <div className="space-y-4">
                        <FileText className="w-12 h-12 mx-auto text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        {isProcessing ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm text-gray-500">Processing document...</span>
                            </div>
                            <div className="w-full max-w-xs mx-auto">
                              <Progress value={progress} className="h-1" />
                              <p className="mt-1 text-xs text-center text-gray-500">{progress}%</p>
                            </div>
                          </div>
                        ) : (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExtract()
                            }}
                            disabled={isProcessing}
                          >
                            Process Document
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="w-12 h-12 mx-auto text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">Drop your document here or click to upload</p>
                          <p className="text-xs text-gray-500">
                            Supports TXT files
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {file && !isProcessing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        setError(null)
                      }}
                      className="mt-2"
                    >
                      Remove File
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => setIsUploadPanelExpanded(!isUploadPanelExpanded)}
            >
              {isUploadPanelExpanded ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Graph Section */}
          <div className="flex-1 min-h-0">
            {graphData && (
              <GraphVisualization 
                key={graphData._reset} // Force re-mount on reset
                graphData={graphData} 
                onGraphReset={handleGraphReset}
              />
            )}
          </div>
        </div>

        {/* Merge Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => setShowMergeConfirm(true)}
            disabled={!graphData}
          >
            <GitMerge className="w-4 h-4" />
            Merge to Prod DB
          </Button>
        </div>

        {/* Merge Confirmation Dialog */}
        <AlertDialog open={showMergeConfirm} onOpenChange={setShowMergeConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Merge to Production Database</AlertDialogTitle>
              <AlertDialogDescription>
                This will start the process of merging your local graph changes into the production database.
                The merge process will be interactive, allowing you to review and resolve any conflicts.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleMergeConfirm}>
                Continue to Merge
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </WorkflowLayout>
  )
}

export default function TransformPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <TransformPageContent />
    </Suspense>
  )
}
