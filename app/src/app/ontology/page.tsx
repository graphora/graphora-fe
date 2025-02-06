'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { VisualEditor } from '@/components/ontology/visual-editor'
import { YAMLEditor } from '@/components/ontology/yaml-editor'
import { useOntologyEditorStore } from '@/lib/store/ontology-editor-store'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Toolbar } from '@/components/command-center/toolbar'
import { ResizablePanel } from '@/components/command-center/resizable-panel'
import { CommandPalette } from '@/components/command-center/command-palette'
import { AIAssistantPanel } from '@/components/ai-assistant/ai-assistant-panel'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { type ViewMode } from '@/lib/types/command-center'
import { type AIAssistantState } from '@/lib/types/ai-assistant'
import { 
  Play, Save, Code2, Grid2x2, 
  SplitSquareVertical, Settings,
  Database, GitBranch
} from 'lucide-react'

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
  const [activeView, setActiveView] = useState<ViewMode>('split')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [aiAssistantState, setAiAssistantState] = useState<AIAssistantState>({
    isExpanded: true,
    isCompact: false,
    suggestions: [
      {
        id: '1',
        priority: 'high',
        type: 'pattern',
        content: {
          title: 'Add Timestamps to Entities',
          description: 'Consider adding created_at and updated_at fields to track entity changes.',
          impact: 'Improves auditability and helps track data lineage.',
          confidence: 0.9
        }
      },
      {
        id: '2',
        priority: 'medium',
        type: 'improvement',
        content: {
          title: 'Normalize Property Names',
          description: 'Use consistent casing (snake_case) for property names.',
          impact: 'Enhances code readability and maintainability.',
          confidence: 0.8
        }
      }
    ],
    activePatterns: [
      {
        id: '1',
        name: 'Temporal Pattern',
        description: 'Track entity changes over time using timestamp fields.',
        confidence: 0.9,
        type: 'domain',
        matches: [
          { path: 'entities.user', score: 0.9 },
          { path: 'entities.post', score: 0.85 }
        ]
      }
    ],
    qualityMetrics: {
      score: 75,
      components: {
        completeness: 80,
        consistency: 70,
        optimization: 75,
        bestPractices: 75
      },
      improvements: [],
      history: [
        { timestamp: Date.now() - 3600000, score: 70 },
        { timestamp: Date.now(), score: 75 }
      ]
    }
  })

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
  }, [updateFromYaml])

  const handleSave = useCallback(() => {
    // TODO: Implement save
    console.log('Saving...')
  }, [])

  const handleApplySuggestion = useCallback((id: string) => {
    // TODO: Implement applying suggestion
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
    // TODO: Implement customizing suggestion
    console.log('Customizing suggestion:', id)
  }, [])

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
      action: () => setActiveView('code')
    },
    {
      id: 'visual',
      icon: <Grid2x2 className="h-4 w-4" />,
      label: 'Visual View',
      action: () => setActiveView('visual')
    },
    {
      id: 'split',
      icon: <SplitSquareVertical className="h-4 w-4" />,
      label: 'Split View',
      action: () => setActiveView('split')
    },
    {
      id: 'settings',
      icon: <Settings className="h-4 w-4" />,
      label: 'Settings',
      action: () => {}
    }
  ]

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    focusEditor: () => {
      // TODO: Focus editor
    },
    runQuery: handleSubmit,
    saveChanges: handleSave,
    toggleSidebar: () => {
      setSidebarWidth(prev => prev === 0 ? 320 : 0)
    },
    commandPalette: () => setIsCommandPaletteOpen(true),
    findInEditor: () => {
      // TODO: Implement find
    }
  })

  return (
    <div className="command-center">
      <ResizablePanel
        defaultWidth={320}
        onResize={setSidebarWidth}
      >
        <div className="h-full bg-white text-black">
          <div className="panel-header">
            <span>Project Explorer</span>
          </div>
          <div className="p-4">
            <div className="control-group">
              <div className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4" />
                <span>Data Sources</span>
              </div>
            </div>
            <div className="control-group">
              <div className="flex items-center gap-2 text-sm">
                <GitBranch className="h-4 w-4" />
                <span>Version Control</span>
              </div>
            </div>
            <div className="control-group">
              <div className="flex items-center gap-2 text-sm">
                <Button 
                  variant="outline" 
                  onClick={loadSampleYaml}
                  className="w-full"
                >
                  Load Sample
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ResizablePanel>

      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar tools={tools} />

        <div className="flex-1 p-4 bg-white">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="h-full">
            {activeView === 'split' ? (
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="h-full">
                  <YAMLEditor 
                    value={yaml} 
                    onChange={updateFromYaml}
                  />
                </div>
                <div className="h-full">
                  <VisualEditor />
                </div>
              </div>
            ) : activeView === 'code' ? (
              <YAMLEditor 
                value={yaml} 
                onChange={updateFromYaml}
              />
            ) : (
              <VisualEditor />
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
        commands={tools}
      />
    </div>
  )
}