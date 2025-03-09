import { useState, useEffect } from 'react'
import { CheckCircle2, Eye, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface MergeStatistics {
  total_nodes: number
  total_relationships: number
  nodes_added: number
  nodes_updated: number
  nodes_deleted: number
  relationships_added: number
  relationships_updated: number
  relationships_deleted: number
  conflicts_resolved: number
  completion_time: string
}

interface MergeCompletionBannerProps {
  mergeId: string
  takeToFinalize: boolean
  onViewProgress: () => void
  onViewFinalGraph: () => void
  className?: string
}

export function MergeCompletionBanner({
  mergeId,
  onViewFinalGraph,
  onViewProgress,
  takeToFinalize = false,
  className
}: MergeCompletionBannerProps) {
  const [statistics, setStatistics] = useState<MergeStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/merge/${mergeId}/statistics`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch merge statistics: ${response.statusText}`)
        }
        
        const data = await response.json()
        setStatistics(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching merge statistics:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch merge statistics')
      } finally {
        setLoading(false)
      }
    }
    
    fetchStatistics()
  }, [mergeId])

  return (
    <div className={cn("w-full", className)}>
      { takeToFinalize ? (  
        <div>
          <Alert className="bg-green-50 border-green-200 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <AlertTitle className="text-green-700 font-medium ml-2">
              Graph Ready to be merged to Production
            </AlertTitle>
            <AlertDescription className="ml-7 text-green-600">
              All conflicts have been resolved and the graph is ready to be merged to Production.
            </AlertDescription>
          </Alert>
        
          <div className="flex items-center justify-between mb-4">
            <Button 
              onClick={onViewProgress}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Eye className="mr-2 h-5 w-5" />
              Merge to Production
            </Button>
          </div>
        </div>
        ) : (
          <div className={cn("w-full", className)}>
            <Alert className="bg-green-50 border-green-200 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <AlertTitle className="text-green-700 font-medium ml-2">
                All conflicts resolved successfully!
              </AlertTitle>
              <AlertDescription className="ml-7 text-green-600">
                The merge process is complete and all conflicts have been resolved.
              </AlertDescription>
            </Alert>
          
            <div className="flex items-center justify-between mb-4">
              <Button 
                onClick={onViewFinalGraph}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Eye className="mr-2 h-5 w-5" />
                View Final Merged Graph
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowStats(!showStats)}
                size="sm"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                {showStats ? 'Hide Statistics' : 'Show Statistics'}
              </Button>
            </div>
            
            {showStats && (
              <Card className="border-blue-100 bg-blue-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-blue-800">Merge Statistics</CardTitle>
                  <CardDescription>Summary of changes applied during the merge</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  ) : error ? (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : statistics ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Total Nodes:</span>
                          <Badge variant="outline" className="font-mono">{statistics.total_nodes}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Nodes Added:</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 font-mono">{statistics.nodes_added}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Nodes Updated:</span>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono">{statistics.nodes_updated}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Nodes Deleted:</span>
                          <Badge variant="outline" className="bg-red-50 text-red-700 font-mono">{statistics.nodes_deleted}</Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Total Relationships:</span>
                          <Badge variant="outline" className="font-mono">{statistics.total_relationships}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Relationships Added:</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 font-mono">{statistics.relationships_added}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Relationships Updated:</span>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono">{statistics.relationships_updated}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Relationships Deleted:</span>
                          <Badge variant="outline" className="bg-red-50 text-red-700 font-mono">{statistics.relationships_deleted}</Badge>
                        </div>
                      </div>
                      <div className="col-span-2 pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Conflicts Resolved:</span>
                          <Badge className="bg-green-500 text-white font-mono">{statistics.conflicts_resolved}</Badge>
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-sm text-gray-500">Completion Time:</span>
                          <span className="text-sm font-medium">
                            {new Date().toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No statistics available</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )
      }
    </div>
  )
} 