'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, Plus, RefreshCw, Eye, ArrowRight } from 'lucide-react'

import { useUser } from '@/hooks/useAuth'
import { useUserConfig } from '@/hooks/useUserConfig'

import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { NodePill, Spark } from '@/components/graphora'

import { dashboardApi } from '@/lib/dashboard-api'
import type {
  DashboardPerformance,
  DashboardQuality,
  DashboardSummary,
  PerformanceTimeseriesPoint,
  TransformRunSummary,
} from '@/types/dashboard'
import {
  dashboardDateFormatter,
  formatNumber,
  formatSeconds,
} from '@/lib/formatters'

interface ConflictByMerge {
  merge_id: string
  total_conflicts: number
  by_type: Record<string, number>
}

interface ConflictsSummaryResponse {
  total_conflicts: number
  conflicts_by_merge: ConflictByMerge[]
}

const percentile = (values: number[], pct: number) => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.ceil((pct / 100) * sorted.length) - 1
  return sorted[Math.min(Math.max(idx, 0), sorted.length - 1)]
}

const toSeconds = (ms?: number | null) => (ms ? ms / 1000 : null)

const normaliseErrorMessage = (message?: string | null) => {
  if (!message) return 'Failed to load dashboard data'
  return /<[a-z!\/?][\s\S]*>/i.test(message) ? 'Failed to load dashboard data' : message
}

const qualityStatusLabel = (status?: string | null) => {
  const n = status?.toLowerCase()
  if (!n) return 'pending'
  if (n === 'warn' || n === 'warning') return 'warn'
  if (n === 'pass') return 'pass'
  if (n === 'fail') return 'fail'
  return n
}

const qualityStatusTone = (status?: string | null): 'success' | 'warn' | 'danger' | 'info' => {
  const n = status?.toLowerCase()
  if (n === 'fail') return 'danger'
  if (n === 'warn' || n === 'warning') return 'warn'
  if (n === 'pass') return 'success'
  return 'info'
}

const buildTransformHref = (run: TransformRunSummary, hash?: string) => {
  if (!run.session_id) return null
  const base = `/transform?session_id=${run.session_id}&transform_id=${run.transform_id}`
  return hash ? `${base}${hash}` : base
}

