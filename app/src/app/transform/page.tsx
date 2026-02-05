'use client'

import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from 'react'
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
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { EnhancedWorkflowLayout, WorkflowStep } from '@/components/enhanced-workflow-layout'
import { clsx as cn } from 'clsx'
import { Toolbar } from '@/components/command-center/toolbar'
import { ResizablePanel } from '@/components/command-center/resizable-panel'
import { CommandPalette } from '@/components/command-center/command-palette'
import { ChunkingConfig } from '@/components/chunking/chunking-config'
import { toast } from 'sonner'
import { useUserConfig } from '@/hooks/useUserConfig'
import { extractQualityGateInsight, isQualityGateWarning, type QualityGateInsight } from './quality-gate'
import { formatTransformFailureMessage } from './failure-utils'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md', '.markdown']
}
const GRAPH_RETRY_DELAY_MS = 2000
const MAX_GRAPH_RETRY_ATTEMPTS = 5

type QualityFailure = {
  code: string
  message: string
  score?: number
  threshold?: number
  retryAllowed?: boolean
  suggestions?: string[]
  chunkingSignature?: string | null
  fileToken?: string | null
  lastSuccessfulGraphId?: string | null
}

type TransformFailureInfo = {
  reason: string | null
  title: string
  message: string
  description: string
  details: string[]
  suggestions: string[]
}

const TRANSFORM_FAILURE_CONTENT: Record<
  string,
  { title: string; description: string; suggestion?: string }
> = {
  llm_unavailable: {
    title: 'Language model temporarily unavailable',
    description:
      'The upstream language model could not complete the request due to provider limits or a transient outage.',
    suggestion: 'Retry in a few minutes. If this persists, consider switching models or reducing concurrency.',
  },
  no_graph_generated: {
    title: 'No graph generated from document',
    description:
      'The extraction pipeline could not identify any entities or relationships from the document content.',
    suggestion: 'Check that the document matches your ontology and contains the expected sections.',
  },
  quality_gate_failed: {
    title: 'Quality gate blocked the transform',
    description:
      'Quality validation detected issues that breach configured thresholds. Review the violations before retrying.',
    suggestion: 'Open the quality review panel to inspect violations and address them before running again.',
  },
  parse_failed: {
    title: 'Document parsing failed',
    description:
      'The raw document could not be parsed into text for chunking and extraction.',
    suggestion: 'Ensure the source file is supported and not corrupted. Convert to UTF-8 text or PDF if needed.',
  },
  chunking_failed: {
    title: 'Chunking configuration failed',
    description:
      'The chunking stage could not partition the document within configured limits.',
    suggestion: 'Adjust chunking parameters (size, overlap) or simplify the document structure.',
  },
  transform_execution_failed: {
    title: 'Extraction step failed',
    description:
      'The transform pipeline hit an unexpected error while extracting nodes or relationships.',
    suggestion: 'Retry the transform. If it recurs, inspect logs for the failing chunk and adjust the document or ontology.',
  },
  storage_failed: {
    title: 'Graph storage failed',
    description:
      'The knowledge graph could not be written to the database.',
    suggestion: 'Check database connectivity and permissions, then retry the transform.',
  },
  unknown_error: {
    title: 'Unexpected transform error',
    description: 'An unexpected error interrupted the transform pipeline.',
    suggestion: 'Retry the transform. If it fails again, review backend logs for details.',
  },
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

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[TransformPage]', ...args)
  }
}
const debugWarn = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.warn('[TransformPage]', ...args)
  }
}

const deriveTransformFailureInfo = (
  payload: any,
  fallbackMessage: string,
): TransformFailureInfo => {
  const reasonRaw = payload?.failure_reason || payload?.failureReason || null
  const reason = typeof reasonRaw === 'string' ? reasonRaw.toLowerCase() : null
  const content =
    (reason ? TRANSFORM_FAILURE_CONTENT[reason] : undefined) ??
    TRANSFORM_FAILURE_CONTENT.unknown_error

  const detailsSet = new Set<string>()
  const addDetail = (value?: unknown) => {
    if (typeof value !== 'string') {
      return
    }
    const trimmed = value.trim()
    if (!trimmed) {
      return
    }
    if (!detailsSet.has(trimmed)) {
      detailsSet.add(trimmed)
    }
  }

  addDetail(payload?.error_summary?.error_message)
  addDetail(payload?.error_summary?.error_type)
  addDetail(payload?.message)
  const failureDetails = payload?.failure_details || {}
  addDetail(failureDetails.message)
  addDetail(failureDetails.details?.message)

  const suggestions: string[] = []
  if (content.suggestion) {
    suggestions.push(content.suggestion)
  }
  if (typeof failureDetails.recovery_instructions === 'string') {
    const recovery = failureDetails.recovery_instructions.trim()
    if (recovery) {
      suggestions.push(recovery)
    }
  }

  return {
    reason,
    title: content.title,
    message: fallbackMessage,
    description: content.description,
    details: Array.from(detailsSet),
    suggestions,
  }
}

function TransformPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams])
  const sessionId = searchParams.get('session_id')
  const urlTransformId = searchParams.get('transform_id')
  const { checkConfigBeforeWorkflow } = useUserConfig()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [file, setFile] = useState<FileWithPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [lastSuccessfulGraph, setLastSuccessfulGraph] = useState<GraphData | null>(null)
  const [isUploadPanelExpanded, setIsUploadPanelExpanded] = useState(true)
  const [showMergeConfirm, setShowMergeConfirm] = useState(false)
  const [transformId, setTransformId] = useState<string | null>(urlTransformId)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [showUploadConfirm, setShowUploadConfirm] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [showQualityReview, setShowQualityReview] = useState(false)
  const [qualityReviewCompleted, setQualityReviewCompleted] = useState(false)
  const [chunkingConfig, setChunkingConfig] = useState<any>(null)
  const [qualityFailure, setQualityFailure] = useState<QualityFailure | null>(null)
  const [qualityWarning, setQualityWarning] = useState<QualityGateInsight | null>(null)
  const [qualityContextTransformId, setQualityContextTransformId] = useState<string | null>(null)
  const [transformFailure, setTransformFailure] = useState<TransformFailureInfo | null>(null)
  const hasCustomChunking = Boolean(chunkingConfig)
  const formattedFileSize = file
    ? file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    : null
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [showChunkingConfig, setShowChunkingConfig] = useState(false)
  const graphRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const chunkingSignature = useMemo(() => {
    if (!chunkingConfig) return '::default::'
    try {
      return JSON.stringify(chunkingConfig)
    } catch (err) {
      debugWarn('Failed to stringify chunking config for signature', err)
      return '::custom::'
    }
  }, [chunkingConfig])

  const fileToken = useMemo(() => {
    if (!file) return null
    return `${file.name}:${file.size}:${file.lastModified ?? '0'}`
  }, [file])

  const isPdfFile = useMemo(() => {
    if (!file?.name) return false
    const name = file.name.toLowerCase()
    return name.endsWith('.pdf') || file.type === 'application/pdf'
  }, [file])

  const isChunkingAvailable = useMemo(() => {
    if (!file) return true
    return !isPdfFile
  }, [file, isPdfFile])

  const restoreFallbackGraph = useCallback(() => {
    if (!graphData && lastSuccessfulGraph) {
      const fallbackGraph = {
        ...lastSuccessfulGraph,
        nodes: [...lastSuccessfulGraph.nodes],
        edges: [...lastSuccessfulGraph.edges]
      }
      setGraphData(fallbackGraph)
    }
  }, [graphData, lastSuccessfulGraph])

  const deriveQualityFailure = useCallback((payload: any): QualityFailure | null => {
    const failureCode = payload?.failure_code || payload?.failure?.code
    if (failureCode === 'quality_threshold_not_met') {
      const details = payload?.failure_details || payload?.failure || {}
      const message = details.message || payload?.message || 'Quality threshold not met. Please adjust settings before retrying.'
      const suggestions = Array.isArray(details.suggestions)
        ? details.suggestions
        : (payload?.retry_suggestions && Array.isArray(payload.retry_suggestions)
            ? payload.retry_suggestions
            : [])

      return {
        code: failureCode,
        message,
        score: details.quality_score ?? payload?.quality_score,
        threshold: details.threshold ?? payload?.quality_threshold,
        retryAllowed: details.retry_allowed ?? payload?.retry_allowed ?? false,
        suggestions,
        chunkingSignature,
        fileToken,
        lastSuccessfulGraphId: details.last_successful_graph_id ?? payload?.last_successful_graph_id ?? null
      }
    }

    return null
  }, [chunkingSignature, fileToken])

  const normalizeGraphData = useCallback((data: any, transformIdentifier: string): GraphData => ({
    ...data,
    id: transformIdentifier,
    nodes: (data.nodes || []).map((node: any) => ({
      ...node,
      label: node.label || node.type,
      properties: node.properties || {}
    })),
    edges: (data.edges || []).map((edge: any) => ({
      ...edge,
      label: edge.type,
      properties: edge.properties || {}
    })),
    total_nodes: data.nodes?.length ?? 0,
    total_edges: data.edges?.length ?? 0
  }), [])

  const loadGraphData = useCallback(async (transformId: string, retryAttempt = 0) => {
    if (!transformId) {
      console.error('No transform ID provided to loadGraphData')
      return
    }
    setTransformId(transformId)
    try {
      debug('Loading graph data for transform:', transformId)
      const response = await fetch(`/api/graph/${transformId}`)

      if (!response.ok) {
        if (response.status === 404 && retryAttempt < MAX_GRAPH_RETRY_ATTEMPTS) {
          debug('Graph data not found, scheduling retry')
          if (graphRetryTimeoutRef.current) {
            clearTimeout(graphRetryTimeoutRef.current)
          }
          graphRetryTimeoutRef.current = setTimeout(() => {
            loadGraphData(transformId, retryAttempt + 1)
          }, GRAPH_RETRY_DELAY_MS)
          return
        }
        throw new Error('Failed to load graph data')
      }

      const data = await response.json()

      if (!data.nodes || data.nodes.length === 0 || !data.edges) {
        if (retryAttempt < MAX_GRAPH_RETRY_ATTEMPTS) {
          debug('Graph data incomplete, scheduling retry')
          if (graphRetryTimeoutRef.current) {
            clearTimeout(graphRetryTimeoutRef.current)
          }
          graphRetryTimeoutRef.current = setTimeout(() => {
            loadGraphData(transformId, retryAttempt + 1)
          }, GRAPH_RETRY_DELAY_MS)
        } else {
          debugWarn('Graph data unavailable after retries')
        }
        return
      }

      const processedData = normalizeGraphData(data, transformId)
      debug('Setting processed graph data:', processedData)
      setGraphData(processedData)
      setLastSuccessfulGraph(processedData)
      setQualityContextTransformId(transformId)
      setQualityFailure(null)
      setTransformFailure(null)
      setError(null)
      if (graphRetryTimeoutRef.current) {
        clearTimeout(graphRetryTimeoutRef.current)
        graphRetryTimeoutRef.current = null
      }
    } catch (err) {
      console.error('Error loading graph data:', err)
      if (!isProcessing) {
        setError(err instanceof Error ? err.message : 'Failed to load graph data')
      }
    }
  }, [isProcessing, normalizeGraphData])

  const fetchGraphSnapshot = useCallback(async (graphId: string) => {
    try {
      const response = await fetch(`/api/graph/${graphId}`)
      if (!response.ok) {
        debugWarn('Fallback graph snapshot fetch failed with status', response.status)
        return
      }
      const data = await response.json()
      if (!data?.nodes || !data?.edges) {
        debugWarn('Fallback graph snapshot missing nodes/edges')
        return
      }
      const processed = normalizeGraphData(data, graphId)
      setLastSuccessfulGraph(processed)
      setQualityContextTransformId(graphId)
      if (!graphData) {
        setGraphData(processed)
      }
    } catch (err) {
      debugWarn('Failed to load fallback graph snapshot', err)
    }
  }, [graphData, normalizeGraphData])

  const handleTerminalFailure = useCallback((
    fallbackMessage: string,
    failureDetails?: QualityFailure | null,
    sourceTransformId?: string | null,
    failurePayload?: any,
  ) => {
    const normalizedMessage = (message?: string | null) => {
      if (!message) return 'An unexpected error occurred during transform.'
      const trimmed = message.trim()
      return trimmed.length > 0 ? trimmed : 'An unexpected error occurred during transform.'
    }

    console.error('[Transform Failure]', {
      fallbackMessage,
      failureDetails,
      failurePayload,
      sourceTransformId,
      timestamp: new Date().toISOString(),
    })

    if (failureDetails) {
      setQualityFailure(failureDetails)
      setTransformFailure(null)
      setError(normalizedMessage(failureDetails.message))
    } else {
      setQualityFailure(null)
      const derivedFailure = deriveTransformFailureInfo(
        failurePayload,
        fallbackMessage,
      )
      setTransformFailure(derivedFailure)
      setError(normalizedMessage(derivedFailure.message))
    }

    if (sourceTransformId) {
      const snapshotId = failureDetails?.lastSuccessfulGraphId || sourceTransformId
      fetchGraphSnapshot(snapshotId)
      setQualityContextTransformId(snapshotId)
    }

    setQualityWarning(null)
    setIsProcessing(false)
    setProgress(0)
    // Preserve transform reference so the user can revisit after re-auth
    setShowQualityReview(false)
    setQualityReviewCompleted(false)
    restoreFallbackGraph()
  }, [fetchGraphSnapshot, restoreFallbackGraph])

  const openChunkingConfig = useCallback(() => {
    if (!isChunkingAvailable) return
    setShowChunkingConfig(true)
  }, [isChunkingAvailable])

  const activeQualityTransformId = transformId ?? qualityContextTransformId

  useEffect(() => {
    if (!qualityFailure) return
    if (qualityFailure.chunkingSignature && qualityFailure.chunkingSignature !== chunkingSignature) {
      debug('Clearing quality failure due to chunking change')
      setQualityFailure(null)
    }
  }, [chunkingSignature, qualityFailure])

  useEffect(() => {
    if (!qualityFailure) return
    if (qualityFailure.fileToken !== fileToken) {
      debug('Clearing quality failure due to file change')
      setQualityFailure(null)
    }
  }, [fileToken, qualityFailure])

  useEffect(() => {
    return () => {
      if (graphRetryTimeoutRef.current) {
        clearTimeout(graphRetryTimeoutRef.current)
        graphRetryTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isChunkingAvailable && showChunkingConfig) {
      setShowChunkingConfig(false)
    }
  }, [isChunkingAvailable, showChunkingConfig])

  useEffect(() => {
    if (!sessionId) {
      router.push('/ontology')
    }
  }, [sessionId, router])

  useEffect(() => {
    if (!transformId) {
      return
    }
    const params = new URLSearchParams(searchParamsString)
    if (params.get('transform_id') === transformId) {
      return
    }
    params.set('transform_id', transformId)
    router.replace(`${pathname}?${params.toString()}`)
  }, [transformId, searchParamsString, router, pathname])

  useEffect(() => {
    const loadStateFromUrl = async () => {
      if (urlTransformId && !graphData && !isProcessing && !error) {
        debug('Loading state from URL transform_id:', urlTransformId)
        setTransformId(urlTransformId)
        
        try {
          const response = await fetch(`/api/transform/status/${urlTransformId}`)
          
          if (!response.ok) {
            const errorData = await response.json()

            // Auth error - stop and redirect
            if (response.status === 403 && errorData.type === 'access_denied') {
              setError('You do not have permission to access this transform. Please check if you are signed in with the correct account.')
              setTransformId(null)
              const newSearchParams = new URLSearchParams(searchParamsString)
              newSearchParams.delete('transform_id')
              router.replace(`${pathname}?${newSearchParams.toString()}`)
              return
            }

            // 404 is terminal - transform truly doesn't exist
            if (response.status === 404) {
              handleTerminalFailure(
                'Transform process not found for the provided ID.',
                undefined,
                urlTransformId,
                errorData,
              )
              return
            }

            // For all other errors (500, 502, 503, 504, etc.), assume transform is in progress
            // The backend might be slow, the transform might not be registered yet, or services restarting
            debug(`Initial status check returned ${response.status}, assuming transform is in progress:`, errorData)
            setIsProcessing(true)
            setProgress(10)
            return
          }

          const data = await response.json()

          if (data.overall_status === 'completed') {
            setProgress(100)
            setIsProcessing(false)
            setIsUploadPanelExpanded(false)
            debug('Transform already completed, loading graph data')
            await loadGraphData(urlTransformId)
            const gateInsight = extractQualityGateInsight(data)
            if (isQualityGateWarning(gateInsight)) {
              setQualityWarning(gateInsight)
              setQualityReviewCompleted(false)
            } else {
              setQualityWarning(null)
            }
            // Check if quality validation is available
            setShowQualityReview(true)
          } else if (data.status === 'failed' || data.overall_status === 'failed' || data.current_stage === 'failed') {
            // Log the full failure data for debugging
            console.error('[URL Load Transform Failure]', {
              urlTransformId,
              status: data.status,
              overall_status: data.overall_status,
              current_stage: data.current_stage,
              fullData: data,
              timestamp: new Date().toISOString()
            })

            const failureDetails = deriveQualityFailure(data)
            if (failureDetails?.lastSuccessfulGraphId && (!lastSuccessfulGraph || lastSuccessfulGraph.id !== failureDetails.lastSuccessfulGraphId)) {
              fetchGraphSnapshot(failureDetails.lastSuccessfulGraphId)
            }
            const gateInsight = extractQualityGateInsight(data)
            if (isQualityGateWarning(gateInsight)) {
              debug('Transform status reported quality gate warning; treating as completed with warnings')
              setProgress(100)
              setIsProcessing(false)
              setIsUploadPanelExpanded(false)
              // Load graph if not present or if ID doesn't match
              // Type assertion needed because TypeScript's control flow analysis gets confused in this branch
              const currentData = graphData as GraphData | null
              const currentGraphId = currentData?.id
              const needsGraphLoad = !currentData || currentGraphId !== urlTransformId
              if (needsGraphLoad) {
                await loadGraphData(urlTransformId)
              }
              setQualityWarning(gateInsight)
              setQualityFailure(null)
              setQualityReviewCompleted(false)
              setQualityContextTransformId(urlTransformId)
              setTransformId(urlTransformId)
              setShowQualityReview(true)
              return
            }
            const statusMessage = failureDetails?.message || formatTransformFailureMessage(data)
            console.error('[URL Load Formatted Failure Message]', statusMessage)
            handleTerminalFailure(statusMessage, failureDetails, urlTransformId, data)
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
          handleTerminalFailure(
            err instanceof Error ? err.message : 'Failed to load state from transform ID',
            undefined,
            urlTransformId,
          )
        }
      }
    }

    if (sessionId) {
      loadStateFromUrl()
    }
  }, [urlTransformId, sessionId, graphData, lastSuccessfulGraph, isProcessing, error, loadGraphData, router, pathname, searchParamsString, deriveQualityFailure, fetchGraphSnapshot, handleTerminalFailure, extractQualityGateInsight, isQualityGateWarning])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    setQualityWarning(null)
    setQualityReviewCompleted(false)
    setTransformFailure(null)
    
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

    const fileWithPreview = Object.assign(file, {
      preview: URL.createObjectURL(file)
    })
    
    setFile(fileWithPreview)
    
    // Read file content for chunking analysis
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFileContent(e.target?.result as string)
      }
      reader.readAsText(file)
    } else {
      setFileContent(null) // PDF files can't be read directly for analysis
    }
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
    setShowQualityReview(false)
    setQualityReviewCompleted(false)
    setChunkingConfig(null)
    setFileContent(null)
    setLastSuccessfulGraph(null)
    setQualityFailure(null)
    setQualityWarning(null)
    setTransformFailure(null)
    const newSearchParams = new URLSearchParams(searchParamsString)
    newSearchParams.delete('transform_id')
    router.replace(`${pathname}?${newSearchParams.toString()}`)
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
    setLastSuccessfulGraph(null)
    setQualityFailure(null)
    setQualityWarning(null)
    setTransformFailure(null)
    setQualityReviewCompleted(false)

    // Remove transform_id from URL
    const newSearchParams = new URLSearchParams(searchParamsString)
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

    if (graphData) {
      setLastSuccessfulGraph(graphData)
    }
    setQualityFailure(null)
    setQualityWarning(null)
    setTransformFailure(null)
    setQualityContextTransformId(null)
    setQualityReviewCompleted(false)
    setIsProcessing(true)
    setError(null)
    setProgress(0)
    setTransformId(null)

    try {
      const formData = new FormData()
      formData.append('files', file)
      
      // Add chunking configuration if available
      if (chunkingConfig) {
        formData.append('chunking_config', JSON.stringify(chunkingConfig))
      }

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

      const newSearchParams = new URLSearchParams(searchParamsString)
      newSearchParams.set('transform_id', newTransformId)
      router.replace(`${pathname}?${newSearchParams.toString()}`)

    } catch (err) {
      console.error('Error processing file:', err)
      setError(err instanceof Error ? err.message : 'Failed to process file')
      setIsProcessing(false)
      setProgress(0)
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
        debug('Checking transform status:', transformId)
        const response = await fetch(`/api/transform/status/${transformId}`)
        
        if (!response.ok) {
          const errorData = await response.json()

          // Only stop polling for auth errors (403)
          // All other errors should be treated as temporary and retried
          if (response.status === 403 && errorData.type === 'access_denied') {
            debug('Access denied for transform, stopping status checks')
            setError('You do not have permission to access this transform')
            setIsProcessing(false)
            if (statusInterval) {
              clearInterval(statusInterval)
            }
            return
          }

          // For all other errors (404, 500, 502, 503, 504, etc.), log and retry
          // The backend might be slow, restarting, or the transform might not be ready yet
          debug(`Status check returned ${response.status}, will retry on next interval:`, errorData)
          return
        }
        
        const data = await response.json()

        if (data.overall_status === 'completed') {
          setProgress(100)
          setIsProcessing(false)
          setIsUploadPanelExpanded(false)
          debug('Transform completed, loading graph data')

          await loadGraphData(transformId)
          const gateInsight = extractQualityGateInsight(data)
          if (isQualityGateWarning(gateInsight)) {
            setQualityWarning(gateInsight)
            setQualityReviewCompleted(false)
          } else {
            setQualityWarning(null)
          }
          // Show quality review after transform completion
          setShowQualityReview(true)
          setQualityFailure(null)

          if (statusInterval) {
            clearInterval(statusInterval)
          }
        } else if (data.status === 'failed' || data.overall_status === 'failed' || data.current_stage === 'failed') {
          // Log the full failure data for debugging
          console.error('[Transform Status Failure]', {
            transformId,
            status: data.status,
            overall_status: data.overall_status,
            current_stage: data.current_stage,
            fullData: data,
            timestamp: new Date().toISOString()
          })

          const failureDetails = deriveQualityFailure(data)
          if (failureDetails?.lastSuccessfulGraphId && (!lastSuccessfulGraph || lastSuccessfulGraph.id !== failureDetails.lastSuccessfulGraphId)) {
            fetchGraphSnapshot(failureDetails.lastSuccessfulGraphId)
          }
          const gateInsight = extractQualityGateInsight(data)
          if (isQualityGateWarning(gateInsight)) {
            debug('Transform status reported quality gate warning; treating as completed with warnings')
            setProgress(100)
            setIsProcessing(false)
            setIsUploadPanelExpanded(false)
            // Load graph if not present or if ID doesn't match
            // Type assertion needed because TypeScript's control flow analysis gets confused in this branch
            const currentData = graphData as GraphData | null
            const currentGraphId = currentData?.id
            const needsGraphLoad = !currentData || currentGraphId !== transformId
            if (needsGraphLoad) {
              await loadGraphData(transformId)
            }
            setQualityWarning(gateInsight)
            setQualityFailure(null)
            setQualityReviewCompleted(false)
            setShowQualityReview(true)
            if (statusInterval) {
              clearInterval(statusInterval)
            }
            return
          }
          const statusMessage = failureDetails?.message || formatTransformFailureMessage(data)
          console.error('[Formatted Failure Message]', statusMessage)
          handleTerminalFailure(statusMessage, failureDetails, transformId, data)
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
        // Don't treat network errors as terminal failures - just log and retry
        // The backend might be temporarily unavailable or slow
        debug('Status check failed, will retry on next interval:', err)
      }
    }

    if (transformId && isProcessing) {
      debug('Starting status check interval for transform:', transformId)
      checkStatus()
      statusInterval = setInterval(checkStatus, STATUS_CHECK_INTERVAL)
    }

    return () => {
      if (statusInterval) {
        debug('Clearing status check interval for transform:', transformId)
        clearInterval(statusInterval)
      }
    }
  }, [transformId, isProcessing, loadGraphData, deriveQualityFailure, graphData, lastSuccessfulGraph, fetchGraphSnapshot, handleTerminalFailure, router, pathname, searchParamsString, extractQualityGateInsight, isQualityGateWarning])

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
    debug('Quality approved for transform:', transformId)
    setShowQualityReview(false)
    setQualityReviewCompleted(true)
    setQualityWarning(null)
    setTransformFailure(null)
    toast.success('Quality validation approved. Ready for merge.')
  }

  const handleQualityReject = () => {
    debug('Quality rejected for transform:', transformId)
    setShowQualityReview(false)
    setQualityReviewCompleted(false)
    // Reset to allow new transform
    setGraphData(null)
    setTransformId(null)
    setIsUploadPanelExpanded(true)
    setLastSuccessfulGraph(null)
    setQualityFailure(null)
    setQualityWarning(null)
    setTransformFailure(null)

    const newSearchParams = new URLSearchParams(searchParamsString)
    newSearchParams.delete('transform_id')
    router.push(`${pathname}?${newSearchParams.toString()}`)
    
    toast.error('Quality validation rejected. Please upload a new document or adjust your ontology.')
  }

  const handleApplySuggestion = useCallback((id: string) => {
    debug('Applying suggestion:', id)
  }, [])

  const handleDismissSuggestion = useCallback((id: string) => {
    debug('Dismissing suggestion:', id)
  }, [])

  const handleExplainSuggestion = useCallback((id: string) => {
    debug('Explaining suggestion:', id)
  }, [])

  const handleCustomizeSuggestion = useCallback((id: string) => {
    debug('Customizing suggestion:', id)
  }, [])

  const handleSampleFileSelect = async (sampleFile: typeof SAMPLE_FILES[0]) => {
    try {
      setError(null)
      setQualityWarning(null)
      setQualityReviewCompleted(false)
      setTransformFailure(null)
      
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
      
      const fileWithPreview = Object.assign(file, {
        preview: URL.createObjectURL(file)
      })
      
      setFile(fileWithPreview)
      
      // Read file content for chunking analysis if it's a text file
      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFileContent(e.target?.result as string)
          // Auto-extract after content is loaded
          setTimeout(() => {
            if (sessionId) {
              handleExtract()
            }
          }, 500)
        }
        reader.readAsText(file)
      } else {
        setFileContent(null)
        // Auto-extract for non-text files
        setTimeout(() => {
          if (sessionId) {
            handleExtract()
          }
        }, 500)
      }
      
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
      debugWarn('NEXT_PUBLIC_TRANSFORM_PREFECT_STATUS_URL is not defined.')
    }
  };

  const handleRetryTransform = () => {
    if (qualityFailure && qualityRetryBlocked) {
      openChunkingConfig()
      toast.info('Quality threshold not met', {
        description: 'Adjust the chunking configuration or upload improvements before retrying the transform.'
      })
      return
    }

    // Clear the transform_id from URL and reset state to allow retry
    const newSearchParams = new URLSearchParams(searchParamsString)
    newSearchParams.delete('transform_id')
    router.push(`${pathname}?${newSearchParams.toString()}`)
    
    setTransformId(null)
    setError(null)
    setIsProcessing(false)
    setProgress(0)
    setCurrentStep('')
    setQualityFailure(null)
    setQualityWarning(null)
    setTransformFailure(null)
    setIsUploadPanelExpanded(true)
    setShowQualityReview(false)
    setQualityReviewCompleted(false)
    if (lastSuccessfulGraph) {
      setGraphData(lastSuccessfulGraph)
    }
    
    toast.success('Ready to retry transform. Apply your adjustments, then click Transform again.')
  }

  const qualityRetryBlocked = Boolean(qualityFailure && qualityFailure.retryAllowed !== true)

  const tools = [
    {
      id: 'upload',
      icon: <Rocket className="h-4 w-4" />,
      label: 'Transform',
      action: handleExtract,
      disabled: !file || isProcessing || !!transformId || qualityRetryBlocked,
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
    debug('Graph operation requested:', operation)
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
            debugWarn(`Edge ID ${operation.payload.id} not found directly, attempting fallback find.`)
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
      debug('Graph changes saved successfully:', result)
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
      {/* Error / Quality Alerts */}
      {qualityFailure ? (
        <Alert variant="warning" className="m-4 border-warning/40 bg-warning/10">
          <AlertDescription className="flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Quality threshold not met</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {qualityFailure.message}
                </p>
                {(qualityFailure.score !== undefined && qualityFailure.threshold !== undefined) && (
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    Score {Number(qualityFailure.score).toFixed(2)} vs required {Number(qualityFailure.threshold).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {qualityFailure.suggestions && qualityFailure.suggestions.length > 0 && (
              <ul className="list-disc space-y-1 pl-6 text-xs text-muted-foreground/90">
                {qualityFailure.suggestions.map((suggestion, index) => (
                  <li key={`${suggestion}-${index}`}>{suggestion}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {isChunkingAvailable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openChunkingConfig}
                  className="border-warning/40"
                >
                  <Settings2 className="h-4 w-4 mr-1.5" />
                  Adjust chunking
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (activeQualityTransformId) setShowQualityReview(true)
                }}
                disabled={!activeQualityTransformId}
              >
                <Database className="h-4 w-4 mr-1.5" />
                Review quality insights
              </Button>
              {!qualityFailure.retryAllowed && (
                <span className="text-xs text-muted-foreground/80">
                  Update settings or upload a new document to re-enable transform.
                </span>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ) : qualityWarning ? (
        <Alert variant="warning" className="m-4 border-warning/40 bg-warning/10">
          <AlertDescription className="flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Quality review recommended</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {qualityWarning.message}
                </p>
              </div>
            </div>

            {qualityWarning.reasons && qualityWarning.reasons.length > 0 && (
              <ul className="list-disc space-y-1 pl-6 text-xs text-muted-foreground/90">
                {qualityWarning.reasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>{reason}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (activeQualityTransformId) setShowQualityReview(true)
                }}
                disabled={!activeQualityTransformId}
              >
                <Database className="h-4 w-4 mr-1.5" />
                Review quality insights
              </Button>
              <span className="text-xs text-muted-foreground/80">
                Resolve or approve warnings before merging to production.
              </span>
            </div>
          </AlertDescription>
        </Alert>
      ) : error && (
        <Alert variant="destructive" className="m-4">
          <AlertDescription className="flex flex-col gap-3">
            <div className="space-y-2">
              <p className="font-semibold text-foreground">
                {transformFailure?.title ?? 'Transform failed'}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {transformFailure?.description ?? 'The transform encountered an unexpected error.'}
              </p>
            </div>

            {transformFailure?.details && transformFailure.details.length > 0 && (
              <ul className="list-disc space-y-1 pl-6 text-xs text-muted-foreground/90">
                {transformFailure.details.map((detail, index) => (
                  <li key={`${detail}-${index}`}>{detail}</li>
                ))}
              </ul>
            )}

            {transformFailure?.suggestions && transformFailure.suggestions.length > 0 && (
              <div className="space-y-1 text-xs text-muted-foreground/80">
                <p className="font-medium text-muted-foreground">Suggested actions</p>
                <ul className="list-disc space-y-1 pl-6">
                  {transformFailure.suggestions.map((suggestion, index) => (
                    <li key={`${suggestion}-${index}`}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground/70">
                {transformFailure?.message ?? error}
              </span>
              {!isProcessing && (transformFailure?.reason ?? '') !== 'quality_gate_failed' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRetryTransform}
                  className="ml-auto"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Retry Transform
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Bar */}
      <div className="bg-muted/30 px-6 py-3">
        <div className="flex items-center justify-end gap-2">
          {isChunkingAvailable && (
            <Button
              onClick={openChunkingConfig}
              disabled={!file || isProcessing}
              size="sm"
              variant="outline"
            >
              <Settings2 className="h-4 w-4 mr-1.5" />
              Chunking Config
            </Button>
          )}

          <Button
            onClick={handleExtract}
            disabled={!file || isProcessing || !!transformId || qualityRetryBlocked}
            size="sm"
            variant="cta"
          >
            <Rocket className="h-4 w-4 mr-1.5" />
            {isProcessing ? 'Processing...' : 'Transform'}
          </Button>

          {(transformId || urlTransformId) && graphData && (
            <Button
              onClick={() => setShowQualityReview(true)}
              disabled={isProcessing}
              size="sm"
              variant="outline"
            >
              <Monitor className="h-4 w-4 mr-1.5" />
              View Quality
            </Button>
          )}

          <Button
            onClick={() => setShowMergeConfirm(true)}
            disabled={!graphData || isProcessing || !qualityReviewCompleted}
            size="sm"
            variant="cta"
          >
            <GitMerge className="h-4 w-4 mr-1.5" />
            Merge
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">

        <div className="page-shell py-6 flex-1 flex flex-col overflow-hidden">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr] flex-1 min-h-[80vh]">
            {/* Upload Panel */}
            <div className="flex flex-col h-full overflow-auto">
              {/* File Upload Section */}
              <div className="enhanced-card h-full flex-shrink-0">
                <div className="enhanced-card-header pb-3">
                  <h3 className="text-sm font-semibold text-foreground">Document Upload</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Upload a document to transform into a knowledge graph</p>
                </div>
                <div className="enhanced-card-content space-y-4">
                  {!file ? (
                    <div
                      {...getRootProps()}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
                        isDragActive
                          ? "border-primary/60 bg-primary/5 scale-[1.02]"
                          : "border-border/60 hover:border-primary/40 hover:bg-muted/30",
                        error && "border-destructive/60 bg-destructive/5"
                      )}
                    >
                      <input {...getInputProps()} />
                      <div className="flex flex-col items-center space-y-3">
                        <div className={cn(
                          "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                          isDragActive ? "bg-primary/20" : "bg-muted"
                        )}>
                          <Upload className={cn(
                            "h-6 w-6 transition-colors",
                            isDragActive ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {isDragActive ? "Drop file here" : "Drop file or click to upload"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PDF, TXT, MD • Max 10MB
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

            {/* Graph Visualization Panel */}
            <div className="flex flex-col h-full">
              <div className="enhanced-card flex flex-col h-full text-sm text-muted-foreground">
                <div className="enhanced-card-header pb-3 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-foreground">Knowledge Graph</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {graphData ? 'Interactive visualization of your knowledge graph' : 'Graph will appear here after transformation'}
                  </p>
                </div>
                <div className="enhanced-card-content flex-1 relative overflow-hidden rounded-lg min-h-0">
                  {isProcessing ? (
                    <div className="h-full flex items-center justify-center bg-muted/30">
                      <div className="text-center space-y-4 max-w-md">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-card shadow-soft">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-foreground">Transforming Document</h3>
                          <p className="text-sm text-muted-foreground">{currentStep || 'Processing your document...'}</p>
                          <div className="w-full max-w-xs mx-auto">
                            <Progress value={progress} className="w-full h-2" />
                            <p className="text-sm font-medium mt-2 text-primary">{progress}% Complete</p>
                          </div>
                        </div>
                        <div className="rounded-lg p-3 space-y-1.5 bg-card shadow-soft">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                            <span>Parsing document structure</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                            <span>Extracting entities and relationships</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
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
        <AlertDialogContent className="max-w-7xl max-h-[95vh] p-0 bg-background border-border overflow-hidden">
          <AlertDialogHeader className="sr-only">
            <AlertDialogTitle>Data Quality Review</AlertDialogTitle>
            <AlertDialogDescription>
              Review the quality of the extracted data before proceeding with merge.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col h-[95vh]">
            {/* Modal Content - scrollable */}
            <div className="flex-1 overflow-y-auto p-8 bg-background min-h-0">
              {activeQualityTransformId && (
                <QualityDashboard
                  transformId={activeQualityTransformId}
                  onApprove={handleQualityApprove}
                  onReject={handleQualityReject}
                />
              )}
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Chunking Configuration Modal */}
      <Dialog
        open={isChunkingAvailable && showChunkingConfig}
        onOpenChange={(value) => setShowChunkingConfig(isChunkingAvailable && value)}
      >
        <DialogContent className="glass-surface max-w-5xl h-[90vh] max-h-[90vh] overflow-x-hidden overflow-y-auto border  p-0 text-card-foreground shadow-large">
          <DialogTitle className="sr-only">Chunking Configuration</DialogTitle>
          <div className="grid h-full min-h-0 md:grid-cols-[320px_1fr]">
            <aside className="flex h-full min-h-0 flex-col bg-gradient-to-br from-primary/18 via-background/30 to-background/60 p-8 text-left ">
              <div className="flex-1 min-h-0 space-y-6 overflow-y-auto pr-3">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-foreground/55">Document</p>
                  <h2 className="text-heading text-foreground">
                    {file?.name ?? 'No document selected'}
                  </h2>
                  <p className="text-sm text-foreground/70">
                    {file ? `${formattedFileSize ?? '—'} • ${file.type || 'unknown type'}` : 'Upload a document to tailor chunking.'}
                  </p>
                </div>
                <div className="space-y-3 rounded-xl border  bg-white/10 p-5 shadow-inner min-h-[220px]">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/55">Current configuration</p>
                  {hasCustomChunking ? (
                    <div className="space-y-3 text-sm text-foreground/80">
                      <div className="flex items-center justify-between">
                        <span>Strategy</span>
                        <Badge variant="glass" className="uppercase tracking-[0.14em]">
                          {chunkingConfig?.strategy ?? 'hybrid'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Min size</span>
                        <span>{chunkingConfig?.min_chunk_size ?? 500} chars</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Max size</span>
                        <span>{chunkingConfig?.max_chunk_size ?? 3000} chars</span>
                      </div>
                      {chunkingConfig?.chunk_overlap && (
                        <div className="flex items-center justify-between">
                          <span>Overlap</span>
                          <span>{chunkingConfig.chunk_overlap} chars</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/65">
                      Using adaptive hybrid chunking. Enable custom settings to fine-tune chunk sizes and overlap for this document.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex-shrink-0 space-y-3 rounded-xl border  bg-white/8 p-5 text-xs text-foreground/75 shadow-inner">
                <p className="font-medium uppercase tracking-[0.16em] text-foreground/70">Recommendations</p>
                <ul className="space-y-2 text-foreground/80">
                  <li>• Smaller chunks improve retrieval accuracy for dense documents.</li>
                  <li>• Increase overlap when preserving context across sections.</li>
                  <li>• Structural strategy works best for reports with headings and lists.</li>
                </ul>
              </div>
            </aside>

            <div className="flex h-full min-h-0 flex-col bg-background/92  overflow-hidden">
              <header className="flex items-center justify-between border-b  p-8 pb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-white shadow-glass">
                    <Settings2 className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <h2 className="text-display-xs text-foreground">Chunking configuration</h2>
                    <p className="text-sm text-foreground/70">
                      Tune how the document is segmented before embedding and graph generation.
                    </p>
                  </div>
                </div>
              </header>

              <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
                <ChunkingConfig
                  fileContent={fileContent ?? undefined}
                  fileName={file?.name}
                  onConfigChange={setChunkingConfig}
                  className=" bg-white/10 shadow-glass "
                />
              </div>

              <footer className="flex items-center justify-end gap-3 border-t  bg-white/5 px-8 py-6 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setShowChunkingConfig(false)}
                  className=" text-foreground hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowChunkingConfig(false)}
                  variant="cta"
                  size="sm"
                  className="text-sm"
                >
                  Apply settings
                </Button>
              </footer>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
      description="Upload and transform documents into knowledge graphs"
      onStepClick={handleStepNavigation}
    >
      <Suspense fallback={<div>Loading...</div>}>
        <TransformPageContent />
      </Suspense>
    </EnhancedWorkflowLayout>
  )
}
