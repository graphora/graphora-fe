'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'

import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import type { ButtonProps } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatTile } from '@/components/ui/stat-tile'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useUserConfig } from '@/hooks/useUserConfig'
import { dashboardApi } from '@/lib/dashboard-api'
import { TransformRunSummary } from '@/types/dashboard'
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
  Brain,
  Clock,
  Flame,
  Gauge,
  LucideIcon,
  TrendingUp,
  Zap,
} from 'lucide-react'

type TrendIconProps = {
  icon: LucideIcon
  tone: 'default' | 'warning' | 'critical' | 'success'
}

const trendToneClass: Record<TrendIconProps['tone'], string> = {
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
  if (!normalized) return '—'
  if (normalized === 'warn' || normalized === 'warning') return 'Warning'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
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

const ActionLinkButton = ({
  href,
  children,
  variant = 'outline',
  disabled = false,
}: {
  href?: string | null
  children: React.ReactNode
  variant?: ButtonProps['variant']
  disabled?: boolean
}) => {
  const button = (
    <Button size="sm" variant={variant} className="gap-1" disabled={disabled || !href}>
      {children}
    </Button>
  )

  if (href && !disabled) {
    return (
      <Link href={href} prefetch={false}>
        {button}
      </Link>
    )
  }

  return button
}

export default function DashboardPage() {
  const { checkConfigBeforeWorkflow } = useUserConfig()
  const { isLoaded: userLoaded } = useUser()

  const [runs, setRuns] = useState<TransformRunSummary[]>([])
  const [runsWindow, setRunsWindow] = useState<{ start?: string; end?: string }>({})
  const [runsLoading, setRunsLoading] = useState(true)
  const [runsError, setRunsError] = useState<string | null>(null)

  const [conflictsSummary, setConflictsSummary] = useState<any>(null)
  const [conflictsLoading, setConflictsLoading] = useState(true)
  const [conflictsError, setConflictsError] = useState<string | null>(null)

  useEffect(() => {
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
        }
      } finally {
        if (active) setRunsLoading(false)
      }
    }
    loadRuns()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const fetchConflicts = async () => {
      try {
        setConflictsLoading(true)
        const response = await fetch('/api/audit/conflicts', { credentials: 'include' })
        if (!response.ok) throw new Error('Failed to load merge conflicts')
        const data = await response.json()
        setConflictsSummary(data)
        setConflictsError(null)
      } catch (error) {
        console.error(error)
        const message = error instanceof Error ? error.message : null
        setConflictsError(normaliseErrorMessage(message))
        setConflictsSummary(null)
      } finally {
        setConflictsLoading(false)
      }
    }
    fetchConflicts()
  }, [])

  const derived = useMemo(() => {
    if (!runs.length) {
      return {
        totalRuns: 0,
        p50Duration: null as number | null,
        p95Duration: null as number | null,
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
      }
    }

    const durations = runs
      .map((run) => toSeconds(run.processing_duration_ms))
      .filter((value): value is number => value !== null)

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
      (run) => run.quality_requires_review || warnStatuses.includes(run) || failStatuses.includes(run)
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
          .filter(Boolean)
      )
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
      }
    )

    return {
      totalRuns: runs.length,
      p50Duration: percentile(durations, 50),
      p95Duration: percentile(durations, 95),
      passCount: passStatuses.length,
      warnCount: warnStatuses.length,
      failCount: failStatuses.length,
      reviewQueue,
      failedRuns,
      recentQualityReasons: recentReasons,
      avgScore: avgScoreValues.length
        ? Number((avgScoreValues.reduce((sum, value) => sum + value, 0) / avgScoreValues.length).toFixed(1))
        : null,
      llmTotals: {
        totalTokens: llmAggregate.totalTokens,
        totalCalls: llmAggregate.totalCalls,
        totalCost: Number(llmAggregate.totalCost.toFixed(4)),
        models: Array.from(llmAggregate.modelSet).slice(0, 6),
      },
    }
  }, [runs])

  const handleRunWorkflow = () => {
    if (checkConfigBeforeWorkflow()) {
      window.location.href = '/ontology'
    }
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-h-0">
        <PageHeader
          title="Dashboard"
          description="Execution health, performance, and actionables across your extracts"
          actions={
            <div className="flex items-centered gap-3">
              <Button variant="cta" size="lg" onClick={handleRunWorkflow}>
                Run Workflow
              </Button>
            </div>
          }
        />

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="page-shell py-section stack-gap p-6 space-y-6">
            {/* KPIs */}
            <section aria-labelledby="kpi-heading" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 id="kpi-heading" className="text-heading-sm font-semibold">
                  Pipeline KPIs ({runsWindow.start ? dashboardDateFormatter(runsWindow.start) : ''} →{' '}
                  {runsWindow.end ? dashboardDateFormatter(runsWindow.end) : ''})
                </h2>
                {runsError && <Badge variant="destructive">{runsError}</Badge>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatTile
                  value={formatNumber(derived.totalRuns)}
                  label="Transforms"
                  description="Runs processed in window"
                  trend={<TrendIcon icon={Activity} tone="default" />}
                />
                <StatTile
                  value={derived.avgScore !== null ? derived.avgScore.toFixed(1) : '—'}
                  label="Avg Quality Score"
                  description={`Pass ${derived.passCount} · Warn ${derived.warnCount} · Fail ${derived.failCount}`}
                  trend={<TrendIcon icon={Gauge} tone="success" />}
                />
                <StatTile
                  value={
                    derived.p50Duration !== null
                      ? `${formatSeconds(derived.p50Duration)} p50`
                      : '—'
                  }
                  label="Pipeline Duration"
                  description={
                    derived.p95Duration !== null ? `${formatSeconds(derived.p95Duration)} p95` : 'No duration data'
                  }
                  trend={<TrendIcon icon={Clock} tone="default" />}
                />
                <StatTile
                  value={formatNumber(derived.reviewQueue.length)}
                  label="Needs Attention"
                  description="Quality review or failed runs"
                  trend={<TrendIcon icon={AlertCircle} tone={derived.reviewQueue.length ? 'warning' : 'success'} />}
                />
              </div>
            </section>

            {/* Action Centre */}
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
                              <p className="text-body-sm font-medium truncate">
                                {run.document_name}
                              </p>
                              <p className="text-body-xs text-muted-foreground">
                                Gate: {qualityStatusLabel(run.quality_gate_status)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Score {run.quality_score?.toFixed(1) ?? '—'}</Badge>
                              <ActionLinkButton href={buildTransformHref(run)}>
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
                            className="flex items-center justify-between gap-3 rounded-lg bg-background/80 px-3 py-2 transition hover:bg-background"
                          >
                            <div className="min-w-0">
                              <p className="text-body-sm font-medium truncate">
                                {run.document_name}
                              </p>
                              <p className="text-body-xs text-muted-foreground">
                                {dashboardDateFormatter(run.processing_started_at)}
                              </p>
                            </div>
                            <ActionLinkButton href={buildTransformHref(run)}>
                              View logs
                            </ActionLinkButton>
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
                <CardContent className="space-y-3">
                  {conflictsLoading ? (
                    <p className="text-body-xs text-muted-foreground">Loading conflicts…</p>
                  ) : conflictsError ? (
                    <p className="text-body-xs text-muted-foreground">
                      Retry from the Merge tab once the service becomes available.
                    </p>
                  ) : conflictsSummary?.conflicts_by_merge?.length ? (
                    conflictsSummary.conflicts_by_merge.slice(0, 4).map((conflict: any) => (
                      <div key={conflict.merge_id} className="rounded-lg border border-border/50 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-body-sm font-medium">Merge {conflict.merge_id?.slice(0, 8)}</p>
                            <p className="text-body-xs text-muted-foreground">
                              {conflict.total_conflicts} conflicts · {Object.keys(conflict.by_type || {}).length} entity types
                            </p>
                          </div>
                          <Link href={`/merge?merge_id=${conflict.merge_id}`}>
                            <Button size="sm" variant="outline" className="gap-1">
                              <ArrowUpRight className="h-3.5 w-3.5" /> Resolve
                            </Button>
                          </Link>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {Object.entries(conflict.by_type || {}).map(([entityType, count]) => (
                            <Badge key={entityType} variant="neutral">
                              {entityType}: {count as number}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-body-xs text-muted-foreground">No outstanding merge conflicts.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <section aria-labelledby="performance-heading" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card className="border-border/40 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle id="performance-heading" className="text-heading-sm">
                    Performance overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border/30 bg-muted/10 p-4">
                      <p className="text-body-xs text-muted-foreground">Median pipeline time</p>
                      <p className="text-heading-sm font-semibold">
                        {derived.p50Duration !== null ? formatSeconds(derived.p50Duration) : '—'}
                      </p>
                      <p className="text-body-xs text-muted-foreground">
                        p95 {derived.p95Duration !== null ? formatSeconds(derived.p95Duration) : '—'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/30 bg-muted/10 p-4">
                      <p className="text-body-xs text-muted-foreground">Average nodes per run</p>
                      <p className="text-heading-sm font-semibold">
                        {formatNumber(
                          runs.length
                            ? Math.round(
                                runs.reduce((sum, run) => sum + run.nodes_extracted, 0) /
                                  runs.length
                              )
                            : 0
                        )}
                      </p>
                      <p className="text-body-xs text-muted-foreground">
                        Relationships avg {formatNumber(
                          runs.length
                            ? Math.round(
                                runs.reduce(
                                  (sum, run) => sum + run.relationships_extracted,
                                  0
                                ) /
                                  runs.length
                              )
                            : 0
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-muted/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-body-sm font-semibold text-foreground">
                        <TrendIcon icon={Zap} tone="default" /> LLM usage snapshot
                      </div>
                      <Badge variant="outline">{formatNumber(derived.llmTotals.totalCalls)} calls</Badge>
                    </div>
                    <dl className="space-y-2 text-body-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <dt>Total tokens</dt>
                        <dd>{formatNumber(derived.llmTotals.totalTokens)}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt>Estimated cost</dt>
                        <dd>
                          {derived.llmTotals.totalCost
                            ? `$${derived.llmTotals.totalCost.toFixed(4)}`
                            : '—'}
                        </dd>
                      </div>
                      {derived.llmTotals.models.length > 0 && (
                        <div>
                          <dt className="mb-1">Models used</dt>
                          <dd className="flex flex-wrap gap-2">
                            {derived.llmTotals.models.map((model) => (
                              <Badge key={model} variant="neutral">
                                {model}
                              </Badge>
                            ))}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-heading-sm">Quality signals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-border/30 bg-muted/10 p-4">
                    <p className="text-body-xs text-muted-foreground">Recent gate reasons</p>
                    {derived.recentQualityReasons.length ? (
                      <ul className="mt-2 space-y-1 text-body-xs">
                        {derived.recentQualityReasons.map((reason) => (
                          <li key={reason} className="flex items-start gap-2">
                            <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-warning" />
                            <span className="text-muted-foreground">{reason}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-body-xs mt-2">No warning or failure reasons in this window.</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-border/30 bg-muted/10 p-4">
                    <p className="text-body-xs text-muted-foreground">Average quality score</p>
                    <p className="text-heading-sm font-semibold">
                      {derived.avgScore !== null ? derived.avgScore.toFixed(1) : '—'} / 100
                    </p>
                    <p className="text-body-xs text-muted-foreground mt-2">
                      Pass {derived.passCount} · Warn {derived.warnCount} · Fail {derived.failCount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section aria-labelledby="recent-runs-heading" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 id="recent-runs-heading" className="text-heading-sm font-semibold">
                  Recent transforms
                </h2>
                <Badge variant="outline">{formatNumber(runs.length)} runs</Badge>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border/30 bg-background/80 backdrop-blur">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Document</th>
                      <th className="px-4 py-3 font-medium">Quality</th>
                      <th className="px-4 py-3 font-medium">Nodes / Edges</th>
                      <th className="px-4 py-3 font-medium">Tokens</th>
                      <th className="px-4 py-3 font-medium">Duration</th>
                      <th className="px-4 py-3 font-medium">Started</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runsLoading && !runs.length ? (
                      <tr>
                        <td className="px-4 py-6 text-muted-foreground text-center" colSpan={7}>
                          Loading runs…
                        </td>
                      </tr>
                    ) : runs.length ? (
                      runs.map((run) => (
                        <tr key={run.transform_id} className="border-t border-border/50">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{run.document_name}</span>
                              <span className="text-body-xs text-muted-foreground">
                                {run.document_type} · {formatBytes(run.document_size_bytes)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-body-sm font-medium">
                                {run.quality_score !== null && run.quality_score !== undefined
                                  ? run.quality_score.toFixed(1)
                                  : '—'}
                              </span>
                              <Badge
                                variant={run.quality_gate_status === 'fail' ? 'destructive' : run.quality_gate_status === 'warn' || run.quality_gate_status === 'warning' ? 'warning' : 'outline'}
                                className="w-fit"
                              >
                                {qualityStatusLabel(run.quality_gate_status)}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col text-body-sm">
                              <span>{formatNumber(run.nodes_extracted)} nodes</span>
                              <span className="text-body-xs text-muted-foreground">
                                {formatNumber(run.relationships_extracted)} edges
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-body-sm">
                            {formatNumber(run.llm_usage.total_tokens)}
                            <div className="text-body-xs text-muted-foreground">
                              {run.llm_usage.total_calls} calls
                            </div>
                          </td>
                          <td className="px-4 py-3 text-body-sm">
                            {run.processing_duration_ms ? formatSeconds(toSeconds(run.processing_duration_ms)!) : '—'}
                          </td>
                          <td className="px-4 py-3 text-body-sm text-muted-foreground">
                            {dashboardDateFormatter(run.processing_started_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <ActionLinkButton href={buildTransformHref(run)}>
                                Inspect
                              </ActionLinkButton>
                              <ActionLinkButton href={buildTransformHref(run, '#graph')} variant="ghost">
                                Graph
                              </ActionLinkButton>
                              <ActionLinkButton href={`/api/quality/export/${run.transform_id}`} variant="ghost">
                                CSV
                              </ActionLinkButton>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-6 text-muted-foreground text-center" colSpan={7}>
                          No runs recorded in this window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
