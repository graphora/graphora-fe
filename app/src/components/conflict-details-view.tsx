import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  ThumbsUp, 
  SkipForward,
  Undo2,
  GitCompare,
  AlertTriangle,
  AlertOctagon,
  Network,
  Loader2
} from 'lucide-react'
import { type ConflictListItem, type ConflictSeverity } from '@/types/merge'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'
import { Progress } from '@/components/ui/progress'
import { formatLabel } from '@/lib/utils'
import { MergeCompletionBanner } from './merge-completion-banner'

interface ConflictDetailsViewProps {
  mergeId: string
  conflict: ConflictListItem
  onBack: () => void
  onNext?: () => void
  onResolve: (resolution: string) => void
  canSubmit?: boolean
  onViewMergedResults?: () => void
  onViewFinalGraph?: () => void
}

interface ConflictDetails extends ConflictListItem {
  related_entities?: Array<{
    id: string
    type: string
    properties: Record<string, any>
  }>
  context?: {
    description: string
    additional_info?: Record<string, any>
    entity_type?: string
    property_name?: string
    staging_value?: any
    production_value?: any
    analysis?: {
      strategy: string
      confidence: number
      explanation: string
      risks?: string[]
    }
  }
  severity_details?: {
    level: 'critical' | 'major' | 'minor' | 'info'
    label: string
  }
  properties_affected?: Record<string, PropertyDiff>
  resolution_options?: Array<{
    id: string
    description: string
    resolution_type: string
    resolution_data: Record<string, any>
    confidence: number
    reasoning: string
    requires_review: boolean
    auto_resolvable: boolean
  }>
  resolution?: {
    id: string
    description: string
    resolution_type: string
    resolution_data: Record<string, any>
    confidence: number
    reasoning: string
    requires_review: boolean
    auto_resolvable: boolean
    risks?: string[]
  }
  resolved?: boolean
  resolution_timestamp?: string
  resolved_by?: string
}

interface PropertyDiff {
  staging: string | number | boolean | null
  prod: string | number | boolean | null
}

interface ResolutionPreview {
  staging_changes: Record<string, any>
  prod_changes: Record<string, any>
  final_state: Record<string, any>
}

const severityColors: Record<ConflictSeverity['level'], { bg: string, text: string, border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  major: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  minor: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
}

const conflictTypeIcons: Record<string, React.ReactNode> = {
  property: <GitCompare className="h-4 w-4" />,
  relationship: <Network className="h-4 w-4" />,
  entity_match: <AlertOctagon className="h-4 w-4" />
}

