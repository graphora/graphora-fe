'use client'

import React, { useState } from 'react'
import { 
  XCircle, 
  CheckCircle,
  MessageSquare,
  AlertTriangle,
  Info,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { type QualityResults } from '@/types/quality'

interface QualityActionButtonsProps {
  qualityResults: QualityResults;
  onApprove: (comment?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  className?: string;
}

export function QualityActionButtons({
  qualityResults,
  onApprove,
  onReject,
  className = ''
}: QualityActionButtonsProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      return;
    }

    try {
      setIsRejecting(true);
      await onReject(rejectionReason);
      setRejectDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await onApprove(approvalComment.trim() || undefined);
      setApproveDialogOpen(false);
      setApprovalComment('');
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setIsApproving(false);
    }
  };

  const getActionRecommendation = () => {
    const { overall_score, violations } = qualityResults;
    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;

    if (overall_score >= 90 && errorCount === 0) {
      return {
        type: 'auto-approve',
        message: 'High quality score with no errors. Safe to auto-approve.',
        tone: 'success' as const
      };
    } else if (overall_score >= 80 && errorCount <= 2) {
      return {
        type: 'manual-approve',
        message: 'Good quality with minor issues. Review and approve if acceptable.',
        tone: 'info' as const
      };
    } else if (overall_score >= 60 && errorCount <= 5) {
      return {
        type: 'review-required',
        message: 'Moderate quality issues detected. Careful review recommended.',
        tone: 'warning' as const
      };
    } else {
      return {
        type: 'reject-recommended',
        message: 'Significant quality issues found. Consider rejecting for re-extraction.',
        tone: 'destructive' as const
      };
    }
  };

  const recommendation = getActionRecommendation();
  const toneVariant = {
    success: 'success',
    info: 'info',
    warning: 'warning',
    destructive: 'destructive'
  } as const;
  const toneText = {
    success: 'text-success',
    info: 'text-info',
    warning: 'text-warning',
    destructive: 'text-destructive'
  } as const;
  const toneBorder = {
    success: 'border-l-success',
    info: 'border-l-info',
    warning: 'border-l-warning',
    destructive: 'border-l-destructive'
  } as const;
  const gradeBadgeClasses: Record<string, string> = {
    A: 'bg-success/15 text-success border-success/30 shadow-sm',
    B: 'bg-info/15 text-info border-info/30 shadow-sm',
    C: 'bg-warning/15 text-warning border-warning/30 shadow-sm',
    D: 'bg-warning/20 text-warning border-warning/40 shadow-sm',
    F: 'bg-destructive/15 text-destructive border-destructive/30 shadow-sm',
    default: 'bg-neutral/15 text-neutral-foreground border-neutral/30 shadow-sm'
  };
  const errorViolations = qualityResults.violations.filter(v => v.severity === 'error').length;
  const warningViolations = qualityResults.violations.filter(v => v.severity === 'warning').length;

  return (
    <div className={cn("bg-gradient-to-br from-muted/40 via-muted/30 to-background rounded-2xl p-10 border-2 border-border/60 shadow-lg", className)}>
      <div className="mb-8 text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">
          What would you like to do?
        </h3>
        <p className="text-muted-foreground">
          Review the quality results and decide whether to proceed with merge
        </p>
      </div>

      {/* Recommendation Alert */}
      <Alert
        variant={toneVariant[recommendation.tone]}
        className={cn('border-l-4 mb-8', toneBorder[recommendation.tone])}
      >
        <Info className={cn('h-4 w-4', toneText[recommendation.tone])} />
        <AlertDescription className={cn('font-semibold text-base', toneText[recommendation.tone])}>
          <strong>Recommendation:</strong> {recommendation.message}
        </AlertDescription>
      </Alert>

      {/* Action Buttons - Now Prominent */}
      <div className="flex flex-wrap justify-center gap-6 mb-8">
          {/* Approve Dialog */}
          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="cta"
              size="lg"
              disabled={isApproving}
              className="group relative px-10 py-6 text-lg font-semibold"
            >
              <CheckCircle className="h-6 w-6 mr-2" />
              Approve & Continue to Merge
            </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-background border-border">
              <DialogHeader>
                <DialogTitle className="text-heading text-foreground">Approve Quality Results</DialogTitle>
                <DialogDescription className="text-body-sm text-muted-foreground">
                  This will approve the quality validation and continue with the merge process. The data will be added to the knowledge graph.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <Alert variant="success">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success">
                    Quality score: {qualityResults.overall_score}% - {qualityResults.grade} grade
                  </AlertDescription>
                </Alert>

                <div className="space-y-content-sm">
                  <Label htmlFor="approval-comment">Approval Comment (Optional)</Label>
                  <Textarea
                    id="approval-comment"
                    placeholder="Add any comments about the approval (e.g., quality looks good, minor issues acceptable...)"
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setApproveDialogOpen(false)}
                  disabled={isApproving}
                >
                  Cancel
                </Button>
                <Button 
                  variant="success"
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="shadow-medium"
                >
                  {isApproving ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Approval
                      </>
                    )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reject Dialog */}
          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                disabled={isRejecting}
                className="px-8 py-6 text-lg border-2 hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all"
              >
                <XCircle className="h-6 w-6 mr-2" />
                Reject & Stop Process
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-background border-border">
              <DialogHeader>
                <DialogTitle className="text-heading text-foreground">Reject Quality Results</DialogTitle>
                <DialogDescription className="text-body-sm text-muted-foreground">
                  This will reject the quality validation and stop the merge process. The data will not be added to the knowledge graph.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-content">
                {errorViolations > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">
                      {errorViolations} critical error{errorViolations > 1 ? 's' : ''} detected in the data quality validation.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-content-sm">
                  <Label htmlFor="rejection-reason">Rejection Reason (Required)</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Explain why you're rejecting this data (e.g., too many errors, poor extraction quality, data inconsistencies...)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    required
                  />
                  {rejectionReason.trim() === '' && (
                    <p className="text-body-sm text-muted-foreground">
                      Please provide a reason for rejection to help improve future extractions.
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setRejectDialogOpen(false)}
                  disabled={isRejecting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Confirm Rejection
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

      {/* Summary Stats - Moved to bottom, less prominent */}
      <div className="text-center text-sm text-muted-foreground pt-6 border-t border-border/40">
        <p>Quality Score: <span className="font-semibold text-foreground">{Math.round(qualityResults.overall_score)}</span> •
        Errors: <span className="font-semibold text-destructive">{errorViolations}</span> •
        Warnings: <span className="font-semibold text-warning">{warningViolations}</span> •
        Grade: <span className="font-semibold text-foreground">{qualityResults.grade}</span></p>
      </div>
    </div>
  );
}
