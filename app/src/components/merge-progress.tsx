import { useEffect, useState, useRef } from 'react';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Clock, AlertCircle, CheckCircle, XCircle, Loader2, Info, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { MergeProgress as MergeProgressType, MergeStage, MergeStageStatus } from '@/types/merge';
import { format } from 'date-fns';
import { Tooltip } from './ui/tooltip';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from './ui/use-toast';

interface MergeProgressProps {
  mergeId: string;
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

export function MergeProgress({ mergeId, onViewConflicts, onCancel, onFinalize }: MergeProgressProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<MergeProgressType>({
    merge_id: mergeId,
    overall_status: 'running',
    overall_progress: 0,
    current_stage: 'analyze',
    start_time: new Date().toISOString(),
    stages_progress: [],
    has_conflicts: false,
    conflict_count: 0
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [isFinalizingMerge, setIsFinalizingMerge] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showZeroConflictNotification, setShowZeroConflictNotification] = useState(false);
  const [hasShownNotification, setHasShownNotification] = useState(false);

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
        
        // Check for zero conflicts scenario
        if ((data.current_stage === 'conflict_detection' || data.current_stage === 'merge') && 
            !data.has_conflicts && 
            (data.conflict_count === 0 || !data.conflict_count) &&
            data.overall_status == 'completed' &&
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
  }, [mergeId, retryCount, hasShownNotification]);

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
      
      // Call the apply-strategies endpoint
      const response = await fetch(`/api/merge/${mergeId}/apply-strategies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Empty strategies object since no conflicts
      });
      
      if (!response.ok) {
        throw new Error(`Failed to finalize merge: ${response.status}`);
      }
      
      // Show success toast
      toast({
        title: "Merge Finalized",
        description: "The merge process has been successfully finalized.",
        variant: "default",
      });
      
      // Verify the merge
      await verifyMerge();
      
      // Update status to show completion
      setProgress(prev => ({
        ...prev,
        overall_status: 'completed',
        overall_progress: 100
      }));
      
      // Call the onFinalize callback if provided
      if (onFinalize) {
        onFinalize();
      }
      
      // Show completion toast
      toast({
        title: "Merge Complete",
        description: "The merge has been successfully completed with no conflicts.",
        variant: "default",
      });
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
  
  const verifyMerge = async () => {
    try {
      const response = await fetch(`/api/merge/${mergeId}/verify`);
      
      if (!response.ok) {
        throw new Error(`Failed to verify merge: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Verification result:', data);
      
      // Format the verification result
      const formattedResult: VerificationResult = {
        status: 'success',
        data: data,
        issues: data.issues || []
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-500 hover:bg-blue-600">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-500 hover:bg-red-600">Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>;
      case 'cancelled':
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

  // Add a safe access helper function
  const safeValue = (value: any, defaultValue: any) => {
    return value !== undefined && value !== null ? value : defaultValue;
  };

  // Add a helper function to convert stages_progress object to array if needed
  const getStagesArray = (): MergeStage[] => {
    // Default stages in order
    const defaultStages = [
      'analyze',
      'conflict_detection',
      'merge',
      'verification'
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
        }));
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

  const hasConflicts = progress.has_conflicts || progress.overall_status === 'pending';
  const isReadyToFinalize = (progress.current_stage === 'conflict_detection' || 
                           progress.current_stage === 'merge') &&
                           !progress.has_conflicts && 
                           (progress.conflict_count === 0 || !progress.conflict_count) &&
                           progress.overall_status == 'completed';

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
            {getStatusBadge(isReadyToFinalize ? 'READY_TO_FINALIZE' : progress.overall_status)}
            {progress.conflict_count > 0 && (
              <Badge variant="outline" className="ml-2">
                {progress.conflict_count} Conflicts
              </Badge>
            )}
            {isReadyToFinalize && (
              <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 border-green-300">
                No Conflicts
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-y-auto flex-grow">
        {/* Zero Conflict Notification */}
        {showZeroConflictNotification && (
          <Alert className="bg-green-50 border-green-200 animate-fadeIn mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="font-medium text-green-800">No Conflicts Detected!</div>
            <AlertDescription className="text-green-700">
              Great news! This merge has no conflicts and is ready to finalize. 
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
            <span>{Math.round(progress.overall_progress)}%</span>
          </div>
          <Progress value={progress.overall_progress} className="h-2" />
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
              {formatTime(elapsedTime)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span>Estimated Remaining</span>
            </div>
            <div className="text-lg font-semibold">
              {getEstimatedTimeRemaining()}
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Action Buttons - Fixed at the bottom */}
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t mt-auto flex-shrink-0 bg-white sticky bottom-0 z-10 pb-4">
        <div>
          {onCancel && progress.overall_status === 'running' && (
            <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              Cancel Merge
            </Button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {hasConflicts && onViewConflicts && (
            <Button onClick={onViewConflicts} className="w-full sm:w-auto">
              View Conflicts
            </Button>
          )}
          
          {isReadyToFinalize && (
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
    </Card>
  );
}