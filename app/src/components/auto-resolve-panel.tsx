import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Wand2,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  Loader2,
  XCircle,
  CheckCircle2
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface ConflictSummary {
  total: number
  by_severity: {
    critical: number
    major: number
    minor: number
  }
}

interface AutoResolutionResult {
  resolved: number
  failed: number
  skipped: number
  errors?: Array<{
    conflict_id: string
    reason: string
  }>
}

interface AutoResolvePanelProps {
  mergeId: string
  conflictSummary: ConflictSummary
  onResolutionComplete: () => void
}

export function AutoResolvePanel({
  mergeId,
  conflictSummary,
  onResolutionComplete
}: AutoResolvePanelProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<AutoResolutionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const eligibleCount = conflictSummary.by_severity.minor

  const handleAutoResolve = async () => {
    try {
      setIsResolving(true)
      setError(null)
      setProgress(0)

      const response = await fetch(`/api/v1/merge/${mergeId}/auto-resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        throw new Error('Failed to auto-resolve conflicts')
      }

      const data = await response.json()
      setResult(data)

      // Show success toast
      toast({
        title: "Auto-Resolution Complete",
        description: `Successfully resolved ${data.resolved} conflicts.`,
        variant: "default",
      })

      // Refresh conflict list
      onResolutionComplete()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      toast({
        title: "Error",
        description: "Failed to auto-resolve conflicts. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResolving(false)
      setProgress(100)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Conflict Summary</CardTitle>
            <CardDescription>
              Overview of conflicts by severity level
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsConfirmOpen(true)}
            disabled={eligibleCount === 0 || isResolving}
            className="gap-2"
          >
            <Wand2 className="h-4 w-4" />
            Auto-Resolve
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Severity Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-700">Critical</p>
                    <p className="text-2xl font-bold text-red-700">
                      {conflictSummary.by_severity.critical}
                    </p>
                  </div>
                  <AlertOctagon className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-orange-700">Major</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {conflictSummary.by_severity.major}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-yellow-700">Minor</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      {conflictSummary.by_severity.minor}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Auto-Resolution Progress */}
          {isResolving && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Auto-resolving conflicts...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Results */}
          {result && !isResolving && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">Auto-Resolution Complete</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    {result.resolved}
                  </Badge>
                  <span className="text-sm">Resolved</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-orange-500 text-orange-500">
                    {result.skipped}
                  </Badge>
                  <span className="text-sm">Skipped</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-red-500 text-red-500">
                    {result.failed}
                  </Badge>
                  <span className="text-sm">Failed</span>
                </div>
              </div>
              {result.errors && result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {result.errors.length} conflicts could not be auto-resolved.
                    Please review these conflicts manually.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auto-Resolve Conflicts</AlertDialogTitle>
            <AlertDialogDescription>
              This will automatically resolve {eligibleCount} minor conflicts.
              Critical and major conflicts will need to be resolved manually.
              You can review and undo any auto-resolutions later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsConfirmOpen(false)
                handleAutoResolve()
              }}
            >
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
} 