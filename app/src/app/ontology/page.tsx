'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { YAMLEditor } from '@/components/ontology/yaml-editor'
import { EntityList } from '@/components/ontology/entity-list'
import { useOntologyEditorStore } from '@/lib/store/ontology-editor-store'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { WorkflowLayout } from '@/components/workflow-layout'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Upload, Play, Save, Code2, Grid2x2, SplitSquareVertical, Settings } from 'lucide-react'
import { AIAssistantPanel } from '@/components/ai-assistant/ai-assistant-panel'
import { VisualEditor } from '@/components/ontology/visual-editor'
import { type AIAssistantState } from '@/lib/types/ai-assistant'

type ViewMode = 'code' | 'visual' | 'split'

const SAMPLE_YAML = `sections:
  Metadata:
  PartI:
    - Business
    - RiskFactor
    - LegalProceeding
    - MineSafety

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
      HAS_PART1:
        target: PartI
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
  PartI:
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
        description: General business description
      seasonality:
        type: str
        description: Business seasonality patterns
      employees:
        type: int
        description: Number of employees
      regulatoryEnvironment:
        type: str
        description: Regulatory framework description
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
        description: Name of the segment
        unique: true
        required: true
  Product:
    properties:
      name:
        type: str
        description: Name of the product
        unique: true
        required: true
  RawMaterial:
    properties:
      name:
        type: str
        description: Name of the raw material
        unique: true
        required: true
  IntellectualProperty:
    properties:
      name:
        type: str
        description: Name of the IntellectualProperty
        unique: true
        required: true
  RiskFactor:
    properties:
      name:
        type: str
        description: Risk factor name
        unique: true
        required: true
      description:
        type: str
        description: General risk description
      potentialImpact:
        type: str
        description: Potential impact of the risk on business
      mitigationStrategy:
        type: str
        description: Risk mitigation strategy
    relationships:
      HAS_RISK_CATEGORY:
        target: RiskCategory
  RiskCategory:
    properties:
      name:
        type: str
        description: Name of the Risk Category
        unique: true
        required: true
  LegalProceeding:
    properties:
      name:
        type: str
        description: Legal proceeding name
        unique: true
        required: true
      description:
        type: str
        description: Legal case description
      jurisdiction:
        type: str
        description: Legal jurisdiction
      status:
        type: str
        description: Current proceeding status
      potentialLiability:
        type: str
        description: Potential financial liability
      expectedResolution:
        type: str
        description: Expected resolution timeline
  MineSafety:
    properties:
      name:
        type: str
        description: Mine safety record name
        unique: true
        required: true
      violations:
        type: str
        description: Number of safety violations
      assessments:
        type: str
        description: Number of financial assessments or penalties
    relationships:
      HAS_CITATION:
        target: Citation
  Citation:
    properties:
      name:
        type: str
        description: Citation name
        unique: true
        required: true
      description:
        type: str
        description: Citation description`

