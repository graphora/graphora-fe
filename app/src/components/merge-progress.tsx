import { useEffect, useState, useRef } from 'react';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Clock, AlertCircle, CheckCircle, XCircle, Loader2, Info, Calendar } from 'lucide-react';
import { MergeProgress as MergeProgressType, MergeStage, MergeStageStatus } from '@/types/merge';
import { format } from 'date-fns';
import { Tooltip } from './ui/tooltip';

interface MergeProgressProps {
  mergeId: string;
  onViewConflicts?: () => void;
  onCancel?: () => void;
}

export function MergeProgress({ mergeId, onViewConflicts, onCancel }: MergeProgressProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<MergeProgressType | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/merge/status/${mergeId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch merge status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Merge status data:', data);
        setProgress(data);
        setError(null);
        setRetryCount(0); // Reset retry count on successful fetch
      } catch (err) {
        console.error('Error fetching merge status:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch merge status');
        
        // Implement exponential backoff for retries
        if (retryCount < maxRetries) {
          const backoffTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`Retrying in ${backoffTime}ms (attempt ${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, backoffTime);
        }
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchStatus();
    
    // Start polling
    intervalRef.current = setInterval(fetchStatus, 5000);
    
    // Start timer for elapsed time
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mergeId, retryCount]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy HH:mm:ss');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getEstimatedTimeRemaining = (): string => {
    if (!progress || progress.overall_progress >= 100) return '0:00';
    
    // If API provides estimated_end_time, use it
    if (progress.estimated_end_time) {
      const estimatedEnd = new Date(progress.estimated_end_time);
      const now = new Date();
      const remainingMs = Math.max(0, estimatedEnd.getTime() - now.getTime());
      return formatTime(Math.round(remainingMs / 1000));
    }
    
    // Otherwise, calculate based on elapsed time and progress
    if (progress.overall_progress <= 0) return '--:--';
    
    const totalEstimatedTime = (elapsedTime / progress.overall_progress) * 100;
    const remainingTime = Math.max(0, totalEstimatedTime - elapsedTime);
    return formatTime(Math.round(remainingTime));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-500 hover:bg-blue-600">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500 hover:bg-red-600">Failed</Badge>;
      case 'PAUSED':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Paused</Badge>;
      case 'WAITING_FOR_INPUT':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Waiting for Input</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-500 hover:bg-gray-600">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-500 hover:bg-gray-600">{status}</Badge>;
    }
  };

  const getStageIcon = (stage: MergeStage) => {
    switch (stage.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  // Add a safe access helper function
  const safeValue = (value: any, defaultValue: any) => {
    return value !== undefined && value !== null ? value : defaultValue;
  };

  if (loading && !progress) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading merge status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Error Loading Merge Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No merge data available</p>
        </CardContent>
      </Card>
    );
  }

  const hasConflicts = progress.has_conflicts || progress.overall_status === 'WAITING_FOR_INPUT';
  const isCompleted = progress.overall_status === 'COMPLETED';
  const isFailed = progress.overall_status === 'FAILED';
  const isCancelled = progress.overall_status === 'CANCELLED';

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Merge Progress</CardTitle>
          {getStatusBadge(safeValue(progress.overall_status, 'UNKNOWN'))}
        </div>
        <CardDescription className="flex items-center gap-1">
          <span>Merge ID: {mergeId}</span>
          {hasConflicts && (
            <Tooltip content="This merge has conflicts that need to be resolved">
              <div className="inline-flex items-center">
                <AlertCircle className="h-4 w-4 text-amber-500 ml-2 cursor-help" />
              </div>
            </Tooltip>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-medium">{Math.round(safeValue(progress.overall_progress, 0))}%</span>
          </div>
          <Progress value={safeValue(progress.overall_progress, 0)} className="h-2" />
        </div>

        {/* Time Information */}
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Elapsed Time</span>
            <span className="text-sm font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatTime(elapsedTime)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Estimated Time Remaining</span>
            <span className="text-sm font-medium">{getEstimatedTimeRemaining()}</span>
          </div>
        </div>

        {/* Start/End Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Started At</span>
            <span className="text-sm font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {formatDateTime(progress.start_time)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              {isCompleted ? 'Completed At' : 'Estimated Completion'}
            </span>
            <span className="text-sm font-medium">
              {isCompleted && progress.end_time 
                ? formatDateTime(progress.end_time) 
                : formatDateTime(progress.estimated_end_time)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Current Stage */}
        <div>
          <h4 className="text-sm font-medium mb-2">Current Stage: {safeValue(progress.current_stage, 'Unknown')}</h4>
          <div className="space-y-3">
            {Array.isArray(progress.stages) ? 
              progress.stages.map((stage, index) => (
                <div key={index} className="flex items-center gap-2">
                  {getStageIcon(stage)}
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{safeValue(stage.name, 'Unknown Stage')}</span>
                        {stage.status === 'running' && (
                          <Tooltip content={`Started: ${formatDateTime(stage.start_time)}`}>
                            <Info className="h-3 w-3 text-blue-500 cursor-help" />
                          </Tooltip>
                        )}
                      </div>
                      <span className="text-xs">{Math.round(safeValue(stage.progress, 0))}%</span>
                    </div>
                    <Progress value={safeValue(stage.progress, 0)} className="h-1.5" />
                  </div>
                </div>
              )) : Array.isArray(progress.stages_progress) ?
              progress.stages_progress.map((stage, index) => (
                <div key={index} className="flex items-center gap-2">
                  {getStageIcon(stage)}
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{safeValue(stage.name, 'Unknown Stage')}</span>
                        {stage.status === 'running' && (
                          <Tooltip content={`Started: ${formatDateTime(stage.start_time)}`}>
                            <Info className="h-3 w-3 text-blue-500 cursor-help" />
                          </Tooltip>
                        )}
                      </div>
                      <span className="text-xs">{Math.round(safeValue(stage.progress, 0))}%</span>
                    </div>
                    <Progress value={safeValue(stage.progress, 0)} className="h-1.5" />
                  </div>
                </div>
              )) : (
                <div className="text-sm text-muted-foreground">
                  No stage information available
                </div>
              )
            }
          </div>
        </div>

        {/* Conflict Information */}
        {hasConflicts && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-800">Conflicts Detected</h4>
                <p className="text-xs text-amber-600">
                  {progress.conflict_count 
                    ? `${progress.conflict_count} conflicts need your attention` 
                    : 'Some conflicts need your attention'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {progress.error_message && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Error</h4>
                <p className="text-xs text-red-600">{progress.error_message}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        {hasConflicts && (
          <Button 
            variant="default" 
            onClick={onViewConflicts}
            className="flex-1"
          >
            View Conflicts
          </Button>
        )}
        {isCompleted ? (
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => window.location.href = '/'}
          >
            Return to Dashboard
          </Button>
        ) : isFailed || isCancelled ? (
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => window.location.href = '/'}
          >
            {isFailed ? 'Merge Failed - Return Home' : 'Merge Cancelled - Return Home'}
          </Button>
        ) : (
          <Button 
            variant="destructive" 
            onClick={onCancel}
            className="flex-1"
            disabled={isFailed || isCancelled}
          >
            Cancel Merge
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}