'use client'

import React from 'react'
import { Trophy, Target, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { type QualityResults } from '@/types/quality'
import { useTheme } from 'next-themes'

interface QualityScoreCardProps {
  qualityResults: QualityResults;
  className?: string;
}

export function QualityScoreCard({ qualityResults, className = '' }: QualityScoreCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
    <div className={className}>
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Quality Score
        </h4>
        <p className="text-sm text-muted-foreground mt-1">
          Overall data quality assessment for this extraction
        </p>
      </div>

      <div
        className={`rounded-3xl p-12 border shadow-2xl ${
          isDark
            ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50'
            : 'bg-gradient-to-br from-slate-50 to-slate-100/80 border-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center md:items-start gap-12">
          {/* Score Display */}
          <div className="flex flex-col items-center justify-center flex-shrink-0">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className={isDark ? 'text-slate-700/40' : 'text-slate-300'}
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${qualityResults.overall_score * 2.64} 264`}
                  className={getScoreColor(qualityResults.overall_score)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-6xl leading-none font-bold ${getScoreColor(qualityResults.overall_score)}`}>
                    {Math.round(qualityResults.overall_score)}
                  </div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>out of 100</div>
                </div>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`mt-4 text-lg px-4 py-1.5 ${getGradeColor(qualityResults.grade)}`}
            >
              GRADE {qualityResults.grade}
            </Badge>
          </div>

          {/* Key Metrics */}
          <div className="flex-1 grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Entities Processed</span>
                <span className={`font-bold text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>{qualityResults.metrics.total_entities}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Relationships</span>
                <span className={`font-bold text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>{qualityResults.metrics.total_relationships}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Total Violations</span>
                <span className={`font-bold text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>{qualityResults.violations.length}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Property Completeness</span>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{Math.round(qualityResults.metrics.property_completeness_rate)}%</span>
                </div>
                <Progress
                  value={qualityResults.metrics.property_completeness_rate}
                  className={`h-2 ${getProgressColor(qualityResults.metrics.property_completeness_rate)}`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Extraction Confidence</span>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{Math.round(qualityResults.metrics.avg_entity_confidence * 100)}%</span>
                </div>
                <Progress
                  value={qualityResults.metrics.avg_entity_confidence * 100}
                  className={`h-2 ${getProgressColor(qualityResults.metrics.avg_entity_confidence * 100)}`}
                />
              </div>

              <div className={`pt-4 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                {qualityResults.requires_review ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-warning"></div>
                    <span className="text-sm font-semibold text-warning">Manual Review Required</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-success"></div>
                    <span className="text-sm font-semibold text-success">Ready for Auto-Approval</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
