'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  Loader2, 
  Brain, 
  Settings2, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Zap,
  RefreshCw,
  HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'

// Types for chunking configuration
interface ChunkingStrategy {
  value: string
  name: string
  description: string
  best_for: string[]
  pros: string[]
  cons: string[]
}

interface ChunkingConfig {
  strategy: 'semantic' | 'structural' | 'recursive' | 'hybrid'
  min_chunk_size: number
  max_chunk_size: number
  semantic_threshold?: number
  preserve_lists?: boolean
  preserve_headings?: boolean
  preserve_quotes?: boolean
  chunk_overlap?: number
  force_strategy?: boolean
  quality_threshold?: number
}

interface DocumentAnalysis {
  document_type: string
  recommended_strategy: string
  confidence_score: number
  recommended_config: ChunkingConfig
  document_stats: {
    total_characters: number
    total_words: number
    total_lines: number
    has_headings: boolean
    has_lists: boolean
    has_quotes: boolean
    complexity_score: number
  }
  chunking_estimate: {
    estimated_chunks: number
    avg_chunk_size: number
    processing_time_estimate: string
    memory_estimate: string
  }
  alternative_configs: Record<string, ChunkingConfig>
}

interface ChunkingConfigProps {
  fileContent?: string
  fileName?: string
  onConfigChange: (config: ChunkingConfig | null) => void
  className?: string
}

const DEFAULT_CONFIG: ChunkingConfig = {
  strategy: 'hybrid',
  min_chunk_size: 500,
  max_chunk_size: 3000,
  semantic_threshold: 0.7,
  preserve_lists: true,
  preserve_headings: true,
  preserve_quotes: true,
  chunk_overlap: 200,
  force_strategy: false,
  quality_threshold: 0.6
}

const STRATEGY_INFO: Record<string, ChunkingStrategy> = {
  semantic: {
    value: 'semantic',
    name: 'Semantic Chunking',
    description: 'Splits text based on semantic similarity using embeddings',
    best_for: ['Long narrative documents', 'Articles', 'Books'],
    pros: ['Maintains semantic coherence', 'Good for continuous text'],
    cons: ['Ignores document structure', 'Computationally expensive']
  },
  structural: {
    value: 'structural',
    name: 'Structural Chunking',
    description: 'Preserves document structure like headings, lists, and quotes',
    best_for: ['Structured documents', 'Documentation', 'Lists and outlines'],
    pros: ['Preserves formatting', 'Fast processing', 'Good for extraction'],
    cons: ['May create uneven chunk sizes', 'Less semantic awareness']
  },
  recursive: {
    value: 'recursive',
    name: 'Recursive Character Splitting',
    description: 'Splits text using hierarchical separators with overlap',
    best_for: ['Technical documents', 'Code documentation', 'Mixed content'],
    pros: ['Consistent chunk sizes', 'Good overlap handling', 'Versatile'],
    cons: ['May break semantic units', 'Less structure awareness']
  },
  hybrid: {
    value: 'hybrid',
    name: 'Hybrid Chunking (Recommended)',
    description: 'Automatically selects best strategy based on document type',
    best_for: ['All document types', 'Unknown content', 'Mixed collections'],
    pros: ['Adaptive', 'Best of all strategies', 'Intelligent'],
    cons: ['Slightly more complex', 'May need fine-tuning']
  }
}

