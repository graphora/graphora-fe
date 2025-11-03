'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { YAMLEditor } from '@/components/ontology/yaml-editor'
import { EntityList } from '@/components/ontology/entity-list'
import { useOntologyEditorStore } from '@/lib/store/ontology-editor-store'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { EnhancedWorkflowLayout, WorkflowStep } from '@/components/enhanced-workflow-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Upload, Play, Code2, Grid2x2, SplitSquareVertical, Settings, Database, Save, ArrowLeft, Edit2, Check, X, Download } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VisualEditor } from '@/components/ontology/visual-editor'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useUserConfig } from '@/hooks/useUserConfig'

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[OntologyPage]', ...args)
  }
}

type ViewMode = 'code' | 'visual' | 'split'

interface ParsedOntology {
  entities: Record<string, {
    properties: Record<string, any>
    relationships: Record<string, any>
  }>
}

interface LoadedOntology {
  id: string
  name: string
  file_name: string
  yaml_content: string
  version: number
  source: 'file' | 'database'
  created_at: string
  updated_at: string
}

const SAMPLE_YAML = `version: 0.1.0 
entities:
  Metadata:
    properties:
      name:
        type: str
        description: Form13_2023
      type:
        type: str
        description: financial_report
      about:
        type: str
        description: Form 13 Annual report containing company's financial statements and operations
        index: true
      filingDate:
        type: str
        description: Date in YYYY-MM-DD format
      context:
        type: str
        description: Contains high level information about the document processed
        index: true
    relationships:
      ABOUT_COMPANY:
        target: Company
        properties:
          name:
            type: str
            description: since
            unique: true
            required: false
  Company:
    properties:
      name:
        type: str
        description: Name of the Company
        unique: true
        required: true
      cik:
        type: str
        description: Cusip Identifier for Company
        unique: true
    relationships:
      HAS_BUSINESS:
        target: Business
      HAS_RISK_FACTOR:
        target: RiskFactor
      HAS_LEGAL_PROCEEDING:
        target: LegalProceeding
      HAS_MINE_SAFETY:
        target: MineSafety
  Business:
    properties:
      description:
        type: str
        description: General business description (10 words max)
      seasonality:
        type: str
        description: Business seasonality patterns (10 words max)
      employees:
        type: int
        description: Number of employees
      regulatoryEnvironment:
        type: str
        description: Regulatory framework description (10 words max)
    relationships:
      HAS_SEGMENT:
        target: BusinessSegment
      HAS_PRODUCT:
        target: Product
      HAS_COMPETITION:
        target: Company
      HAS_RAW_MATERIAL:
        target: RawMaterial
      HAS_INTELLECTUAL_PROPERTY:
        target: IntellectualProperty
  BusinessSegment:
    properties:
      name:
        type: str
        description: Name of the segment (3 words max)
        unique: true
        required: true
  Product:
    properties:
      name:
        type: str
        description: Name of the product (5 words max)
        unique: true
        required: true
  RawMaterial:
    properties:
      name:
        type: str
        description: Name of the raw material (1 word max)
        unique: true
        required: true
  IntellectualProperty:
    properties:
      name:
        type: str
        description: Name of the IntellectualProperty (5 words max)
        unique: true
        required: true
  RiskFactor:
    properties:
      name:
        type: str
        description: Risk factor name (5 words max)
        unique: true
        required: true
      description:
        type: str
        description: General risk description (10 words max)
      potentialImpact:
        type: str
        description: Potential impact of the risk on business (10 words max)
      mitigationStrategy:
        type: str
        description: Risk mitigation strategy (10 words max)
    relationships:
      HAS_RISK_CATEGORY:
        target: RiskCategory
  RiskCategory:
    properties:
      name:
        type: str
        description: Name of the Risk Category (5 words max)
        unique: true
        required: true
  LegalProceeding:
    properties:
      name:
        type: str
        description: Legal proceeding name (5 words max)
        unique: true
        required: true
      description:
        type: str
        description: Legal case description (10 words max)
      jurisdiction:
        type: str
        description: Legal jurisdiction (5 words max)
      status:
        type: str
        description: Current proceeding status (5 words max)
      potentialLiability:
        type: str
        description: Potential financial liability (5 words max)
      expectedResolution:
        type: str
        description: Expected resolution timeline (5 words max)
  MineSafety:
    properties:
      name:
        type: str
        description: Mine safety record name (5 words max)
        unique: true
        required: true
      violations:
        type: str
        description: Number of safety violations (5 words max)
      assessments:
        type: str
        description: Number of financial assessments or penalties (5 words max)
    relationships:
      HAS_CITATION:
        target: Citation
  Citation:
    properties:
      name:
        type: str
        description: Citation name (5 words max)
        unique: true
        required: true
      description:
        type: str
        description: Citation description (10 words max)`

function OntologyPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const { yaml, updateFromYaml } = useOntologyEditorStore()
  const { checkConfigBeforeWorkflow } = useUserConfig()
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('split')

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // New state for ontology management
  const [loadedOntology, setLoadedOntology] = useState<LoadedOntology | null>(null)
  const [isLoadingOntology, setIsLoadingOntology] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  
  // Filename editing state
  const [isEditingFilename, setIsEditingFilename] = useState(false)
  const [editingFilename, setEditingFilename] = useState('')
  const [ontologyTitle, setOntologyTitle] = useState('My Ontology')

  // Load existing ontology if ID is provided in URL
  useEffect(() => {
    const ontologyId = searchParams.get('id')
    if (ontologyId) {
      loadExistingOntology(ontologyId)
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track changes to YAML content and name
  useEffect(() => {
    if (loadedOntology) {
      const originalTitle = loadedOntology.name || loadedOntology.file_name.replace('.yaml', '')
      if (yaml !== loadedOntology.yaml_content || ontologyTitle !== originalTitle) {
        setHasUnsavedChanges(true)
      }
    } else if (!loadedOntology && (yaml !== SAMPLE_YAML && yaml.trim() !== '')) {
      setHasUnsavedChanges(true)
    }
  }, [yaml, loadedOntology, ontologyTitle])

  const loadExistingOntology = async (ontologyId: string) => {
    setIsLoadingOntology(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/v1/ontologies/${ontologyId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Ontology not found')
        }
        throw new Error('Failed to load ontology')
      }
      
      const ontologyData = await response.json()
      setLoadedOntology(ontologyData)
      setIsEditMode(true)
      setOntologyTitle(ontologyData.name || ontologyData.file_name.replace('.yaml', ''))
      updateFromYaml(ontologyData.yaml_content)
      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('Error loading ontology:', err)
      setError(err instanceof Error ? err.message : 'Failed to load ontology')
    } finally {
      setIsLoadingOntology(false)
    }
  }

  const handleStartEditingFilename = () => {
    setIsEditingFilename(true)
    setEditingFilename(ontologyTitle)
  }

  const handleSaveFilename = () => {
    const trimmedTitle = editingFilename.trim()
    if (trimmedTitle) {
      setOntologyTitle(trimmedTitle)
      setHasUnsavedChanges(true)
    }
    setIsEditingFilename(false)
  }

  const handleCancelEditingFilename = () => {
    setIsEditingFilename(false)
    setEditingFilename('')
  }

  const handleFilenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveFilename()
    } else if (e.key === 'Escape') {
      handleCancelEditingFilename()
    }
  }

  const handleContinue = async () => {
    if (!yaml.trim()) {
      setError('Please define your ontology before proceeding')
      return
    }

    // Check if user has database and AI configurations before proceeding
    const configCheck = checkConfigBeforeWorkflow()
    if (!configCheck.success) {
      if (configCheck.error) {
        setError(configCheck.error)
      }
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      let sessionId: string

      if (isEditMode && loadedOntology) {
        // Using an existing ontology
        if (hasUnsavedChanges) {
          // Save changes first (this will create a new version)
          await saveOntology()
        }
        // Use the existing ontology ID as session ID
        sessionId = loadedOntology.id
        debug('Using existing ontology ID as session:', sessionId)
      } else {
        // Creating a new ontology - need to create it first
        const response = await fetch('/api/v1/ontology', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: yaml,
            name: ontologyTitle
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to submit ontology')
        }

        const data = await response.json()
        debug('Ontology API response:', data)
        
        // Check if the backend returned an error
        if (data.status === 'error') {
          throw new Error(data.error || data.message || 'Failed to process ontology')
        }
        
        // The backend returns 'id' field, use that as session ID
        sessionId = data.id
        
        // Ensure we have a session ID
        if (!sessionId) {
          console.error('No session ID found in response. Available fields:', Object.keys(data))
          throw new Error(`No session ID received from server. Response: ${JSON.stringify(data)}`)
        }
        
        debug('Created new ontology with ID:', sessionId)
      }
      
      // Navigate to transform page with session ID
      router.push(`/transform?session_id=${sessionId}`)
    } catch (err) {
      console.error('Error submitting ontology:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const saveOntology = async () => {
    if (!yaml.trim()) {
      setError('Please define your ontology before saving')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // If editing existing ontology, use PUT; otherwise use POST
      if (isEditMode && loadedOntology) {
        // Update existing ontology
        const response = await fetch(`/api/v1/ontology/${loadedOntology.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: yaml,
            name: ontologyTitle
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to update ontology')
        }

        const data = await response.json()
        
        if (data.status === 'error') {
          throw new Error(data.error || data.message || 'Failed to update ontology')
        }

        // Update loaded ontology with new data
        setLoadedOntology(prev => prev ? {
          ...prev,
          name: ontologyTitle,
          file_name: `${ontologyTitle}.yaml`,
          yaml_content: yaml,
          updated_at: new Date().toISOString()
        } : null)
      } else {
        // Create new ontology
        const response = await fetch('/api/v1/ontology', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: yaml,
            name: ontologyTitle
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save ontology')
        }

        const data = await response.json()
        
        if (data.status === 'error') {
          throw new Error(data.error || data.message || 'Failed to save ontology')
        }
      }

      setHasUnsavedChanges(false)
      setError(null)

      // Show success message or toast here if needed
      debug('Ontology saved successfully')
      
    } catch (err) {
      console.error('Error saving ontology:', err)
      setError(err instanceof Error ? err.message : 'Failed to save ontology')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSave = async () => {
    await saveOntology()
  }

  const loadSampleYaml = useCallback(() => {
    updateFromYaml(SAMPLE_YAML)
    setOntologyTitle('Sample Ontology')
    setHasUnsavedChanges(false) // Reset unsaved changes when loading sample
  }, [updateFromYaml])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) {
        updateFromYaml(content)
        // Set filename from uploaded file, removing .yaml/.yml extension
        const filename = file.name.replace(/\.(yaml|yml)$/i, '')
        setOntologyTitle(filename)
      }
    }
    reader.readAsText(file)
  }, [updateFromYaml])

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

  const tools = [
    {
      id: 'run',
      icon: <Play className="h-4 w-4" />,
      label: 'Run',
      action: handleContinue,
      shortcut: '⌘R'
    },
    {
      id: 'code',
      icon: <Code2 className="h-4 w-4" />,
      label: 'Code View',
      action: () => setViewMode('code')
    },
    {
      id: 'visual',
      icon: <Grid2x2 className="h-4 w-4" />,
      label: 'Visual View',
      action: () => setViewMode('visual')
    },
    {
      id: 'split',
      icon: <SplitSquareVertical className="h-4 w-4" />,
      label: 'Split View',
      action: () => setViewMode('split')
    },
    {
      id: 'settings',
      icon: <Settings className="h-4 w-4" />,
      label: 'Settings',
      action: () => {}
    }
  ]

  // Define workflow steps
  const workflowSteps: WorkflowStep[] = [
    { 
      id: 'ontology', 
      title: 'Ontology', 
      description: 'Define your graph structure',
      status: 'current'
    },
    { 
      id: 'transform', 
      title: 'Extract & Transform', 
      description: 'Upload documents and extract knowledge',
      status: 'upcoming'
    },
    { 
      id: 'merge', 
      title: 'Merge to Prod', 
      description: 'Merge data into production database',
      status: 'upcoming'
    }
  ]

  const handleStepNavigation = (stepId: string) => {
    const routes: Record<string, string> = {
      'ontology': '/ontology',
      'transform': '/transform',
      'merge': '/merge'
    }
    
    if (routes[stepId]) {
      router.push(routes[stepId])
    }
  }

  return (
    <EnhancedWorkflowLayout 
      steps={workflowSteps} 
      currentStepId="ontology"
      hasUnsavedChanges={hasUnsavedChanges}
      projectTitle="Ontology Editor"
      onStepClick={handleStepNavigation}
    >
      <div className="flex-1 flex flex-col h-full">
        {/* Toolbar Header */}
        <div className="bg-transparent">
          <div className="px-6 pt-4 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/20 bg-white/65 px-5 py-4 shadow-[0_26px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-700/40 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-center gap-3">
                {isEditMode && (
                  <Link href="/ontologies">
                    <Button variant="ghost" size="sm" className="mr-1 text-muted-foreground hover:text-foreground">
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to Library
                    </Button>
                  </Link>
                )}
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <div className="flex items-center gap-2">
                    {isLoadingOntology ? (
                      <h2 className="text-lg font-semibold text-foreground">Loading Ontology...</h2>
                    ) : isEditingFilename ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingFilename}
                          onChange={(e) => setEditingFilename(e.target.value)}
                          onKeyDown={handleFilenameKeyDown}
                          className="text-lg font-semibold h-8 px-2 py-1 w-64"
                          placeholder="Enter ontology name..."
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={handleSaveFilename}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={handleCancelEditingFilename}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <h2 className="text-lg font-semibold text-foreground">
                          {isEditMode ? `Edit: ${ontologyTitle}` : ontologyTitle}
                        </h2>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={handleStartEditingFilename}
                          title="Edit filename"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isEditMode && loadedOntology
                      ? `Version ${loadedOntology.version} • ${loadedOntology.source === 'file' ? 'File System' : 'Database'}`
                      : 'Define your knowledge graph structure using YAML or visual editor'
                    }
                  </p>
                </div>
                {hasUnsavedChanges && (
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-xs font-medium">Unsaved changes</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isEditMode && (
                  <Button 
                    onClick={handleSave} 
                    disabled={!yaml.trim() || isSubmitting || !hasUnsavedChanges}
                    size="sm"
                    variant="outline"
                    className="border-white/30 text-foreground/90 hover:bg-white/30 dark:border-slate-600/60 dark:text-slate-100"
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                )}

                <Button 
                  onClick={handleContinue} 
                  disabled={!yaml.trim() || isSubmitting}
                  size="sm"
                  variant="cta"
                  className="shadow-[0_20px_40px_rgba(14,116,144,0.32)]"
                >
                  <Play className="h-4 w-4 mr-1.5" />
                  {isSubmitting ? 'Processing...' : (isEditMode ? 'Use for Transform' : 'Submit')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content Area - Make it scrollable */}
        <div className="flex-1 overflow-auto">
          <ResizablePanelGroup direction="horizontal" className="gap-2 px-6 pb-6">
            <ResizablePanel
              defaultSize={25}
              minSize={25}
              maxSize={60}
              className="flex"
            >
              <div className="enhanced-card h-full w-full flex flex-col overflow-hidden border border-white/20 dark:border-slate-700/45 shadow-[0_32px_72px_rgba(15,23,42,0.16)]">
                <div className="relative flex items-center justify-between px-4 py-3 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl sticky top-0 z-20 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/45 after:to-transparent dark:after:via-white/15">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <div className="bg-primary/5 w-5 h-5 rounded flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1.40594 0C0.629627 0 0 0.629627 0 1.40594V13.5941C0 14.3704 0.629627 15 1.40594 15H3.2013C3.97761 15 4.60724 14.3704 4.60724 13.5941V1.40594C4.60724 0.629627 3.97761 0 3.2013 0H1.40594ZM3.45161 1.64516C3.45161 1.75305 3.36434 1.84032 3.25645 1.84032H1.35079C1.24289 1.84032 1.15563 1.75305 1.15563 1.64516V1.29563C1.15563 1.18774 1.24289 1.10047 1.35079 1.10047H3.25645C3.36434 1.10047 3.45161 1.18774 3.45161 1.29563V1.64516ZM3.25645 2.94079H1.35079C1.24289 2.94079 1.15563 3.02805 1.15563 3.13595V3.48547C1.15563 3.59337 1.24289 3.68063 1.35079 3.68063H3.25645C3.36434 3.68063 3.45161 3.59337 3.45161 3.48547V3.13595C3.45161 3.02805 3.36434 2.94079 3.25645 2.94079ZM3.25645 4.78111H1.35079C1.24289 4.78111 1.15563 4.86837 1.15563 4.97626V5.32579C1.15563 5.43368 1.24289 5.52095 1.35079 5.52095H3.25645C3.36434 5.52095 3.45161 5.43368 3.45161 5.32579V4.97626C3.45161 4.86837 3.36434 4.78111 3.25645 4.78111ZM13.5941 0C14.3704 0 15 0.629627 15 1.40594V13.5941C15 14.3704 14.3704 15 13.5941 15H6.95161C6.17529 15 5.54567 14.3704 5.54567 13.5941V1.40594C5.54567 0.629627 6.17529 0 6.95161 0H13.5941ZM10.9695 7.50047C12.0816 7.50047 12.9853 6.59677 12.9853 5.48453C12.9853 4.37229 12.0816 3.46859 10.9695 3.46859C9.85724 3.46859 8.95354 4.37229 8.95354 5.48453C8.95354 6.59677 9.85724 7.50047 10.9695 7.50047ZM13.3226 9.92905C13.3226 9.17811 12.6083 8.46374 11.8574 8.46374H10.0816C9.33066 8.46374 8.61629 9.17811 8.61629 9.92905V13.9839H13.3226V9.92905Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium">Entities</span>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 bg-white/60 backdrop-blur-sm hover:bg-white/70 dark:bg-slate-800/70 dark:hover:bg-slate-700/70 shadow-soft"
                      onClick={loadSampleYaml}
                      title="Load Sample Ontology"
                    >
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM1.82707 7.49972C1.82707 4.36671 4.36689 1.82689 7.49991 1.82689C10.6329 1.82689 13.1727 4.36671 13.1727 7.49972C13.1727 10.6327 10.6329 13.1726 7.49991 13.1726C4.36689 13.1726 1.82707 10.6327 1.82707 7.49972ZM7.50003 4C7.77617 4 8.00003 4.22386 8.00003 4.5V7H10.5C10.7762 7 11 7.22386 11 7.5C11 7.77614 10.7762 8 10.5 8H7.50003C7.22389 8 7.00003 7.77614 7.00003 7.5V4.5C7.00003 4.22386 7.22389 4 7.50003 4Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
                      </svg>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 bg-white/60 backdrop-blur-sm hover:bg-white/70 dark:bg-slate-800/70 dark:hover:bg-slate-700/70 shadow-soft"
                      onClick={() => setIsCommandPaletteOpen(true)}
                      title="Search Entities"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-3 p-4">
                    <EntityList onLoadSample={loadSampleYaml} />
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>
            <ResizableHandle className="w-1 bg-transparent after:bg-gradient-to-b after:from-transparent after:via-white/40 after:to-transparent dark:after:via-white/15" />
            <ResizablePanel defaultSize={75} className="flex">
              <div className="enhanced-card h-full w-full flex flex-col overflow-hidden border border-white/20 dark:border-slate-700/45 shadow-[0_32px_72px_rgba(15,23,42,0.16)]">
                <div className="relative flex flex-wrap items-center gap-4 px-4 py-3 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl sticky top-0 z-20 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/45 after:to-transparent dark:after:via-white/15">
                  <div className="flex items-center gap-2 text-foreground">
                    <div className="bg-primary/5 w-5 h-5 rounded flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3.94993 2.95002L3.94993 4.49998C3.94993 4.74851 3.74845 4.94998 3.49993 4.94998C3.2514 4.94998 3.04993 4.74851 3.04993 4.49998V2.49998C3.04993 2.45565 3.05698 2.41268 3.06997 2.37194C3.09608 2.28868 3.1462 2.21526 3.21386 2.15795C3.23285 2.14099 3.25313 2.12618 3.27449 2.11351C3.32415 2.08558 3.38185 2.06943 3.44214 2.06595C3.4609 2.06489 3.47993 2.06489 3.49993 2.06595C3.51993 2.06489 3.53896 2.06489 3.55772 2.06595C3.61802 2.06943 3.67571 2.08558 3.72537 2.11351C3.74673 2.12618 3.76701 2.14099 3.786 2.15795C3.85366 2.21526 3.90378 2.28868 3.92989 2.37194C3.94288 2.41268 3.94993 2.45565 3.94993 2.49998V2.95002ZM3.94993 4.49998V2.95002L3.94993 4.49998ZM1.99993 2.49998C1.99993 1.94769 2.44764 1.49998 2.99993 1.49998H11.9999C12.5522 1.49998 12.9999 1.94769 12.9999 2.49998V12.5C12.9999 13.0522 12.5522 13.5 11.9999 13.5H2.99993C2.44764 13.5 1.99993 13.0522 1.99993 12.5V2.49998ZM2.99993 2.49998L2.94993 2.49998C2.9222 2.49998 2.89993 2.52224 2.89993 2.54998L2.89993 12.45C2.89993 12.4777 2.9222 12.5 2.94993 12.5H11.9999C12.0277 12.5 12.0499 12.4777 12.0499 12.45V2.54998C12.0499 2.52224 12.0277 2.49998 11.9999 2.49998H10.4999C10.2514 2.49998 10.0499 2.2985 10.0499 2.04998C10.0499 1.80146 10.2514 1.59998 10.4999 1.59998H11.9999C12.5522 1.59998 12.9999 2.04769 12.9999 2.59998V12.4C12.9999 12.9522 12.5522 13.4 11.9999 13.4H2.99993C2.44764 13.4 1.99993 12.9522 1.99993 12.4V2.59998C1.99993 2.04769 2.44764 1.59998 2.99993 1.59998H4.49993C4.74845 1.59998 4.94993 1.80146 4.94993 2.04998C4.94993 2.2985 4.74845 2.49998 4.49993 2.49998H2.99993ZM6.82899 5.12621L5.12434 10.1281C5.04468 10.3637 4.78353 10.4996 4.54797 10.4199C4.31241 10.3403 4.17654 10.0791 4.2562 9.84357L5.96085 4.84167C6.04051 4.60611 6.30165 4.47024 6.53721 4.5499C6.77277 4.62956 6.90865 4.89071 6.82899 5.12621ZM8.31378 9.4394L10.1566 7.50002L8.31378 5.56063C8.13641 5.37325 8.1455 5.0803 8.33288 4.90293C8.52026 4.72556 8.81321 4.73465 8.99058 4.92202L11.1906 7.23072C11.3638 7.41434 11.3638 7.58569 11.1906 7.76931L8.99058 10.078C8.81321 10.2654 8.52026 10.2745 8.33288 10.0971C8.1455 9.91974 8.13641 9.62678 8.31378 9.4394Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium">Editor</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 ml-auto text-foreground/80">
                    <label>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7 bg-white/60 hover:bg-white/70 dark:bg-slate-800/70 dark:hover:bg-slate-700/70 shadow-soft"
                        title="Upload YAML File"
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                      <input
                        type="file"
                        accept=".yaml,.yml"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>

                    <Tabs
                      value={viewMode}
                      onValueChange={(value) => setViewMode(value as ViewMode)}
                      className="hidden sm:block flex-1"
                    >
                      <TabsList className="w-full grid grid-cols-3 bg-white/55 px-1.5 py-1 backdrop-blur-lg shadow-[0_12px_28px_rgba(15,23,42,0.16)] dark:bg-slate-900/70 dark:ring-1 dark:ring-slate-700/55">
                        <TabsTrigger value="code">
                          <span className="flex items-center gap-2">
                            <Code2 className="h-4 w-4" />
                            Code
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="visual">
                          <span className="flex items-center gap-2">
                            <Grid2x2 className="h-4 w-4" />
                            Visual
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="split">
                          <span className="flex items-center gap-2">
                            <SplitSquareVertical className="h-4 w-4" />
                            Split
                          </span>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  {viewMode === 'split' ? (
                    <div className="h-full w-full rounded-[24px] bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-[0_26px_60px_rgba(15,23,42,0.12)]">
                      <div className="grid h-full grid-cols-2">
                        <div className="relative h-full overflow-auto p-4 after:absolute after:top-4 after:bottom-4 after:right-0 after:w-px after:bg-gradient-to-b after:from-transparent after:via-white/45 after:to-transparent dark:after:via-white/20">
                          <YAMLEditor
                            value={yaml}
                            onChange={(value) => {
                              updateFromYaml(value)
                            }}
                          />
                        </div>
                        <div className="h-full overflow-auto p-4">
                          <VisualEditor />
                        </div>
                      </div>
                    </div>
                  ) : viewMode === 'code' ? (
                    <div className="h-full w-full rounded-[24px] border border-white/18 dark:border-slate-700/45 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-[0_26px_60px_rgba(15,23,42,0.12)] p-4">
                      <YAMLEditor 
                        value={yaml} 
                        onChange={(value) => {
                          updateFromYaml(value)
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-full w-full rounded-[24px] border border-white/18 dark:border-slate-700/45 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-[0_26px_60px_rgba(15,23,42,0.12)] p-4">
                      <div className="h-full overflow-auto">
                        <VisualEditor />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </EnhancedWorkflowLayout>
  )
}

export default function OntologyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OntologyPageContent />
    </Suspense>
  )
}
