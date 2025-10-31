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
import { type QualityMetrics } from '@/types/quality'

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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-content">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Database className="h-8 w-8 text-info" />
              <div>
                <p className="text-display-sm font-semibold">{metrics.total_entities}</p>
                <p className="text-body-xs text-muted-foreground">Total Entities</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Network className="h-8 w-8 text-primary" />
              <div>
                <p className="text-display-sm font-semibold">{metrics.total_relationships}</p>
                <p className="text-body-xs text-muted-foreground">Relationships</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-success" />
              <div>
                <p className="text-display-sm font-semibold">{metrics.total_properties}</p>
                <p className="text-body-xs text-muted-foreground">Properties</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-warning" />
              <div>
                <p className="text-display-sm font-semibold">{metrics.total_violations}</p>
                <p className="text-body-xs text-muted-foreground">Total Violations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Violation Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Violation Rates
          </CardTitle>
          <CardDescription>
            Percentage of entities and relationships with quality issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-content">
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
        </CardContent>
      </Card>

      {/* Confidence Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Confidence Scores
          </CardTitle>
          <CardDescription>
            Average confidence levels for extracted data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
        </CardContent>
      </Card>

      {/* Property Completeness & Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-content">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Property Completeness
            </CardTitle>
            <CardDescription>
              Percentage of required properties that are populated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <p className="text-body-xs text-muted-foreground text-center">
              Higher rates indicate better data quality and extraction completeness
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Entity Type Coverage
            </CardTitle>
            <CardDescription className="text-body-sm">
              Distribution of entities across different types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(metrics.entity_type_coverage).map(([entityType, count]) => {
              const percentage = (count / metrics.total_entities) * 100;
              return (
                <div key={entityType} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm font-medium">{entityType}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-body-sm text-muted-foreground">{count}</span>
                      <Badge variant="outline" className="text-body-xs">
                        {Math.round(percentage)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Entity Quality Summary */}
      {Object.keys(entityQualitySummary).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Entity Quality Summary
            </CardTitle>
            <CardDescription className="text-body-sm">
              Quality breakdown by entity type and metric
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-content">
              {Object.entries(entityQualitySummary).map(([entityType, summary]) => (
                <div key={entityType} className="border rounded-lg p-4">
                  <h4 className="text-heading-sm font-semibold mb-3">{entityType}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-content text-body-sm">
                    {Object.entries(summary).map(([metric, value]) => (
                      <div key={metric} className="text-center">
                        <div className="font-semibold text-heading">
                          {typeof value === 'number' ? 
                            (metric.includes('rate') || metric.includes('confidence') ? 
                              `${Math.round(value * 100)}%` : 
                              Math.round(value)
                            ) : 
                            value
                          }
                        </div>
                        <div className="text-muted-foreground text-body-xs capitalize">
                          {metric.replace('_', ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
