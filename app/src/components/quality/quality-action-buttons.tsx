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
    <Card variant="glass" className={className}>
      <CardHeader className="p-6 pb-3">
        <CardTitle className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Quality Review Actions
        </CardTitle>
        <CardDescription>
          Review the quality results and decide whether to proceed with merge
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-content">
        {/* Recommendation Alert */}
        <Alert 
          variant={toneVariant[recommendation.tone]}
          className={cn('border-l-4', toneBorder[recommendation.tone])}
        >
          <Info className={cn('h-4 w-4', toneText[recommendation.tone])} />
          <AlertDescription className={cn('font-medium', toneText[recommendation.tone])}>
            <strong>Recommendation:</strong> {recommendation.message}
          </AlertDescription>
        </Alert>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-[var(--border-radius)] border border-border/60 bg-white/5 backdrop-blur-sm">
            <div className="text-display-sm font-semibold text-info">
              {Math.round(qualityResults.overall_score)}
            </div>
            <div className="text-body-sm text-muted-foreground">Quality Score</div>
          </div>
          <div className="text-center p-4 rounded-[var(--border-radius)] border border-border/60 bg-white/5 backdrop-blur-sm">
            <div className="text-display-sm font-semibold text-destructive">
              {errorViolations}
            </div>
            <div className="text-body-sm text-muted-foreground">Errors</div>
          </div>
          <div className="text-center p-4 rounded-[var(--border-radius)] border border-border/60 bg-white/5 backdrop-blur-sm">
            <div className="text-display-sm font-semibold text-warning">
              {warningViolations}
            </div>
            <div className="text-body-sm text-muted-foreground">Warnings</div>
          </div>
          <div className="text-center p-4 rounded-[var(--border-radius)] border border-border/60 bg-white/5 backdrop-blur-sm">
            <Badge 
              variant="outline" 
              className={cn('text-lg px-3 py-1', gradeBadgeClasses[qualityResults.grade] ?? gradeBadgeClasses.default)}
            >
              Grade {qualityResults.grade}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-content">
          {/* Approve Dialog */}
          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="glass" 
              size="lg"
              disabled={isApproving}
              className="px-6"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Approve & Continue
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
                variant="destructive" 
                size="lg"
                disabled={isRejecting}
                className="px-6"
              >
                <XCircle className="h-5 w-5 mr-2" />
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

        {/* Additional Info */}
        <div className="text-body-xs text-muted-foreground space-y-1 border-t pt-4">
          <div>Transform ID: {qualityResults.transform_id}</div>
          <div>Validation completed: {new Date(qualityResults.validation_timestamp).toLocaleString()}</div>
          <div>Rules applied: {qualityResults.rules_applied} | Duration: {qualityResults.validation_duration_ms}ms</div>
        </div>
      </CardContent>
    </Card>
  );
}
