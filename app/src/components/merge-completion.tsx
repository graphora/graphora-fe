'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  Home, 
  RefreshCw,
  Star,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface MergeCompletionProps {
  mergeId: string
  onComplete?: () => void
}

interface MergeStatistics {
  total_conflicts: number
  resolved_conflicts: number
  unresolved_conflicts: number
  nodes_merged: number
  relationships_created: number
  time_taken: number
  success_rate: number
}

interface VerificationResult {
  status: 'success' | 'warning' | 'error'
  issues: Array<{
    type: string
    description: string
    severity: 'low' | 'medium' | 'high'
  }>
}

export function MergeCompletion({ mergeId, onComplete }: MergeCompletionProps) {
  const router = useRouter()
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [statistics, setStatistics] = useState<MergeStatistics | null>(null)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [defaultStrategy, setDefaultStrategy] = useState<string>('keep_source')
  const [userRating, setUserRating] = useState<number | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  // Fetch initial statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await fetch(`/api/merge/merges/${mergeId}/statistics`)
      if (!response.ok) throw new Error('Failed to fetch statistics')
      const data = await response.json()
      setStatistics(data)
    } catch (error) {
      console.error('Error fetching statistics:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch merge statistics',
        variant: 'destructive',
      })
    }
  }, [mergeId])

  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  // Verify merge
  const verifyMerge = async () => {
    try {
      const response = await fetch(`/api/merge/merges/${mergeId}/verify`)
      if (!response.ok) throw new Error('Verification failed')
      const data = await response.json()
      setVerificationResult(data)
      return data.status === 'success'
    } catch (error) {
      console.error('Error verifying merge:', error)
      return false
    }
  }

  // Submit batch resolutions
  const submitBatchResolutions = async () => {
    try {
      const response = await fetch(`/api/merge/conflicts/${mergeId}/batch-resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_strategy: defaultStrategy
        })
      })
      if (!response.ok) throw new Error('Failed to submit batch resolutions')
      return true
    } catch (error) {
      console.error('Error submitting batch resolutions:', error)
      return false
    }
  }

  // Apply resolution strategies
  const applyStrategies = async () => {
    try {
      const response = await fetch(`/api/merge/merges/${mergeId}/apply-strategies`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to apply strategies')
      return true
    } catch (error) {
      console.error('Error applying strategies:', error)
      return false
    }
  }

  // Submit feedback
  const submitFeedback = async (rating: number) => {
    try {
      await fetch(`/api/merge/merges/${mergeId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      })
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }
  }

  // Handle completion workflow
  const handleComplete = async () => {
    setIsSubmitting(true)
    setSubmissionError(null)

    try {
      // Step 1: Submit batch resolutions
      const batchSuccess = await submitBatchResolutions()
      if (!batchSuccess) throw new Error('Failed to submit batch resolutions')

      // Step 2: Apply strategies
      const applySuccess = await applyStrategies()
      if (!applySuccess) throw new Error('Failed to apply strategies')

      // Step 3: Verify merge
      const verifySuccess = await verifyMerge()
      if (!verifySuccess) {
        toast({
          title: 'Warning',
          description: 'Merge completed with warnings. Please review the verification results.',
          variant: 'default',
        })
      }

      // Step 4: Fetch final statistics
      await fetchStatistics()

      setIsCompleted(true)
      onComplete?.()

      toast({
        title: 'Success',
        description: 'Merge process completed successfully!',
        variant: 'default',
      })
    } catch (error) {
      console.error('Error completing merge:', error)
      setSubmissionError(error instanceof Error ? error.message : 'Failed to complete merge')
      toast({
        title: 'Error',
        description: 'Failed to complete merge process',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
      setShowConfirmation(false)
    }
  }

  if (!statistics) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const progressPercentage = Math.round(
    (statistics.resolved_conflicts / statistics.total_conflicts) * 100
  )

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution Progress</CardTitle>
          <CardDescription>
            Track the progress of your merge conflict resolutions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progressPercentage} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Total Conflicts</div>
                <div className="mt-1 text-2xl font-semibold">
                  {statistics.total_conflicts}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Resolved</div>
                <div className="mt-1 text-2xl font-semibold text-green-600">
                  {statistics.resolved_conflicts}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Unresolved</div>
                <div className="mt-1 text-2xl font-semibold text-amber-600">
                  {statistics.unresolved_conflicts}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Success Rate</div>
                <div className="mt-1 text-2xl font-semibold">
                  {Math.round(statistics.success_rate)}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Strategy Selection */}
      {!isCompleted && statistics.unresolved_conflicts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Default Resolution Strategy</CardTitle>
            <CardDescription>
              Choose how to handle remaining unresolved conflicts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={defaultStrategy}
              onValueChange={setDefaultStrategy}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="keep_source" id="keep_source" />
                <Label htmlFor="keep_source">Keep Source Version</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="keep_target" id="keep_target" />
                <Label htmlFor="keep_target">Keep Target Version</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="merge_properties" id="merge_properties" />
                <Label htmlFor="merge_properties">Merge Properties</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Verification Results */}
      {verificationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Verification Results
              {verificationResult.status === 'success' && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {verificationResult.status === 'warning' && (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              {verificationResult.status === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {verificationResult.issues.length > 0 ? (
              <div className="space-y-3">
                {verificationResult.issues.map((issue, index) => (
                  <Alert
                    key={index}
                    variant={
                      issue.severity === 'high'
                        ? 'destructive'
                        : issue.severity === 'medium'
                        ? 'destructive'
                        : 'default'
                    }
                  >
                    <AlertTitle>{issue.type}</AlertTitle>
                    <AlertDescription>{issue.description}</AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>All checks passed</AlertTitle>
                <AlertDescription>
                  No issues were found during verification.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completion Actions */}
      {isCompleted ? (
        <div className="space-y-6">
          {/* Success Message */}
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Merge Completed Successfully</AlertTitle>
            <AlertDescription>
              All conflicts have been resolved and changes have been applied.
            </AlertDescription>
          </Alert>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Merge Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Nodes Merged</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {statistics.nodes_merged}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Relationships Created
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {statistics.relationships_created}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Time Taken</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {Math.round(statistics.time_taken / 60)}m {Math.round(statistics.time_taken % 60)}s
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Success Rate</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {Math.round(statistics.success_rate)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback */}
          {!userRating && (
            <Card>
              <CardHeader>
                <CardTitle>Rate Your Experience</CardTitle>
                <CardDescription>
                  How satisfied are you with the merge resolution process?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setUserRating(rating)
                        submitFeedback(rating)
                      }}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          rating <= (userRating || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Options */}
          <div className="flex gap-4">
            <Button
              variant="default"
              onClick={() => router.push('/dashboard')}
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/merge')}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Start New Merge
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {submissionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{submissionError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => setShowConfirmation(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing Merge...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Complete Merge
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Merge Process</DialogTitle>
            <DialogDescription>
              This action will apply all resolution strategies and finalize the merge.
              {statistics.unresolved_conflicts > 0 && (
                <>
                  {' '}
                  There are still {statistics.unresolved_conflicts} unresolved
                  conflicts that will be handled using the selected default strategy.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This action cannot be undone. Make sure you have reviewed all
                changes before proceeding.
              </AlertDescription>
            </Alert>

            {statistics.unresolved_conflicts > 0 && (
              <div className="rounded-md bg-amber-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">
                      Unresolved Conflicts
                    </h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>
                        {statistics.unresolved_conflicts} conflicts will be resolved
                        using the &quot;{defaultStrategy}&quot; strategy.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleComplete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Complete Merge'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 