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

  if (loading) {
    return (
      <div className={cn('space-y-section', className)}>
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
      <div className={cn('space-y-section', className)}>
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
      <div className={cn('space-y-section', className)}>
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
    <div className={cn('space-y-section', className)}>
      {/* Header with refresh button */}
      <div className="flex flex-wrap items-center justify-between gap-content pb-content-sm border-b border-border/70">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-success/15 rounded-full flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-success" />
          </div>
          <div>
            <h3 className="text-heading font-semibold text-foreground">Validation Complete</h3>
            <p className="text-body-sm text-muted-foreground">
              Data quality analysis for your extracted content
            </p>
          </div>
        </div>
        <Button 
          onClick={() => fetchQualityResults(true)} 
          variant="glass"
          size="sm"
          disabled={refreshing}
          className="px-4"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quality Score Card */}
      <QualityScoreCard qualityResults={qualityResults} className="shadow-soft" />

      {/* Violations Summary */}
      {qualityResults.violations.length > 0 && (
        <Card variant="glass">
          <CardHeader className="p-6 pb-content-sm">
            <CardTitle className="flex items-center text-heading gap-2">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Violations Summary
            </CardTitle>
            <CardDescription className="text-body-sm">
              {qualityResults.violations.length} quality issues found
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-content-lg">
              {Object.entries(qualityResults.violations_by_severity).map(([severity, count]) => (
                <div
                  key={severity}
                  className="flex items-center gap-3 rounded-[var(--border-radius)] border border-border/60 bg-white/5 px-4 py-3 backdrop-blur-sm"
                >
                  {getSeverityIcon(severity)}
                  <div>
                    <p className="text-body-sm font-medium capitalize text-foreground/90">{severity}</p>
                    <p className="text-display-sm font-semibold text-foreground">{count}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="violations" className="space-y-content">
        <div className="border-b border-border/60">
          <TabsList className="w-full justify-start bg-transparent border-b-0">
            <TabsTrigger 
              value="violations" 
              className="flex items-center"
            >
              <FileText className="h-4 w-4 mr-2" />
              Issues ({qualityResults.violations.length})
            </TabsTrigger>
            <TabsTrigger 
              value="metrics" 
              className="flex items-center"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="violations" className="space-y-content">
          <ViolationsTable 
            violations={qualityResults.violations}
            transformId={transformId}
          />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-content">
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
