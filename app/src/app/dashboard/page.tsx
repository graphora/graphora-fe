'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useAuth'

import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { Button, buttonVariants } from '@/components/ui/button'
import type { ButtonProps } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatTile } from '@/components/ui/stat-tile'
import { cn } from '@/lib/utils'
import { useUserConfig } from '@/hooks/useUserConfig'
import { dashboardApi } from '@/lib/dashboard-api'
import type {
  DashboardPerformance,
  DashboardQuality,
  DashboardSummary,
  TransformRunSummary,
} from '@/types/dashboard'
import {
  dashboardDateFormatter,
  formatBytes,
  formatNumber,
  formatSeconds,
} from '@/lib/formatters'
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Clock,
  FileSpreadsheet,
  Flame,
  Gauge,
  Loader2,
  LucideIcon,
  Zap,
} from 'lucide-react'

interface ConflictByMerge {
  merge_id: string
  total_conflicts: number
  by_type: Record<string, number>
}

interface ConflictsSummaryResponse {
  total_conflicts: number
  conflicts_by_merge: ConflictByMerge[]
}

type TrendTone = 'default' | 'warning' | 'critical' | 'success'

type TrendIconProps = {
  icon: LucideIcon
  tone: TrendTone
}

const trendToneClass: Record<TrendTone, string> = {
  default: 'text-muted-foreground',
  warning: 'text-warning',
  critical: 'text-destructive',
  success: 'text-success',
}

const TrendIcon = ({ icon: Icon, tone }: TrendIconProps) => (
  <Icon className={cn('h-4 w-4', trendToneClass[tone])} />
)

const qualityStatusLabel = (status?: string | null) => {
  const normalized = status?.toLowerCase()
  if (!normalized) return 'Pending'
  if (normalized === 'warn' || normalized === 'warning') return 'Warning'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const qualityStatusVariant = (status?: string | null) => {
  const normalized = status?.toLowerCase()
  if (normalized === 'fail') return 'destructive'
  if (normalized === 'warn' || normalized === 'warning') return 'warning'
  if (normalized === 'pass') return 'success'
  return 'outline'
}

const percentile = (values: number[], percentage: number) => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentage / 100) * sorted.length) - 1
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)]
}

const toSeconds = (ms?: number | null) => (ms ? ms / 1000 : null)

const normaliseErrorMessage = (message?: string | null) => {
  if (!message) return 'Failed to load dashboard data'
  return /<[a-z!\/?][\s\S]*>/i.test(message)
    ? 'Failed to load dashboard data'
    : message
}

const buildTransformHref = (run: TransformRunSummary, hash?: string) => {
  if (!run.session_id) return null
  const base = `/transform?session_id=${run.session_id}&transform_id=${run.transform_id}`
  return hash ? `${base}${hash}` : base
}

type ActionLinkProps = {
  href?: string | null
  children: React.ReactNode
  icon?: LucideIcon
  variant?: ButtonProps['variant']
  disabled?: boolean
  external?: boolean
}

const ActionLinkButton = ({
  href,
  children,
  icon: Icon = ArrowUpRight,
  variant = 'outline',
  disabled = false,
  external = false,
}: ActionLinkProps) => {
  const baseClass = buttonVariants({ variant, size: 'sm', className: 'gap-1' })
  const content = (
    <>
      <Icon className="h-3.5 w-3.5" />
      <span>{children}</span>
    </>
  )

  if (!href || disabled) {
    return (
      <Button size="sm" variant={variant} className="gap-1" disabled>
        {content}
      </Button>
    )
  }

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={baseClass}>
        {content}
      </a>
    )
  }

  return (
    <Link href={href} prefetch={false} className={baseClass}>
      {content}
    </Link>
  )
}

