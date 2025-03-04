import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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

interface ConflictDetailsViewProps {
  mergeId: string
  conflict: ConflictListItem
  onBack: () => void
  onNext?: () => void
  onResolve: (resolution: string) => void
  canSubmit?: boolean
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
  }
}

interface ResolutionPreview {
  staging_changes: Record<string, any>
  prod_changes: Record<string, any>
  final_state: Record<string, any>
}

const severityColors: Record<ConflictSeverity['level'], { bg: string, text: string, border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  major: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  minor: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' }
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

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/merge/conflicts/${mergeId}/conflicts${conflict.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch conflict details')
        }

        const data = await response.json()
        setDetails(data)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [mergeId, conflict.id])

  const fetchResolutionPreview = async (resolutionId: string) => {
    try {
      setIsLoadingPreview(true)
      setError(null)

      const response = await fetch(
        `/api/merge/conflicts/${mergeId}/conflicts/${conflict.id}/preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            resolution_id: resolutionId
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch resolution preview')
      }

      const data = await response.json()
      setPreview(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load preview')
      setPreview(null)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleResolutionSelect = (resolutionId: string) => {
    setSelectedResolution(resolutionId)
    fetchResolutionPreview(resolutionId)
  }

  const handleApplyResolution = async () => {
    if (!selectedResolution) return

    try {
      setIsApplying(true)
      setError(null)

      const response = await fetch(
        `/api/merge/conflicts/${mergeId}/conflicts/${conflict.id}/resolve`,
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

      setLastAppliedResolution(selectedResolution)
      onResolve(selectedResolution)

      toast({
        title: "Resolution Applied",
        description: "The conflict has been successfully resolved.",
        variant: "default",
      })

      if (onNext) {
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
        `/api/merge/conflicts/${mergeId}/conflicts/${conflict.id}/undo`,
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

  // Use severity from details if available, otherwise use from conflict
  const severityLevel = details?.severity_details?.level || conflict.severity
  const severityStyle = severityColors[severityLevel]
  const severityLabel = details?.severity_details?.label || severityLevel

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
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
              <h2 className="text-lg font-semibold">Conflict #{conflict.id}</h2>
              <Badge variant="outline" className="flex items-center gap-1">
                {conflictTypeIcons[conflict.conflict_type.toLowerCase()] || 
                  <AlertTriangle className="h-4 w-4" />}
                {conflict.conflict_type}
              </Badge>
              <Badge className={cn(severityStyle.bg, severityStyle.text, severityStyle.border)}>
                {severityLabel}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Detected at: {new Date(conflict.detected_at).toLocaleString()}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
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
              {details?.context?.description && (
                <>
                  <Separator className="my-4" />
                  <div className="text-sm">
                    <h4 className="font-medium mb-2">Additional Context</h4>
                    <p className="text-gray-600">{details.context.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Side by Side Comparison */}
          {details && details.properties_affected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5" />
                  Changes
                </CardTitle>
                <CardDescription>Compare staging and production values</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-green-700">Staging</h4>
                    <Card className="bg-green-50 border-green-100">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          {Object.entries(details.properties_affected).map(([property, diff]) => (
                            <div key={property} className="text-sm">
                              <span className="font-medium">{property}:</span>
                              <div className="mt-1 p-2 bg-white rounded border border-green-200">
                                {(diff as PropertyDiff).staging}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-blue-700">Production</h4>
                    <Card className="bg-blue-50 border-blue-100">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          {Object.entries(details.properties_affected).map(([property, diff]) => (
                            <div key={property} className="text-sm">
                              <span className="font-medium">{property}:</span>
                              <div className="mt-1 p-2 bg-white rounded border border-blue-200">
                                {(diff as PropertyDiff).prod}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resolution Preview */}
          {selectedResolution && (
            <Card>
              <CardHeader>
                <CardTitle>Resolution Preview</CardTitle>
                <CardDescription>
                  See how the selected resolution will affect the data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPreview ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : preview ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Final State</h4>
                      <Card className="bg-green-50 border-green-100">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            {Object.entries(preview.final_state).map(([key, value]) => (
                              <div key={key} className="text-sm">
                                <span className="font-medium">{key}:</span>
                                <div className="mt-1 p-2 bg-white rounded border border-green-200">
                                  {String(value)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Changes in Staging</h4>
                        <Card className="border-yellow-200">
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              {Object.entries(preview.staging_changes).map(([key, value]) => (
                                <div key={key} className="text-sm">
                                  <span className="font-medium">{key}:</span>
                                  <div className="mt-1 p-2 bg-white rounded border border-yellow-200">
                                    {String(value)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Changes in Production</h4>
                        <Card className="border-blue-200">
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              {Object.entries(preview.prod_changes).map(([key, value]) => (
                                <div key={key} className="text-sm">
                                  <span className="font-medium">{key}:</span>
                                  <div className="mt-1 p-2 bg-white rounded border border-blue-200">
                                    {String(value)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-600">
                    Preview not available for this resolution
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Related Entities */}
          {details?.related_entities && details.related_entities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Related Entities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {details.related_entities.map((entity) => (
                    <Card key={entity.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-medium">{entity.type}</h5>
                            <p className="text-sm text-gray-600">ID: {entity.id}</p>
                          </div>
                          <Badge variant="outline">{entity.type}</Badge>
                        </div>
                        {Object.entries(entity.properties).length > 0 && (
                          <div className="mt-4">
                            <h6 className="text-sm font-medium mb-2">Properties</h6>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {Object.entries(entity.properties).map(([key, value]) => (
                                <div key={key} className="flex">
                                  <span className="font-medium mr-2">{key}:</span>
                                  <span className="text-gray-600">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resolution Options */}
          {details && details.suggestions && (
            <Card>
              <CardHeader>
                <CardTitle>Resolution Options</CardTitle>
                <CardDescription>Select a resolution strategy to apply</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {conflict.suggestions.map((suggestion, index) => (
                    <Card 
                      key={index}
                      className={cn(
                        "hover:border-blue-300 transition-colors cursor-pointer",
                        selectedResolution === suggestion.suggestion_type && "border-blue-500 bg-blue-50",
                        suggestion.confidence > 0.8 && "ring-2 ring-green-100"
                      )}
                      onClick={() => handleResolutionSelect(suggestion.suggestion_type)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div>
                              <h5 className="font-medium">{suggestion.suggestion_type}</h5>
                              <p className="text-sm text-gray-600">{suggestion.description}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex-1 max-w-[200px]">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span>Confidence</span>
                                  <span>{Math.round(suggestion.confidence * 100)}%</span>
                                </div>
                                <Progress 
                                  value={suggestion.confidence * 100} 
                                  className={cn(
                                    suggestion.confidence > 0.8 ? "bg-green-100" : "bg-gray-100",
                                    "h-2"
                                  )}
                                  indicatorClassName={
                                    suggestion.confidence > 0.8 ? "bg-green-500" : "bg-blue-500"
                                  }
                                />
                              </div>
                              {suggestion.confidence > 0.8 && (
                                <Badge variant="default" className="bg-green-500 text-xs">
                                  Recommended
                                </Badge>
                              )}
                            </div>
                          </div>
                          {selectedResolution === suggestion.suggestion_type && (
                            <CheckCircle2 className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
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
    </div>
  )
} 
