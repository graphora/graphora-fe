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
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
      case 'B':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      case 'C':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
      case 'D':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700';
      case 'F':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'progress-green';
    if (score >= 80) return 'progress-blue';
    if (score >= 70) return 'progress-yellow';
    if (score >= 60) return 'progress-orange';
    return 'progress-red';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="h-5 w-5 mr-2" />
          Quality Score
        </CardTitle>
        <CardDescription>
          Overall data quality assessment for this extraction
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Score Display */}
          <div className="text-center space-y-3">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
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
                  <div className={`text-2xl font-bold ${getScoreColor(qualityResults.overall_score)}`}>
                    {Math.round(qualityResults.overall_score)}
                  </div>
                  <div className="text-xs text-muted-foreground">out of 100</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Badge 
                variant="outline" 
                className={`text-lg px-3 py-1 ${getGradeColor(qualityResults.grade)}`}
              >
                Grade {qualityResults.grade}
              </Badge>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Entities Processed</span>
                <span className="font-medium">{qualityResults.metrics.total_entities}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Relationships</span>
                <span className="font-medium">{qualityResults.metrics.total_relationships}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Violations</span>
                <span className="font-medium">{qualityResults.violations.length}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Property Completeness</span>
                <span className="font-medium">{Math.round(qualityResults.metrics.property_completeness_rate)}%</span>
              </div>
              <Progress 
                value={qualityResults.metrics.property_completeness_rate} 
                className={`h-2 ${getProgressColor(qualityResults.metrics.property_completeness_rate)}`}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
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
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Review Status</span>
            </div>
            
            {qualityResults.requires_review ? (
              <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Manual Review Required</span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Quality score or violations require human review before proceeding to merge.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">Ready for Auto-Approval</span>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">
                  High quality score with minimal issues. Safe to proceed automatically.
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
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