'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  Loader2, X, Upload, FileText, 
  GitMerge,
  Database, Settings2,
  Monitor,
  Rocket,
  FileSymlink,
  Zap,
  RefreshCcw,
  AlertTriangle
} from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { GraphVisualization } from '@/components/graph-viz'
import { QualityDashboard } from '@/components/quality/quality-dashboard'
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
import { EnhancedWorkflowLayout, WorkflowStep } from '@/components/enhanced-workflow-layout'
import { clsx as cn } from 'clsx'
import { Toolbar } from '@/components/command-center/toolbar'
import { ResizablePanel } from '@/components/command-center/resizable-panel'
import { CommandPalette } from '@/components/command-center/command-palette'
import { toast } from 'sonner'
import { useUserConfig } from '@/hooks/useUserConfig'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md', '.markdown']
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

// Add workflow steps definition
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
    status: 'current'
  },
  { 
    id: 'merge', 
    title: 'Merge to Prod', 
    description: 'Merge data into production database',
    status: 'upcoming'
  }
]

function TransformPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const sessionId = searchParams.get('session_id')
  const urlTransformId = searchParams.get('transform_id')
  const { checkConfigBeforeWorkflow } = useUserConfig()

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
  const [showUploadConfirm, setShowUploadConfirm] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [showQualityReview, setShowQualityReview] = useState(false)

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
            const errorData = await response.json()
            
            if (response.status === 403 && errorData.type === 'access_denied') {
              setError('You do not have permission to access this transform. Please check if you are signed in with the correct account.')
              setTransformId(null)
              const newSearchParams = new URLSearchParams(searchParams.toString())
              newSearchParams.delete('transform_id')
              router.replace(`${pathname}?${newSearchParams.toString()}`)
            } else if (response.status === 404) {
              setError('Transform process not found for the provided ID.')
              setTransformId(null)
              const newSearchParams = new URLSearchParams(searchParams.toString())
              newSearchParams.delete('transform_id')
              router.replace(`${pathname}?${newSearchParams.toString()}`)
            } else {
              setError(errorData.message || 'Failed to fetch transform status')
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
            // Check if quality validation is available
            setShowQualityReview(true)
          } else if (data.status === 'failed' || data.overall_status === 'failed' || data.current_stage === 'failed') {
            setIsProcessing(false)
            setProgress(0) // Reset progress for failed state
            setError(data.message || 'Processing failed for this transform ID')
            setIsUploadPanelExpanded(true)
          } else {
            setIsProcessing(true)
            setIsUploadPanelExpanded(false)
            const progressStatus: Record<string, number> = {
              "upload": 10, "parse": 20, "chunk": 30, "transform": 50, "load": 90, "failed": 0
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
    
    if (isProcessing) {
      setError('A transform process is currently running. Please wait for completion.')
      return
    }
    
    // If there's already a transform completed, ask for confirmation
    if (transformId || graphData) {
      setPendingFiles(acceptedFiles)
      setShowUploadConfirm(true)
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
  }, [isProcessing, transformId, graphData])

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

  const handleConfirmNewUpload = () => {
    if (pendingFiles.length === 0) return
    
    // Clear existing state
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
    
    // Remove transform_id from URL
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('transform_id')
    router.push(`${pathname}?${newSearchParams.toString()}`)
    
    // Process the new file
    const newFile = pendingFiles[0]
    if (newFile.size > MAX_FILE_SIZE) {
      setError('File size exceeds 10MB limit')
      setPendingFiles([])
      setShowUploadConfirm(false)
      return
    }

    setFile(Object.assign(newFile, {
      preview: URL.createObjectURL(newFile)
    }))
    
    // Clear pending state
    setPendingFiles([])
    setShowUploadConfirm(false)
    
    // Show success toast
    toast.success('New document uploaded successfully. Transform button is now enabled.')
  }

  const handleCancelNewUpload = () => {
    setPendingFiles([])
    setShowUploadConfirm(false)
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
        const errorMessage = errorData.message || errorData.error || 'Failed to process file'
        throw new Error(errorMessage)
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
    if (transformId) {
      await loadGraphData(transformId)
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
          const errorData = await response.json()
          
          if (response.status === 403 && errorData.type === 'access_denied') {
            console.log('Access denied for transform, stopping status checks')
            setError('You do not have permission to access this transform')
            setIsProcessing(false)
            if (statusInterval) {
              clearInterval(statusInterval)
            }
            return
          }
          
          if (response.status === 404) {
            console.log('Transform not found, continuing processing')
            return
          }
          
          console.error('Failed to fetch status:', response.status, errorData.message)
          return
        }
        
        const data = await response.json()

        if (data.overall_status === 'completed') {
          setProgress(100)
          setIsProcessing(false)
          setIsUploadPanelExpanded(false)
          console.log('Transform completed, loading graph data')
          
          await loadGraphData(transformId)
          // Show quality review after transform completion
          setShowQualityReview(true)

          if (statusInterval) {
            clearInterval(statusInterval)
          }
        } else if (data.status === 'failed' || data.overall_status === 'failed' || data.current_stage === 'failed') {
          setIsProcessing(false)
          setProgress(0) // Reset progress for failed state
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
            "load": 90,
            "failed": 0 // Handle failed stage explicitly
          }
          setProgress(Math.max(10, progressStatus[data.current_stage] || 0))
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
    
    // Check if user has database configurations before proceeding with merge
    if (!checkConfigBeforeWorkflow()) {
      return
    }
    
    setIsProcessing(true)
    setCurrentStep('Initializing merge process...')
    
    router.push(`/merge?session_id=${sessionId}&transform_id=${transformId}`)
  }

  const handleQualityApprove = () => {
    console.log('Quality approved for transform:', transformId)
    setShowQualityReview(false)
    toast.success('Quality validation approved. Ready for merge.')
  }

  const handleQualityReject = () => {
    console.log('Quality rejected for transform:', transformId)
    setShowQualityReview(false)
    // Reset to allow new transform
    setGraphData(null)
    setTransformId(null)
    setIsUploadPanelExpanded(true)
    
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('transform_id')
    router.push(`${pathname}?${newSearchParams.toString()}`)
    
    toast.error('Quality validation rejected. Please upload a new document or adjust your ontology.')
  }

  const handleApplySuggestion = useCallback((id: string) => {
    console.log('Applying suggestion:', id)
  }, [])

  const handleDismissSuggestion = useCallback((id: string) => {
    console.log('Dismissing suggestion:', id)
  }, [])

  const handleExplainSuggestion = useCallback((id: string) => {
    console.log('Explaining suggestion:', id)
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
      } else if (sampleFile.name.endsWith('.md') || sampleFile.name.endsWith('.markdown')) {
        mimeType = 'text/markdown'
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

  const handleRetryTransform = () => {
    // Clear the transform_id from URL and reset state to allow retry
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('transform_id')
    router.push(`${pathname}?${newSearchParams.toString()}`)
    
    // Reset state
    setTransformId(null)
    setError(null)
    setIsProcessing(false)
    setProgress(0)
    setCurrentStep('')
    setGraphData(null)
    setIsUploadPanelExpanded(true)
    
    // Show success message
    toast.success('Ready to retry transform. Please click Transform button to start again.')
  }

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
      disabled: false,
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
      // Ensure API path uses frontend route
      const response = await fetch(`/api/graph/${transformId}`, {
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
    <div className="flex-1 flex flex-col h-full">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            {(error.includes('failed') || error.includes('Failed')) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryTransform}
                className="ml-4 bg-white hover:bg-gray-50 text-red-600 border-red-300"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry Transform
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content with Action Bar */}
      <div className="flex-1 overflow-auto">
        {/* Action Bar */}
        <div className="bg-background border-b border-border shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Zap className="h-6 w-6 text-purple-600" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Document Transform</h2>
                  <p className="text-sm text-muted-foreground">Upload and transform documents into knowledge graphs</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Progress indicator in header when processing */}
                {isProcessing && (
                  <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-950 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">{progress}%</span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">{currentStep || 'Processing...'}</span>
                  </div>
                )}

                {/* Quality review indicator */}
                {showQualityReview && (
                  <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-950 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">Quality Review Required</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowQualityReview(true)}
                      className="h-6 px-2 text-xs bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
                    >
                      Review Now
                    </Button>
                  </div>
                )}
                
                <div className="flex flex-col space-y-2">
                  <Button 
                    onClick={handleExtract} 
                    disabled={!file || isProcessing || !!transformId}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Rocket className="h-4 w-4 mr-1.5" />
                    {isProcessing ? 'Processing...' : 'Transform'}
                  </Button>
                  
                  <Button 
                    onClick={handleViewTransformStatus}
                    size="sm"
                    variant="outline"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Monitor className="h-4 w-4 mr-1.5" />
                    View Status
                  </Button>
                </div>
                
                <Button 
                  onClick={() => setShowMergeConfirm(true)} 
                  disabled={!graphData || isProcessing || showQualityReview}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                  title={showQualityReview ? "Complete quality review first" : ""}
                >
                  <GitMerge className="h-4 w-4 mr-1.5" />
                  Merge
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-4 gap-6 h-full">
            {/* Upload Panel - 25% width */}
            <div className="col-span-1 space-y-6">
              {/* File Upload Section */}
              <div className="enhanced-card">
                <div className="enhanced-card-header">
                  <h3 className="text-base font-semibold text-foreground">Document Upload</h3>
                  <p className="text-xs text-muted-foreground">Upload a document to transform into a knowledge graph</p>
                </div>
                <div className="enhanced-card-content space-y-3">
                  {!file ? (
                    <div
                      {...getRootProps()}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors duration-200",
                        isDragActive ? "border-blue-400 bg-blue-50 dark:bg-blue-950" : "border-border hover:border-border/80",
                        error && "border-red-300 bg-red-50 dark:bg-red-950"
                      )}
                    >
                      <input {...getInputProps()} />
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {isDragActive ? "Drop file here" : "Drop file or click"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PDF, TXT, MD up to 10MB
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-3 bg-muted">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-6 w-6 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFile(null)}
                          disabled={isProcessing}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Sample Files */}
                  <div className="border-t pt-3">
                    <h4 className="text-xs font-medium text-foreground mb-2">Sample Files</h4>
                    <div className="space-y-2">
                      {SAMPLE_FILES.map((sampleFile) => (
                        <div key={sampleFile.id} className="space-y-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSampleFileSelect(sampleFile)}
                            disabled={isProcessing}
                            className="w-full justify-start h-auto p-2 text-xs"
                          >
                            <FileSymlink className="h-3 w-3 mr-1.5 flex-shrink-0" />
                            <div className="text-left truncate">
                              <div className="font-medium truncate">{sampleFile.name}</div>
                            </div>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(sampleFile.path, '_blank')}
                            className="w-full text-xs h-6 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            Preview File
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Graph Visualization Panel - 75% width */}
            <div className="col-span-3">
              <div className="enhanced-card h-full text-sm text-muted-foreground">
                <div className="enhanced-card-header">
                  <h3 className="text-lg font-semibold text-foreground">Knowledge Graph</h3>
                  <p className="text-sm text-muted-foreground">
                    {graphData ? 'Interactive visualization of your knowledge graph' : 'Graph will appear here after transformation'}
                  </p>
                </div>
                <div className="enhanced-card-content h-[600px] relative">
                  {isProcessing ? (
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900">
                      <div className="text-center space-y-6 max-w-md">
                        <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto shadow-xl border-2 border-blue-200 dark:border-slate-600">
                          <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Transforming Document</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{currentStep || 'Processing your document...'}</p>
                          <div className="w-full max-w-xs mx-auto">
                            <Progress value={progress} className="w-full h-3" />
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">{progress}% Complete</p>
                          </div>
                        </div>
                        <div className="bg-white/90 dark:bg-slate-800/95 border border-blue-200 dark:border-slate-600 rounded-lg p-4 space-y-2 backdrop-blur-sm shadow-lg">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span>Parsing document structure</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                            <span>Extracting entities and relationships</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span>Building knowledge graph</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : graphData ? (
                    <GraphVisualization 
                      graphData={graphData}
                      onGraphReset={handleGraphReset}
                      onGraphOperation={handleGraphOperation}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                          <Database className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-foreground">No Graph Data</p>
                          <p className="text-sm text-muted-foreground">Upload and transform a document to see your knowledge graph</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Merge Confirmation Dialog */}
      <AlertDialog open={showMergeConfirm} onOpenChange={setShowMergeConfirm}>
        <AlertDialogContent className="bg-card border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-card-foreground">Merge to Production Database</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
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
            <AlertDialogCancel className="bg-muted text-muted-foreground border-border hover:bg-muted/80">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMergeConfirm} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Continue to Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Confirmation Dialog */}
      <AlertDialog open={showUploadConfirm} onOpenChange={setShowUploadConfirm}>
        <AlertDialogContent className="bg-card border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-card-foreground">Replace Current Document?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You already have a transformed document. Uploading a new document will:
            </AlertDialogDescription>
            <div className="mt-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-1">
                <li>Clear the current graph visualization</li>
                <li>Remove the existing transform data</li>
                <li>Allow you to start fresh with the new document</li>
              </ul>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNewUpload} className="bg-muted text-muted-foreground border-border hover:bg-muted/80">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNewUpload} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Replace Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quality Review Modal */}
      <AlertDialog open={showQualityReview} onOpenChange={setShowQualityReview}>
        <AlertDialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Quality Validation Review</AlertDialogTitle>
            <AlertDialogDescription>
              Please review the quality of the extracted data before proceeding with merge.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mt-4">
            {transformId && (
              <QualityDashboard
                transformId={transformId}
                onApprove={handleQualityApprove}
                onReject={handleQualityReject}
              />
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowQualityReview(false)}>
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function TransformPage() {
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
      currentStepId="transform"
      projectTitle="Document Transform"
      onStepClick={handleStepNavigation}
    >
      <Suspense fallback={<div>Loading...</div>}>
        <TransformPageContent />
      </Suspense>
    </EnhancedWorkflowLayout>
  )
}