export function ChunkingConfig({ fileContent, fileName, onConfigChange, className }: ChunkingConfigProps) {
  const [config, setConfig] = useState<ChunkingConfig>(DEFAULT_CONFIG)
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [useCustomConfig, setUseCustomConfig] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Update parent when config changes
  useEffect(() => {
    if (useCustomConfig || analysis) {
      onConfigChange(config)
    } else {
      onConfigChange(null) // Use default chunking
    }
  }, [config, useCustomConfig, analysis, onConfigChange])

  // Validate configuration
  useEffect(() => {
    if (config.min_chunk_size >= config.max_chunk_size) {
      setValidationError('Minimum chunk size must be less than maximum chunk size')
    } else if (config.min_chunk_size < 100) {
      setValidationError('Minimum chunk size must be at least 100 characters')
    } else if (config.max_chunk_size > 50000) {
      setValidationError('Maximum chunk size must not exceed 50,000 characters')
    } else {
      setValidationError(null)
    }
  }, [config])

  const handleAnalyzeDocument = async () => {
    if (!fileContent) {
      toast.error('No document content available for analysis')
      return
    }

    setIsAnalyzing(true)
    setValidationError(null)

    try {
      const response = await fetch('/api/v1/chunking/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: fileContent }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to analyze document')
      }

      const analysisResult: DocumentAnalysis = await response.json()
      setAnalysis(analysisResult)
      setConfig(analysisResult.recommended_config)
      setUseCustomConfig(true)
      
      toast.success(`Document analyzed! Recommended strategy: ${analysisResult.recommended_strategy}`)
    } catch (error) {
      console.error('Error analyzing document:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to analyze document')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleConfigChange = (key: keyof ChunkingConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleStrategyChange = (strategy: string) => {
    const newStrategy = strategy as ChunkingConfig['strategy']
    
    // Apply strategy-specific defaults when switching
    let strategyDefaults: Partial<ChunkingConfig> = {}
    
    switch (newStrategy) {
      case 'structural':
        strategyDefaults = {
          min_chunk_size: 300,
          max_chunk_size: 2000,
          preserve_lists: true,
          preserve_headings: true,
          preserve_quotes: true
        }
        break
      case 'semantic':
        strategyDefaults = {
          min_chunk_size: 1000,
          max_chunk_size: 4000,
          semantic_threshold: 0.75,
          chunk_overlap: 150
        }
        break
      case 'recursive':
        strategyDefaults = {
          min_chunk_size: 800,
          max_chunk_size: 3500,
          chunk_overlap: 250,
          preserve_headings: true
        }
        break
      case 'hybrid':
        strategyDefaults = {
          min_chunk_size: 500,
          max_chunk_size: 3000,
          semantic_threshold: 0.7,
          preserve_lists: true,
          preserve_headings: true,
          preserve_quotes: true,
          chunk_overlap: 200
        }
        break
    }
    
    setConfig(prev => ({ ...prev, strategy: newStrategy, ...strategyDefaults }))
  }

  const resetToDefault = () => {
    setConfig(DEFAULT_CONFIG)
    setAnalysis(null)
    setUseCustomConfig(false)
    setShowAdvanced(false)
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400'
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'structured': return '📋'
      case 'narrative': return '📖'
      case 'technical': return '⚙️'
      case 'mixed': return '📚'
      default: return '📄'
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Settings2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Chunking Configuration</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Configure how your document is split for processing
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyzeDocument}
            disabled={isAnalyzing || !fileContent}
            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-3 w-3 mr-1.5" />
                Analyze Document
              </>
            )}
          </Button>
        </div>

        {/* Analysis Progress */}
        {isAnalyzing && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Progress value={66} className="flex-1 h-2" />
              <span className="text-xs text-muted-foreground">Analyzing...</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Detecting document structure and content patterns</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getDocumentTypeIcon(analysis.document_type)}</span>
                <div>
                  <h4 className="font-medium text-sm">Document Analysis</h4>
                  <p className="text-xs text-muted-foreground">
                    Type: <span className="font-medium capitalize">{analysis.document_type}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getConfidenceColor(analysis.confidence_score)}`}>
                  {Math.round(analysis.confidence_score * 100)}% Confidence
                </div>
                <p className="text-xs text-muted-foreground">Recommendation accuracy</p>
              </div>
            </div>

            {/* Document Stats */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Characters:</span>
                  <span className="font-medium">{analysis.document_stats.total_characters.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Words:</span>
                  <span className="font-medium">{analysis.document_stats.total_words.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Chunks:</span>
                  <span className="font-medium">{analysis.chunking_estimate.estimated_chunks}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Has Lists:</span>
                  <span className={analysis.document_stats.has_lists ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                    {analysis.document_stats.has_lists ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Has Headings:</span>
                  <span className={analysis.document_stats.has_headings ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                    {analysis.document_stats.has_headings ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processing:</span>
                  <span className="font-medium">{analysis.chunking_estimate.processing_time_estimate}</span>
                </div>
              </div>
            </div>

            {/* Recommended Strategy Badge */}
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Recommended: {STRATEGY_INFO[analysis.recommended_strategy]?.name || analysis.recommended_strategy}
              </Badge>
            </div>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {/* Configuration Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${useCustomConfig ? 'bg-blue-500' : 'bg-gray-400'}`} />
            <div>
              <p className="text-sm font-medium">
                {useCustomConfig ? 'Custom Configuration' : 'Default Configuration'}
              </p>
              <p className="text-xs text-muted-foreground">
                {useCustomConfig ? 'Using custom chunking settings' : 'Using system defaults'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={useCustomConfig}
              onCheckedChange={setUseCustomConfig}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {useCustomConfig ? 'On' : 'Off'}
            </span>
          </div>
        </div>

        {/* Configuration Form */}
        {useCustomConfig && (
          <div className="space-y-4 p-4 border rounded-lg bg-card">
            {/* Strategy Selection */}
            <div className="space-y-2">
              <Label htmlFor="strategy" className="text-sm font-medium">Chunking Strategy</Label>
              <Select value={config.strategy} onValueChange={handleStrategyChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(STRATEGY_INFO).map((strategy) => (
                    <SelectItem key={strategy.value} value={strategy.value}>
                      <div className="flex items-center space-x-2">
                        <span>{strategy.name}</span>
                        {analysis?.recommended_strategy === strategy.value && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Recommended
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Strategy Description */}
              <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded border">
                <p className="mb-2">{STRATEGY_INFO[config.strategy]?.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400 mb-1">Pros:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {STRATEGY_INFO[config.strategy]?.pros.map((pro, index) => (
                        <li key={index}>{pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Best for:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {STRATEGY_INFO[config.strategy]?.best_for.map((use, index) => (
                        <li key={index}>{use}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_chunk_size" className="text-sm">Min Chunk Size</Label>
                <Input
                  id="min_chunk_size"
                  type="number"
                  min="100"
                  max="10000"
                  value={config.min_chunk_size}
                  onChange={(e) => handleConfigChange('min_chunk_size', parseInt(e.target.value))}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Minimum characters per chunk</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_chunk_size" className="text-sm">Max Chunk Size</Label>
                <Input
                  id="max_chunk_size"
                  type="number"
                  min="500"
                  max="50000"
                  value={config.max_chunk_size}
                  onChange={(e) => handleConfigChange('max_chunk_size', parseInt(e.target.value))}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Maximum characters per chunk</p>
              </div>
            </div>

            {/* Strategy-specific settings */}
            {(config.strategy === 'semantic' || config.strategy === 'hybrid') && (
              <div className="space-y-2">
                <Label htmlFor="semantic_threshold" className="text-sm">Semantic Threshold</Label>
                <Input
                  id="semantic_threshold"
                  type="number"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={config.semantic_threshold || 0.7}
                  onChange={(e) => handleConfigChange('semantic_threshold', parseFloat(e.target.value))}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Similarity threshold for semantic chunking (0.1-1.0)</p>
              </div>
            )}

            {(config.strategy === 'recursive' || config.strategy === 'hybrid') && (
              <div className="space-y-2">
                <Label htmlFor="chunk_overlap" className="text-sm">Chunk Overlap</Label>
                <Input
                  id="chunk_overlap"
                  type="number"
                  min="0"
                  max="500"
                  value={config.chunk_overlap || 200}
                  onChange={(e) => handleConfigChange('chunk_overlap', parseInt(e.target.value))}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Characters to overlap between chunks</p>
              </div>
            )}

            {/* Structure Preservation Options */}
            {(config.strategy === 'structural' || config.strategy === 'hybrid') && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Structure Preservation</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">Preserve Lists</p>
                      <p className="text-xs text-muted-foreground">Keep numbered and bulleted lists together</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.preserve_lists || false}
                        onCheckedChange={(checked) => handleConfigChange('preserve_lists', checked)}
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {config.preserve_lists ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">Preserve Headings</p>
                      <p className="text-xs text-muted-foreground">Keep headings with their content</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.preserve_headings || false}
                        onCheckedChange={(checked) => handleConfigChange('preserve_headings', checked)}
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {config.preserve_headings ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">Preserve Quotes</p>
                      <p className="text-xs text-muted-foreground">Keep quoted text and emphasis together</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.preserve_quotes || false}
                        onCheckedChange={(checked) => handleConfigChange('preserve_quotes', checked)}
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {config.preserve_quotes ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Settings Toggle */}
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-sm">Advanced Settings</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs"
              >
                <Settings2 className="h-3 w-3 mr-1" />
                {showAdvanced ? 'Hide' : 'Show'} Advanced
              </Button>
            </div>

            {showAdvanced && (
              <div className="space-y-3 p-3 bg-muted/30 rounded border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Force Strategy</p>
                    <p className="text-xs text-muted-foreground">Disable automatic strategy selection</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.force_strategy || false}
                      onCheckedChange={(checked) => handleConfigChange('force_strategy', checked)}
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {config.force_strategy ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quality_threshold" className="text-sm">Quality Threshold</Label>
                  <Input
                    id="quality_threshold"
                    type="number"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={config.quality_threshold || 0.6}
                    onChange={(e) => handleConfigChange('quality_threshold', parseFloat(e.target.value))}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Minimum quality score for chunks (0.1-1.0)</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefault}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset to Default
              </Button>
              
              {analysis && (
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>Configuration based on document analysis</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Configuration Toggle - Always Visible */}
        {!useCustomConfig && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Default Chunking</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {fileContent ? 'Click "Analyze Document" for recommendations' : 'Enable custom config to manually adjust settings'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseCustomConfig(true)}
                className="bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200"
              >
                <Settings2 className="h-3 w-3 mr-1" />
                Customize
              </Button>
            </div>
          </div>
        )}

        {/* Help Text */}
        {!fileContent && !useCustomConfig && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Upload a text file (TXT or MD) to enable document analysis. You can still enable "Custom Configuration" 
              to manually set chunking options for any file type.
            </AlertDescription>
          </Alert>
        )}
        
        {fileContent && !useCustomConfig && (
          <Alert>
            <HelpCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Using default chunking configuration. Click "Analyze Document" for personalized recommendations, 
              or enable "Custom Configuration" to manually adjust settings.
            </AlertDescription>
          </Alert>
        )}
        
        {!fileContent && useCustomConfig && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Custom configuration enabled. Document analysis is not available for this file type, 
              but you can manually configure chunking settings below.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
