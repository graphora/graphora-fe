'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  BarChart3, 
  Zap, 
  FileText, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Activity,
  Calendar,
  RefreshCw
} from 'lucide-react'
import { useUsageSummary, useModelUsage } from '@/hooks/useUsageData'
import { cn } from '@/lib/utils'

interface UsageTrackingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UsageTrackingModal({ isOpen, onClose }: UsageTrackingModalProps) {
  const [activeTab, setActiveTab] = useState('overview')
  
  const { data: summary, loading: summaryLoading, error: summaryError, refetch: refetchSummary } = useUsageSummary()
  const { data: modelUsage, loading: modelLoading, error: modelError, refetch: refetchModelUsage } = useModelUsage(30)

  // Handle modal close properly
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
      // Force cleanup of any remaining overlay styles
      setTimeout(() => {
        document.body.style.removeProperty('pointer-events')
        document.body.classList.remove('overflow-hidden')
      }, 100)
    }
  }

  // Reset tab when modal opens and cleanup on unmount
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
    }
    
    return () => {
      // Cleanup on unmount
      document.body.style.removeProperty('pointer-events')
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen])

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const getUsagePercentage = (current: number, limit: number | null) => {
    if (!limit) return 0
    return Math.min((current / limit) * 100, 100)
  }

  const getUsageStatus = (current: number, limit: number | null) => {
    if (!limit) return 'unlimited'
    const percentage = (current / limit) * 100
    if (percentage >= 90) return 'danger'
    if (percentage >= 75) return 'warning'
    return 'good'
  }

  const handleRefresh = () => {
    refetchSummary()
    refetchModelUsage()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden bg-background border-border">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl text-foreground">Usage & Billing</DialogTitle>
                <p className="text-sm text-muted-foreground">Track your document processing and AI usage</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={summaryLoading || modelLoading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", (summaryLoading || modelLoading) && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-1 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Usage Overview
            </TabsTrigger>
          </TabsList>

          <div className="overflow-auto max-h-[65vh]">
            <TabsContent value="overview" className="space-y-6 mt-0">
              {summaryError ? (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      <span>Error loading usage data: {summaryError}</span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Current Billing Period */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Current Billing Period
                      </CardTitle>
                      <CardDescription>
                        {summary && new Date(summary.current_period.start).toLocaleDateString()} - {summary && new Date(summary.current_period.end).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                          <div className="text-2xl font-bold text-foreground">
                            {summaryLoading ? '...' : formatNumber(summary?.current_period.documents_processed || 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Documents</div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <Clock className="w-6 h-6 mx-auto mb-2 text-green-600" />
                          <div className="text-2xl font-bold text-foreground">
                            {summaryLoading ? '...' : formatNumber(summary?.current_period.pages_processed || 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Pages</div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <Zap className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
                          <div className="text-2xl font-bold text-foreground">
                            {summaryLoading ? '...' : formatNumber(summary?.current_period.tokens_used || 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Tokens</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Usage Limits */}
                  {summary && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Usage Limits
                          <Badge variant={summary.limits.within_limits ? "default" : "destructive"} className="ml-2">
                            {summary.limits.tier}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Current usage against your plan limits
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Document Usage */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Documents</span>
                            <span className="text-sm text-muted-foreground">{summary.limits.document_usage}</span>
                          </div>
                          <Progress 
                            value={getUsagePercentage(summary.current_period.documents_processed, summary.limits.document_usage.includes('unlimited') ? null : parseInt(summary.limits.document_usage.split('/')[1]))} 
                            className="h-2"
                          />
                        </div>

                        {/* Page Usage */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Pages</span>
                            <span className="text-sm text-muted-foreground">{summary.limits.page_usage}</span>
                          </div>
                          <Progress 
                            value={getUsagePercentage(summary.current_period.pages_processed, summary.limits.page_usage.includes('unlimited') ? null : parseInt(summary.limits.page_usage.split('/')[1]))} 
                            className="h-2"
                          />
                        </div>

                        {/* Token Usage */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Tokens</span>
                            <span className="text-sm text-muted-foreground">{summary.limits.token_usage}</span>
                          </div>
                          <Progress 
                            value={getUsagePercentage(summary.current_period.tokens_used, summary.limits.token_usage.includes('unlimited') ? null : parseInt(summary.limits.token_usage.split('/')[1]))} 
                            className="h-2"
                          />
                        </div>

                        {summary.limits.warnings.length > 0 && (
                          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="font-medium">Warnings</span>
                            </div>
                            <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                              {summary.limits.warnings.map((warning, index) => (
                                <li key={index}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Performance Metrics */}
                  {summary && summary.performance && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="w-5 h-5" />
                          Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Average Processing Time</span>
                            <span className="text-foreground">
                              {summary.performance.avg_processing_time_ms 
                                ? `${(summary.performance.avg_processing_time_ms / 1000).toFixed(2)}s`
                                : 'N/A'
                              }
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Success Rate</span>
                            <div className="flex items-center gap-2">
                              <span className="text-foreground">
                                {summary.performance.success_rate ? `${parseFloat(summary.performance.success_rate).toFixed(1)}%` : 'N/A'}
                              </span>
                              {summary.performance.success_rate && parseFloat(summary.performance.success_rate) >= 95 && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Model Usage Breakdown */}
                  {modelUsage && Object.keys(modelUsage.by_provider).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          Model Usage
                        </CardTitle>
                        <CardDescription>
                          AI model usage breakdown for the current period
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          // Calculate total input and output tokens across all models and providers
                          let totalInputTokens = 0;
                          let totalOutputTokens = 0;
                          
                          Object.values(modelUsage.by_provider).forEach(models => {
                            Object.values(models).forEach(usage => {
                              totalInputTokens += usage.input_tokens;
                              totalOutputTokens += usage.output_tokens;
                            });
                          });
                          
                          return (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <div className="text-2xl font-bold text-foreground">
                                  {formatNumber(totalInputTokens)}
                                </div>
                                <div className="text-sm text-muted-foreground">Input Tokens</div>
                              </div>
                              <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <div className="text-2xl font-bold text-foreground">
                                  {formatNumber(totalOutputTokens)}
                                </div>
                                <div className="text-sm text-muted-foreground">Output Tokens</div>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 