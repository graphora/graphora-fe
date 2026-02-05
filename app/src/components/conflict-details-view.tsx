import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import { type ConflictListItem, type ConflictSeverity, ChangeLog } from '@/types/merge'
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

const severityColors: Record<ConflictSeverity['level'], { bg: string, text: string, border: string }> = {
  critical: { bg: 'bg-red-50 dark:bg-red-950/50', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800/50' },
  major: { bg: 'bg-orange-50 dark:bg-orange-950/50', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800/50' },
  minor: { bg: 'bg-yellow-50 dark:bg-yellow-950/50', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800/50' },
  info: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800/50' }
}

const conflictTypeIcons: Record<string, React.ReactNode> = {
  property: <GitCompare className="h-4 w-4" />,
  property_conflict: <GitCompare className="h-4 w-4" />,
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
  const [changeLog, setChangeLog] = useState<ChangeLog | null>(null)
  const [selectedResolution, setSelectedResolution] = useState<string>('staging')
  const [isApplying, setIsApplying] = useState(false)
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [learningComment, setLearningComment] = useState('')
  const [isLastConflictResolved, setIsLastConflictResolved] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        // If the conflict has the raw_changelog property (added during conversion), use it directly
        if (conflict.raw_changelog) {
          setChangeLog(conflict.raw_changelog)
          setLoading(false)
          return
        }

        // Otherwise fetch from the API
        const response = await fetch(`/api/merge/merges/${mergeId}/conflicts/${conflict.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch conflict details')
        }

        const data = await response.json()
        setChangeLog(data)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [mergeId, conflict.id, conflict.raw_changelog])

  const handleResolutionSelect = (value: string) => {
    setSelectedResolution(value)
  }

  const handleCustomValueChange = (property: string, value: string) => {
    setCustomValues(prev => ({
      ...prev,
      [property]: value
    }))
  }

  const handleApplyResolution = async () => {
    try {
      setIsApplying(true)
      setError(null)
      
      // Prepare the changed properties based on selection
      const changedProps: Record<string, any> = {}
      
      if (changeLog) {
        Object.entries(changeLog.prop_changes).forEach(([prop, [prodValue, stagingValue]]) => {
          if (selectedResolution === 'staging') {
            // Use staging value
            changedProps[prop] = stagingValue
          } else if (selectedResolution === 'production') {
            // Use production value
            changedProps[prop] = prodValue
          } else if (selectedResolution === 'custom' && customValues[prop]) {
            // Use custom value
            changedProps[prop] = customValues[prop]
          } else if (selectedResolution === 'both') {
            //do nothing
          }
        })
      }
      
      if (Object.keys(changedProps).length === 0 && selectedResolution !== 'both') {
        throw new Error('No properties to change')
      }
      
      // Map frontend resolution values to backend enum values
      const resolutionMapping: Record<string, string> = {
        'staging': 'KEEP_STAGING',
        'production': 'KEEP_PRODUCTION',
        'custom': 'MERGE_VALUES',
        'both': 'KEEP_BOTH'
      }
      
      const backendResolution = resolutionMapping[selectedResolution] || selectedResolution
      
      // If learning comment is empty, use a default
      const comment = learningComment.trim() || 'Conflict resolved manually'
      
      const response = await fetch(
        `/api/merge/merges/${mergeId}/conflicts/${conflict.id}/resolve?resolution=${backendResolution}&learning_comment=${encodeURIComponent(comment)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(changedProps)
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to apply resolution')
      }
      
      // Check remaining conflicts
      const conflictsResponse = await fetch(`/api/merge/merges/${mergeId}/conflicts`)
      if (conflictsResponse.ok) {
        const conflictData = await conflictsResponse.json()
        const remainingConflicts = Array.isArray(conflictData) ? conflictData.length : 0
        if (remainingConflicts === 0) {
          setIsLastConflictResolved(true)
        }
      }
      
      // Call onResolve with the selected resolution type
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

  const severityLevel = conflict.severity.level
  const severityStyle = severityColors[severityLevel]
  const severityLabel = conflict.severity.label

  // Format the property value for display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

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
          <div className="flex-none bg-transparent">
            <div className="p-4 pb-0">
              <Breadcrumb>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={onBack}>Conflicts</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbItem>
                <BreadcrumbItem isCurrentPage>
                  <span className="text-muted-foreground">Conflict Details</span>
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
                    {conflict.resolved && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {changeLog ? 
                      `Entity ID: ${changeLog.staging_node.id}` : 
                      `Entity ID: ${conflict.entity_id}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Type: {changeLog ? changeLog.staging_node.type : conflict.entity_type}
                  </p>
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

              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : changeLog ? (
                <>
                  {/* Description */}
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-soft">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-foreground">Property Conflicts</h3>
                      <p className="text-sm text-muted-foreground">Select the version you want to keep for each conflicting property</p>
                    </div>
                      <RadioGroup 
                        value={selectedResolution} 
                        onValueChange={handleResolutionSelect}
                        className="mb-4"
                      >
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="staging" id="staging" />
                            <Label htmlFor="staging" className="font-medium">Keep Staging Values</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="production" id="production" />
                            <Label htmlFor="production" className="font-medium">Keep Production Values</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id="custom" />
                            <Label htmlFor="custom" className="font-medium">Provide Custom Values</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="both" id="both" />
                            <Label htmlFor="both" className="font-medium">Keep both</Label>
                          </div>
                        </div>
                      </RadioGroup>

                      <div className="mt-6 rounded-2xl border border-white/5 bg-background/40">
                        <Table className="[&_th]:text-xs [&_td]:text-sm">
                          <TableHeader>
                            <TableRow className="border-white/5">
                              <TableHead className="text-muted-foreground">Property</TableHead>
                              <TableHead className="text-muted-foreground">Production Value</TableHead>
                              <TableHead className="text-muted-foreground">Staging Value</TableHead>
                              {selectedResolution === 'custom' && <TableHead className="text-muted-foreground">Custom Value</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(changeLog.prop_changes).map(([prop, [prodValue, stagingValue]]) => (
                              <TableRow key={prop} className="border-white/5">
                                <TableCell className="font-medium text-foreground/90">{prop}</TableCell>
                                <TableCell>{formatValue(prodValue)}</TableCell>
                                <TableCell>{formatValue(stagingValue)}</TableCell>
                                {selectedResolution === 'custom' && (
                                  <TableCell>
                                    <Input
                                      value={customValues[prop] || ''}
                                      onChange={(e) => handleCustomValueChange(prop, e.target.value)}
                                      placeholder="Enter custom value"
                                    />
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-soft">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-foreground">Learning Comment</h3>
                      <p className="text-sm text-muted-foreground">Add a comment / rule to help the system learn from this resolution</p>
                    </div>
                    <Textarea
                      placeholder="Why did you choose this resolution? This helps improve automated conflict resolution."
                      value={learningComment}
                      onChange={(e) => setLearningComment(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No conflict data available</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          {!conflict.resolved && (
            <div className="flex-none bg-card/95 backdrop-blur-sm border-t border-border/40 shadow-soft p-3 fixed bottom-0 left-0 w-full">
              <div className="flex items-center justify-between">
                <div>
                  {/* Left side actions if needed */}
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
                    disabled={!canSubmit || isApplying || !changeLog}
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Apply Resolution
                      </>
                    )}
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
