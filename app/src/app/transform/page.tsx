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
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { GraphVisualization } from '@/components/graph-viz'
import { type FileWithPreview, type GraphData, type TransformResponse, type GraphOperation, type Node, type Edge } from '@/types/graph'
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
import { toast } from 'sonner'

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
  const pathname = usePathname()
  const sessionId = searchParams.get('session_id')
  const urlTransformId = searchParams.get('transform_id')

  const [file, setFile] = useState<FileWithPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [isUploadPanelExpanded, setIsUploadPanelExpanded] = useState(true)
  const [showMergeConfirm, setShowMergeConfirm] = useState(false)
  const [transformId, setTransformId] = useState<string | null>(urlTransformId)
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
    if (!sessionId) {
      router.push('/ontology')
    }
  }, [sessionId, router])

  useEffect(() => {
    const loadStateFromUrl = async () => {
      if (urlTransformId && !graphData && !isProcessing && !error) {
        console.log('Loading state from URL transform_id:', urlTransformId)
        setTransformId(urlTransformId)
        
        try {
          const response = await fetch(`/api/transform/status/${urlTransformId}`)
          
          if (!response.ok) {
            if (response.status === 404) {
              setError('Transform process not found for the provided ID.')
              setTransformId(null)
              const newSearchParams = new URLSearchParams(searchParams.toString())
              newSearchParams.delete('transform_id')
              router.replace(`${pathname}?${newSearchParams.toString()}`)
            } else {
              throw new Error('Failed to fetch transform status')
            }
            return
          }

          const data = await response.json()

          if (data.overall_status === 'completed') {
            setProgress(100)
            setIsProcessing(false)
            setIsUploadPanelExpanded(false)
            console.log('Transform already completed, loading graph data')
            await loadGraphData(urlTransformId)
          } else if (data.status === 'failed') {
            setIsProcessing(false)
            setError(data.message || 'Processing failed for this transform ID')
            setIsUploadPanelExpanded(true)
          } else {
            setIsProcessing(true)
            setIsUploadPanelExpanded(false)
            const progressStatus: Record<string, number> = {
              "upload": 10, "parse": 20, "chunk": 30, "transform": 50, "load": 90
            }
            setProgress(Math.max(10, progressStatus[data.current_stage] || 10))
          }
        } catch (err) {
          console.error('Error loading state from URL:', err)
          setError(err instanceof Error ? err.message : 'Failed to load state from transform ID')
          setIsProcessing(false)
          setTransformId(null)
          const newSearchParams = new URLSearchParams(searchParams.toString())
          newSearchParams.delete('transform_id')
          router.replace(`${pathname}?${newSearchParams.toString()}`)
        }
      }
    }

    if (sessionId) {
      loadStateFromUrl()
    }
  }, [urlTransformId, sessionId])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    
    if (isProcessing || transformId) {
      setError('A transform process is already active or loaded. Please clear or wait for completion.')
      return
    }
    
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
    multiple: false,
  })

  const handleRemoveFile = () => {
    if (file?.preview) {
      URL.revokeObjectURL(file.preview)
    }
    setFile(null)
    setError(null)
    setGraphData(null)
    setTransformId(null)
    setProgress(0)
    setIsProcessing(false)
    setIsUploadPanelExpanded(true)
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('transform_id')
    router.push(`${pathname}?${newSearchParams.toString()}`)
  }

  const handleExtract = async () => {
    if (!file || !sessionId || isProcessing || transformId) return

    setIsProcessing(true)
    setError(null)
    setProgress(0)
    setTransformId(null)
    setGraphData(null)

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

      if (!data.id) {
        throw new Error('No transform ID received from server')
      }
      
      const newTransformId = data.id
      setTransformId(newTransformId)
      setProgress(10)

      const newSearchParams = new URLSearchParams(searchParams.toString())
      newSearchParams.set('transform_id', newTransformId)
      router.push(`${pathname}?${newSearchParams.toString()}`)

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
    const STATUS_CHECK_INTERVAL = 5000

    const checkStatus = async () => {
      if (!transformId || !isProcessing) {
        if (statusInterval) clearInterval(statusInterval)
        return
      }

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
        console.log('Clearing status check interval for transform:', transformId)
        clearInterval(statusInterval)
      }
    }
  }, [transformId, isProcessing, loadGraphData])

  const handleMergeConfirm = () => {
    setShowMergeConfirm(false)
    
    setIsProcessing(true)
    setCurrentStep('Initializing merge process...')
    
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
      
      const response = await fetch(sampleFile.path)
      if (!response.ok) {
        throw new Error(`Failed to load sample file: ${sampleFile.name}`)
      }
      
      const blob = await response.blob()
      
      let mimeType = 'text/plain'
      if (sampleFile.name.endsWith('.pdf')) {
        mimeType = 'application/pdf'
      } else if (sampleFile.name.endsWith('.docx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
      
      const file = new File([blob], sampleFile.name, { type: mimeType })
      
      setFile(Object.assign(file, {
        preview: URL.createObjectURL(file)
      }))
      
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
    }
  };

  const tools = [
    {
      id: 'upload',
      icon: <Rocket className="h-4 w-4" />,
      label: 'Transform',
      action: handleExtract,
      disabled: !file || isProcessing || !!transformId,
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

  const handleGraphOperation = async (operation: GraphOperation) => {
    console.log("Graph operation requested:", operation);
    if (!transformId) {
      console.error("Cannot save graph changes: transformId is missing.");
      toast.error("Cannot save changes: No active transform ID.");
      return;
    }
    if (!graphData) {
      console.error("Cannot save graph changes: graphData is missing.");
      toast.error("Cannot save changes: Graph data not loaded.");
      return;
    }

    // --- Optimistic UI Update --- (More complex now)
    let originalGraphData = JSON.parse(JSON.stringify(graphData)); // Deep copy for potential revert
    let updatedGraphData = JSON.parse(JSON.stringify(graphData)); // Deep copy to modify

    try {
      if (operation.type === 'UPDATE_NODE') {
        const nodeIndex = updatedGraphData.nodes.findIndex((n: Node) => n.id === operation.payload.id);
        if (nodeIndex !== -1) {
          const currentProps = updatedGraphData.nodes[nodeIndex].properties || {};
          updatedGraphData.nodes[nodeIndex].properties = { ...currentProps, ...operation.payload.properties };
          // Also update label if name property changed
          if (operation.payload.properties?.hasOwnProperty('name')) {
              updatedGraphData.nodes[nodeIndex].label = operation.payload.properties.name || updatedGraphData.nodes[nodeIndex].label || updatedGraphData.nodes[nodeIndex].type || updatedGraphData.nodes[nodeIndex].id;
          }
        } else {
            throw new Error("Node not found for optimistic update.");
        }
      } else if (operation.type === 'UPDATE_EDGE') {
        // Finding the edge requires the ID used in the operation payload.
        const edgeIndex = updatedGraphData.edges.findIndex((e: Edge) => e.id === operation.payload.id);
        if (edgeIndex !== -1) {
            const currentProps = updatedGraphData.edges[edgeIndex].properties || {};
            updatedGraphData.edges[edgeIndex].properties = { ...currentProps, ...operation.payload.properties };
            // Optionally update edge label if relevant properties changed
        } else {
            // Attempt fallback find if ID match failed (e.g., ID constructed differently)
            // This part might be brittle and depends on how edge IDs are handled.
            console.warn(`Edge ID ${operation.payload.id} not found directly, attempting fallback find.`);
            // Add fallback logic if needed, otherwise throw.
            throw new Error("Edge not found for optimistic update.");
        }
      }
      // Add other operation types (CREATE, DELETE) if needed

      setGraphData({ ...updatedGraphData, _reset: (graphData._reset || 0) + 1 });
    } catch(error) {
        console.error("Error during optimistic update:", error);
        toast.error("Error updating graph visually.");
        // Don't proceed with API call if optimistic update failed
        return;
    }
    // --- End Optimistic UI Update ---

    // --- Construct Backend Request Body (matching SaveGraphRequest) ---
    let requestBody: { nodes?: { updated?: any[] }, edges?: { updated?: any[] } } = {};

    if (operation.type === 'UPDATE_NODE') {
      requestBody = {
        nodes: {
          updated: [operation.payload] // Put payload in nodes.updated list
        }
      };
    } else if (operation.type === 'UPDATE_EDGE') {
      requestBody = {
        edges: {
          updated: [operation.payload] // Put payload in edges.updated list
        }
      };
    } else {
      console.error("Unsupported graph operation type for save:", operation.type);
      toast.error("Cannot save: Unsupported operation type.");
      // Revert optimistic update if we can't save
      setGraphData({ ...originalGraphData, _reset: (originalGraphData._reset || 0) + 1 });
      return;
    }
    // --- End Construct Backend Request Body ---

    try {
      // Ensure API path includes /v1/
      const response = await fetch(`/api/v1/graph/${transformId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody), // Send the correctly structured body
      });

      if (!response.ok) {
        console.error("Failed to save graph changes:", response.status, await response.text());
        toast.error("Failed to save changes to the server. Reverting local changes.");
        // Revert optimistic update on failure
        setGraphData({ ...originalGraphData, _reset: (originalGraphData._reset || 0) + 1 });
        return;
      }

      const result = await response.json();
      console.log("Graph changes saved successfully:", result);
      toast.success("Graph changes saved successfully.");

      // Optionally update state based on `result.data` if the backend returns the full updated graph
      // or specific confirmation. For now, the optimistic update stands.
      // if (result.data) {
      //   setGraphData({ ...result.data, _reset: (graphData._reset || 0) + 1 });
      // }

    } catch (error) {
      console.error("Error saving graph data:", error);
      toast.error(`An error occurred while saving changes: ${error instanceof Error ? error.message : 'Unknown error'}. Reverting local changes.`);
      // Revert optimistic update on exception
      setGraphData({ ...originalGraphData, _reset: (originalGraphData._reset || 0) + 1 });
    }
  };

  return (
    <WorkflowLayout progress={progress} currentStep={isProcessing ? 'Processing Document...' : undefined}>
      <div className="command-center grid h-full grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr] gap-0">
        {/* Left Sidebar (Upload Menu) */}
        <div className="row-span-2">
          <ResizablePanel
            defaultWidth={320}
            minWidth={250}
            maxWidth={500}
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
                          disabled={isProcessing}
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
                      'border-2 border-dashed rounded-lg p-4 text-center',
                      'transition-colors duration-200',
                      (isProcessing || !!transformId)
                        ? 'bg-gray-100 border-gray-300 text-gray-400'
                        : isDragActive
                          ? 'border-blue-500 bg-blue-500/10 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-400 cursor-pointer'
                    )}
                  >
                    <Upload className="h-6 w-6 mx-auto mb-2" />
                    <p className="text-sm">
                      {isDragActive
                        ? 'Drop the file here'
                        : 'Drag & drop a file here, or click to select'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, TXT (max 10MB)
                    </p>
                  </div>
                </div>

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
                        className="flex items-start gap-2 p-2 text-left border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
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

                {file && !isProcessing && !transformId && (
                  <Button
                    onClick={handleExtract}
                    className="w-full mt-4"
                  >
                    Transform Document
                  </Button>
                )}

                {isProcessing ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <Loader2 className="h-10 w-10 animate-spin mb-3" />
                    <p>Processing document...</p>
                    {transformId && <p className="text-sm mt-1">Transform ID: {transformId}</p>}
                  </div>
                ) : !transformId ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <p>Upload a document to begin transformation</p>
                  </div>
                ) : null}
              </div>
            </div>
          </ResizablePanel>
        </div>

        {/* Toolbar */}
        <div className="col-span-2">
          <Toolbar tools={tools} />
        </div>

        {/* Center Graph Panel */}
        <div className="p-4 bg-gray-50 overflow-auto">
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
                onGraphOperation={handleGraphOperation}
                sidebarWidth={sidebarWidth}
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

        {/* Right AI Assistant Panel */}
        <div className="row-span-2">
          <AIAssistantPanel
            state={aiAssistantState}
            onStateChange={(changes) => setAiAssistantState(prev => ({ ...prev, ...changes }))}
            onApplySuggestion={handleApplySuggestion}
            onDismissSuggestion={handleDismissSuggestion}
            onExplainSuggestion={handleExplainSuggestion}
            onCustomizeSuggestion={handleCustomizeSuggestion}
          />
        </div>

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

      {/* Add CSS for responsive layout */}
      <style jsx>{`
        .command-center {
          height: 100vh; /* Ensure full height */
          overflow: hidden;
        }

        /* Ensure the center panel doesn't overlap with the sidebar */
        .command-center > div:nth-child(3) {
          position: relative;
          min-width: 0;
        }

        /* Responsive adjustments */
        @media (max-width: 1024px) {
          .command-center {
            grid-template-columns: auto 1fr; /* Hide AI assistant panel on smaller screens */
            grid-template-rows: auto 1fr auto;
          }

          .command-center > div:nth-child(1) {
            grid-row: 1 / 4;
          }

          .command-center > div:nth-child(2) {
            grid-column: 2 / 3;
            grid-row: 1 / 2;
          }

          .command-center > div:nth-child(3) {
            grid-column: 2 / 3;
            grid-row: 2 / 3;
          }

          .command-center > div:nth-child(4) {
            display: none; /* Hide AI assistant panel */
          }
        }

        @media (max-width: 640px) {
          .command-center {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto 1fr auto;
          }

          .command-center > div:nth-child(1) {
            grid-column: 1 / 2;
            grid-row: 2 / 3;
          }

          .command-center > div:nth-child(2) {
            grid-column: 1 / 2;
            grid-row: 1 / 2;
          }

          .command-center > div:nth-child(3) {
            grid-column: 1 / 2;
            grid-row: 3 / 4;
          }
        }
      `}</style>
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