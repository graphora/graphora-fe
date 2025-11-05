'use client'

import React from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Database,
  CheckCircle,
  AlertTriangle,
  Info,
  Users,
  Network
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { type QualityMetrics, type QualitySeverity } from '@/types/quality'
import { cn } from '@/lib/utils'

interface QualityMetricsPanelProps {
  metrics: QualityMetrics;
  entityQualitySummary: Record<string, Record<string, number>>;
  className?: string;
}

export function QualityMetricsPanel({ 
  metrics, 
  entityQualitySummary, 
  className = '' 
}: QualityMetricsPanelProps) {
  const getViolationRateColor = (rate: number) => {
    if (rate <= 5) return 'text-success';
    if (rate <= 15) return 'text-info';
    if (rate <= 30) return 'text-warning';
    return 'text-destructive';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-success';
    if (confidence >= 0.8) return 'text-info';
    if (confidence >= 0.7) return 'text-warning';
    return 'text-destructive';
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 90) return 'text-success';
    if (coverage >= 75) return 'text-info';
    if (coverage >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const propertyFillRates = Object.entries(metrics.property_fill_rates_by_entity ?? {}).sort(
    (a, b) => (b[1] ?? 0) - (a[1] ?? 0)
  );

  const severityMeta: Record<QualitySeverity, { label: string; badge: string; dot: string }> = {
    error: {
      label: 'Errors',
      badge: 'border-destructive/40 bg-destructive/10 text-destructive',
      dot: 'bg-destructive',
    },
    warning: {
      label: 'Warnings',
      badge: 'border-warning/40 bg-warning/10 text-warning',
      dot: 'bg-warning',
    },
    info: {
      label: 'Notes',
      badge: 'border-info/30 bg-info/10 text-info',
      dot: 'bg-info',
    },
  }

  const severityOrder: QualitySeverity[] = ['error', 'warning', 'info']

  return (
    <div className={cn('space-y-8', className)}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-muted/30 rounded-xl p-6 border border-border/40">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-info flex-shrink-0" />
            <div>
              <p className="text-3xl font-semibold text-foreground">{metrics.total_entities}</p>
              <p className="text-xs text-muted-foreground">Total Entities</p>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl p-6 border border-border/40">
          <div className="flex items-center gap-3">
            <Network className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <p className="text-3xl font-semibold text-foreground">{metrics.total_relationships}</p>
              <p className="text-xs text-muted-foreground">Relationships</p>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl p-6 border border-border/40">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-success flex-shrink-0" />
            <div>
              <p className="text-3xl font-semibold text-foreground">{metrics.total_properties}</p>
              <p className="text-xs text-muted-foreground">Properties</p>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl p-6 border border-border/40">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-warning flex-shrink-0" />
            <div>
              <p className="text-3xl font-semibold text-foreground">{metrics.total_violations}</p>
              <p className="text-xs text-muted-foreground">Total Violations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Violation Rates */}
      <div className="bg-muted/30 rounded-2xl p-8 border border-border/40">
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-info" />
            Violation Rates
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Percentage of entities and relationships with quality issues
          </p>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium">Entity Violations</span>
                <span className={`text-body-sm font-semibold ${getViolationRateColor(metrics.entity_violation_rate)}`}>
                  {Math.round(metrics.entity_violation_rate)}%
                </span>
              </div>
              <Progress 
                value={metrics.entity_violation_rate} 
                className="h-2"
              />
              <p className="text-body-xs text-muted-foreground">
                {metrics.entities_with_violations} of {metrics.total_entities} entities
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium">Relationship Violations</span>
                <span className={`text-body-sm font-semibold ${getViolationRateColor(metrics.relationship_violation_rate)}`}>
                  {Math.round(metrics.relationship_violation_rate)}%
                </span>
              </div>
              <Progress 
                value={metrics.relationship_violation_rate} 
                className="h-2"
              />
              <p className="text-body-xs text-muted-foreground">
                {metrics.relationships_with_violations} of {metrics.total_relationships} relationships
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium">Overall Violations</span>
                <span className={`text-body-sm font-semibold ${getViolationRateColor(metrics.overall_violation_rate)}`}>
                  {Math.round(metrics.overall_violation_rate)}%
                </span>
              </div>
              <Progress 
                value={metrics.overall_violation_rate} 
                className="h-2"
              />
              <p className="text-body-xs text-muted-foreground">
                Across all validated items
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confidence Scores */}
      <div className="bg-muted/30 rounded-2xl p-8 border border-border/40">
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Confidence Scores
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Average confidence levels for extracted data
          </p>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-content">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium">Entity Confidence</span>
                <span className={`text-body-sm font-semibold ${getConfidenceColor(metrics.avg_entity_confidence)}`}>
                  {Math.round(metrics.avg_entity_confidence * 100)}%
                </span>
              </div>
              <Progress 
                value={metrics.avg_entity_confidence * 100} 
                className="h-3"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium">Relationship Confidence</span>
                <span className={`text-body-sm font-semibold ${getConfidenceColor(metrics.avg_relationship_confidence)}`}>
                  {Math.round(metrics.avg_relationship_confidence * 100)}%
                </span>
              </div>
              <Progress 
                value={metrics.avg_relationship_confidence * 100} 
                className="h-3"
              />
            </div>
          </div>

          {/* Confidence by Type */}
          {Object.keys(metrics.confidence_scores_by_type).length > 0 && (
            <div>
              <h4 className="text-body-sm font-medium mb-3">Confidence by Entity Type</h4>
              <div className="space-y-3">
                {Object.entries(metrics.confidence_scores_by_type).map(([type, confidence]) => (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm">{type}</span>
                      <span className={`text-body-sm font-medium ${getConfidenceColor(confidence)}`}>
                        {Math.round(confidence * 100)}%
                      </span>
                    </div>
                    <Progress value={confidence * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Property Completeness & Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-muted/30 rounded-2xl p-8 border border-border/40">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-success" />
              Property Completeness
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Percentage of required properties that are populated
            </p>
          </div>
          <div className="space-y-4">
            <div className="text-center">
              <div className={`text-display-lg font-semibold ${getCoverageColor(metrics.property_completeness_rate)}`}>
                {Math.round(metrics.property_completeness_rate)}%
              </div>
              <p className="text-body-sm text-muted-foreground mt-1">
                Property Completeness Rate
              </p>
            </div>
            <Progress 
              value={metrics.property_completeness_rate} 
              className="h-3"
            />
            <p className="text-xs text-muted-foreground text-center">
              Higher rates indicate better data quality and extraction completeness
            </p>
            {propertyFillRates.length > 0 && (
              <div className="pt-5 border-t border-border/40 space-y-3">
                <p className="text-body-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Per-entity property fill rate
                </p>
                <div className="space-y-3">
                  {propertyFillRates.slice(0, 5).map(([entityType, ratio]) => {
                    const percent = Math.round((ratio ?? 0) * 100);
                    return (
                      <div key={entityType} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-body-sm font-medium">{entityType}</span>
                          <span className={`text-body-sm font-semibold ${getCoverageColor(percent)}`}>
                            {percent}%
                          </span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-muted/30 rounded-2xl p-8 border border-border/40">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-info" />
              Entity Type Coverage
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Distribution of entities across different types
            </p>
          </div>
          <div className="space-y-4">
            {Object.entries(metrics.entity_type_coverage).map(([entityType, count]) => {
              const percentage = (count / metrics.total_entities) * 100;
              return (
                <div key={entityType} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm font-medium">{entityType}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-body-sm text-muted-foreground">{count}</span>
                      <Badge variant="neutral" className="text-body-xs">
                        {Math.round(percentage)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Entity Quality Summary */}
      {Object.keys(entityQualitySummary).length > 0 && (
        <div className="bg-muted/30 rounded-2xl p-8 border border-border/40">
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Entity Quality Summary
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Quality breakdown by entity type and metric
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(entityQualitySummary).map(([entityType, summary]) => {
              const severityCounts: Record<QualitySeverity, number> = {
                error: Number(summary.error ?? 0),
                warning: Number(summary.warning ?? 0),
                info: Number(summary.info ?? 0),
              }
              const total = Object.values(severityCounts).reduce((acc, value) => acc + value, 0)
              const hasFindings = total > 0

              return (
                <div
                  key={entityType}
                  className="rounded-2xl border border-border/60 bg-background/40 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h4 className="text-heading-sm font-semibold text-foreground">{entityType}</h4>
                      <p className="text-body-xs text-muted-foreground">
                        {hasFindings ? 'Violations by severity' : 'No violations detected'}
                      </p>
                    </div>
                    {hasFindings && (
                      <div className="text-heading font-semibold text-foreground">
                        {total}
                      </div>
                    )}
                  </div>
                  {hasFindings ? (
                    <div className="flex flex-wrap gap-2">
                      {severityOrder.map((severity) => {
                        const count = severityCounts[severity]
                        if (!count) return null
                        const meta = severityMeta[severity]
                        return (
                          <Badge
                            key={`${entityType}-${severity}`}
                            variant="outline"
                            className={cn('gap-2 px-3 py-1 text-body-xs font-medium', meta.badge)}
                          >
                            <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
                            {count} {meta.label}
                          </Badge>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-body-sm text-muted-foreground">
                      All checks passed for this entity type.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}