export default function DashboardPage() {
  const { checkConfigBeforeWorkflow } = useUserConfig()
  const { isLoaded: userLoaded } = useUser()

  const [runs, setRuns] = useState<TransformRunSummary[]>([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [runsError, setRunsError] = useState<string | null>(null)
  const [runsWindow, setRunsWindow] = useState<{ start?: string; end?: string }>({})

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [performance, setPerformance] = useState<DashboardPerformance | null>(null)

  const [quality, setQuality] = useState<DashboardQuality | null>(null)

  const [conflictsSummary, setConflictsSummary] = useState<ConflictsSummaryResponse | null>(null)

  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d')

  useEffect(() => {
    if (!userLoaded) return
    let active = true

    const days = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30

    ;(async () => {
      try {
        setRunsLoading(true)
        const data = await dashboardApi.getRecentRuns({ limit: 30, days })
        if (!active) return
        setRuns(data.runs)
        setRunsWindow({ start: data.window_start, end: data.window_end })
        setRunsError(null)
      } catch (err) {
        if (active) {
          setRunsError(normaliseErrorMessage(err instanceof Error ? err.message : null))
          setRuns([])
        }
      } finally {
        if (active) setRunsLoading(false)
      }
    })()

    ;(async () => {
      try {
        setSummaryLoading(true)
        const data = await dashboardApi.getSummary({ days, max_runs: 200 })
        if (active) setSummary(data)
      } catch {
        if (active) setSummary(null)
      } finally {
        if (active) setSummaryLoading(false)
      }
    })()

    ;(async () => {
      try {
        const data = await dashboardApi.getPerformance({ days, max_runs: 200 })
        if (active) setPerformance(data)
      } catch {
        if (active) setPerformance(null)
      }
    })()

    ;(async () => {
      try {
        const data = await dashboardApi.getQuality({ days, max_runs: 200 })
        if (active) setQuality(data)
      } catch {
        if (active) setQuality(null)
      }
    })()

    ;(async () => {
      try {
        const response = await fetch('/api/audit/conflicts', { credentials: 'include' })
        if (!response.ok) throw new Error('Failed to load merge conflicts')
        const data = (await response.json()) as ConflictsSummaryResponse
        if (active) setConflictsSummary(data)
      } catch {
        if (active) setConflictsSummary(null)
      }
    })()

    return () => {
      active = false
    }
  }, [userLoaded, timeframe])

  // --- Derived metrics (preserving the original computation) ----------------
  const derived = useMemo(() => {
    const durations = runs
      .map((r) => toSeconds(r.processing_duration_ms))
      .filter((v): v is number => v !== null)
    const avgScoreValues = runs
      .map((r) => r.quality_score)
      .filter((v): v is number => typeof v === 'number')
    const totalNodes = runs.reduce((sum, r) => sum + (r.nodes_extracted || 0), 0)
    const totalRels = runs.reduce((sum, r) => sum + (r.relationships_extracted || 0), 0)
    const passCount = runs.filter((r) => r.quality_gate_status?.toLowerCase() === 'pass').length
    const warnCount = runs.filter((r) => {
      const n = r.quality_gate_status?.toLowerCase()
      return n === 'warn' || n === 'warning'
    }).length
    const failCount = runs.filter((r) => r.quality_gate_status?.toLowerCase() === 'fail').length
    const avgScore =
      avgScoreValues.length > 0
        ? Number(
            (avgScoreValues.reduce((a, b) => a + b, 0) / avgScoreValues.length).toFixed(1),
          )
        : null

    return {
      totalRuns: runs.length,
      totalNodes,
      totalRels,
      avgScore,
      passCount,
      warnCount,
      failCount,
      p50Duration: percentile(durations, 50),
      p95Duration: percentile(durations, 95),
    }
  }, [runs])

  const metrics = {
    totalRuns: summary?.total_runs ?? derived.totalRuns,
    totalNodes: derived.totalNodes,
    totalRels: derived.totalRels,
    avgScore: quality?.average_score ?? derived.avgScore,
    passCount: quality?.pass_count ?? summary?.pass_count ?? derived.passCount,
    warnCount: quality?.warn_count ?? summary?.warn_count ?? derived.warnCount,
    failCount: quality?.fail_count ?? summary?.fail_count ?? derived.failCount,
    p50DurationSeconds: summary?.p50_duration_ms
      ? summary.p50_duration_ms / 1000
      : derived.p50Duration,
    p95DurationSeconds: summary?.p95_duration_ms
      ? summary.p95_duration_ms / 1000
      : derived.p95Duration,
    pendingConflicts: conflictsSummary?.total_conflicts ?? 0,
    conflictsByType: conflictsSummary?.conflicts_by_merge.reduce<Record<string, number>>(
      (acc, c) => {
        Object.entries(c.by_type).forEach(([type, count]) => {
          acc[type] = (acc[type] || 0) + count
        })
        return acc
      },
      {},
    ) ?? {},
  }

  const handleRunWorkflow = () => {
    if (checkConfigBeforeWorkflow()) {
      window.location.href = '/ontology'
    }
  }

  // Sparkline values from performance timeseries where available
  const nodesSpark = useMemo(() => {
    if (performance?.timeseries?.length) {
      return performance.timeseries.map((p) => p.runs || 0)
    }
    // Fallback: distribute runs across a gentle climb
    return runs.length ? runs.slice(0, 12).map((r) => r.nodes_extracted || 0).reverse() : []
  }, [performance, runs])

  const relsSpark = useMemo(() => {
    if (performance?.timeseries?.length) {
      return performance.timeseries.map((p) => p.total_tokens || 0)
    }
    return runs.length ? runs.slice(0, 12).map((r) => r.relationships_extracted || 0).reverse() : []
  }, [performance, runs])

  // Derive a process-ticker stream from the most recent runs
  const tickerLines = useMemo(() => {
    return runs.slice(0, 10).map((run) => {
      const time = run.processing_started_at
        ? new Date(run.processing_started_at).toLocaleTimeString('en-GB', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : '--:--:--'
      const status = run.processing_status
      const gate = run.quality_gate_status?.toLowerCase()
      const tone: 'ok' | 'warn' | 'cur' =
        status === 'failed' || gate === 'fail' ? 'warn' : gate === 'warn' ? 'warn' : 'ok'
      const glyph = tone === 'warn' ? '!' : '✓'
      const label =
        status === 'failed'
          ? `transform ${run.transform_id.slice(0, 8)} failed`
          : gate === 'warn'
            ? `quality gate flagged ${run.document_name}`
            : `transform ${run.transform_id.slice(0, 8)} · ${formatNumber(run.nodes_extracted)} entities`
      return { time, tone, glyph, label, id: run.transform_id }
    })
  }, [runs])

  return (
    <DashboardLayout>
      <div className="gx-page-enter" style={{ padding: '28px 32px 48px', maxWidth: 1600 }}>
        <PageHeader
          kicker={`Overview · Last ${timeframe}`}
          title="Pipeline at a glance"
          description="Execution health, quality signals, and actionables across your extracts."
          actions={
            <>
              <TimeframeChips value={timeframe} onChange={setTimeframe} />
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-[13px] w-[13px]" /> Export
              </Button>
              <Button size="sm" className="gap-1.5" onClick={handleRunWorkflow}>
                <Plus className="h-[13px] w-[13px]" /> New transform
              </Button>
            </>
          }
        />

        {/* Stat row ------------------------------------------------------- */}
        <section className="gx-stagger mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Entities"
            value={formatNumber(metrics.totalNodes)}
            trend={
              runsLoading
                ? { text: 'loading…' }
                : { text: `${metrics.totalRuns} runs in window`, tone: 'up' }
            }
            spark={<Spark values={nodesSpark.length ? nodesSpark : [1, 2, 2, 3, 3, 4, 5, 6]} />}
          />
          <StatTile
            label="Relations"
            value={formatNumber(metrics.totalRels)}
            trend={{
              text: metrics.totalNodes
                ? `${(metrics.totalRels / Math.max(metrics.totalNodes, 1)).toFixed(2)} avg/entity`
                : '—',
              tone: 'up',
            }}
            spark={<Spark values={relsSpark.length ? relsSpark : [1, 2, 3, 4, 5, 7, 9, 12]} color="var(--edge)" />}
          />
          <StatTile
            label="Quality score"
            value={
              metrics.avgScore !== null ? (
                <>
                  {metrics.avgScore.toFixed(1)}
                  <span style={{ color: 'var(--fg-faint)', fontSize: 18, fontWeight: 400 }}>
                    /100
                  </span>
                </>
              ) : (
                '—'
              )
            }
            trend={{
              text: `pass ${metrics.passCount} · warn ${metrics.warnCount} · fail ${metrics.failCount}`,
              tone: 'up',
            }}
            bar={{
              value: metrics.avgScore ?? 0,
              tone: (metrics.avgScore ?? 0) >= 80 ? 'success' : 'warn',
            }}
          />
          <StatTile
            label="Pending conflicts"
            value={formatNumber(metrics.pendingConflicts)}
            trend={{
              text: metrics.pendingConflicts
                ? 'awaiting review'
                : 'all clear',
              tone: metrics.pendingConflicts ? 'dn' : 'up',
            }}
            chips={
              metrics.pendingConflicts ? (
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  {Object.entries(metrics.conflictsByType)
                    .slice(0, 3)
                    .map(([type, count]) => (
                      <NodePill
                        key={type}
                        tone={type.includes('dup') ? 'danger' : 'warn'}
                      >
                        {type}:{count}
                      </NodePill>
                    ))}
                </div>
              ) : null
            }
          />
        </section>

        {/* Chart + Ticker row -------------------------------------------- */}
        <section
          className="gx-stagger mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]"
        >
          <Card
            title="Ingestion throughput"
            headerRight={
              <div className="flex items-center gap-2">
                <span className="gx-badge success">
                  <span className="tick" />
                  nominal
                </span>
                <span className="gx-mono gx-faint" style={{ fontSize: 10 }}>
                  RATE · docs/day
                </span>
              </div>
            }
          >
            <div style={{ padding: '20px 20px 16px' }}>
              <ThroughputChart timeseries={performance?.timeseries || []} />
            </div>
          </Card>

          <Card
            title="Live pipeline"
            headerRight={
              <span className="gx-mono gx-faint" style={{ fontSize: 10 }}>
                STREAM
              </span>
            }
          >
            <div className="gx-ticker" style={{ padding: 16, maxHeight: 280, overflow: 'auto' }}>
              {tickerLines.length > 0 ? (
                tickerLines.map((l) => (
                  <div key={l.id}>
                    <span className="ts">{l.time}</span>{' '}
                    <span className={l.tone === 'warn' ? 'warn' : 'ok'}>{l.glyph}</span>{' '}
                    {l.label.split(' ').map((word, i) => {
                      const isHex = /^[a-f0-9]{8}/i.test(word) || word.startsWith('t-') || word.startsWith('m-')
                      return (
                        <React.Fragment key={i}>
                          {isHex ? <span className="cur">{word}</span> : word}{' '}
                        </React.Fragment>
                      )
                    })}
                  </div>
                ))
              ) : (
                <div className="gx-faint" style={{ fontSize: 11 }}>
                  No recent activity in this window.
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Quality + Recent transforms ----------------------------------- */}
        <section className="gx-stagger mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card
            title="Quality signals"
            headerRight={
              <Button variant="ghost" size="sm" className="gap-1.5">
                <RefreshCw className="h-[11px] w-[11px]" />
              </Button>
            }
          >
            <div style={{ padding: '14px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="gx-badge success">
                <span className="tick" /> pass {metrics.passCount}
              </span>
              <span className="gx-badge warn">
                <span className="tick" /> warn {metrics.warnCount}
              </span>
              <span className="gx-badge danger">
                <span className="tick" /> fail {metrics.failCount}
              </span>
            </div>
            <div style={{ padding: '4px 16px 16px' }}>
              <div className="gx-sep-label">Top recent reasons</div>
              {quality?.recent_reasons && quality.recent_reasons.length > 0 ? (
                <div className="gx-mlist">
                  {quality.recent_reasons.slice(0, 6).map((r) => (
                    <div key={r.reason} style={{ display: 'flex', gap: 12 }}>
                      <span className="k" style={{ minWidth: 44, textAlign: 'right' }}>
                        ×{r.count}
                      </span>
                      <span className="v" style={{ wordBreak: 'break-word' }}>{r.reason}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gx-faint" style={{ fontSize: 11.5 }}>
                  No rule violations in this window.
                </div>
              )}
            </div>
          </Card>

          <Card
            title="Recent transforms"
            headerRight={
              runsLoading ? (
                <span className="gx-badge">
                  <span className="tick" /> loading
                </span>
              ) : (
                <span className="gx-mono gx-faint" style={{ fontSize: 10 }}>
                  LAST {runs.length}
                </span>
              )
            }
          >
            {runs.length > 0 ? (
              <TransformTable runs={runs.slice(0, 8)} />
            ) : (
              <div
                className="gx-faint"
                style={{ padding: 20, fontSize: 11.5, textAlign: 'center' }}
              >
                {runsError ?? 'No transforms in this window. Run a document to populate.'}
              </div>
            )}
          </Card>
        </section>

        {/* Window footer */}
        {runsWindow.start && runsWindow.end && (
          <div
            className="gx-mono gx-faint mt-8"
            style={{ fontSize: 10, letterSpacing: '0.08em' }}
          >
            WINDOW · {dashboardDateFormatter(runsWindow.start)} →{' '}
            {dashboardDateFormatter(runsWindow.end)}
            {summaryLoading && <span> · syncing…</span>}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// ============ Subcomponents ==============================================

function TimeframeChips({
  value,
  onChange,
}: {
  value: '24h' | '7d' | '30d'
  onChange: (v: '24h' | '7d' | '30d') => void
}) {
  const options: Array<{ v: '24h' | '7d' | '30d'; label: string }> = [
    { v: '24h', label: '24h' },
    { v: '7d', label: '7d' },
    { v: '30d', label: '30d' },
  ]
  return (
    <div
      className="inline-flex"
      style={{
        padding: 3,
        background: 'var(--bg-deep)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-sm)',
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const on = opt.v === value
        return (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            style={{
              padding: '5px 10px',
              borderRadius: 4,
              fontSize: 11.5,
              color: on ? 'var(--fg)' : 'var(--fg-muted)',
              fontWeight: 500,
              background: on ? 'var(--bg-elev-2)' : 'transparent',
              boxShadow: on ? '0 0 0 1px var(--line-strong)' : 'none',
              transition: 'all var(--dur-1) var(--ease)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function StatTile({
  label,
  value,
  trend,
  spark,
  bar,
  chips,
}: {
  label: string
  value: React.ReactNode
  trend?: { text: string; tone?: 'up' | 'dn' }
  spark?: React.ReactNode
  bar?: { value: number; tone: 'success' | 'warn' | 'danger' }
  chips?: React.ReactNode
}) {
  return (
    <div
      style={{
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--fg-faint)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontWeight: 500,
          fontSize: 28,
          letterSpacing: '-0.02em',
          color: 'var(--fg)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.15,
        }}
      >
        {value}
      </div>
      {trend && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            color: 'var(--fg-muted)',
          }}
        >
          <span
            className="gx-mono"
            style={{
              color: trend.tone === 'dn' ? 'var(--danger)' : trend.tone === 'up' ? 'var(--gx-success)' : 'var(--fg-muted)',
              fontSize: 11,
            }}
          >
            {trend.tone === 'up' ? '↑' : trend.tone === 'dn' ? '↓' : ''}
          </span>
          <span>{trend.text}</span>
        </div>
      )}
      {spark}
      {bar && (
        <div className={`gx-bar ${bar.tone}`} style={{ marginTop: 6 }}>
          <span style={{ width: `${Math.max(0, Math.min(100, bar.value))}%` }} />
        </div>
      )}
      {chips}
    </div>
  )
}

function Card({
  title,
  headerRight,
  children,
}: {
  title: string
  headerRight?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <h3 style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--fg)', margin: 0 }}>
          {title}
        </h3>
        {headerRight}
      </div>
      {children}
    </div>
  )
}

function ThroughputChart({ timeseries }: { timeseries: PerformanceTimeseriesPoint[] }) {
  const points = timeseries.length > 0 ? timeseries.map((p) => p.runs || 0) : [3, 5, 4, 7, 8, 12, 10, 14, 16, 18, 14, 20]
  const W = 720
  const H = 200
  const P = 24
  const max = Math.max(...points, 1)
  const step = points.length > 1 ? (W - P * 2) / (points.length - 1) : 0
  const pts = points.map((v, i) => [P + i * step, H - P - (v / max) * (H - P * 2)] as const)
  const d = pts.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ')
  const da = d + ` L ${W - P} ${H - P} L ${P} ${H - P} Z`

  const labels = timeseries.length > 0
    ? timeseries.filter((_, i) => i % Math.max(1, Math.floor(timeseries.length / 5)) === 0).map((p) => {
        const d = new Date(p.date)
        return `${d.getMonth() + 1}/${d.getDate()}`
      })
    : ['00:00', '06:00', '12:00', '18:00', '24:00']

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 220 }}>
      <defs>
        <linearGradient id="thrFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gx-accent)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--gx-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((r) => (
        <line
          key={r}
          x1={P}
          x2={W - P}
          y1={P + r * (H - P * 2)}
          y2={P + r * (H - P * 2)}
          stroke="var(--line)"
          strokeDasharray="2 4"
        />
      ))}
      <path d={da} fill="url(#thrFill)" />
      <path d={d} stroke="var(--gx-accent)" strokeWidth="1.6" fill="none" />
      {pts.map(([x, y], i) => (i % Math.max(1, Math.floor(pts.length / 8)) === 0) && (
        <circle key={i} cx={x} cy={y} r="2" fill="var(--gx-accent)" />
      ))}
      {labels.map((t, i) => (
        <text
          key={`${t}-${i}`}
          x={P + (i / Math.max(labels.length - 1, 1)) * (W - P * 2)}
          y={H - 4}
          textAnchor="middle"
          className="gx-g-label"
          fill="var(--fg-faint)"
        >
          {t}
        </text>
      ))}
    </svg>
  )
}

function TransformTable({ runs }: { runs: TransformRunSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12.5px',
        }}
      >
        <thead>
          <tr>
            {['Run', 'Document', 'Gate', 'Duration', 'Nodes'].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  fontSize: '10.5px',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-faint)',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--line)',
                  background: 'var(--bg-deep)',
                }}
              >
                {h}
              </th>
            ))}
            <th style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--line)' }} />
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const tone = qualityStatusTone(run.quality_gate_status)
            const href = buildTransformHref(run, '#chunks')
            return (
              <tr
                key={run.transform_id}
                style={{
                  transition: 'background var(--dur-1) var(--ease)',
                }}
              >
                <td
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--line)',
                    fontFamily: 'var(--font-mono), "IBM Plex Mono", monospace',
                    fontSize: '11.5px',
                    color: 'var(--fg-muted)',
                  }}
                >
                  {run.transform_id.slice(0, 8)}
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <NodePill>{truncate(run.document_name, 28)}</NodePill>
                </td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  <span className={`gx-badge ${tone}`}>
                    <span className="tick" />
                    {qualityStatusLabel(run.quality_gate_status)}
                  </span>
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--line)',
                    fontFamily: 'var(--font-mono), "IBM Plex Mono", monospace',
                    fontSize: '11.5px',
                    color: 'var(--fg)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {run.processing_duration_ms
                    ? formatSeconds((run.processing_duration_ms || 0) / 1000)
                    : '—'}
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--line)',
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono), "IBM Plex Mono", monospace',
                    fontSize: '11.5px',
                    color: 'var(--fg)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatNumber(run.nodes_extracted)}
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--line)',
                    textAlign: 'right',
                  }}
                >
                  {href ? (
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1"
                      style={{
                        color: 'var(--fg-muted)',
                        fontSize: 11,
                      }}
                    >
                      <Eye className="h-[11px] w-[11px]" />
                      <ArrowRight className="h-[11px] w-[11px]" />
                    </Link>
                  ) : (
                    <span style={{ color: 'var(--fg-faint)' }}>—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function truncate(text: string, max: number) {
  if (!text) return ''
  if (text.length <= max) return text
  return text.slice(0, max - 1) + '…'
}