export function ConflictDetailsView({
  mergeId,
  conflict,
  onBack,
  onNext,
  onResolve,
  onViewFinalGraph = () => {},
  canSubmit = true
}: ConflictDetailsViewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<ConflictDetails | null>(null)
  const [selectedResolution, setSelectedResolution] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [lastAppliedResolution, setLastAppliedResolution] = useState<string | null>(null)
  const [preview, setPreview] = useState<ResolutionPreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isLastConflictResolved, setIsLastConflictResolved] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/merge/${mergeId}/conflicts/${conflict.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch conflict details')
        }

        const data = await response.json()
        setDetails(data)
        // If resolved, pre-select the resolution
        if (data.resolved && data.resolution) {
          setSelectedResolution(data.resolution.id)
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [mergeId, conflict.id])

  const handleResolutionSelect = (resolutionId: string) => {
    setSelectedResolution(resolutionId)
  }

  const handleApplyResolution = async () => {
    if (!selectedResolution) return
  
    try {
      setIsApplying(true)
      setError(null)
  
      const response = await fetch(
        `/api/merge/${mergeId}/conflicts/${conflict.id}/resolve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            resolution_id: selectedResolution
          })
        }
      )
  
      if (!response.ok) {
        throw new Error('Failed to apply resolution')
      }
  
      // Check remaining conflicts
      const conflictsResponse = await fetch(`/api/merge/${mergeId}/conflicts`)
      if (conflictsResponse.ok) {
        const conflictData = await conflictsResponse.json()
        console.log(conflictData)
        const unresolvedCount = conflictData.summary?.unresolved || 0
        if (unresolvedCount === 0) {
          setIsLastConflictResolved(true)
        }
      }
  
      setLastAppliedResolution(selectedResolution)
      onResolve(selectedResolution)
  
      toast({
        title: "Resolution Applied",
        description: "The conflict has been successfully resolved.",
        variant: "default",
      })
  
      if (onNext && !isLastConflictResolved) {
        onNext()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to apply resolution')
      toast({
        title: "Error",
        description: "Failed to apply resolution. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsApplying(false)
    }
  }

  const handleUndo = async () => {
    try {
      setIsApplying(true)
      setError(null)

      const response = await fetch(
        `/api/merge/${mergeId}/conflicts/${conflict.id}/undo`,
        {
          method: 'POST'
        }
      )

      if (!response.ok) {
        throw new Error('Failed to undo resolution')
      }

      setLastAppliedResolution(null)
      setSelectedResolution(null)

      toast({
        title: "Resolution Undone",
        description: "The conflict resolution has been undone.",
        variant: "default",
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to undo resolution')
      toast({
        title: "Error",
        description: "Failed to undo resolution. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsApplying(false)
    }
  }

  const severityLevel = details?.severity_details?.level || conflict.severity.level
  const severityStyle = severityColors[severityLevel]
  const severityLabel = details?.severity_details?.label || severityLevel
  const isResolved = details?.resolved || false

  return (
    <div className="h-[calc(100vh-14rem)] flex flex-col overflow-hidden">
      {isLastConflictResolved ? (
        <div className="p-4">
          <MergeCompletionBanner
            mergeId={mergeId}
            onViewFinalGraph={onViewFinalGraph}
            onViewProgress={() => {}}
            takeToFinalize={false}
          />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex-none bg-white border-b shadow-sm">
            <div className="p-4">
              <Breadcrumb>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={onBack}>Conflicts</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbItem>
                <BreadcrumbItem isCurrentPage>
                  <span className="text-gray-600">Conflict Details</span>
                </BreadcrumbItem>
              </Breadcrumb>

              <div className="mt-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Conflict</h2>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {conflictTypeIcons[conflict.conflict_type.toLowerCase()] || 
                        <AlertTriangle className="h-4 w-4" />}
                      {conflict.conflict_type}
                    </Badge>
                    <Badge className={cn(severityStyle?.bg, severityStyle?.text, severityStyle?.border)}>
                      {severityLabel}
                    </Badge>
                    {isResolved && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Detected at: {new Date(conflict.created_at).toLocaleString()}
                  </p>
                  {isResolved && details?.resolution_timestamp && (
                    <p className="text-sm text-gray-600">
                      Resolved at: {new Date(details.resolution_timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-h-0 overflow-y-auto pb-24">
            <div className="p-4 space-y-6 pb-[calc(4rem+1px)]">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{conflict.description}</p>
                  {details && (
                    <>
                      <Separator className="my-4" />
                      <div className="text-sm">
                        {details.context && Object.keys(details.context).length > 0 && (
                          <div className="space-y-2">
                            {Object.entries(details.context)
                              .filter(([key]) => key !== 'description' && key !== 'analysis')
                              .map(([key, value]) => (
                                <div key={key} className="flex items-start gap-2">
                                  <span className="font-medium text-gray-700">{formatLabel(key)}:</span>
                                  <span className="text-gray-600">
                                    {typeof value === 'object' && value !== null
                                      ? JSON.stringify(value)
                                      : String(value)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Resolution Section */}
              {details && (
                <Card>
                  <CardHeader>
                    <CardTitle>{isResolved ? 'Resolution' : 'Resolution Options'}</CardTitle>
                    <CardDescription>
                      {isResolved ? 'Selected resolution for this conflict' : 'Select a resolution strategy to apply'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : isResolved && details.resolution ? (
                      <div className="space-y-4 pb-24">
                        <Card className="border-green-500 bg-green-50">
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div>
                                <h5 className="font-medium">{formatLabel(details.resolution.resolution_type.toLowerCase())}</h5>
                                <p className="text-sm text-gray-600">{details.resolution.description}</p>
                                {details.resolution.reasoning && (
                                  <p className="text-sm text-gray-500 mt-2">{details.resolution.reasoning}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex-1 max-w-[200px]">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span>Confidence</span>
                                    <span>{Math.round(details.resolution.confidence * 100)}%</span>
                                  </div>
                                  <Progress 
                                    value={details.resolution.confidence * 100} 
                                    className={cn(
                                      details.resolution.confidence > 0.8 ? "bg-green-100" : "bg-gray-100",
                                      "h-2"
                                    )}
                                    indicatorClassName={
                                      details.resolution.confidence > 0.8 ? "bg-green-500" : "bg-blue-500"
                                    }
                                  />
                                </div>
                                {details.resolution.confidence > 0.8 && (
                                  <Badge variant="default" className="bg-green-500 text-xs">
                                    Recommended
                                  </Badge>
                                )}
                                {details.resolution.auto_resolvable && (
                                  <Badge variant="outline" className="text-xs">
                                    Auto-resolved
                                  </Badge>
                                )}
                              </div>
                              {details.resolved_by && (
                                <p className="text-xs text-gray-500">
                                  Resolved by: {details.resolved_by}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : details.resolution_options ? (
                      <div className="space-y-4 pb-24">
                        {details.resolution_options.map((option) => (
                          <Card 
                            key={option.id}
                            className={cn(
                              "hover:border-blue-300 transition-colors cursor-pointer",
                              selectedResolution === option.id && "border-blue-500 bg-blue-50",
                              option.confidence > 0.8 && "ring-2 ring-green-100"
                            )}
                            onClick={() => handleResolutionSelect(option.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                  <div>
                                    <h5 className="font-medium">{formatLabel(option.resolution_type.toLowerCase())}</h5>
                                    <p className="text-sm text-gray-600">{option.description}</p>
                                    {option.reasoning && (
                                      <p className="text-sm text-gray-500 mt-2">{option.reasoning}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 max-w-[200px]">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span>Confidence</span>
                                        <span>{Math.round(option.confidence * 100)}%</span>
                                      </div>
                                      <Progress 
                                        value={option.confidence * 100} 
                                        className={cn(
                                          option.confidence > 0.8 ? "bg-green-100" : "bg-gray-100",
                                          "h-2"
                                        )}
                                        indicatorClassName={
                                          option.confidence > 0.8 ? "bg-green-500" : "bg-blue-500"
                                        }
                                      />
                                    </div>
                                    {option.confidence > 0.8 && (
                                      <Badge variant="default" className="bg-green-500 text-xs">
                                        Recommended
                                      </Badge>
                                    )}
                                    {option.auto_resolvable && (
                                      <Badge variant="outline" className="text-xs">
                                        Auto-resolvable
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {selectedResolution === option.id && (
                                  <CheckCircle2 className="h-5 w-5 text-blue-500" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No resolution options available.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Footer Actions - Only show if not resolved */}
          {!isResolved && (
            <div className="flex-none bg-gray-50 border-t shadow-[0_-1px_2px_rgba(0,0,0,0.05)] p-1 fixed bottom-0 left-0 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {lastAppliedResolution && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleUndo}
                      disabled={isApplying}
                    >
                      <Undo2 className="h-4 w-4 mr-2" />
                      Undo Resolution
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {onNext && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onNext}
                      disabled={isApplying}
                    >
                      <SkipForward className="h-4 w-4 mr-2" />
                      Skip
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleApplyResolution}
                    disabled={!selectedResolution || !canSubmit || isApplying}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    {isApplying ? 'Applying...' : 'Apply Resolution'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}