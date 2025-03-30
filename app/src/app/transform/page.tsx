'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  Loader2, X, Upload, FileText, 
  GitMerge,
  Database, Settings2,
  Monitor,
  Rocket,
  FileSymlink
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { GraphVisualization } from '@/components/graph-visualization'
import { type FileWithPreview, type GraphData, type TransformResponse } from '@/types/graph'
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
import { Toolbar } from '@/components/command-center/toolbar'
import { ResizablePanel } from '@/components/command-center/resizable-panel'
import { CommandPalette } from '@/components/command-center/command-palette'
import { AIAssistantPanel } from '@/components/ai-assistant/ai-assistant-panel'
import { type AIAssistantState } from '@/lib/types/ai-assistant'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt']
}

// Sample files array
const SAMPLE_FILES = [
  { 
    id: 'sample1',
    name: 'APPLE Form-10K.pdf', 
    description: 'Apple Form 10K financial report',
    path: '/samples/APPL-Form10K.pdf'
  },
  { 
    id: 'sample2',
    name: 'Adams Form-10K.txt', 
    description: 'Adams Form 10K financial report',
    path: '/samples/Adams-Form10K.txt'
  },
  { 
    id: 'sample3',
    name: 'Howmet Aerospace Form-10K.txt', 
    description: 'Howmet Aerospace Form 10K financial report',
    path: '/samples/HowmetAero-Form10K.txt'
  }
]

function TransformPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [file, setFile] = useState<FileWithPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [isUploadPanelExpanded, setIsUploadPanelExpanded] = useState(true)
  const [showMergeConfirm, setShowMergeConfirm] = useState(false)
  const [transformId, setTransformId] = useState<string | null>(null)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [aiAssistantState, setAiAssistantState] = useState<AIAssistantState>({
    isExpanded: false,
    isCompact: true,
    suggestions: [
      {
        id: '1',
        priority: 'high',
        type: 'pattern',
        content: {
          title: 'Potential Entity Match',
          description: 'Found similar entities in your document that could be merged.',
          impact: 'Reduces data redundancy and improves graph consistency.',
          confidence: 0.9
        }
      }
    ],
    activePatterns: [
      {
        id: '1',
        name: 'Document Structure',
        description: 'Common document organization pattern detected.',
        confidence: 0.9,
        type: 'domain',
        matches: [
          { path: 'sections.header', score: 0.9 },
          { path: 'sections.content', score: 0.85 }
        ]
      }
    ],
    qualityMetrics: {
      score: 85,
      components: {
        completeness: 90,
        consistency: 85,
        optimization: 80,
        bestPractices: 85
      },
      improvements: [],
      history: [
        { timestamp: Date.now() - 3600000, score: 80 },
        { timestamp: Date.now(), score: 85 }
      ]
    }
  })

  useEffect(() => {
    // Redirect back to ontology if no session_id is present
    if (!sessionId) {
      router.push('/ontology')
    }
  }, [sessionId, router])

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

  const loadGraphData = async (transformId: string) => {
    if (!transformId) {
      console.error('No transform ID provided to loadGraphData')
      return
    }
    setTransformId(transformId)
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
      await loadGraphData(transformId)
    } catch (error) {
      console.error('Error resetting graph:', error)
      setError('Failed to reset graph')
    }
  }

  useEffect(() => {
    let statusInterval: NodeJS.Timeout | null = null
    const STATUS_CHECK_INTERVAL = 10000 // Check every 10 secs

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
          console.error('Failed to fetch status:', response.status)
          return
        }
        
        const data = await response.json()

        if (data.overall_status === 'completed') {
          setProgress(100)
          setIsProcessing(false)
          setIsUploadPanelExpanded(false)
          console.log('Transform completed, loading graph data')
          
          // Load graph data immediately after completion
          await loadGraphData(transformId)

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
          const progressStatus: Record<string, number> = {
            "upload": 10,
            "parse": 20,
            "chunk": 30,
            "transform": 50,
            "load": 90
          }
          setProgress(Math.max(10, progressStatus[data.current_stage]))
        }
      } catch (err) {
        console.error('Error checking status:', err)
      }
    }

    if (transformId && isProcessing) {
      console.log('Starting status check interval for transform:', transformId)
      checkStatus()
      statusInterval = setInterval(checkStatus, STATUS_CHECK_INTERVAL)
    }

    return () => {
      if (statusInterval) {
        clearInterval(statusInterval)
      }
    }
  }, [transformId, isProcessing])

  const handleMergeConfirm = () => {
    setShowMergeConfirm(false)
    
    // Show a loading state before navigating
    setIsProcessing(true)
    setCurrentStep('Initializing merge process...')
    
    // Navigate to the merge page with required parameters
    router.push(`/merge?session_id=${sessionId}&transform_id=${transformId}`)
  }

  const handleApplySuggestion = useCallback((id: string) => {
    console.log('Applying suggestion:', id)
  }, [])

  const handleDismissSuggestion = useCallback((id: string) => {
    setAiAssistantState(prev => ({
      ...prev,
      suggestions: prev.suggestions.filter(s => s.id !== id)
    }))
  }, [])

  const handleExplainSuggestion = useCallback((id: string) => {
    setAiAssistantState(prev => ({
      ...prev,
      selectedSuggestion: id
    }))
  }, [])

  const handleCustomizeSuggestion = useCallback((id: string) => {
    console.log('Customizing suggestion:', id)
  }, [])

  const handleSampleFileSelect = async (sampleFile: typeof SAMPLE_FILES[0]) => {
    try {
      setError(null)
      
      // Fetch the sample file
      const response = await fetch(sampleFile.path)
      if (!response.ok) {
        throw new Error(`Failed to load sample file: ${sampleFile.name}`)
      }
      
      // Get the blob data
      const blob = await response.blob()
      
      // Determine the MIME type based on file extension
      let mimeType = 'text/plain'
      if (sampleFile.name.endsWith('.pdf')) {
        mimeType = 'application/pdf'
      } else if (sampleFile.name.endsWith('.docx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
      
      // Create a File object from the blob
      const file = new File([blob], sampleFile.name, { type: mimeType })
      
      // Set the file as if it was uploaded normally
      setFile(Object.assign(file, {
        preview: URL.createObjectURL(file)
      }))
      
      // Auto-process the sample file after a short delay
      // This gives time for the UI to update and show the selected file
      setTimeout(() => {
        if (sessionId) {
          handleExtract()
        }
      }, 500)
      
    } catch (err) {
      console.error('Error loading sample file:', err)
      setError(err instanceof Error ? err.message : 'Failed to load sample file')
    }
  }

  const handleViewTransformStatus = () => {
    const url = process.env.NEXT_PUBLIC_TRANSFORM_PREFECT_STATUS_URL;
    if (url) {
      window.open(url, '_blank');
    } else {
      console.warn('NEXT_PUBLIC_TRANSFORM_PREFECT_STATUS_URL is not defined.');
      // Optionally show a toast or alert to the user
      // toast({ title: "Configuration Error", description: "Status URL is not configured.", variant: "destructive" });
    }
  };

  const tools = [
    {
      id: 'upload',
      icon: <Rocket className="h-4 w-4" />,
      label: 'Transform',
      action: handleExtract,
      disabled: !file || isProcessing,
      primary: true,
      className: "mr-4"
    },
    {
      id: 'merge',
      icon: <GitMerge className="h-4 w-4" />,
      label: 'Merge',
      action: () => setShowMergeConfirm(true),
      disabled: !graphData || isProcessing,
      primary: true,
      className: "bg-green-500 hover:bg-green-600 text-white"
    },
    {
      id: 'settings',
      icon: <Settings2 className="h-4 w-4" />,
      label: 'Settings',
      action: () => {}
    },
    {
      id: 'viewStatus',
      icon: <Monitor className="h-4 w-4" />,
      label: 'View Status',
      disabled: !file,
      action: handleViewTransformStatus
    }
  ]

  return (
    <WorkflowLayout progress={progress} currentStep={isProcessing ? 'Processing Document...' : undefined}>
      <div className="command-center">
        <ResizablePanel
          defaultWidth={320}
          onResize={setSidebarWidth}
        >
          <div className="h-full bg-white text-gray-800">
            <div className="panel-header">
              <span>Document Explorer</span>
            </div>
            <div className="p-4">
              <div className="control-group">
                <div className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4" />
                  <span>Documents</span>
                </div>
                {file && (
                  <div className="mt-2 p-2 rounded-md bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm truncate">{file.name.length > 10 ? `${file.name.substring(0, 10)}...` : file.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div {...getRootProps()} className="mt-4">
                <input {...getInputProps()} />
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer',
                    'transition-colors duration-200',
                    isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-200 hover:border-gray-400'
                  )}
                >
                  <Upload className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm">
                    {isDragActive
                      ? 'Drop the file here'
                      : 'Drag & drop a file here, or click to select'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, TXT, DOCX (max 10MB)
                  </p>
                </div>
              </div>

              {/* Sample files section */}
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-3">Try with sample data</h3>
                <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                  <FileSymlink className="h-3.5 w-3.5" />
                  <span>Click any sample to automatically process it</span>
                </div>
                <div className="grid gap-2">
                  {SAMPLE_FILES.map((sampleFile) => (
                    <button
                      key={sampleFile.id}
                      onClick={() => handleSampleFileSelect(sampleFile)}
                      className="flex items-start gap-2 p-2 text-left border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-200 transition-colors"
                      disabled={isProcessing}
                    >
                      <FileText className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                      <div className="overflow-hidden w-full">
                        <p className="text-sm font-medium text-blue-600 truncate">{sampleFile.name}</p>
                        <div className="flex items-center justify-between w-full">
                          <p className="text-xs text-gray-500 truncate max-w-[70%]">{sampleFile.description}</p>
                          <a 
                            href={sampleFile.path} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-blue-500 hover:text-blue-700 hover:underline ml-2 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Preview
                          </a>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {file && !isProcessing && (
                <Button
                  onClick={handleExtract}
                  className="w-full mt-4"
                >
                  Transform Document
                </Button>
              )}

              {isProcessing && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-500">Processing document...</span>
                  </div>
                  <div className="w-full">
                    <Progress value={progress} className="h-1" />
                    <p className="mt-1 text-xs text-center text-gray-500">{progress}%</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <div className="flex-1 flex flex-col min-w-0">
          <Toolbar tools={tools} />

          <div className="flex-1 p-4 bg-gray-50">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="h-full">
              {graphData ? (
                <GraphVisualization 
                  key={`${transformId}-${graphData._reset}`}
                  graphData={graphData} 
                  onGraphReset={handleGraphReset}
                />
              ) : isProcessing ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <Loader2 className="h-10 w-10 animate-spin mb-3" />
                  <p>Processing document...</p>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <p>Upload a document to begin transformation</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <AIAssistantPanel
          state={aiAssistantState}
          onStateChange={(changes) => setAiAssistantState(prev => ({ ...prev, ...changes }))}
          onApplySuggestion={handleApplySuggestion}
          onDismissSuggestion={handleDismissSuggestion}
          onExplainSuggestion={handleExplainSuggestion}
          onCustomizeSuggestion={handleCustomizeSuggestion}
        />

        <CommandPalette
          open={isCommandPaletteOpen}
          onOpenChange={setIsCommandPaletteOpen}
          commands={tools.map(({ id, label, action }) => ({ id, label, action }))}
        />

        <AlertDialog open={showMergeConfirm} onOpenChange={setShowMergeConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Merge to Production Database</AlertDialogTitle>
              <AlertDialogDescription>
                This will start the process of merging your transformed graph into the production database.
              </AlertDialogDescription>
              <div className="mt-2 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>The merge process will start automatically</li>
                  <li>You'll be guided through any conflicts that need resolution</li>
                  <li>No additional input is required to begin the process</li>
                </ul>
              </div>
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