export default function OntologyPage() {
  const router = useRouter()
  const { user } = useUser()
  const { yaml, updateFromYaml } = useOntologyEditorStore()
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [aiAssistantState, setAiAssistantState] = useState<AIAssistantState>({
    isExpanded: false,
    isCompact: true,
    suggestions: [
      {
        id: '1',
        priority: 'high' as const,
        type: 'pattern' as const,
        content: {
          title: 'Add Timestamps to Entities',
          description: 'Consider adding created_at and updated_at fields to track entity changes.',
          impact: 'Improves auditability and helps track data lineage.',
          confidence: 0.9
        }
      }
    ],
    activePatterns: [
      {
        id: 'p1',
        name: 'Timestamp Pattern',
        description: 'Add created_at and updated_at fields',
        confidence: 0.9,
        type: 'domain' as const,
        matches: [
          {
            path: 'entities.User',
            score: 0.9
          }
        ]
      }
    ],
    qualityMetrics: {
      score: 85,
      components: {
        completeness: 80,
        consistency: 90,
        optimization: 85,
        bestPractices: 85
      },
      improvements: [],
      history: [
        {
          id: '1',
          timestamp: Date.now(),
          score: 85
        }
      ]
    }
  })

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const handleSubmit = async () => {
    if (!yaml.trim()) {
      setError('Please define your ontology before proceeding')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Call ontology API to create session
      const response = await fetch('/api/ontology', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: yaml
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create ontology session')
      }

      const { id } = await response.json()
      
      // Redirect to transform page with session_id
      router.push(`/transform?session_id=${id}`)
    } catch (error) {
      console.error('Error creating ontology session:', error)
      setError('Failed to create ontology session. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadSampleYaml = useCallback(() => {
    updateFromYaml(SAMPLE_YAML)
    setHasUnsavedChanges(true)
  }, [updateFromYaml])

  const handleSave = useCallback(() => {
    // TODO: Implement save
    console.log('Saving...')
    setHasUnsavedChanges(false)
  }, [])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) {
        updateFromYaml(content)
        setHasUnsavedChanges(true)
      }
    }
    reader.readAsText(file)
  }, [updateFromYaml])

  const handleApplySuggestion = useCallback((id: string) => {
    const suggestion = aiAssistantState.suggestions.find(s => s.id === id)
    if (!suggestion?.content) return
    
    // TODO: Implement applying suggestion
    console.log('Applying suggestion:', suggestion.content)
  }, [aiAssistantState.suggestions])

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
    const suggestion = aiAssistantState.suggestions.find(s => s.id === id)
    if (!suggestion?.content) return
    
    // TODO: Implement customizing suggestion
    console.log('Customizing suggestion:', suggestion.content)
  }, [aiAssistantState.suggestions])

  const tools = [
    {
      id: 'run',
      icon: <Play className="h-4 w-4" />,
      label: 'Run',
      action: handleSubmit,
      shortcut: '⌘R'
    },
    {
      id: 'save',
      icon: <Save className="h-4 w-4" />,
      label: 'Save',
      action: handleSave,
      shortcut: '⌘S'
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

  return (
    <WorkflowLayout hasUnsavedChanges={hasUnsavedChanges}>
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <div className="h-14 flex items-center justify-between px-4 border-b">
            <div className="font-medium">Ontology Editor</div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>Loading...</>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Submit Ontology
                  </>
                )}
              </Button>
            </div>
          </div>
          {error && (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex-1 flex">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel
                defaultSize={25}
                minSize={20}
                maxSize={40}
                className="min-w-[250px]"
              >
                <div className="h-full border-r">
                  <div className="h-14 flex items-center justify-between px-4 border-b">
                    <div className="font-medium">Entities</div>
                    <Button variant="ghost" size="icon" onClick={() => setIsCommandPaletteOpen(true)}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="h-[calc(100%-3.5rem)]">
                    <div className="p-4 space-y-4">
                      <EntityList onLoadSample={loadSampleYaml} />
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={75}>
                <div className="h-full">
                  <div className="h-14 flex items-center justify-between px-4 border-b">
                    <div className="font-medium">Schema Editor</div>
                    <div className="flex items-center gap-2">
                      <label>
                        <Button variant="ghost" size="sm">
                          <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Import
                          </div>
                        </Button>
                        <input
                          type="file"
                          accept=".yaml,.yml"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="h-[calc(100%-3.5rem)]">
                    {viewMode === 'split' ? (
                      <div className="grid grid-cols-2 h-full">
                        <div className="h-full p-4 border-r">
                          <YAMLEditor 
                            value={yaml} 
                            onChange={(value) => {
                              updateFromYaml(value)
                              setHasUnsavedChanges(true)
                            }} 
                          />
                        </div>
                        <div className="h-full p-4">
                          <VisualEditor />
                        </div>
                      </div>
                    ) : viewMode === 'code' ? (
                      <div className="h-full p-4">
                        <YAMLEditor 
                          value={yaml} 
                          onChange={(value) => {
                            updateFromYaml(value)
                            setHasUnsavedChanges(true)
                          }} 
                        />
                      </div>
                    ) : (
                      <div className="h-full p-4">
                        <VisualEditor />
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
        <AIAssistantPanel
          state={aiAssistantState}
          onStateChange={(newState) => {
            setAiAssistantState(prev => ({
              ...prev,
              ...newState
            }))
          }}
          onApplySuggestion={handleApplySuggestion}
          onDismissSuggestion={handleDismissSuggestion}
          onExplainSuggestion={handleExplainSuggestion}
          onCustomizeSuggestion={handleCustomizeSuggestion}
        />
      </div>
    </WorkflowLayout>
  )
}