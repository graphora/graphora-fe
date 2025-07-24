'use client'

import React, { useState } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  AlertTriangle,
  Info,
  Loader2,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await onApprove(approvalComment || undefined);
      setApproveDialogOpen(false);
      setApprovalComment('');
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setIsApproving(false);
    }
  };

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

  const getActionRecommendation = () => {
    const { overall_score, violations, requires_review } = qualityResults;
    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;

    if (overall_score >= 90 && errorCount === 0) {
      return {
        type: 'auto-approve',
        message: 'High quality score with no errors. Safe to auto-approve.',
        color: 'green'
      };
    } else if (overall_score >= 80 && errorCount <= 2) {
      return {
        type: 'manual-approve',
        message: 'Good quality with minor issues. Review and approve if acceptable.',
        color: 'blue'
      };
    } else if (overall_score >= 60 && errorCount <= 5) {
      return {
        type: 'review-required',
        message: 'Moderate quality issues detected. Careful review recommended.',
        color: 'yellow'
      };
    } else {
      return {
        type: 'reject-recommended',
        message: 'Significant quality issues found. Consider rejecting for re-extraction.',
        color: 'red'
      };
    }
  };

  const recommendation = getActionRecommendation();
  const errorViolations = qualityResults.violations.filter(v => v.severity === 'error').length;
  const warningViolations = qualityResults.violations.filter(v => v.severity === 'warning').length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Quality Review Actions
        </CardTitle>
        <CardDescription>
          Review the quality results and decide whether to proceed with merge
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recommendation Alert */}
        <Alert className={`border-l-4 ${
          recommendation.color === 'green' ? 'border-l-green-500 bg-green-50' :
          recommendation.color === 'blue' ? 'border-l-blue-500 bg-blue-50' :
          recommendation.color === 'yellow' ? 'border-l-yellow-500 bg-yellow-50' :
          'border-l-red-500 bg-red-50'
        }`}>
          <Info className="h-4 w-4" />
          <AlertDescription className="font-medium">
            <strong>Recommendation:</strong> {recommendation.message}
          </AlertDescription>
        </Alert>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(qualityResults.overall_score)}
            </div>
            <div className="text-sm text-muted-foreground">Quality Score</div>
          </div>
          <div className="text-center p-4 rounded-lg border">
            <div className="text-2xl font-bold text-red-600">
              {errorViolations}
            </div>
            <div className="text-sm text-muted-foreground">Errors</div>
          </div>
          <div className="text-center p-4 rounded-lg border">
            <div className="text-2xl font-bold text-amber-600">
              {warningViolations}
            </div>
            <div className="text-sm text-muted-foreground">Warnings</div>
          </div>
          <div className="text-center p-4 rounded-lg border">
            <Badge 
              variant="outline" 
              className={`text-lg px-3 py-1 ${
                qualityResults.grade === 'A' ? 'bg-green-100 text-green-800' :
                qualityResults.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                qualityResults.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                qualityResults.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}
            >
              Grade {qualityResults.grade}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Approve Dialog */}
          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="flex-1" 
                size="lg"
                disabled={isApproving || isRejecting}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Approve & Proceed to Merge
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Approve Quality Results</DialogTitle>
                <DialogDescription>
                  This will approve the quality validation and proceed with merging the data into the knowledge graph.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="font-bold">{Math.round(qualityResults.overall_score)}</div>
                    <div className="text-muted-foreground">Score</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="font-bold">{errorViolations}</div>
                    <div className="text-muted-foreground">Errors</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="font-bold">{warningViolations}</div>
                    <div className="text-muted-foreground">Warnings</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="approval-comment">Approval Comment (Optional)</Label>
                  <Textarea
                    id="approval-comment"
                    placeholder="Add any notes about this approval decision..."
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
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="bg-green-600 hover:bg-green-700"
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
                className="flex-1" 
                size="lg"
                disabled={isApproving || isRejecting}
              >
                <XCircle className="h-5 w-5 mr-2" />
                Reject & Stop Process
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Reject Quality Results</DialogTitle>
                <DialogDescription>
                  This will reject the quality validation and stop the merge process. The data will not be added to the knowledge graph.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {errorViolations > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {errorViolations} critical error{errorViolations > 1 ? 's' : ''} detected in the data quality validation.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
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
                    <p className="text-sm text-muted-foreground">
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
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
          <div>Transform ID: {qualityResults.transform_id}</div>
          <div>Validation completed: {new Date(qualityResults.validation_timestamp).toLocaleString()}</div>
          <div>Rules applied: {qualityResults.rules_applied} | Duration: {qualityResults.validation_duration_ms}ms</div>
        </div>
      </CardContent>
    </Card>
  );
}