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
import { toast } from 'sonner'

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
  const [exportingCsv, setExportingCsv] = useState(false);

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

  const handleExportCsv = useCallback(async () => {
    if (!qualityResults) {
      return;
    }

    try {
      setExportingCsv(true);
      await qualityApi.exportViolationsCsv(qualityResults.transform_id);
      toast.success('Violations CSV export started');
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Failed to export quality violations';
      console.error('Failed to export quality violations:', err);
      const sanitised = rawMessage.replace(/<[^>]*>/g, '').trim();
      toast.error(sanitised || 'Failed to export quality violations');
    } finally {
      setExportingCsv(false);
    }
  }, [qualityResults]);

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

  const gateStatusConfig = {
    pass: {
      label: 'Pass',
      title: 'Quality gate passed',
      description: 'All configured quality thresholds were satisfied.',
      tone: 'success',
      icon: CheckCircle,
    },
    warn: {
      label: 'Warning',
      title: 'Quality gate warnings detected',
      description: 'Review the highlighted warnings before proceeding to merge.',
      tone: 'warning',
      icon: AlertTriangle,
    },
    fail: {
      label: 'Failed',
      title: 'Quality gate failed',
      description: 'Blocking quality issues were detected. Resolve them before retrying.',
      tone: 'destructive',
      icon: XCircle,
    },
  } as const;

  type GateStatusKey = keyof typeof gateStatusConfig;

  const normalizeGateStatus = (status: string): GateStatusKey => {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'warning') return 'warn';
    if (normalized === 'warn' || normalized === 'fail' || normalized === 'pass') {
      return normalized as GateStatusKey;
    }
    return 'pass';
  };

  const gateStatusRaw = (qualityResults.quality_gate_status ?? 'pass').toString();
  const gateStatusKey = normalizeGateStatus(gateStatusRaw);
  const gateMeta = gateStatusConfig[gateStatusKey];
  const GateIcon = gateMeta.icon;

  const toneStyles = {
    success: {
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      badge: 'border-success/30 text-success bg-success/15',
      alert: 'border-success/30 bg-success/10',
    },
    warning: {
      iconBg: 'bg-warning/15',
      iconColor: 'text-warning',
      badge: 'border-warning/30 text-warning bg-warning/15',
      alert: 'border-warning/40 bg-warning/10',
    },
    destructive: {
      iconBg: 'bg-destructive/15',
      iconColor: 'text-destructive',
      badge: 'border-destructive/30 text-destructive bg-destructive/15',
      alert: 'border-destructive/40 bg-destructive/10',
    },
  } as const;

  const toneStyle = toneStyles[gateMeta.tone as keyof typeof toneStyles];
  const gateReasons = (qualityResults.quality_gate_reasons ?? [])
    .map((reason) => (typeof reason === 'string' ? reason.trim() : ''))
    .filter((reason) => reason.length > 0);
  const gateMessage = qualityResults.quality_gate_message?.trim() || gateMeta.description;
  const headerDescription = gateStatusKey === 'pass'
    ? 'Data quality analysis for your extracted content'
    : gateMessage;
  const showGateAlert = gateStatusKey !== 'pass' || gateReasons.length > 0;

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
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', toneStyle.iconBg)}>
            <GateIcon className={cn('h-6 w-6', toneStyle.iconColor)} />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-semibold text-foreground tracking-tight">{gateMeta.title}</h3>
              <Badge
                variant="outline"
                className={cn('uppercase tracking-wide text-[11px] px-3 py-1 border', toneStyle.badge)}
              >
                Quality Gate · {gateMeta.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {headerDescription}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCsv}
            variant="outline"
            size="sm"
            disabled={exportingCsv}
          >
            <FileText className={`h-4 w-4 mr-2 ${exportingCsv ? 'animate-pulse' : ''}`} />
            Export CSV
          </Button>
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
      </div>

      {showGateAlert && (
        <Alert
          variant={gateStatusKey === 'fail' ? 'destructive' : 'default'}
          className={cn('border rounded-2xl px-5 py-4 flex items-start gap-3', toneStyle.alert)}
        >
          <GateIcon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', toneStyle.iconColor)} />
          <AlertDescription className="space-y-2">
            <p className="text-sm text-foreground font-medium leading-relaxed">{gateMessage}</p>
            {gateReasons.length > 0 && (
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {gateReasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>{reason}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

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
