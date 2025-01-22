'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Loader2, X, Upload, FileText, ChevronLeft, ChevronRight, GitMerge } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { GraphVisualization } from '@/components/graph-visualization'
import type { FileWithPreview, GraphData, TransformResponse } from '@/types/graph'
import { MockWebSocket } from '@/lib/mock-websocket'
import { auth } from '@clerk/nextjs'
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

export default function TransformPage() {
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
      setTransformId(data.id)
      setProgress(10)

    } catch (err) {
      console.error('Error processing file:', err)
      setError(err instanceof Error ? err.message : 'Failed to process file')
      setIsProcessing(false)
      setProgress(0)
    }
  }

  const loadGraphData = async (transformId: string) => {
    try {
      const response = await fetch(`/api/graph/${transformId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Graph data not found')
          return
        }
        throw new Error('Failed to load graph data')
      }
      
      const data = await response.json()
      setGraphData({
        nodes: data.nodes.map((node: any) => ({
          ...node,
          // Ensure required properties exist
          label: node.label || node.type,
          properties: node.properties || {}
        })),
        edges: data.edges.map((edge: any) => ({
          ...edge,
          // Ensure required properties exist
          label: edge.type,
          properties: edge.properties || {}
        }))
      })
    } catch (err) {
      console.error('Error loading graph data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load graph data')
      setIsProcessing(false)
    }
  }

  const handleGraphReset = async () => {
    if (transformId) {
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
          // Add timestamp to force graph to re-render with fresh data
          _reset: Date.now()
        })
      } catch (error) {
        console.error('Error resetting graph:', error)
        setError('Failed to reset graph')
      }
    }
  }

  useEffect(() => {
    let statusInterval: NodeJS.Timeout | null = null

    const checkStatus = async () => {
      if (!transformId) return

      try {
        const response = await fetch(`/api/transform/status/${transformId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            return
          }
          throw new Error('Failed to fetch status')
        }
        
        const data = await response.json()

        if (data.status === 'completed') {
          setProgress(100)
          setIsProcessing(false)
          setIsUploadPanelExpanded(false)
          // Load graph data
          loadGraphData(transformId)
          if (statusInterval) {
            clearInterval(statusInterval)
          }
        } else if (data.status === 'failed') {
          throw new Error(data.message || 'Processing failed')
        } else {
          setProgress(data.progress || progress)
        }
      } catch (err) {
        console.error('Error checking status:', err)
        setError(err instanceof Error ? err.message : 'Failed to check status')
        setIsProcessing(false)
        if (statusInterval) {
          clearInterval(statusInterval)
        }
      }
    }

    if (transformId && isProcessing) {
      statusInterval = setInterval(checkStatus, 10000)
    }

    return () => {
      if (statusInterval) {
        clearInterval(statusInterval)
      }
    }
  }, [transformId, isProcessing])

  const handleMergeConfirm = () => {
    setShowMergeConfirm(false)
    router.push('/merge')
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
