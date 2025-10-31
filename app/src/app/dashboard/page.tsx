'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  BarChart3, 
  Database, 
  FileText, 
  GitMerge, 
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  Upload,
  Play,
  History,
  AlertTriangle,
  ExternalLink,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useUserConfig } from '@/hooks/useUserConfig'

export default function DashboardPage() {
  const [auditSummary, setAuditSummary] = useState<any>(null)
  const [conflictsSummary, setConflictsSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { user, isLoaded } = useUser()
  const { checkConfigBeforeWorkflow } = useUserConfig()

  // Fetch audit trail data
  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const [auditResponse, conflictsResponse] = await Promise.all([
          fetch('/api/audit/summary'),
          fetch('/api/audit/conflicts')
        ])

        if (auditResponse.ok) {
          const auditData = await auditResponse.json()
          setAuditSummary(auditData)
        }

        if (conflictsResponse.ok) {
          const conflictsData = await conflictsResponse.json()
          setConflictsSummary(conflictsData)
        }
      } catch (error) {
        console.error('Error fetching audit data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAuditData()
  }, [])

  // Calculate metrics based on audit trail data
  const metrics = [
    {
      title: 'Ontologies Created',
      value: auditSummary?.by_type?.ontology_stored || '0',
      change: null,
      trend: 'up',
      icon: <Database className="h-5 w-5" />,
      description: 'Total ontologies stored'
    },
    {
      title: 'Transforms Completed',
      value: auditSummary?.by_type?.transform_completed || '0',
      change: null,
      trend: 'up',
      icon: <FileText className="h-5 w-5" />,
      description: 'Documents processed successfully'
    },
    {
      title: 'Merges Executed',
      value: auditSummary?.by_type?.merge_completed || '0',
      change: null,
      trend: 'up',
      icon: <GitMerge className="h-5 w-5" />,
      description: 'Successful merge operations'
    },
    {
      title: 'Active Conflicts',
      value: conflictsSummary?.total_conflicts?.toString() || '0',
      change: null,
      trend: conflictsSummary?.total_conflicts > 0 ? 'down' : 'up',
      icon: <AlertTriangle className="h-5 w-5" />,
      description: 'Merge conflicts needing review'
    }
  ]

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  const handleRunWorkflow = () => {
    if (checkConfigBeforeWorkflow()) {
      window.location.href = '/ontology'
    }
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Dashboard"
          description="Overview of your knowledge graph projects and workflow progress"
          icon={<BarChart3 className="h-6 w-6" />}
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="glass"
                className="px-5 py-2.5 text-body font-semibold shadow-medium"
                onClick={handleRunWorkflow}
              >
                <Play className="h-4 w-4 mr-2" />
                Run Workflow
              </Button>
            </div>
          }
        />

        <div className="flex-1 overflow-auto">
          <div className="page-shell py-section-sm stack-gap p-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 xl:gap-6">
            {metrics.map((metric, index) => (
              <Card key={index} variant="glass" className="shadow-soft">
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/18 to-primary/6 flex items-center justify-center text-primary shadow-soft">
                        {metric.icon}
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-4xl md:text-[2.75rem] font-semibold text-foreground leading-tight">
                          {metric.value}
                        </div>
                        <div className="text-body-sm text-muted-foreground/80">
                          {metric.title}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {getTrendIcon(metric.trend)}
                      {metric.change && (
                        <span
                          className={cn(
                            'text-body-xs font-medium',
                            metric.trend === 'up' && 'text-emerald-500',
                            metric.trend === 'down' && 'text-destructive'
                          )}
                        >
                          {metric.change}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-body-xs text-muted-foreground/80">
                    {metric.description}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 xl:gap-6">
            {/* Audit Trail */}
            <Card variant="glass">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-heading">
                    <History className="h-5 w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {auditSummary?.recent_operations?.slice(0, 5).map((activity: any, index: number) => (
                  <div
                    key={activity.id || index}
                    className="flex items-center gap-4 rounded-[var(--border-radius)] border border-border/60 bg-white/6 px-5 py-4 backdrop-blur-sm transition hover:bg-white/10 dark:hover:bg-white/5"
                  >
                    <div className="flex-shrink-0">
                      {activity.operation_type === 'ontology_stored' && <Database className="h-4 w-4 text-blue-500" />}
                      {activity.operation_type === 'transform_started' && <Upload className="h-4 w-4 text-purple-500" />}
                      {activity.operation_type === 'transform_completed' && <FileText className="h-4 w-4 text-green-500" />}
                      {activity.operation_type === 'merge_started' && <GitMerge className="h-4 w-4 text-orange-500" />}
                      {activity.operation_type === 'merge_completed' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground capitalize">
                        {activity.operation_type?.replace('_', ' ') || 'Unknown operation'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {activity.resource_name || `ID: ${activity.operation_id?.slice(0, 8)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <StatusIndicator 
                        status={activity.status === 'success' ? 'success' : activity.status === 'failed' ? 'error' : 'pending'} 
                        size="sm"
                      />
                      <span className="text-body-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-muted-foreground py-10">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Merge Conflicts */}
            <Card variant="glass">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-heading">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Merge Conflicts
                  </CardTitle>
                  {conflictsSummary?.total_conflicts > 0 && (
                    <Badge variant="warning" className="text-body-xs">
                      {conflictsSummary.total_conflicts} conflicts
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {conflictsSummary?.conflicts_by_merge?.slice(0, 3).map((conflict: any, index: number) => (
                  <div
                    key={conflict.merge_id || index}
                    className="p-5 rounded-[var(--border-radius)] border border-border/60 bg-white/6 backdrop-blur-sm transition hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer group"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                          Merge {conflict.merge_id?.slice(0, 8)}
                        </div>
                        <div className="text-body-sm text-muted-foreground mt-1">
                          {conflict.total_conflicts} conflicts across {Object.keys(conflict.by_type || {}).length} entity types
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <Link href={`/merge?merge_id=${conflict.merge_id}`}>
                          <Button size="sm" variant="glass" className="px-3 py-2">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Resolve
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(conflict.by_type || {}).map(([entityType, count]: [string, any]) => (
                        <Badge key={entityType} variant="neutral">
                          {entityType}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-muted-foreground py-10">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <p>No conflicts detected</p>
                    <p className="text-xs mt-1">All merges completed successfully</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Validation Section */}
          <div className="grid grid-cols-1 gap-5 xl:gap-6">
            <Card variant="glass">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-heading">
                    <Database className="h-5 w-5 text-info" />
                    Data Validation
                  </CardTitle>
                  <Badge variant="muted">Coming Soon</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="rounded-[var(--border-radius)] border border-dashed border-border/50 bg-white/6 px-6 py-10 text-center backdrop-blur-sm">
                  <Database className="h-12 w-12 mx-auto mb-4 text-primary/60" />
                  <h3 className="text-heading-sm font-semibold mb-2">Data Quality Reports</h3>
                  <p className="text-body-sm text-muted-foreground max-w-2xl mx-auto">
                    Comprehensive validation metrics will surface here to help you maintain schema alignment and detect anomalies across your knowledge graphs.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  {[
                    {
                      title: 'Schema Validation',
                      description: 'Ensure ingested data conforms to ontology expectations.',
                    },
                    {
                      title: 'Data Quality Metrics',
                      description: 'Track completeness, coverage, and confidence trends over time.',
                    },
                    {
                      title: 'Anomaly Detection',
                      description: 'Receive alerts when extraction quality drifts or conflicts spike.',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[var(--border-radius)] border border-border/50 bg-white/4 p-4 shadow-soft backdrop-blur-sm"
                    >
                      <div className="text-body font-semibold text-foreground mb-2">
                        {item.title}
                      </div>
                      <div className="text-body-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 
