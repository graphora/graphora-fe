'use client'

import React from 'react'
import {
  Zap,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  RefreshCw,
  Sigma,
} from 'lucide-react'

import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { useUsageSummary, useModelUsage } from '@/hooks/useUsageData'
import { cn } from '@/lib/utils'

const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num)

const getUsagePercentage = (current: number, limit: number | null) => {
  if (!limit) return 0
  return Math.min((current / limit) * 100, 100)
}

const parseLimit = (usageString: string | undefined): number | null => {
  if (!usageString || usageString.includes('unlimited')) return null
  const parts = usageString.split('/')
  if (parts.length < 2) return null
  const parsed = parseInt(parts[1], 10)
  return Number.isFinite(parsed) ? parsed : null
}

export default function UsagePage() {
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useUsageSummary()
  const {
    data: modelUsage,
    loading: modelLoading,
    refetch: refetchModelUsage,
  } = useModelUsage(30)

  const handleRefresh = () => {
    refetchSummary()
    refetchModelUsage()
  }

  // Aggregate model usage across providers
  let totalInputTokens = 0
  let totalOutputTokens = 0
  if (modelUsage) {
    Object.values(modelUsage.by_provider).forEach((models) => {
      Object.values(models).forEach((usage) => {
        totalInputTokens += usage.input_tokens
        totalOutputTokens += usage.output_tokens
      })
    })
  }

  const periodRange =
    summary &&
    `${new Date(summary.current_period.start).toLocaleDateString()} – ${new Date(summary.current_period.end).toLocaleDateString()}`

  return (
    <>
      <div className="gx-page-enter" style={{ padding: '28px 32px 48px', maxWidth: 1600 }}>
        <PageHeader
          kicker="System · usage & billing"
          title="Usage & billing"
          description="Track document processing, AI tokens, and plan limits across the current billing period."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={summaryLoading || modelLoading}
              className="gap-1.5"
            >
              <RefreshCw
                className={cn('h-[13px] w-[13px]', (summaryLoading || modelLoading) && 'animate-spin')}
              />
              Refresh
            </Button>
          }
        />

        {summaryError ? (
          <div
            className="mt-7 flex items-center gap-3"
            style={{
              padding: '14px 16px',
              background: 'color-mix(in oklch, var(--danger), transparent 92%)',
              border: '1px solid color-mix(in oklch, var(--danger), transparent 70%)',
              borderRadius: 'var(--r-md)',
              color: 'var(--fg)',
            }}
          >
            <AlertTriangle className="h-[15px] w-[15px]" style={{ color: 'var(--danger)' }} />
            <span style={{ fontSize: 12.5 }}>
              Error loading usage data: <span className="gx-mono">{summaryError}</span>
            </span>
          </div>
        ) : (
          <>
            {/* Current billing period - stat row */}
            <section className="gx-stagger mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatTile
                label="Documents"
                value={summaryLoading ? '…' : formatNumber(summary?.current_period.documents_processed || 0)}
                icon={<FileText className="h-[13px] w-[13px]" />}
              />
              <StatTile
                label="Pages"
                value={summaryLoading ? '…' : formatNumber(summary?.current_period.pages_processed || 0)}
                icon={<Clock className="h-[13px] w-[13px]" />}
              />
              <StatTile
                label="Tokens"
                value={summaryLoading ? '…' : formatNumber(summary?.current_period.tokens_used || 0)}
                icon={<Zap className="h-[13px] w-[13px]" />}
                tone="edge"
              />
            </section>

            {periodRange && (
              <div
                className="gx-mono gx-faint mt-3 flex items-center gap-2"
                style={{ fontSize: 10.5, letterSpacing: '0.08em' }}
              >
                <Calendar className="h-[11px] w-[11px]" />
                <span>BILLING PERIOD · {periodRange.toUpperCase()}</span>
              </div>
            )}

            {/* Plan limits */}
            {summary && (
              <section className="gx-stagger mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
                <Card
                  title="Plan limits"
                  kicker="Current usage against your tier"
                  headerRight={
                    <span
                      className={cn('gx-badge', summary.limits.within_limits ? 'success' : 'danger')}
                    >
                      <span className="tick" /> {summary.limits.tier}
                    </span>
                  }
                >
                  <div style={{ padding: 16 }} className="space-y-4">
                    <LimitBar
                      label="Documents"
                      display={summary.limits.document_usage}
                      value={summary.current_period.documents_processed}
                      limit={parseLimit(summary.limits.document_usage)}
                    />
                    <LimitBar
                      label="Pages"
                      display={summary.limits.page_usage}
                      value={summary.current_period.pages_processed}
                      limit={parseLimit(summary.limits.page_usage)}
                    />
                    <LimitBar
                      label="Tokens"
                      display={summary.limits.token_usage}
                      value={summary.current_period.tokens_used}
                      limit={parseLimit(summary.limits.token_usage)}
                    />
                    {summary.limits.warnings.length > 0 && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 12,
                          background: 'color-mix(in oklch, var(--warn), transparent 92%)',
                          border: '1px solid color-mix(in oklch, var(--warn), transparent 70%)',
                          borderRadius: 'var(--r-sm)',
                        }}
                      >
                        <div
                          className="gx-mono flex items-center gap-2"
                          style={{
                            color: 'var(--warn)',
                            fontSize: 10.5,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          <AlertTriangle className="h-[11px] w-[11px]" />
                          Warnings
                        </div>
                        <ul
                          className="mt-2 gx-mlist"
                          style={{ fontSize: 11.5, color: 'var(--fg)' }}
                        >
                          {summary.limits.warnings.map((warning, i) => (
                            <li key={i}>· {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>

                {summary.performance && (
                  <Card
                    title="Performance"
                    kicker="Pipeline vitals"
                    headerRight={<Sigma className="h-[14px] w-[14px]" style={{ color: 'var(--fg-faint)' }} />}
                  >
                    <div style={{ padding: 16 }} className="gx-mlist">
                      <div className="flex items-center justify-between" style={{ padding: '5px 0' }}>
                        <span className="k">avg_time   </span>
                        <span className="v">
                          {summary.performance.avg_processing_time_ms
                            ? `${(summary.performance.avg_processing_time_ms / 1000).toFixed(2)}s`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between" style={{ padding: '5px 0' }}>
                        <span className="k">success    </span>
                        <span className="v flex items-center gap-1.5">
                          {summary.performance.success_rate
                            ? `${parseFloat(summary.performance.success_rate).toFixed(1)}%`
                            : '—'}
                          {summary.performance.success_rate &&
                            parseFloat(summary.performance.success_rate) >= 95 && (
                              <CheckCircle
                                className="h-[12px] w-[12px]"
                                style={{ color: 'var(--gx-success)' }}
                              />
                            )}
                        </span>
                      </div>
                    </div>
                  </Card>
                )}
              </section>
            )}

            {/* Token breakdown */}
            {modelUsage && Object.keys(modelUsage.by_provider).length > 0 && (
              <section className="gx-stagger mt-6">
                <Card
                  title="Model usage"
                  kicker="Input / output tokens, last 30d"
                  headerRight={
                    <span className="gx-mono gx-faint" style={{ fontSize: 10, letterSpacing: '0.08em' }}>
                      {Object.keys(modelUsage.by_provider).length} PROVIDER
                      {Object.keys(modelUsage.by_provider).length > 1 ? 'S' : ''}
                    </span>
                  }
                >
                  <div style={{ padding: 16 }} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <TokenTile label="Input tokens" value={formatNumber(totalInputTokens)} />
                    <TokenTile label="Output tokens" value={formatNumber(totalOutputTokens)} tone="edge" />
                  </div>
                </Card>
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}

// ============ Subcomponents =============================================

function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  tone?: 'default' | 'edge'
}) {
  return (
    <div
      style={{
        padding: '16px 18px',
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="gx-kicker"
          style={{ margin: 0, color: 'var(--fg-faint)' }}
        >
          {label}
        </span>
        <span style={{ marginLeft: 'auto', color: tone === 'edge' ? 'var(--edge)' : 'var(--gx-accent)' }}>
          {icon}
        </span>
      </div>
      <div
        style={{
          fontWeight: 500,
          fontSize: 28,
          letterSpacing: '-0.02em',
          color: 'var(--fg)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function TokenTile({
  label,
  value,
  tone,
}: {
  label: string
  value: React.ReactNode
  tone?: 'default' | 'edge'
}) {
  return (
    <div
      style={{
        padding: '18px 20px',
        background: 'var(--bg-deep)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span className="gx-kicker" style={{ margin: 0, color: 'var(--fg-faint)' }}>
        {label}
      </span>
      <span
        style={{
          fontWeight: 500,
          fontSize: 26,
          letterSpacing: '-0.02em',
          color: tone === 'edge' ? 'var(--edge)' : 'var(--fg)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function Card({
  title,
  kicker,
  headerRight,
  children,
}: {
  title: string
  kicker?: string
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
        <div>
          <h3
            style={{
              fontSize: '13.5px',
              fontWeight: 500,
              color: 'var(--fg)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h3>
          {kicker && (
            <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 2 }}>
              {kicker}
            </div>
          )}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  )
}

function LimitBar({
  label,
  display,
  value,
  limit,
}: {
  label: string
  display: string
  value: number
  limit: number | null
}) {
  const pct = getUsagePercentage(value, limit)
  const tone: 'success' | 'warn' | 'danger' = pct >= 95 ? 'danger' : pct >= 75 ? 'warn' : 'success'
  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg)' }}>{label}</span>
        <span
          className="gx-mono"
          style={{ fontSize: 11, color: 'var(--fg-muted)', letterSpacing: '0.02em' }}
        >
          {display}
        </span>
      </div>
      <div className={`gx-bar ${tone}`}>
        <span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  )
}
