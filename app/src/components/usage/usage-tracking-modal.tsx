'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
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
  AlertTriangle,
  CheckCircle,
  Activity,
  Calendar,
  RefreshCw,
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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
      setTimeout(() => {
        document.body.style.removeProperty('pointer-events')
        document.body.classList.remove('overflow-hidden')
      }, 100)
    }
  }

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
    }

    return () => {
      document.body.style.removeProperty('pointer-events')
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen])

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num)

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

  const planTier = summary?.limits?.tier ?? '—'
  const billingPeriodLabel = summary
    ? `${new Date(summary.current_period.start).toLocaleDateString()} – ${new Date(
        summary.current_period.end,
      ).toLocaleDateString()}`
    : summaryLoading
      ? 'Loading…'
      : 'Not available'

  const summaryMetrics = [
    {
      label: 'Documents',
      value: summaryLoading ? '…' : formatNumber(summary?.current_period.documents_processed ?? 0),
      icon: FileText,
      accent: 'from-blue-500 via-blue-400 to-sky-400',
    },
    {
      label: 'Pages',
      value: summaryLoading ? '…' : formatNumber(summary?.current_period.pages_processed ?? 0),
      icon: Activity,
      accent: 'from-emerald-500 via-green-400 to-lime-400',
    },
    {
      label: 'Tokens',
      value: summaryLoading ? '…' : formatNumber(summary?.current_period.tokens_used ?? 0),
      icon: Zap,
      accent: 'from-purple-500 via-fuchsia-400 to-pink-400',
    },
  ] as const

  const parseLimitValue = (value?: string) => {
    if (!value) return null
    if (value.toLowerCase().includes('unlimited')) return null
    const limit = value.split('/')[1] ?? value
    const numeric = parseInt(limit.replace(/[^0-9]/g, ''), 10)
    return Number.isFinite(numeric) ? numeric : null
  }

  const limitBreakdown = summary
    ? [
        {
          label: 'Documents',
          current: summary.current_period.documents_processed ?? 0,
          limit: parseLimitValue(summary.limits.document_usage),
          icon: FileText,
        },
        {
          label: 'Pages',
          current: summary.current_period.pages_processed ?? 0,
          limit: parseLimitValue(summary.limits.page_usage),
          icon: Activity,
        },
        {
          label: 'Tokens',
          current: summary.current_period.tokens_used ?? 0,
          limit: parseLimitValue(summary.limits.token_usage),
          icon: Zap,
        },
      ]
    : []

  const statusStyles = {
    good: {
      indicator: 'from-primary via-primary/80 to-primary/60',
      badge: 'success',
      label: 'On track',
    },
    warning: {
      indicator: 'from-amber-400 via-amber-300 to-orange-300',
      badge: 'warning',
      label: 'Approaching limit',
    },
    danger: {
      indicator: 'from-destructive via-destructive/80 to-rose-500',
      badge: 'destructive',
      label: 'Limit reached',
    },
    unlimited: {
      indicator: 'from-info via-info/80 to-info/60',
      badge: 'info',
      label: 'Unlimited',
    },
  } as const

  const usageWarnings = summary?.limits?.warnings ?? []
  const averageProcessingSeconds = summary?.performance?.avg_processing_time_ms
    ? summary.performance.avg_processing_time_ms / 1000
    : null
  const successRateValue = summary?.performance?.success_rate ? parseFloat(summary.performance.success_rate) : null

  const handleRefresh = () => {
    refetchSummary()
    refetchModelUsage()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-surface max-w-6xl max-h-[90vh] overflow-hidden border border-white/15 p-0 shadow-large">
        <div className="grid h-full md:grid-cols-[320px_minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="flex flex-col justify-between gap-8 bg-gradient-to-br from-primary/22 via-background/32 to-background/65 p-8 text-left backdrop-blur-panel">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-foreground/55">Plan tier</p>
                <Badge
                  variant="glass"
                  className="w-fit border-white/25 bg-white/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-foreground"
                >
                  {planTier}
                </Badge>
                <p className="text-sm text-foreground/70">Billing period {billingPeriodLabel}</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-foreground/55">Usage snapshot</p>
                <div className="space-y-3">
                  {summaryMetrics.map((metric) => {
                    const Icon = metric.icon
                    return (
                      <div
                        key={metric.label}
                        className="flex items-center justify-between rounded-xl border border-white/15 bg-white/10 p-4 shadow-glass"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-glass',
                              metric.accent,
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-sm text-foreground/75">{metric.label}</span>
                        </div>
                        <span className="text-display-xs text-foreground">{metric.value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-foreground/55">Capacity</p>
                <div className="space-y-4">
                  {limitBreakdown.length > 0 ? (
                    limitBreakdown.map((item) => {
                      const status = getUsageStatus(item.current, item.limit) as keyof typeof statusStyles
                      const styles = statusStyles[status]
                      const percent = item.limit ? getUsagePercentage(item.current, item.limit) : 0
                      const Icon = item.icon
                      return (
                        <div key={item.label} className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-foreground/70">
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-foreground/50" />
                              {item.label}
                            </span>
                            <Badge variant={styles.badge} className="text-[0.6rem] uppercase tracking-[0.14em]">
                              {styles.label}
                            </Badge>
                          </div>
                          <Progress
                            value={percent}
                            className="h-2 overflow-hidden rounded-full bg-white/15"
                            indicatorClassName={cn('bg-gradient-to-r', styles.indicator)}
                          />
                          <div className="flex justify-between text-[0.7rem] text-foreground/60">
                            <span>{formatNumber(item.current)} used</span>
                            <span>{item.limit ? `${formatNumber(item.limit)} limit` : 'Unlimited'}</span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-foreground/60">
                      {summaryLoading ? 'Loading usage limits…' : summaryError ? 'Usage limits unavailable.' : 'No limits configured.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-white/12 bg-white/8 p-5 text-xs text-foreground/75 shadow-inner">
              {usageWarnings.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium uppercase tracking-[0.16em]">Warnings</span>
                  </div>
                  <ul className="space-y-1 text-foreground/80">
                    {usageWarnings.map((warning) => (
                      <li key={warning}>• {warning}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex items-start gap-2 text-foreground/80">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <div className="space-y-1">
                    <p className="font-medium uppercase tracking-[0.16em] text-foreground/70">All clear</p>
                    <p>Usage is within plan limits.</p>
                  </div>
                </div>
              )}
              <Separator className="border-white/15" />
              <div className="grid grid-cols-2 gap-3 text-foreground/70">
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.18em] text-foreground/60">Avg processing</p>
                  <p className="text-sm text-foreground">
                    {averageProcessingSeconds !== null ? `${Math.round(averageProcessingSeconds)}s` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.18em] text-foreground/60">Success rate</p>
                  <p className="text-sm text-foreground">
                    {successRateValue !== null ? `${successRateValue.toFixed(1)}%` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex flex-col bg-background/92 backdrop-blur-panel">
            <header className="flex items-center justify-between border-b border-white/10 p-8 pb-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-glass">
                  <BarChart3 className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <DialogTitle className="text-display-xs text-foreground">Usage & Billing</DialogTitle>
                  <p className="text-sm text-foreground/70">Track your document processing and AI usage</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={summaryLoading || modelLoading}
                className="border-white/20 text-foreground hover:bg-white/10"
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', (summaryLoading || modelLoading) && 'animate-spin')} />
                Refresh
              </Button>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
              <div className="px-8 pt-4">
                <TabsList className="flex w-full justify-start gap-3 bg-transparent p-0">
                  <TabsTrigger
                    value="overview"
                    className="relative flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-white/12 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glass"
                  >
                    <Activity className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-auto px-8 pb-8">
                <TabsContent value="overview" className="mt-0 space-y-6">
                  {summaryError ? (
                    <Card variant="glass" className="border-destructive/40 bg-destructive/10 text-destructive shadow-glass">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          <span>Error loading usage data: {summaryError}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <Card variant="glass" className="border-white/15 bg-white/5 shadow-glass">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-2 text-heading">
                            <Calendar className="h-5 w-5" />
                            Current billing period
                          </CardTitle>
                          <CardDescription>{billingPeriodLabel}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {summaryMetrics.map((metric) => {
                              const Icon = metric.icon
                              return (
                                <div
                                  key={metric.label}
                                  className="rounded-xl border border-white/15 bg-white/10 p-4 text-center"
                                >
                                  <Icon className="mx-auto mb-3 h-6 w-6 text-foreground/70" />
                                  <p className="text-display-xs text-foreground">{metric.value}</p>
                                  <p className="text-sm text-foreground/65">{metric.label}</p>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {summary && (
                        <Card variant="glass" className="border-white/15 bg-white/5 shadow-glass">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-heading">
                              <TrendingUp className="h-5 w-5" />
                              Usage limits
                              <Badge variant={summary.limits.within_limits ? 'success' : 'destructive'} className="ml-2">
                                {summary.limits.tier}
                              </Badge>
                            </CardTitle>
                            <CardDescription>Current usage against your plan limits</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {limitBreakdown.map((item) => {
                              const status = getUsageStatus(item.current, item.limit) as keyof typeof statusStyles
                              const styles = statusStyles[status]
                              return (
                                <div key={item.label} className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-foreground/80">{item.label}</span>
                                    <span className="text-foreground/60">
                                      {item.limit
                                        ? `${formatNumber(item.current)} / ${formatNumber(item.limit)}`
                                        : `${formatNumber(item.current)} of unlimited`}
                                    </span>
                                  </div>
                                  <Progress
                                    value={item.limit ? getUsagePercentage(item.current, item.limit) : 0}
                                    className="h-2 overflow-hidden rounded-full bg-white/15"
                                    indicatorClassName={cn('bg-gradient-to-r', styles.indicator)}
                                  />
                                </div>
                              )
                            })}

                            {usageWarnings.length > 0 && (
                              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                                <div className="flex items-center gap-2 font-medium">
                                  <AlertTriangle className="h-4 w-4" />
                                  Warnings
                                </div>
                                <ul className="mt-2 space-y-1 text-warning/90">
                                  {usageWarnings.map((warning) => (
                                    <li key={warning}>• {warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {summary && summary.performance && (
                        <Card variant="glass" className="border-white/15 bg-white/5 shadow-glass">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-heading">
                              <Activity className="h-5 w-5" />
                              Performance
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-6 sm:grid-cols-2">
                              <div className="rounded-lg border border-white/15 bg-white/10 p-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-foreground/60">Average processing</p>
                                <p className="text-lg text-foreground">
                                  {averageProcessingSeconds !== null ? `${averageProcessingSeconds.toFixed(2)}s` : 'N/A'}
                                </p>
                              </div>
                              <div className="rounded-lg border border-white/15 bg-white/10 p-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-foreground/60">Success rate</p>
                                <div className="flex items-center gap-2 text-lg text-foreground">
                                  {successRateValue !== null ? `${successRateValue.toFixed(1)}%` : 'N/A'}
                                  {successRateValue !== null && successRateValue >= 95 && (
                                    <CheckCircle className="h-4 w-4 text-success" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {modelUsage && Object.keys(modelUsage.by_provider).length > 0 && (
                        <Card variant="glass" className="border-white/15 bg-white/5 shadow-glass">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-heading">
                              <Zap className="h-5 w-5" />
                              Model usage
                            </CardTitle>
                            <CardDescription>AI model usage breakdown for the current period</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {(() => {
                              let totalInputTokens = 0
                              let totalOutputTokens = 0
                              Object.values(modelUsage.by_provider).forEach((models) => {
                                Object.values(models).forEach((usage) => {
                                  totalInputTokens += usage.input_tokens
                                  totalOutputTokens += usage.output_tokens
                                })
                              })
                              return (
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div className="rounded-lg border border-white/15 bg-white/10 p-4 text-center">
                                    <p className="text-display-xs text-foreground">{formatNumber(totalInputTokens)}</p>
                                    <p className="text-sm text-foreground/60">Input tokens</p>
                                  </div>
                                  <div className="rounded-lg border border-white/15 bg-white/10 p-4 text-center">
                                    <p className="text-display-xs text-foreground">{formatNumber(totalOutputTokens)}</p>
                                    <p className="text-sm text-foreground/60">Output tokens</p>
                                  </div>
                                </div>
                              )
                            })()}
                          </CardContent>
                        </Card>
                      )}

                      {modelError && (
                        <Card variant="glass" className="border-destructive/40 bg-destructive/10 text-destructive shadow-glass">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5" />
                              <span>Error loading model usage: {modelError}</span>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
