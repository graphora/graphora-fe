'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useAuth'
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

  const gateBadgeTone =
    gateStatusKey === 'pass' ? 'success' : gateStatusKey === 'warn' ? 'warn' : 'danger'

  const errorCount = qualityResults.violations.filter((v) => v.severity === 'error').length
  const warningCount = qualityResults.violations.filter((v) => v.severity === 'warning').length
  const score = Math.round(qualityResults.overall_score)
  const scoreColor =
    score >= 90 ? 'var(--gx-success)' : score >= 70 ? 'var(--warn)' : 'var(--danger)'

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* HERO — verdict + key numbers + actions, all in one banner */}
      <section
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
        }}
      >
        {/* Top row: verdict text + right-side toolbar */}
        <div className="flex flex-wrap items-start justify-between gap-4" style={{ padding: '18px 20px 14px' }}>
          <div className="min-w-0 flex-1">
            <div className="gx-kicker" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <GateIcon
                className="h-[11px] w-[11px]"
                style={{
                  color: gateStatusKey === 'pass' ? 'var(--gx-success)' : gateStatusKey === 'warn' ? 'var(--warn)' : 'var(--danger)',
                }}
              />
              Quality gate · {gateMeta.label.toUpperCase()}
            </div>
            <h3
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: 'var(--fg)',
                letterSpacing: '-0.015em',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {gateMeta.title}
            </h3>
            <p
              style={{ color: 'var(--fg-muted)', fontSize: 12.5, marginTop: 4, maxWidth: 640, lineHeight: 1.5 }}
            >
              {gateStatusKey === 'pass' ? gateMeta.description : gateMessage}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleExportCsv}
              variant="ghost"
              size="sm"
              disabled={exportingCsv}
              className="gap-1.5"
              title="Export violations as CSV"
            >
              <FileText className={cn('h-[13px] w-[13px]', exportingCsv && 'animate-pulse')} />
              Export
            </Button>
            <Button
              onClick={() => fetchQualityResults(true)}
              variant="ghost"
              size="sm"
              disabled={refreshing}
              className="gap-1.5"
              title="Refresh results"
            >
              <RefreshCw className={cn('h-[13px] w-[13px]', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* 4-stat row: score, error count, warning count, throughput */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderTop: '1px solid var(--line)',
            background: 'var(--bg-deep)',
          }}
        >
          <HeroStat
            label="Score"
            value={
              <span style={{ color: scoreColor }}>
                {score}
                <span style={{ color: 'var(--fg-faint)', fontSize: 18, fontWeight: 400 }}>/100</span>
              </span>
            }
            sub={`Grade ${qualityResults.grade}`}
            emphasize
          />
          <HeroStat
            label="Errors"
            value={
              <span style={{ color: errorCount > 0 ? 'var(--danger)' : 'var(--fg-muted)' }}>
                {errorCount}
              </span>
            }
            sub={errorCount ? 'blocking' : 'none'}
          />
          <HeroStat
            label="Warnings"
            value={
              <span style={{ color: warningCount > 0 ? 'var(--warn)' : 'var(--fg-muted)' }}>
                {warningCount}
              </span>
            }
            sub={warningCount ? 'review' : 'clear'}
          />
          <HeroStat
            label="Entities · relations"
            value={
              <span className="gx-mono" style={{ fontSize: 22 }}>
                {qualityResults.metrics.total_entities} · {qualityResults.metrics.total_relationships}
              </span>
            }
            sub={`confidence ${(qualityResults.metrics.avg_entity_confidence * 100).toFixed(0)}%`}
          />
        </div>

        {/* Gate reasons strip — only if there's something the user needs to know */}
        {showGateAlert && gateReasons.length > 0 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--line)',
              background:
                gateStatusKey === 'fail'
                  ? 'color-mix(in oklch, var(--danger), transparent 94%)'
                  : 'color-mix(in oklch, var(--warn), transparent 94%)',
            }}
          >
            <div
              className="gx-mono flex items-center gap-2"
              style={{
                color: gateStatusKey === 'fail' ? 'var(--danger)' : 'var(--warn)',
                fontSize: 10.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              <GateIcon className="h-[11px] w-[11px]" />
              {gateStatusKey === 'fail' ? 'Blocking issues' : 'Review before approve'}
            </div>
            <ul className="gx-mlist" style={{ fontSize: 11.5, color: 'var(--fg)' }}>
              {gateReasons.map((reason, index) => (
                <li key={`${reason}-${index}`}>· {reason}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Primary decision — right here, above the fold */}
      <QualityActionButtons
        qualityResults={qualityResults}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Detailed Tabs — for users who want to investigate */}
      <Tabs defaultValue="violations" className="space-y-5">
        <TabsList>
          <TabsTrigger value="violations">
            <FileText className="h-[13px] w-[13px]" />
            Issues ({qualityResults.violations.length})
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <BarChart3 className="h-[13px] w-[13px]" />
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
    </div>
  );
}

/**
 * HeroStat — compact tile used inside the QualityDashboard hero. Matches the
 * StatTile pattern from the Dashboard / Usage pages (kicker label, tabular
 * numeric value, mono sub-label) but renders inside a borderless grid cell so
 * the four tiles read as one unified row rather than four disconnected cards.
 */
function HeroStat({
  label,
  value,
  sub,
  emphasize,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  emphasize?: boolean
}) {
  return (
    <div
      style={{
        padding: '14px 20px',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div className="gx-kicker" style={{ margin: 0 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: emphasize ? 28 : 22,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          color: 'var(--fg)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="gx-mono"
          style={{
            fontSize: 10.5,
            color: 'var(--fg-muted)',
            letterSpacing: '0.02em',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}
