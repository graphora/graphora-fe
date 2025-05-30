'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  Database, 
  FileText, 
  GitMerge, 
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  ArrowRight,
  Upload,
  Play,
  History,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [auditSummary, setAuditSummary] = useState<any>(null)
  const [conflictsSummary, setConflictsSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Dashboard"
          description="Overview of your knowledge graph projects and workflow progress"
          icon={<BarChart3 className="h-6 w-6" />}
          actions={
            <div className="flex items-center space-x-3">
              <Link href="/ontology">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Play className="h-4 w-4 mr-2" />
                  Run Workflow
                </Button>
              </Link>
            </div>
          }
        />

        <div className="flex-1 overflow-auto p-6 space-y-8">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
              <Card key={index} className="enhanced-card">
                <CardContent className="enhanced-card-content p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-muted rounded-lg">
                        {metric.icon}
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                        <div className="text-sm text-muted-foreground">{metric.title}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(metric.trend)}
                      {metric.change && (
                        <span className={`text-sm font-medium ${
                          metric.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 
                          metric.trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                        }`}>
                          {metric.change}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{metric.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Audit Trail */}
            <Card className="enhanced-card">
              <CardHeader className="enhanced-card-header">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="enhanced-card-content space-y-4">
                {auditSummary?.recent_operations?.slice(0, 5).map((activity: any, index: number) => (
                  <div key={activity.id || index} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
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
                    <div className="flex items-center space-x-2">
                      <StatusIndicator 
                        status={activity.status === 'success' ? 'success' : activity.status === 'failed' ? 'error' : 'pending'} 
                        size="sm"
                      />
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-muted-foreground py-8">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Merge Conflicts */}
            <Card className="enhanced-card">
              <CardHeader className="enhanced-card-header">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Merge Conflicts
                  </CardTitle>
                  {conflictsSummary?.total_conflicts > 0 && (
                    <Badge variant="destructive">
                      {conflictsSummary.total_conflicts} conflicts
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="enhanced-card-content space-y-4">
                {conflictsSummary?.conflicts_by_merge?.slice(0, 3).map((conflict: any, index: number) => (
                  <div key={conflict.merge_id || index} className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                          Merge {conflict.merge_id?.slice(0, 8)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {conflict.total_conflicts} conflicts across {Object.keys(conflict.by_type || {}).length} entity types
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Link href={`/merge?merge_id=${conflict.merge_id}`}>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Resolve
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(conflict.by_type || {}).map(([entityType, count]: [string, any]) => (
                        <Badge key={entityType} variant="secondary" className="text-xs">
                          {entityType}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <p>No conflicts detected</p>
                    <p className="text-xs mt-1">All merges completed successfully</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Validation Section */}
          <div className="grid grid-cols-1 gap-8">
            <Card className="enhanced-card">
              <CardHeader className="enhanced-card-header">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Validation
                  </CardTitle>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              </CardHeader>
              <CardContent className="enhanced-card-content">
                <div className="text-center text-muted-foreground py-8">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">Data Quality Reports</h3>
                  <p className="text-sm mb-4">Comprehensive validation reports will be available here to help you maintain data quality across your knowledge graphs.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="font-medium mb-1">Schema Validation</div>
                      <div className="text-muted-foreground">Ensure data conforms to ontology</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="font-medium mb-1">Data Quality Metrics</div>
                      <div className="text-muted-foreground">Monitor completeness & accuracy</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="font-medium mb-1">Anomaly Detection</div>
                      <div className="text-muted-foreground">Identify data inconsistencies</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 