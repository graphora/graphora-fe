import { useEffect, useState, useRef } from 'react';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import type { BadgeProps } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Clock, AlertCircle, CheckCircle, XCircle, Loader2, Info, Calendar, ArrowRight, CheckCircle2, AlertTriangle, ExternalLink, RefreshCcw } from 'lucide-react';
import { MergeProgress as MergeProgressType, MergeStage, MergeStageStatus, MergeStatus } from '@/types/merge';
import { format } from 'date-fns';
import { Tooltip } from './ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { toast } from './ui/use-toast';
import { Checkbox } from './ui/checkbox';
import { useLocalStorage } from '../hooks/use-local-storage';
import { cn } from '@/lib/utils';

const isDebugEnabled = process.env.NODE_ENV !== 'production'
const debug = (...args: unknown[]) => {
  if (isDebugEnabled) {
    console.debug('[MergeProgress]', ...args)
  }
}

interface MergeProgressProps {
  mergeId: string;
  sessionId: string;
  transformId: string,
  onViewConflicts?: () => void;
  onCancel?: () => void;
  onFinalize?: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
}

// Define the verification result type
interface VerificationResult {
  status: 'success' | 'error';
  data?: any;
  message?: string;
  issues: any[];
}

export function MergeProgress({ mergeId, sessionId, transformId, onViewConflicts, onCancel, onFinalize, onRetry, isRetrying }: MergeProgressProps) {
  // Helper function to calculate progress percentage based on merge status
  const calculateProgressFromStatus = (status: MergeStatus): number => {
    switch (status) {
      case MergeStatus.STARTED:
        return 10;
      case MergeStatus.AUTO_RESOLVE:
        return 30;
      case MergeStatus.HUMAN_REVIEW:
        return 50;
      case MergeStatus.READY_TO_MERGE:
        return 70;
      case MergeStatus.MERGE_IN_PROGRESS:
        return 85;
      case MergeStatus.COMPLETED:
        return 100;
      case MergeStatus.FAILED:
      case MergeStatus.CANCELLED:
        return 0;
      default:
        return 0;
    }
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<MergeProgressType>({
    merge_id: mergeId,
    overall_status: MergeStatus.STARTED,
    overall_progress: 0,
    current_stage: 'Initializing merge...',
    stages: [],
    has_conflicts: false,
    conflict_count: 0,
    start_time: new Date().toISOString(),
    elapsed_time: 0
  });
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [elapsedTimeStr, setElapsedTimeStr] = useState<string>('00:00');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [isFinalizingMerge, setIsFinalizingMerge] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showZeroConflictNotification, setShowZeroConflictNotification] = useState(false);
  const [hasShownNotification, setHasShownNotification] = useState(false);
  const [showConflictTour, setShowConflictTour] = useState(false);
  const [autoNavigateToConflicts, setAutoNavigateToConflicts] = useState(false); //useLocalStorage('autoNavigateToConflicts', false);
  const [hasShownConflictNotification, setHasShownConflictNotification] = useState(false);

  useEffect(() => {
    startTimeRef.current = null;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/merge/merges/${mergeId}/status`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch merge status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Adapt the data to our MergeProgressType
        const adaptedProgress: MergeProgressType = {
          merge_id: mergeId,
          overall_status: data.status,
          overall_progress: calculateProgressFromStatus(data.status),
          current_stage: data.current_stage || data.status,
          has_conflicts: data.status === MergeStatus.HUMAN_REVIEW,
          conflict_count: data.conflict_count || 0,
          start_time: data.start_time || new Date().toISOString(),
          elapsed_time: 0,
          // For COMPLETED status, ensure we have empty stages that will be filled by getStagesArray
          stages: data.status === MergeStatus.COMPLETED ? [] : data.stages || []
        };
        
        // Check if we need to fetch conflicts count
        if (data.status === MergeStatus.HUMAN_REVIEW) {
          try {
            const conflictsResponse = await fetch(`/api/merge/merges/${mergeId}/conflicts`);
            if (conflictsResponse.ok) {
              const conflictsData = await conflictsResponse.json();
              adaptedProgress.conflict_count = Array.isArray(conflictsData) ? conflictsData.length : 0;
            }
          } catch (err) {
            console.error('Error fetching conflicts:', err);
          }
        }
        
        startTimeRef.current = new Date(adaptedProgress.start_time);
        setProgress(adaptedProgress);
        debug('Merge status data:', adaptedProgress)
        
        // Handle conflict detection
        if (data.has_conflicts && data.conflict_count > 0 && !hasShownConflictNotification) {
          setHasShownConflictNotification(true);
          
          // Show conflict notification
          toast({
            title: "Conflicts Detected",
            description: `${data.conflict_count} conflicts need to be resolved before proceeding.`,
            variant: "destructive",
            action: (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => onViewConflicts?.()}
              >
                Resolve Now
              </Button>
            ),
          });

          // Auto-navigate to conflicts if enabled
          if (autoNavigateToConflicts && onViewConflicts) {
            onViewConflicts();
          }

          // Show conflict tour for first-time users
          const hasSeenTour = localStorage.getItem('hasSeenConflictTour');
          if (!hasSeenTour) {
            setShowConflictTour(true);
            localStorage.setItem('hasSeenConflictTour', 'true');
          }
        }
        
        // Check for zero conflicts scenario
        if (!data.has_conflicts && 
            (data.conflict_count === 0 || !data.conflict_count) &&
            data.overall_status !== 'completed' &&
            data.current_stage == 'apply_changes' &&
            !hasShownNotification) {
          setShowZeroConflictNotification(true);
          setHasShownNotification(true);
          
          // Show toast notification
          toast({
            title: "No Conflicts Detected",
            description: "Your merge has no conflicts and is ready to finalize.",
            variant: "default",
          });
        }
        
        setError(null);
        setRetryCount(0); // Reset retry count on successful fetch
      } catch (err) {
        console.error('Error fetching merge status:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch merge status');
        
        // Implement exponential backoff for retries
        if (retryCount < maxRetries) {
          const backoffTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          debug(`Retrying in ${backoffTime}ms (attempt ${retryCount + 1}/${maxRetries})`)
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
      const startTime = startTimeRef.current;
      if (!startTime) {
        return;
      }
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
      const seconds = (diff % 60).toString().padStart(2, '0');
      setElapsedTimeStr(`${minutes}:${seconds}`);
      setElapsedTime(diff);
    }, 1000);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mergeId, retryCount, hasShownConflictNotification, autoNavigateToConflicts, onViewConflicts, hasShownNotification]);

  const handleFinalizeMerge = async () => {
    if (!mergeId) return;
    
    try {
      setIsFinalizingMerge(true);
      
      // Show toast notification for starting finalization
      toast({
        title: "Finalizing Merge",
        description: "Starting the finalization process...",
        variant: "default",
      });
      
      // Call the merge status endpoint again to get the latest status
      const response = await fetch(`/api/merge/merges/${mergeId}/status`);
      
      if (!response.ok) {
        throw new Error(`Failed to get merge status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // If status is ready to merge, proceed with finalization
      if (data.status === MergeStatus.READY_TO_MERGE) {
        // Update status to show merge in progress
        setProgress(prev => ({
          ...prev,
          overall_status: MergeStatus.MERGE_IN_PROGRESS,
          overall_progress: calculateProgressFromStatus(MergeStatus.MERGE_IN_PROGRESS)
        }));
        
        // Fetch merge statistics
        const statsResponse = await fetch(`/api/merge/merges/${mergeId}/statistics`);
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          // Add stats to verification result
          setVerificationResult({
            status: 'success',
            data: statsData,
            issues: []
          });
        }
        
        // Update status to show completion
        setProgress(prev => ({
          ...prev,
          overall_status: MergeStatus.COMPLETED,
          overall_progress: 100
        }));
        
        // Call the onFinalize callback if provided
        if (onFinalize) {
          onFinalize();
        }
        
        // Show completion toast
        toast({
          title: "Merge Complete",
          description: "The merge has been successfully completed.",
          variant: "default",
        });
      } else {
        toast({
          title: "Cannot Finalize",
          description: `Merge is not ready to be finalized. Current status: ${data.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error finalizing merge:', error);
      toast({
        title: "Error",
        description: "Failed to finalize the merge process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizingMerge(false);
    }
  };
  
  const finaliseMerge = async () => {
    try {
      const response = await fetch(`/api/merge/merges/${mergeId}/${sessionId}/${transformId}/finalise`);
      
      if (!response.ok) {
        throw new Error(`Failed to verify merge: ${response.status}`);
      }
      
      const data = await response.json();
      debug('Verification result:', data)
      
      // Format the verification result
      const formattedResult: VerificationResult = {
        status: data.status == 'false' ? 'error' : 'success',
        data: data,
        issues: data.checks || []
      };
      
      setVerificationResult(formattedResult);
      return formattedResult;
    } catch (error) {
      console.error('Error verifying merge:', error);
      
      // Set error verification result
      const errorResult: VerificationResult = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred during verification',
        issues: []
      };
      
      setVerificationResult(errorResult);
      return errorResult;
    }
  };

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

  type BadgeVariant = NonNullable<BadgeProps['variant']>
  type StatusBadgeConfig = {
    label: string
    variant: BadgeVariant
    className?: string
  }

  const statusBadgeMap: Record<string, StatusBadgeConfig> = {
    [MergeStatus.STARTED]: { label: 'Started', variant: 'info' },
    [MergeStatus.AUTO_RESOLVE]: { label: 'Auto Resolving', variant: 'info' },
    [MergeStatus.HUMAN_REVIEW]: { label: 'Needs Review', variant: 'warning' },
    [MergeStatus.READY_TO_MERGE]: { label: 'Ready to Finalize', variant: 'success', className: 'animate-pulse-subtle' },
    [MergeStatus.MERGE_IN_PROGRESS]: { label: 'Merging', variant: 'info' },
    [MergeStatus.COMPLETED]: { label: 'Completed', variant: 'success' },
    [MergeStatus.FAILED]: { label: 'Failed', variant: 'destructive' },
    [MergeStatus.CANCELLED]: { label: 'Cancelled', variant: 'neutral' },
    READY_TO_FINALIZE: { label: 'Ready to Finalize', variant: 'success', className: 'animate-pulse-subtle' },
  }

  const getStatusBadge = (status: string) => {
    const fallback: StatusBadgeConfig = {
      label: status,
      variant: 'neutral',
    }

    const config = statusBadgeMap[status as keyof typeof statusBadgeMap] ?? fallback;

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getStageIcon = (stage: MergeStage) => {
    switch (stage.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-info animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Add a safe access helper function
  const safeValue = (value: any, defaultValue: any) => {
    return value !== undefined && value !== null ? value : defaultValue;
  };

  // Add a helper function to convert stages_progress object to array if needed
  const getStagesArray = (): MergeStage[] => {
    // Default stages in order
    const defaultStages = [
      'analyze',
      'auto_resolve',
      'human_review',
      'verification',
      'final_merge'
    ];

    // If the merge is completed, mark all stages as completed regardless of what's in progress.stages
    if (progress.overall_status === MergeStatus.COMPLETED) {
      debug('Merge is COMPLETED, marking all stages as completed')
      return defaultStages.map(stageName => ({
        name: stageName,
        status: 'completed' as MergeStageStatus,
        progress: 100,
        start_time: progress.start_time,
        end_time: new Date().toISOString()
      }));
    }

    if (Array.isArray(progress?.stages) && progress?.stages.length > 0) {
      return progress.stages;
    } 
    
    if (progress?.stages_progress) {
      // Convert stages_progress object to array if it exists
      if (typeof progress.stages_progress === 'object' && !Array.isArray(progress.stages_progress)) {
        return Object.entries(progress.stages_progress).map(([key, value]: [string, any]) => ({
          name: key,
          status: value?.status || 'pending',
          progress: value?.percentage_complete || 0,
          start_time: value?.start_time,
          end_time: value?.end_time
        })).sort((a, b) => {
          const aTime = a.end_time ? new Date(a.end_time).getTime() : Number.POSITIVE_INFINITY;
          const bTime = b.end_time ? new Date(b.end_time).getTime() : Number.POSITIVE_INFINITY;
          return aTime - bTime;
        });
      } else if (Array.isArray(progress.stages_progress)) {
        return progress.stages_progress;
      }
    }
    
    // Return default stages with appropriate status based on current stage
    return defaultStages.map(stageName => {
      const isCurrent = progress?.current_stage === stageName;
      const stageIndex = defaultStages.indexOf(stageName);
      const currentIndex = defaultStages.indexOf(progress?.current_stage || '');
      
      let status: MergeStageStatus = 'pending';
      if (stageIndex < currentIndex) {
        status = 'completed';
      } else if (isCurrent) {
        status = 'running';
      }

      return {
        name: stageName,
        status,
        progress: status === 'completed' ? 100 : isCurrent ? progress?.overall_progress || 0 : 0,
        start_time: isCurrent ? progress?.start_time : undefined,
        end_time: status === 'completed' ? progress?.start_time : undefined
      };
    });
  };

  if (loading && !progress.merge_id) {
    return (
      <Card variant="glass" className="w-full">
        <CardContent className="pt-6 flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-content-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-body-sm text-muted-foreground">Loading merge status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="glass" className="w-full border-red-200/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-heading">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Merge Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-body-sm text-destructive">{error}</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const hasConflicts = progress.has_conflicts || progress.overall_status === MergeStatus.HUMAN_REVIEW;
  const isReadyToFinalize = progress.overall_status === MergeStatus.READY_TO_MERGE;

  return (
    <Card variant="glass" className="w-full flex flex-col max-h-[calc(100vh-100px)] min-h-[500px] shadow-soft">
      <CardHeader className="flex-shrink-0 p-6 pb-content-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <CardDescription>
              Started {formatDateTime(progress.start_time)}
            </CardDescription>
            {progress.overall_status !== MergeStatus.COMPLETED &&
              progress.overall_status !== MergeStatus.FAILED &&
              progress.overall_status !== MergeStatus.CANCELLED && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded whitespace-nowrap">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-mono">{elapsedTimeStr}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {getStatusBadge(progress.overall_status)}
            {progress.conflict_count > 0 && progress.overall_status === MergeStatus.HUMAN_REVIEW && (
              <Badge variant="destructive" className="animate-pulse">
                {progress.conflict_count} Conflicts
              </Badge>
            )}
            {progress.overall_status === MergeStatus.READY_TO_MERGE && (
              <Badge variant="success">
                No Conflicts
              </Badge>
            )}
            {progress.overall_status === MergeStatus.COMPLETED && (
              <Badge variant="success">
                Merged
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-6">
        <div className="space-y-5">
          {/* Conflict Alert */}
          {progress.overall_status === MergeStatus.HUMAN_REVIEW && progress.conflict_count > 0 && (
          <Alert variant="warning" className="animate-fadeIn border-warning/40 bg-warning/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Action Required: Conflicts Detected</AlertTitle>
            <AlertDescription className="text-warning/80 text-sm">
              {progress.conflict_count} conflicts need to be resolved before the merge can proceed.
            </AlertDescription>
            <div className="flex flex-col gap-2 mt-3">
              <Button
                variant="warning"
                size="sm"
                className="bg-amber-500 text-amber-950 hover:bg-amber-400 w-fit"
                onClick={onViewConflicts}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View and Resolve Conflicts
              </Button>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="autoNavigate"
                  checked={autoNavigateToConflicts}
                  onCheckedChange={(checked) => setAutoNavigateToConflicts(checked as boolean)}
                />
                <label htmlFor="autoNavigate" className="text-xs text-warning/70 cursor-pointer">
                  Always take me to conflict resolution when conflicts are detected
                </label>
              </div>
            </div>
          </Alert>
        )}

          {/* Ready to Merge Notification */}
          {progress.overall_status === MergeStatus.READY_TO_MERGE && (
          <Alert variant="success" className="animate-fadeIn">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Merged!</AlertTitle>
            <AlertDescription className="text-success/90 text-sm">
              Great news! All conflicts have been resolved. The merge process is complete.
            </AlertDescription>
          </Alert>
        )}

          {/* Failed Merge Notification */}
          {progress.overall_status === MergeStatus.FAILED && (
          <Alert variant="destructive" className="animate-fadeIn border-destructive/40 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Merge Failed</AlertTitle>
            <AlertDescription className="text-destructive/80 text-sm">
              The merge process encountered an error and could not be completed. You can retry the merge once the issue is addressed.
            </AlertDescription>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 mt-3 w-fit"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Retry Merge
                  </>
                )}
              </Button>
            )}
          </Alert>
        )}

          {/* Completed Merge Notification */}
          {progress.overall_status === MergeStatus.COMPLETED && (
          <Alert variant="success" className="animate-fadeIn">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Merge Completed Successfully!</AlertTitle>
            <AlertDescription className="text-success/90 text-sm">
              Excellent! The merge has been completed successfully. All data has been merged into the production database.
            </AlertDescription>
          </Alert>
        )}

          {/* Verification Results */}
          {verificationResult && (
          <Alert
            variant={verificationResult.status === 'success' ? 'success' : 'warning'}
          >
            {verificationResult.status === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{verificationResult.status === 'success' ? 'Merge Successful' : 'Verification Complete'}</AlertTitle>
            <AlertDescription className="text-sm">
              {verificationResult.status === 'success'
                ? 'The merge has been verified successfully with no issues found.'
                : `Verification completed with ${verificationResult.issues?.length || 0} issues.`}
            </AlertDescription>
          </Alert>
        )}

          {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-body-sm">
            <span>Overall Progress</span>
            <Badge variant="outline" className="border-border/60 text-muted-foreground bg-background/60">
              {progress.overall_status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <Progress 
            value={progress.overall_progress} 
            indicatorClassName={progress.overall_status === MergeStatus.COMPLETED ? 'bg-success' : 'bg-info'}
          />
        </div>

          {/* Stage Progress */}
        <div className="space-y-3">
          <h4 className="text-body-sm font-medium text-muted-foreground">Stages</h4>
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
            {getStagesArray().map((stage, idx) => {
              const isCompleted = stage.status === 'completed'
              const isCurrent = stage.status === 'running'
              const isPending = stage.status === 'pending'

              return (
                <div key={stage.name} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all',
                        isCompleted
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-md'
                          : isCurrent
                            ? 'border-primary bg-primary/20 text-primary shadow-sm'
                            : 'border-muted-foreground/30 bg-muted/30 text-muted-foreground'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : isCurrent ? (
                        <span className="text-xs font-bold">{Math.round(stage.progress)}%</span>
                      ) : (
                        <span className="text-xs">{stage.name.split('_').map((word) => word[0]).join('').toUpperCase()}</span>
                      )}
                    </div>
                    <div className="text-center max-w-[90px]">
                      <div className={cn(
                        "text-[11px] font-medium capitalize leading-tight",
                        isCompleted ? "text-emerald-600" : isCurrent ? "text-primary" : "text-muted-foreground"
                      )}>
                        {stage.name.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                  {idx < getStagesArray().length - 1 && (
                    <div className={cn(
                      "h-0.5 w-8 mb-6 transition-colors",
                      isCompleted ? "bg-emerald-500" : "bg-muted-foreground/30"
                    )} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
        </div>
      </CardContent>
      
      {/* Action Buttons - Fixed at the bottom */}
      <CardFooter className="sticky bottom-0 z-10 mt-auto flex flex-col gap-content-sm border-t border-border/60 bg-background/80 px-6 py-content backdrop-blur-sm sm:flex-row sm:justify-between">
        <div>
          {onCancel && (progress.overall_status === MergeStatus.STARTED || 
                         progress.overall_status === MergeStatus.AUTO_RESOLVE ||
                         progress.overall_status === MergeStatus.HUMAN_REVIEW) && (
            <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              Cancel Merge
            </Button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {progress.overall_status === MergeStatus.HUMAN_REVIEW && onViewConflicts && (
            <Button 
              onClick={onViewConflicts} 
              variant="warning"
              className="w-full sm:w-auto"
              size="lg"
            >
              <AlertTriangle className="mr-2 h-5 w-5" />
              Resolve {progress.conflict_count} Conflicts
            </Button>
          )}
        </div>
      </CardFooter>

      {/* Floating Action Button for Conflicts */}
      {progress.overall_status === MergeStatus.HUMAN_REVIEW && onViewConflicts && (
        <div className="fixed bottom-6 right-6 z-50 sm:hidden">
          <Button
            onClick={onViewConflicts}
            variant="warning"
            className="rounded-full w-14 h-14 shadow-lg"
          >
            <div className="relative">
              <AlertTriangle className="h-6 w-6" />
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 min-w-[1.5rem] h-6 rounded-full animate-pulse"
              >
                {progress.conflict_count}
              </Badge>
            </div>
          </Button>
        </div>
      )}
    </Card>
  );
}