export default function DashboardPage() {
  const { checkConfigBeforeWorkflow } = useUserConfig()
  const { isLoaded: userLoaded } = useUser()

  const [runs, setRuns] = useState<TransformRunSummary[]>([])
  const [runsWindow, setRunsWindow] = useState<{ start?: string; end?: string }>({})
  const [runsLoading, setRunsLoading] = useState(true)
  const [runsError, setRunsError] = useState<string | null>(null)

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [performance, setPerformance] = useState<DashboardPerformance | null>(null)
  const [performanceLoading, setPerformanceLoading] = useState(true)
  const [performanceError, setPerformanceError] = useState<string | null>(null)

  const [quality, setQuality] = useState<DashboardQuality | null>(null)
  const [qualityLoading, setQualityLoading] = useState(true)
  const [qualityError, setQualityError] = useState<string | null>(null)

  const [conflictsSummary, setConflictsSummary] = useState<ConflictsSummaryResponse | null>(
    null,
  )
  const [conflictsLoading, setConflictsLoading] = useState(true)
  const [conflictsError, setConflictsError] = useState<string | null>(null)

  useEffect(() => {
    if (!userLoaded) return

    let active = true

    const loadRuns = async () => {
      try {
        setRunsLoading(true)
        const data = await dashboardApi.getRecentRuns({ limit: 30, days: 14 })
        if (!active) return
        setRuns(data.runs)
        setRunsWindow({ start: data.window_start, end: data.window_end })
        setRunsError(null)
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : null
          setRunsError(normaliseErrorMessage(message))
          setRuns([])
        }
      } finally {
        if (active) setRunsLoading(false)
      }
    }

    loadRuns()
    return () => {
      active = false
    }
  }, [userLoaded])

  useEffect(() => {
    if (!userLoaded) return

    let active = true

    const loadSummary = async () => {
      try {
        setSummaryLoading(true)
        const data = await dashboardApi.getSummary({ days: 14, max_runs: 200 })
        if (!active) return
        setSummary(data)
        setSummaryError(null)
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : null
          setSummaryError(normaliseErrorMessage(message))
          setSummary(null)
        }
      } finally {
        if (active) setSummaryLoading(false)
      }
    }

    loadSummary()
    return () => {
      active = false
    }
  }, [userLoaded])

  useEffect(() => {
    if (!userLoaded) return

    let active = true

    const loadPerformance = async () => {
      try {
        setPerformanceLoading(true)
        const data = await dashboardApi.getPerformance({ days: 14, max_runs: 200 })
        if (!active) return
        setPerformance(data)
        setPerformanceError(null)
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : null
          setPerformanceError(normaliseErrorMessage(message))
          setPerformance(null)
        }
      } finally {
        if (active) setPerformanceLoading(false)
      }
    }

    loadPerformance()
    return () => {
      active = false
    }
  }, [userLoaded])

  useEffect(() => {
    if (!userLoaded) return

    let active = true

    const loadQuality = async () => {
      try {
        setQualityLoading(true)
        const data = await dashboardApi.getQuality({ days: 14, max_runs: 200 })
        if (!active) return
        setQuality(data)
        setQualityError(null)
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : null
          setQualityError(normaliseErrorMessage(message))
          setQuality(null)
        }
      } finally {
        if (active) setQualityLoading(false)
      }
    }

    loadQuality()
    return () => {
      active = false
    }
  }, [userLoaded])

  useEffect(() => {
    if (!userLoaded) return

    let active = true

    const fetchConflicts = async () => {
      try {
        setConflictsLoading(true)
        const response = await fetch('/api/audit/conflicts', { credentials: 'include' })
        if (!response.ok) throw new Error('Failed to load merge conflicts')
        const data = (await response.json()) as ConflictsSummaryResponse
        if (!active) return
        setConflictsSummary(data)
        setConflictsError(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : null
        if (active) {
          setConflictsSummary(null)
          setConflictsError(normaliseErrorMessage(message))
        }
      } finally {
        if (active) setConflictsLoading(false)
      }
    }

    fetchConflicts()
    return () => {
      active = false
    }
  }, [userLoaded])

  const isDashboardLoading =
    runsLoading ||
    summaryLoading ||
    performanceLoading ||
    qualityLoading ||
    conflictsLoading

  const kpiErrorMessage = !runs.length && runsError
    ? runsError
    : !summary && summaryError
      ? summaryError
      : null

  const performanceErrorMessage = !performance && performanceError ? performanceError : null
  const qualityErrorMessage = !quality && qualityError ? qualityError : null

  const derived = useMemo(() => {
    const defaults = {
      totalRuns: 0,
      p50Duration: null as number | null,
      p95Duration: null as number | null,
      averageDuration: null as number | null,
      passCount: 0,
      warnCount: 0,
      failCount: 0,
      reviewQueue: [] as TransformRunSummary[],
      failedRuns: [] as TransformRunSummary[],
      recentQualityReasons: [] as string[],
      avgScore: null as number | null,
      llmTotals: {
        totalTokens: 0,
        totalCalls: 0,
        totalCost: 0,
        models: [] as string[],
      },
      avgTokensPerRun: null as number | null,
      runsPerDay: null as number | null,
    }

    if (!runs.length) {
      return defaults
    }

    const durations = runs
      .map((run) => toSeconds(run.processing_duration_ms))
      .filter((value): value is number => value !== null)

    const averageDuration =
      durations.length > 0
        ? durations.reduce((sum, value) => sum + value, 0) / durations.length
        : null

    const warnStatuses = runs.filter((run) => {
      const normalized = run.quality_gate_status?.toLowerCase()
      return normalized === 'warn' || normalized === 'warning'
    })

    const failStatuses = runs.filter((run) => run.quality_gate_status?.toLowerCase() === 'fail')

    const passStatuses = runs.filter((run) => {
      const normalized = run.quality_gate_status?.toLowerCase()
      return normalized === 'pass' || (!normalized && run.quality_requires_review === false)
    })

    const reviewQueue = runs.filter(
      (run) => run.quality_requires_review || warnStatuses.includes(run) || failStatuses.includes(run),
    )

    const failedRuns = runs.filter((run) => run.processing_status === 'failed')

    const avgScoreValues = runs
      .map((run) => run.quality_score)
      .filter((value): value is number => typeof value === 'number')

    const recentReasons = Array.from(
      new Set(
        reviewQueue
          .flatMap((run) => run.quality_gate_reasons || [])
          .map((reason) => reason.trim())
          .filter(Boolean),
      ),
    ).slice(0, 5)

    const llmAggregate = runs.reduce(
      (acc, run) => {
        const usage = run.llm_usage
        acc.totalCalls += usage.total_calls
        acc.totalTokens += usage.total_tokens
        if (usage.estimated_cost_usd) {
          acc.totalCost += usage.estimated_cost_usd
        }
        usage.models_used.forEach((model) => acc.modelSet.add(model))
        return acc
      },
      {
        totalCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        modelSet: new Set<string>(),
      },
    )

    const tokensPerRun = runs.filter((run) => run.llm_usage.total_tokens > 0)
    const avgTokens =
      tokensPerRun.length > 0
        ? Math.round(
            tokensPerRun.reduce((sum, run) => sum + run.llm_usage.total_tokens, 0) /
              tokensPerRun.length,
          )
        : null

    let runsPerDay: number | null = null
    if (runsWindow.start && runsWindow.end) {
      const start = new Date(runsWindow.start)
      const end = new Date(runsWindow.end)
      const diffMs = Math.max(end.getTime() - start.getTime(), 0)
      const diffDays = Math.max(diffMs / (1000 * 60 * 60 * 24), 1)
      runsPerDay = Number((runs.length / diffDays).toFixed(1))
    }

    return {
      totalRuns: runs.length,
      p50Duration: percentile(durations, 50),
      p95Duration: percentile(durations, 95),
      averageDuration,
      passCount: passStatuses.length,
      warnCount: warnStatuses.length,
      failCount: failStatuses.length,
      reviewQueue,
      failedRuns,
      recentQualityReasons: recentReasons,
      avgScore: avgScoreValues.length
        ? Number(
            (
              avgScoreValues.reduce((sum, value) => sum + value, 0) / avgScoreValues.length
            ).toFixed(1),
          )
        : null,
      llmTotals: {
        totalTokens: llmAggregate.totalTokens,
        totalCalls: llmAggregate.totalCalls,
        totalCost: Number(llmAggregate.totalCost.toFixed(4)),
        models: Array.from(llmAggregate.modelSet).slice(0, 6),
      },
      avgTokensPerRun: avgTokens,
      runsPerDay,
    }
  }, [runs, runsWindow])

  const metrics = useMemo(() => {
    const totalRuns = summary?.total_runs ?? derived.totalRuns
    const avgScore = quality?.average_score ?? derived.avgScore
    const passCount = quality?.pass_count ?? summary?.pass_count ?? derived.passCount
    const warnCount = quality?.warn_count ?? summary?.warn_count ?? derived.warnCount
    const failCount = quality?.fail_count ?? summary?.fail_count ?? derived.failCount
    const needsAttention = summary?.requires_review_count ?? derived.reviewQueue.length

    const averageDurationSeconds = summary?.average_duration_ms
      ? summary.average_duration_ms / 1000
      : derived.averageDuration

    const p50DurationSeconds = summary?.p50_duration_ms
      ? summary.p50_duration_ms / 1000
      : derived.p50Duration

    const p95DurationSeconds = summary?.p95_duration_ms
      ? summary.p95_duration_ms / 1000
      : derived.p95Duration

    const runsPerDay = summary?.runs_per_day ?? derived.runsPerDay
    const totalTokens = summary?.total_tokens ?? derived.llmTotals.totalTokens
    const totalCalls = summary?.total_llm_calls ?? derived.llmTotals.totalCalls
    const totalCost =
      summary?.total_estimated_cost_usd ?? derived.llmTotals.totalCost ?? null
    const avgTokensPerRun = summary?.average_tokens_per_run ?? derived.avgTokensPerRun

    const recentReasons =
      quality?.recent_reasons?.map((item) =>
        item.count > 1 ? `${item.reason} (${item.count})` : item.reason,
      ) ?? summary?.recent_gate_reasons ?? derived.recentQualityReasons

    return {
      totalRuns,
      avgScore,
      passCount,
      warnCount,
      failCount,
      needsAttention,
      averageDurationSeconds,
      p50DurationSeconds,
      p95DurationSeconds,
      runsPerDay,
      totalTokens,
      totalCalls,
      totalCost,
      avgTokensPerRun,
      recentReasons,
    }
  }, [summary, quality, derived])

  const handleRunWorkflow = () => {
    if (checkConfigBeforeWorkflow()) {
      window.location.href = '/ontology'
    }
  }

  const renderConflictSummary = () => {
    if (conflictsLoading) {
      return <p className="text-body-xs text-muted-foreground">Loading conflicts…</p>
    }

    if (conflictsError) {
      return (
        <p className="text-body-xs text-muted-foreground">
          Retry from the Merge tab once the service becomes available.
        </p>
      )
    }

    if (!conflictsSummary || conflictsSummary.conflicts_by_merge.length === 0) {
      return <p className="text-body-xs text-muted-foreground">No conflicts require review.</p>
    }

    return conflictsSummary.conflicts_by_merge.slice(0, 4).map((conflict) => (
      <div key={conflict.merge_id} className="rounded-lg border border-border/40 bg-background/70 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-body-sm font-medium truncate">Merge {conflict.merge_id}</p>
            <p className="text-body-xs text-muted-foreground">
              {Object.entries(conflict.by_type)
                .map(([type, count]) => `${type}: ${count}`)
                .join(' · ')}
            </p>
          </div>
          <Badge variant="outline">{conflict.total_conflicts}</Badge>
        </div>
        <div className="mt-3 flex items-center justify-end">
          <ActionLinkButton href={`/merge?merge_id=${conflict.merge_id}`}>Resolve</ActionLinkButton>
        </div>
      </div>
    ))
  }

  const windowStart = runsWindow.start ? dashboardDateFormatter(runsWindow.start) : ''
  const windowEnd = runsWindow.end ? dashboardDateFormatter(runsWindow.end) : ''

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-h-0">
        <PageHeader
          title="Dashboard"
          description="Execution health, performance, and actionables across your extracts"
          actions={
            <div className="flex items-center gap-3">
              <Button variant="cta" size="lg" onClick={handleRunWorkflow}>
                Run Workflow
              </Button>
            </div>
          }
        />

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="page-shell py-section stack-gap p-6 space-y-6">
            {isDashboardLoading && (
              <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-2 text-body-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading dashboard data…
              </div>
            )}
            <section aria-labelledby="kpi-heading" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 id="kpi-heading" className="text-heading-sm font-semibold">
                  Pipeline KPIs {windowStart && windowEnd ? `(${windowStart} → ${windowEnd})` : ''}
                </h2>
                {kpiErrorMessage && <Badge variant="destructive">{kpiErrorMessage}</Badge>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatTile
                  value={formatNumber(metrics.totalRuns)}
                  label="Transforms"
                  description="Runs processed in window"
                  trend={<TrendIcon icon={Activity} tone="default" />}
                />
                <StatTile
                  value={metrics.avgScore !== null ? metrics.avgScore.toFixed(1) : '—'}
                  label="Avg Quality Score"
                  description={`Pass ${metrics.passCount} · Warn ${metrics.warnCount} · Fail ${metrics.failCount}`}
                  trend={<TrendIcon icon={Gauge} tone="success" />}
                />
                <StatTile
                  value={
                    metrics.p50DurationSeconds !== null
                      ? `${formatSeconds(metrics.p50DurationSeconds)} p50`
                      : '—'
                  }
                  label="Pipeline Duration"
                  description={
                    metrics.p95DurationSeconds !== null
                      ? `${formatSeconds(metrics.p95DurationSeconds)} p95`
                      : 'No duration data'
                  }
                  trend={<TrendIcon icon={Clock} tone="default" />}
                />
                <StatTile
                  value={formatNumber(metrics.needsAttention)}
                  label="Needs Attention"
                  description="Quality review or failed runs"
                  trend={
                    <TrendIcon
                      icon={AlertCircle}
                      tone={metrics.needsAttention ? 'warning' : 'success'}
                    />
                  }
                />
              </div>
            </section>

            <section aria-labelledby="action-center-heading" className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="xl:col-span-2 border-border/40 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle id="action-center-heading" className="text-heading-sm">
                      Action Center
                    </CardTitle>
                    <p className="text-body-xs text-muted-foreground">
                      Quality reviews, failed runs, and open merge conflicts
                    </p>
                  </div>
                  <Badge variant={derived.reviewQueue.length ? 'warning' : 'success'}>
                    {derived.reviewQueue.length || 'No'} reviews
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-border/30 bg-muted/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-body-sm font-semibold text-foreground">
                        <TrendIcon icon={Gauge} tone="warning" /> Quality review queue
                      </div>
                      <Badge variant="outline">{derived.reviewQueue.length}</Badge>
                    </div>
                    {derived.reviewQueue.length ? (
                      <div className="space-y-2">
                        {derived.reviewQueue.slice(0, 4).map((run) => (
                          <div
                            key={run.transform_id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-background/80 px-3 py-2 transition hover:bg-background"
                          >
                            <div className="min-w-0">
                              <p className="text-body-sm font-medium truncate">{run.document_name}</p>
                              <p className="text-body-xs text-muted-foreground">
                                Gate: {qualityStatusLabel(run.quality_gate_status)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Score {run.quality_score?.toFixed(1) ?? '—'}</Badge>
                              <ActionLinkButton href={buildTransformHref(run, '#quality')}>
                                Review
                              </ActionLinkButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-body-xs text-muted-foreground">No quality reviews pending.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border/30 bg-muted/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-body-sm font-semibold text-foreground">
                        <TrendIcon icon={Flame} tone={derived.failedRuns.length ? 'critical' : 'default'} /> Failed runs
                      </div>
                      <Badge variant="outline">{derived.failedRuns.length}</Badge>
                    </div>
                    {derived.failedRuns.length ? (
                      <div className="space-y-2">
                        {derived.failedRuns.slice(0, 3).map((run) => (
                          <div
                            key={run.transform_id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-background/80 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-body-sm font-medium truncate">{run.document_name}</p>
                              <p className="text-body-xs text-muted-foreground">
                                {dashboardDateFormatter(run.processing_started_at)}
                              </p>
                            </div>
                            <Badge variant="destructive">Failed</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-body-xs text-muted-foreground">No failed runs in this window.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-heading-sm">Merge conflicts</CardTitle>
                    <p className="text-body-xs text-muted-foreground">Open items needing manual resolution</p>
                    {conflictsError && (
                      <p className="text-body-xs text-destructive">{conflictsError}</p>
                    )}
                  </div>
                  <Badge
                    variant={
                      conflictsError
                        ? 'destructive'
                        : conflictsSummary?.total_conflicts
                        ? 'warning'
                        : 'success'
                    }
                  >
                    {conflictsError ? 'Error' : conflictsSummary?.total_conflicts || 0}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">{renderConflictSummary()}</CardContent>
              </Card>
            </section>

            <section aria-labelledby="performance-heading" className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="xl:col-span-2 border-border/40 bg-card/80 backdrop-blur">
                <CardHeader className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle id="performance-heading" className="text-heading-sm">
                      Performance &amp; LLM usage
                    </CardTitle>
                    <p className="text-body-xs text-muted-foreground">
                      Latency, throughput, and token consumption for the selected window
                    </p>
                  </div>
                  {performanceErrorMessage ? (
                    <Badge variant="destructive">{performanceErrorMessage}</Badge>
                  ) : (
                    <Badge variant="outline">
                      {metrics.runsPerDay ? `${metrics.runsPerDay} runs/day` : '—'}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border/40 bg-background/70 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-body-sm font-semibold text-foreground">
                      <BarChart3 className="h-4 w-4 text-primary" /> Pipeline duration
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-body-xs text-muted-foreground">
                      <div>
                        <dt>Average</dt>
                        <dd className="text-body-sm font-medium text-foreground">
                          {metrics.averageDurationSeconds !== null
                            ? formatSeconds(metrics.averageDurationSeconds)
                            : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>P95</dt>
                        <dd className="text-body-sm font-medium text-foreground">
                          {metrics.p95DurationSeconds !== null
                            ? formatSeconds(metrics.p95DurationSeconds)
                            : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>Total runs</dt>
                        <dd className="text-body-sm font-medium text-foreground">
                          {formatNumber(metrics.totalRuns)}
                        </dd>
                      </div>
                      <div>
                        <dt>Runs/day</dt>
                        <dd className="text-body-sm font-medium text-foreground">
                          {metrics.runsPerDay ?? '—'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-lg border border-border/40 bg-background/70 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-body-sm font-semibold text-foreground">
                      <Zap className="h-4 w-4 text-primary" /> LLM tokens &amp; cost
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-body-xs text-muted-foreground">
                      <div>
                        <dt>Total tokens</dt>
                        <dd className="text-body-sm font-medium text-foreground">
                          {metrics.totalTokens ? formatNumber(metrics.totalTokens) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>Total calls</dt>
                        <dd className="text-body-sm font-medium text-foreground">
                          {metrics.totalCalls ? formatNumber(metrics.totalCalls) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>Avg tokens/run</dt>
                        <dd className="text-body-sm font-medium text-foreground">
                          {metrics.avgTokensPerRun ? formatNumber(metrics.avgTokensPerRun) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>Estimated cost</dt>
                        <dd className="text-body-sm font-medium text-foreground">
                          {metrics.totalCost ? `$${metrics.totalCost.toFixed(4)}` : '—'}
                        </dd>
                      </div>
                    </dl>
                    {derived.llmTotals.models.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-body-xs">
                        {derived.llmTotals.models.map((model) => (
                          <Badge key={model} variant="outline">
                            {model}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-col gap-1">
                  <CardTitle className="text-heading-sm">Quality signals</CardTitle>
                  <p className="text-body-xs text-muted-foreground">
                    Gate outcomes, confidence trends, and recent rule triggers
                  </p>
                  {qualityErrorMessage && (
                    <p className="text-body-xs text-destructive">{qualityErrorMessage}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-body-sm">
                    <Badge variant="success">Pass {metrics.passCount}</Badge>
                    <Badge variant="warning">Warn {metrics.warnCount}</Badge>
                    <Badge variant="destructive">Fail {metrics.failCount}</Badge>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/70 p-3 space-y-3">
                    <p className="text-body-xs text-muted-foreground">Top recent reasons</p>
                    {metrics.recentReasons.length ? (
                      <ul className="space-y-2 text-body-xs text-foreground">
                        {metrics.recentReasons.map((reason) => (
                          <li key={reason} className="flex items-start gap-2">
                            <span className="mt-[2px] h-1.5 w-1.5 rounded-full bg-primary" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-body-xs text-muted-foreground">No rule violations in this window.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section aria-labelledby="recent-runs-heading" className="space-y-4">
              <Card className="border-border/40 bg-card/80 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle id="recent-runs-heading" className="text-heading-sm">
                      Recent transforms
                    </CardTitle>
                    <p className="text-body-xs text-muted-foreground">
                      Latest runs with quality gates, nodes, and quick actions
                    </p>
                  </div>
                  {runsLoading && <Badge variant="outline">Loading…</Badge>}
                </CardHeader>
                <CardContent className="space-y-4">
                  {runsLoading ? (
                    <p className="text-body-xs text-muted-foreground">Fetching run history…</p>
                  ) : runs.length === 0 ? (
                    <p className="text-body-xs text-muted-foreground">
                      No transforms recorded in this window. Run a document to populate the dashboard.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-body-xs">
                        <thead className="text-muted-foreground">
                          <tr className="border-b border-border/40">
                            <th className="px-3 py-2 font-medium">Document</th>
                            <th className="px-3 py-2 font-medium">Quality gate</th>
                            <th className="px-3 py-2 font-medium">Duration</th>
                            <th className="px-3 py-2 font-medium">Tokens</th>
                            <th className="px-3 py-2 font-medium">Nodes · Edges</th>
                            <th className="px-3 py-2 font-medium">Size · Chunks</th>
                            <th className="px-3 py-2 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runs.map((run) => {
                            const inspectHref = buildTransformHref(run, '#chunks')
                            const csvHref = `/api/quality/export/${run.transform_id}`

                            return (
                              <tr key={run.transform_id} className="border-b border-border/20">
                                <td className="px-3 py-3 align-top">
                                  <div className="space-y-1">
                                    <p className="text-body-sm font-medium text-foreground truncate">
                                      {run.document_name}
                                    </p>
                                    <p className="text-body-xs text-muted-foreground">
                                      {dashboardDateFormatter(run.processing_started_at)}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-3 py-3 align-top">
                                  <div className="space-y-2">
                                    <Badge variant={qualityStatusVariant(run.quality_gate_status)}>
                                      {qualityStatusLabel(run.quality_gate_status)}
                                    </Badge>
                                    <p className="text-body-xs text-muted-foreground">
                                      Score {run.quality_score?.toFixed(1) ?? '—'}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-3 py-3 align-top text-body-sm text-foreground">
                                  {run.processing_duration_ms
                                    ? formatSeconds(toSeconds(run.processing_duration_ms) || 0)
                                    : '—'}
                                </td>
                                <td className="px-3 py-3 align-top text-body-sm text-foreground">
                                  {run.llm_usage.total_tokens
                                    ? formatNumber(run.llm_usage.total_tokens)
                                    : '—'}
                                </td>
                                <td className="px-3 py-3 align-top text-body-sm text-foreground">
                                  {formatNumber(run.nodes_extracted)} · {formatNumber(run.relationships_extracted)}
                                </td>
                                <td className="px-3 py-3 align-top text-body-sm text-foreground">
                                  <div className="space-y-1">
                                    <p>{formatBytes(run.document_size_bytes)}</p>
                                    <p className="text-body-xs text-muted-foreground">
                                      {formatNumber(run.chunks_created)} chunks
                                    </p>
                                  </div>
                                </td>
                                <td className="px-3 py-3 align-top">
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <ActionLinkButton href={inspectHref}>Inspect</ActionLinkButton>
                                    <ActionLinkButton href={csvHref} icon={FileSpreadsheet} external>
                                      CSV
                                    </ActionLinkButton>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
