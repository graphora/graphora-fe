'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Loader2, X, Upload, FileText, ChevronLeft, ChevronRight, GitMerge } from 'lucide-react'
import { useRouter } from 'next/navigation'
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

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
}

export default function TransformPage() {
  const router = useRouter()
  const [file, setFile] = useState<FileWithPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [isUploadPanelExpanded, setIsUploadPanelExpanded] = useState(true)
  const [showMergeConfirm, setShowMergeConfirm] = useState(false)

  // Get ontology ID from localStorage
  const ontologyId = typeof window !== 'undefined' ? localStorage.getItem('ontologyId') : null

  useEffect(() => {
    // Redirect if no ontology ID is found
    if (!ontologyId) {
      router.push('/ontology')
    }
  }, [ontologyId, router])

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
    if (!file || !ontologyId) return

    setIsProcessing(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ontologyId', ontologyId)

      // Use MockWebSocket in development
      const WebSocketClass = process.env.NODE_ENV === 'development' 
        ? MockWebSocket 
        : WebSocket

      const ws = new WebSocketClass(`${process.env.NEXT_PUBLIC_WS_URL}/transform`) as WebSocket
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data) as TransformResponse
        if (data.progress) {
          setProgress(data.progress)
        }
      }

      const response = await fetch('/api/transform', {
        method: 'POST',
        body: formData,
        headers: {
          // The auth headers will be automatically added by Next.js
        },
        // Add this to ensure credentials are included
        credentials: 'include'
      })

      const result: TransformResponse = await response.json()

      if (!response.ok || result.status === 'error') {
        throw new Error(result.error || 'Failed to transform document')
      }

      setGraphData(result.data || null)
      // Auto-collapse the upload panel after successful upload
      setIsUploadPanelExpanded(false)
    } catch (error) {
      console.error('Error transforming document:', error)
      setError(error instanceof Error ? error.message : 'Failed to transform document')
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }

  const handleMergeConfirm = () => {
    setShowMergeConfirm(false)
    router.push('/merge')
  }

  return (
    <WorkflowLayout progress={progress} currentStep={isProcessing ? 'Processing Document...' : undefined}>
      <div className="container mx-auto p-4 max-w-6xl flex-1 flex flex-col">
        <div className="flex flex-1 gap-4 overflow-hidden">
          <div 
            className={`transition-all duration-300 ease-in-out flex ${
              isUploadPanelExpanded ? 'w-1/3' : 'w-12'
            }`}
          >
            <div className={`
              flex-1 
              ${isUploadPanelExpanded ? 'opacity-100' : 'opacity-0 overflow-hidden w-0'}
              transition-opacity duration-300
            `}>
              <div className="space-y-4">
                <h1 className="text-2xl font-bold">Transform Document</h1>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div
                  {...getRootProps()}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors duration-200
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
                    ${file ? 'bg-gray-50' : ''}
                  `}
                >
                  <input {...getInputProps()} />
                  
                  {file ? (
                    <div className="space-y-2">
                      <FileText className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveFile()
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm font-medium">
                        {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Supported formats: PDF, TXT, DOCX (max 10MB)
                      </p>
                    </div>
                  )}
                </div>

                {file && (
                  <div className="space-y-4">
                    {isProcessing && (
                      <Progress value={progress} className="w-full" />
                    )}
                    
                    <Button
                      onClick={handleExtract}
                      disabled={isProcessing || !file}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Extract Graph'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-full rounded-none border-l"
              onClick={() => setIsUploadPanelExpanded(!isUploadPanelExpanded)}
            >
              {isUploadPanelExpanded ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex-1 h-full border rounded-lg bg-gray-50 overflow-hidden relative">
            {graphData ? (
              <>
                <div className="absolute top-4 right-4 z-10 flex gap-4">
                  <Button
                    onClick={() => setShowMergeConfirm(true)}
                    className="gap-2"
                    variant="outline"
                  >
                    <GitMerge className="h-4 w-4" />
                    Merge to Prod DB
                  </Button>
                </div>
                <div className="h-full pt-16">
                  <GraphVisualization graphData={graphData} />
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Graph visualization will appear here
              </div>
            )}
          </div>
        </div>

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
