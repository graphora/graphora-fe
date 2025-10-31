'use client'

import React from 'react'
import { Trophy, Target, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { type QualityResults } from '@/types/quality'

interface QualityScoreCardProps {
  qualityResults: QualityResults;
  className?: string;
}

export function QualityScoreCard({ qualityResults, className = '' }: QualityScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-info';
    if (score >= 70) return 'text-warning';
    if (score >= 60) return 'text-neutral';
    return 'text-destructive';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-success/15 text-success border-success/30 shadow-sm';
      case 'B':
        return 'bg-info/15 text-info border-info/30 shadow-sm';
      case 'C':
        return 'bg-warning/15 text-warning border-warning/30 shadow-sm';
      case 'D':
        return 'bg-warning/20 text-warning border-warning/40 shadow-sm';
      case 'F':
        return 'bg-destructive/15 text-destructive border-destructive/30 shadow-sm';
      default:
        return 'bg-neutral/15 text-neutral-foreground border-neutral/30 shadow-sm';
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'progress-success';
    if (score >= 80) return 'progress-info';
    if (score >= 70) return 'progress-warning';
    if (score >= 60) return 'progress-warning';
    return 'progress-critical';
  };

  return (
    <Card variant="glass" className={className}>
      <CardHeader className="p-6 pb-content-sm">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Quality Score
        </CardTitle>
        <CardDescription>
          Overall data quality assessment for this extraction
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 xl:gap-6">
          {/* Score Display */}
          <div className="text-center space-y-content-sm">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted-foreground/30"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${qualityResults.overall_score * 2.51} 251`}
                  className={getScoreColor(qualityResults.overall_score)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-[2.75rem] leading-none font-semibold tracking-tight ${getScoreColor(qualityResults.overall_score)}`}>
                    {Math.round(qualityResults.overall_score)}
                  </div>
                  <div className="text-body-xs text-muted-foreground">out of 100</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-content-sm">
              <Badge 
                variant="outline" 
                className={`text-lg px-3 py-1 ${getGradeColor(qualityResults.grade)}`}
              >
                Grade {qualityResults.grade}
              </Badge>
            </div>
          </div>

          {/* Key Metrics */}
            <div className="space-y-content-sm">
            <div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-muted-foreground">Entities Processed</span>
                <span className="font-medium">{qualityResults.metrics.total_entities}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-muted-foreground">Relationships</span>
                <span className="font-medium">{qualityResults.metrics.total_relationships}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-muted-foreground">Total Violations</span>
                <span className="font-medium">{qualityResults.violations.length}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-muted-foreground">Property Completeness</span>
                <span className="font-medium">{Math.round(qualityResults.metrics.property_completeness_rate)}%</span>
              </div>
              <Progress 
                value={qualityResults.metrics.property_completeness_rate} 
                className={`h-2 ${getProgressColor(qualityResults.metrics.property_completeness_rate)}`}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-muted-foreground">Extraction Confidence</span>
                <span className="font-medium">{Math.round(qualityResults.metrics.avg_entity_confidence * 100)}%</span>
              </div>
              <Progress 
                value={qualityResults.metrics.avg_entity_confidence * 100} 
                className={`h-2 ${getProgressColor(qualityResults.metrics.avg_entity_confidence * 100)}`}
              />
            </div>
          </div>

          {/* Status & Review */}
            <div className="space-y-content-sm">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-body-sm font-medium">Review Status</span>
            </div>
            
            {qualityResults.requires_review ? (
              <div className="p-4 rounded-lg border border-warning/30 bg-warning/10">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-warning"></div>
                  <span className="text-body-sm font-medium text-warning">Manual Review Required</span>
                </div>
                <p className="text-body-xs text-warning/80">
                  Quality score or violations require human review before proceeding to merge.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-success/30 bg-success/10">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-success"></div>
                  <span className="text-body-sm font-medium text-success">Ready for Auto-Approval</span>
                </div>
                <p className="text-body-xs text-success/90">
                  High quality score with minimal issues. Safe to proceed automatically.
                </p>
              </div>
            )}

            <div className="text-body-xs text-muted-foreground space-y-1">
              <div>Validated: {new Date(qualityResults.validation_timestamp).toLocaleString()}</div>
              <div>Duration: {qualityResults.validation_duration_ms}ms</div>
              <div>Rules Applied: {qualityResults.rules_applied}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
