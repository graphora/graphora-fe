'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Loader2,
  RefreshCw,
  FileText,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QualityScoreCard } from './quality-score-card'
import { ViolationsTable } from './violations-table'
import { QualityMetricsPanel } from './quality-metrics-panel'
import { QualityActionButtons } from './quality-action-buttons'
import { type QualityResults, type QualityViolation } from '@/types/quality'
import { qualityApi } from '@/lib/quality-api'
import { cn } from '@/lib/utils'

interface QualityDashboardProps {
  transformId: string;
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
}

export function QualityDashboard({ 
  transformId, 
  onApprove, 
  onReject, 
  className = '' 
}: QualityDashboardProps) {
  const { user } = useUser();
  const userId = user?.id;
  const [qualityResults, setQualityResults] = useState<QualityResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQualityResults = useCallback(async (showRefreshIndicator = false) => {
    if (!userId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const results = await qualityApi.getQualityResults(transformId);
      setQualityResults(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load quality results';
      setError(errorMessage);
      console.error('Failed to fetch quality results:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [transformId, userId]);

  const handleApprove = async (comment?: string) => {
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    try {
      await qualityApi.approveQualityResults(transformId, comment);
      onApprove?.();
    } catch (err) {
      console.error('Failed to approve quality results:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve quality results');
    }
  };

  const handleReject = async (reason: string) => {
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    try {
      await qualityApi.rejectQualityResults(transformId, reason);
      onReject?.();
    } catch (err) {
      console.error('Failed to reject quality results:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject quality results');
    }
  };

  useEffect(() => {
    if (transformId) {
      fetchQualityResults();
    }
  }, [transformId, fetchQualityResults]);

  const wrapperClasses = 'flex flex-col gap-section-sm'

  if (loading) {
    return (
      <div className={cn(wrapperClasses, className)}>
        <Card variant="glass">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-content-sm">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Loading quality validation results...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(wrapperClasses, className)}>
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <Card variant="glass">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-content-sm">
              <p className="text-muted-foreground">Quality validation results unavailable</p>
              <Button onClick={() => fetchQualityResults()} variant="glass">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!qualityResults) {
    return (
      <div className={cn(wrapperClasses, className)}>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No quality validation results found for this transform.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-info" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default'; // Amber styling via custom CSS
      default:
        return 'secondary';
    }
  };

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {/* Header with refresh button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-foreground tracking-tight">Validation Complete</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Data quality analysis for your extracted content
            </p>
          </div>
        </div>
        <Button
          onClick={() => fetchQualityResults(true)}
          variant="outline"
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quality Score Card */}
      <QualityScoreCard qualityResults={qualityResults} />

      {/* Detailed Tabs */}
      <Tabs defaultValue="violations" className="space-y-6">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="violations" className="gap-2">
            <FileText className="h-4 w-4" />
            Issues ({qualityResults.violations.length})
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="mt-6">
          <ViolationsTable
            violations={qualityResults.violations}
            transformId={transformId}
          />
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <QualityMetricsPanel
            metrics={qualityResults.metrics}
            entityQualitySummary={qualityResults.entity_quality_summary}
          />
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <QualityActionButtons
        qualityResults={qualityResults}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
