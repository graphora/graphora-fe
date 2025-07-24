'use client'

import React, { useState, useEffect } from 'react'
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
  const [qualityResults, setQualityResults] = useState<QualityResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQualityResults = async (showRefreshIndicator = false) => {
    if (!user?.id) {
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

      const results = await qualityApi.getQualityResults(transformId, user.id);
      setQualityResults(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load quality results';
      setError(errorMessage);
      console.error('Failed to fetch quality results:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (comment?: string) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      await qualityApi.approveQualityResults(transformId, user.id, comment);
      onApprove?.();
    } catch (err) {
      console.error('Failed to approve quality results:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve quality results');
    }
  };

  const handleReject = async (reason: string) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      await qualityApi.rejectQualityResults(transformId, user.id, reason);
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
  }, [transformId]);

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
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
      <div className={`space-y-6 ${className}`}>
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Quality validation results unavailable</p>
              <Button onClick={() => fetchQualityResults()} variant="outline">
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
      <div className={`space-y-6 ${className}`}>
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
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
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
    <div className={`space-y-6 ${className}`}>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quality Validation Results</h2>
          <p className="text-muted-foreground">
            Review the quality of extracted data for transform {transformId.substring(0, 8)}...
          </p>
        </div>
        <Button 
          onClick={() => fetchQualityResults(true)} 
          variant="outline"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quality Score Card */}
      <QualityScoreCard qualityResults={qualityResults} />

      {/* Violations Summary */}
      {qualityResults.violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Violations Summary
            </CardTitle>
            <CardDescription>
              {qualityResults.violations.length} quality issues found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(qualityResults.violations_by_severity).map(([severity, count]) => (
                <div key={severity} className="flex items-center space-x-3 p-3 rounded-lg border">
                  {getSeverityIcon(severity)}
                  <div>
                    <p className="font-medium capitalize">{severity}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="violations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="violations" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Violations ({qualityResults.violations.length})
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="space-y-4">
          <ViolationsTable 
            violations={qualityResults.violations}
            transformId={transformId}
          />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
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