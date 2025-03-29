import { useEffect, useState, useRef } from 'react';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Clock, AlertCircle, CheckCircle, XCircle, Loader2, ArrowRight, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { MergeProgress as MergeProgressType, MergeStage, MergeStageStatus, MergeStatus } from '@/types/merge';
import { format } from 'date-fns';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from './ui/use-toast';
import { Checkbox } from './ui/checkbox';

interface MergeProgressProps {
  mergeId: string;
  sessionId: string;
  transformId: string,
  onViewConflicts?: () => void;
  onCancel?: () => void;
  onFinalize?: () => void;
}

// Define the verification result type
interface VerificationResult {
  status: 'success' | 'error';
  data?: any;
  message?: string;
  issues: any[];
}

export function MergeProgress({ mergeId, sessionId, transformId, onViewConflicts, onCancel, onFinalize }: MergeProgressProps) {
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
  const [showDetails, setShowDetails] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [isFinalizingMerge, setIsFinalizingMerge] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [autoNavigateToConflicts, setAutoNavigateToConflicts] = useState(false);
  const [hasShownConflictNotification, setHasShownConflictNotification] = useState(false);
  const [isFirstStatusCheck, setIsFirstStatusCheck] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/merge/merges/${mergeId}/status`);
        
        // Don't show 404 errors during initial polling
        if (response.status === 404 && isFirstStatusCheck) {
          console.log('Status not available yet, will retry...');
          setIsFirstStatusCheck(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch merge status: ${response.status}`);
        }
        
        const data = await response.json();
        setIsFirstStatusCheck(false);
        
        // Adapt the data to our MergeProgressType
        const adaptedProgress: MergeProgressType = {
          merge_id: mergeId,
          overall_status: data.status,
          overall_progress: calculateProgressFromStatus(data.status),
          current_stage: data.status,
          has_conflicts: data.status === MergeStatus.HUMAN_REVIEW,
          conflict_count: 0, // Will be updated if needed
          start_time: data.start_time || new Date().toISOString(),
          elapsed_time: 0
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
        
        setProgress(adaptedProgress);
        console.log('Merge status data:', adaptedProgress);
        
        // Handle conflict detection
        if (adaptedProgress.has_conflicts && 
            adaptedProgress.conflict_count > 0 && 
            !hasShownConflictNotification) {
          setHasShownConflictNotification(true);
          
          // Show conflict notification
          toast({
            title: "Conflicts Detected",
            description: `${adaptedProgress.conflict_count} conflicts need to be resolved before proceeding.`,
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
        }
        
        // If status changes to READY_TO_MERGE, show notification
        if (data.status === MergeStatus.READY_TO_MERGE && 
            progress.overall_status !== MergeStatus.READY_TO_MERGE) {
          toast({
            title: "Ready to Merge",
            description: "All conflicts have been resolved. The merge is ready to be finalized.",
            variant: "default",
          });
        }
        
        // If status changes to COMPLETED, show notification
        if (data.status === MergeStatus.COMPLETED && 
            progress.overall_status !== MergeStatus.COMPLETED) {
          toast({
            title: "Merge Completed",
            description: "The merge process has been completed successfully.",
            variant: "default",
          });
        }
        
        setError(null);
        setRetryCount(0); // Reset retry count on successful fetch
      } catch (err) {
        console.error('Error fetching merge status:', err);
        
        // Don't show error during first status check
        if (!isFirstStatusCheck) {
          setError(err instanceof Error ? err.message : 'Failed to fetch merge status');
        }
        
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

    // Only fetch if we have a mergeId
    if (mergeId) {
      // Fetch immediately
      fetchStatus();
      
      // Start polling
      intervalRef.current = setInterval(fetchStatus, 10000); // Poll every 10 seconds
      
      // Start timer for elapsed time
      timerRef.current = setInterval(() => {
        const startTime = new Date(progress.start_time);
        const now = new Date();
        const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
        const seconds = (diff % 60).toString().padStart(2, '0');
        setElapsedTimeStr(`${minutes}:${seconds}`);
        setElapsedTime(diff);
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mergeId, retryCount, hasShownConflictNotification, autoNavigateToConflicts, onViewConflicts, progress.overall_status, progress.start_time, isFirstStatusCheck]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case MergeStatus.STARTED:
        return <Badge className="bg-blue-500 hover:bg-blue-600">Started</Badge>;
      case MergeStatus.AUTO_RESOLVE:
        return <Badge className="bg-blue-500 hover:bg-blue-600">Auto Resolving</Badge>;
      case MergeStatus.HUMAN_REVIEW:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Needs Review</Badge>;
      case MergeStatus.READY_TO_MERGE:
        return <Badge className="bg-green-500 hover:bg-green-600 animate-pulse-subtle">Ready to Finalize</Badge>;
      case MergeStatus.MERGE_IN_PROGRESS:
        return <Badge className="bg-blue-500 hover:bg-blue-600">Merging</Badge>;
      case MergeStatus.COMPLETED:
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case MergeStatus.FAILED:
        return <Badge className="bg-red-500 hover:bg-red-600">Failed</Badge>;
      case MergeStatus.CANCELLED:
        return <Badge className="bg-gray-500 hover:bg-gray-600">Cancelled</Badge>;
      case 'READY_TO_FINALIZE':
        return <Badge className="bg-green-500 hover:bg-green-600 animate-pulse-subtle">Ready to Finalize</Badge>;
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

  // Add a helper function to convert stages_progress object to array if needed
  const getStagesArray = (): MergeStage[] => {
    // Default stages in order based on MergeStatus
    const defaultStages = [
      'analyze',
      'auto_resolve',
      'human_review',
      'verification',
      'final_merge'
    ];

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
      const statusMap: Record<string, MergeStatus> = {
        'analyze': MergeStatus.STARTED,
        'auto_resolve': MergeStatus.AUTO_RESOLVE,
        'human_review': MergeStatus.HUMAN_REVIEW,
        'verification': MergeStatus.READY_TO_MERGE,
        'final_merge': MergeStatus.MERGE_IN_PROGRESS
      };
      
      const stageStatus = statusMap[stageName];
      let status: MergeStageStatus = 'pending';
      
      if (progress.overall_status === MergeStatus.COMPLETED) {
        status = 'completed';
      } else if (progress.overall_status === stageStatus) {
        status = 'running';
      } else if (progress.overall_status === MergeStatus.FAILED || 
                progress.overall_status === MergeStatus.CANCELLED) {
        status = 'failed';
      } else {
        const allStatuses = Object.values(MergeStatus);
        const currentIndex = allStatuses.indexOf(progress.overall_status);
        const stageIndex = allStatuses.indexOf(stageStatus);
        
        if (stageIndex < currentIndex) {
          status = 'completed';
        }
      }

      return {
        name: stageName,
        status,
        progress: status === 'completed' ? 100 : 
                 status === 'running' ? calculateProgressFromStatus(progress.overall_status) : 0,
        start_time: status === 'running' || status === 'completed' ? progress?.start_time : undefined,
        end_time: status === 'completed' ? progress?.start_time : undefined
      };
    });
  };

  if (loading && !progress.merge_id) {
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

  if (error && !isFirstStatusCheck) {
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

  const hasConflicts = progress.has_conflicts || progress.overall_status === MergeStatus.HUMAN_REVIEW;
  const isReadyToFinalize = progress.overall_status === MergeStatus.READY_TO_MERGE;

  return (
    <Card className="w-full flex flex-col max-h-[calc(100vh-100px)] min-h-[500px]">
      <CardHeader className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle>Merge Progress</CardTitle>
            <CardDescription>
              Started {formatDateTime(progress.start_time)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {getStatusBadge(progress.overall_status)}
            {progress.conflict_count > 0 && progress.overall_status === MergeStatus.HUMAN_REVIEW && (
              <Badge variant="destructive" className="ml-2 animate-pulse">
                {progress.conflict_count} Conflicts
              </Badge>
            )}
            {progress.overall_status === MergeStatus.READY_TO_MERGE && (
              <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 border-green-300">
                No Conflicts
              </Badge>
            )}
            {progress.overall_status === MergeStatus.COMPLETED && (
              <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 border-green-300">
                Merged
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-y-auto flex-grow">
        {/* Conflict Alert */}
        {progress.overall_status === MergeStatus.HUMAN_REVIEW && progress.conflict_count > 0 && ( 
          <Alert className="bg-amber-50 border-amber-200 animate-fadeIn mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div className="font-medium text-amber-800">Action Required: Conflicts Detected</div>
            <AlertDescription className="text-amber-700">
              <p className="mb-2">
                {progress.conflict_count} conflicts need to be resolved before the merge can proceed.
                Please review and resolve these conflicts to continue.
              </p>
              <div className="flex flex-col gap-4">
                <Button 
                  variant="secondary"
                  onClick={onViewConflicts}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900"
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
                  <label htmlFor="autoNavigate" className="text-sm text-amber-800 cursor-pointer">
                    Always take me to conflict resolution when conflicts are detected
                  </label>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Ready to Merge Notification */}
        {progress.overall_status === MergeStatus.READY_TO_MERGE && (
          <Alert className="bg-green-50 border-green-200 animate-fadeIn mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="font-medium text-green-800">Ready to Merge!</div>
            <AlertDescription className="text-green-700">
              Great news! All conflicts have been resolved and the merge is ready to finalize. 
              <strong className="block mt-1">Please click the "Finalize Merge" button below to complete the process.</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Verification Results */}
        {verificationResult && (
          <Alert className={verificationResult.status === 'success' ? 'bg-green-50 border-green-200 mb-4' : 'bg-amber-50 border-amber-200 mb-4'}>
            {verificationResult.status === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
            <div className="font-medium">{verificationResult.status === 'success' ? 'Merge Successful' : 'Verification Complete'}</div>
            <AlertDescription>
              {verificationResult.status === 'success' 
                ? 'The merge has been verified successfully with no issues found.'
                : `Verification completed with ${verificationResult.issues?.length || 0} issues.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Overall Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{progress.overall_status}</span>
          </div>
          <Progress 
            value={progress.overall_progress} 
            className={progress.overall_status === MergeStatus.COMPLETED ? "bg-green-100" : "bg-gray-100"}
            indicatorClassName={progress.overall_status === MergeStatus.COMPLETED ? "bg-green-500" : undefined}
          />
        </div>

        {/* Stage Progress */}
        <div className="space-y-4 mb-4">
          <h4 className="text-sm font-medium">Stages</h4>
          <div className="space-y-4">
            {getStagesArray().map((stage, index) => (
              <div key={stage.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStageIcon(stage)}
                    <span className="text-sm font-medium capitalize">
                      {stage.name.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stage.status === 'completed' ? '100%' : stage.status === 'running' ? `${Math.round(stage.progress)}%` : ''}
                  </div>
                </div>
                {stage.status === 'running' && (
                  <Progress value={stage.progress} className="h-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Time Information */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span>Elapsed Time</span>
            </div>
            <div className="text-lg font-semibold">
              {elapsedTimeStr}
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Action Buttons - Fixed at the bottom */}
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t mt-auto flex-shrink-0 bg-white sticky bottom-0 z-10 pb-4">
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
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
              size="lg"
            >
              <AlertTriangle className="mr-2 h-5 w-5" />
              Resolve {progress.conflict_count} Conflicts
            </Button>
          )}
          
          {progress.overall_status === MergeStatus.READY_TO_MERGE && (
            <Button 
              onClick={handleFinalizeMerge} 
              disabled={isFinalizingMerge}
              className="bg-green-600 hover:bg-green-700 text-white animate-pulse-subtle w-full sm:w-auto"
              size="lg"
            >
              {isFinalizingMerge ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-5 w-5" />
                  Finalize Merge
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>

      {/* Floating Action Button for Conflicts */}
      {progress.overall_status === MergeStatus.HUMAN_REVIEW && onViewConflicts && (
        <div className="fixed bottom-6 right-6 z-50 sm:hidden">
          <Button
            onClick={onViewConflicts}
            className="rounded-full w-14 h-14 bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
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
