'use client'

import React from 'react'
import {
  BarChart3,
  TrendingUp,
  Target,
  CheckCircle,
  Users,
} from 'lucide-react'
import { type QualityMetrics, type QualitySeverity } from '@/types/quality'
import { cn } from '@/lib/utils'

interface QualityMetricsPanelProps {
  metrics: QualityMetrics
  entityQualitySummary: Record<string, Record<string, number>>
  className?: string
}

/**
 * QualityMetricsPanel — analytics tab for the Quality Gate page.
 *
 * Visual contract matches the rest of the app: flat graphora surfaces
 * (`bg-elev` + `line-strong` border + 13.5/500 card-head), compact 16px
 * padding, and the existing `.gx-bar` + `.gx-badge` utilities. No more giant
 * 8x8 icons or `p-8` rounded-2xl panels — those broke visual continuity with
 * the dashboard and config pages.
 *
 * Removed the duplicate "4 overview stat cards" at the top — that info
 * already lives in the hero banner's stat row above the tabs.
 */
export function QualityMetricsPanel({
  metrics,
  entityQualitySummary,
  className = '',
}: QualityMetricsPanelProps) {
  const propertyFillRates = Object.entries(metrics.property_fill_rates_by_entity ?? {}).sort(
    (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
  )

  const severityMeta: Record<QualitySeverity, { label: string; tone: 'danger' | 'warn' | 'info' }> = {
    error: { label: 'errors', tone: 'danger' },
    warning: { label: 'warnings', tone: 'warn' },
    info: { label: 'notes', tone: 'info' },
  }

  const severityOrder: QualitySeverity[] = ['error', 'warning', 'info']

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Row 1: Violation rates + Confidence — both are "percentage health" views */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Violation rates" icon={<TrendingUp className="h-[13px] w-[13px]" />} kicker="Entities and relationships with issues">
          <div className="space-y-4">
            <BarRow
              label="Entity violations"
              sub={`${metrics.entities_with_violations} of ${metrics.total_entities} entities`}
              pct={metrics.entity_violation_rate}
              invert
            />
            <BarRow
              label="Relationship violations"
              sub={`${metrics.relationships_with_violations} of ${metrics.total_relationships} relations`}
              pct={metrics.relationship_violation_rate}
              invert
            />
            <BarRow
              label="Overall violation rate"
              sub="Across all validated items"
              pct={metrics.overall_violation_rate}
              invert
            />
          </div>
        </Card>

        <Card title="Confidence" icon={<CheckCircle className="h-[13px] w-[13px]" />} kicker="Extraction confidence by target">
          <div className="space-y-4">
            <BarRow
              label="Entity confidence"
              pct={metrics.avg_entity_confidence * 100}
            />
            <BarRow
              label="Relationship confidence"
              pct={metrics.avg_relationship_confidence * 100}
            />
            {Object.keys(metrics.confidence_scores_by_type).length > 0 && (
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--line)' }} className="space-y-3">
                <div className="gx-kicker" style={{ marginBottom: 4 }}>
                  By entity type
                </div>
                {Object.entries(metrics.confidence_scores_by_type).map(([type, confidence]) => (
                  <BarRow
                    key={type}
                    label={type}
                    pct={confidence * 100}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 2: Property completeness + Entity type coverage */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Property completeness" icon={<Target className="h-[13px] w-[13px]" />} kicker="Populated required fields">
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>Overall</span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: coverageColor(metrics.property_completeness_rate),
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {Math.round(metrics.property_completeness_rate)}
                <span style={{ color: 'var(--fg-faint)', fontSize: 16, fontWeight: 400 }}>%</span>
              </span>
            </div>
            <div className={`gx-bar ${barTone(metrics.property_completeness_rate)}`}>
              <span style={{ width: `${clamp(metrics.property_completeness_rate)}%` }} />
            </div>

            {propertyFillRates.length > 0 && (
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--line)' }} className="space-y-3">
                <div className="gx-kicker" style={{ marginBottom: 4 }}>
                  Per entity type
                </div>
                {propertyFillRates.slice(0, 5).map(([entityType, ratio]) => (
                  <BarRow
                    key={entityType}
                    label={entityType}
                    pct={(ratio ?? 0) * 100}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card title="Entity type coverage" icon={<Users className="h-[13px] w-[13px]" />} kicker="Distribution across entity types">
          <div className="space-y-3">
            {Object.entries(metrics.entity_type_coverage).map(([entityType, count]) => {
              const pct = metrics.total_entities ? (count / metrics.total_entities) * 100 : 0
              return (
                <div key={entityType} className="space-y-1">
                  <div className="flex items-center justify-between" style={{ fontSize: 12.5 }}>
                    <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{entityType}</span>
                    <span
                      className="gx-mono"
                      style={{ color: 'var(--fg-muted)', fontSize: 11 }}
                    >
                      {count} · {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="gx-bar">
                    <span style={{ width: `${clamp(pct)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Row 3: Entity quality summary — violation severity per type */}
      {Object.keys(entityQualitySummary).length > 0 && (
        <Card
          title="Entity quality breakdown"
          icon={<BarChart3 className="h-[13px] w-[13px]" />}
          kicker="Violations grouped by entity type and severity"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(entityQualitySummary).map(([entityType, summary]) => {
              const severityCounts: Record<QualitySeverity, number> = {
                error: Number(summary.error ?? 0),
                warning: Number(summary.warning ?? 0),
                info: Number(summary.info ?? 0),
              }
              const total = Object.values(severityCounts).reduce((acc, v) => acc + v, 0)
              const hasFindings = total > 0
              return (
                <div
                  key={entityType}
                  style={{
                    background: 'var(--bg-deep)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-sm)',
                    padding: '12px 14px',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 500,
                        color: 'var(--fg)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {entityType}
                    </div>
                    {hasFindings && (
                      <span
                        className="gx-mono"
                        style={{
                          fontSize: 11,
                          color: 'var(--fg-muted)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {total}
                      </span>
                    )}
                  </div>
                  {hasFindings ? (
                    <div className="flex flex-wrap gap-1.5">
                      {severityOrder.map((severity) => {
                        const count = severityCounts[severity]
                        if (!count) return null
                        const meta = severityMeta[severity]
                        return (
                          <span
                            key={`${entityType}-${severity}`}
                            className={`gx-badge ${meta.tone}`}
                          >
                            <span className="tick" /> {count} {meta.label}
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <div
                      className="gx-mono"
                      style={{
                        fontSize: 10.5,
                        color: 'var(--gx-success)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      ✓ all checks passed
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

// ========================================================================
// Helpers
// ========================================================================

function Card({
  title,
  icon,
  kicker,
  children,
}: {
  title: string
  icon?: React.ReactNode
  kicker?: string
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
          padding: '12px 16px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {icon && <span style={{ color: 'var(--fg-muted)' }}>{icon}</span>}
        <div className="flex-1 min-w-0">
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
            <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 1, lineHeight: 1.3 }}>
              {kicker}
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

/**
 * BarRow — label + percentage value + progress bar + optional sub-label.
 * Used consistently across violation rates, confidence scores, fill rates.
 * `invert` flag flips the tone semantics (100% violation = bad, so invert
 * makes the bar red at high values).
 */
function BarRow({
  label,
  sub,
  pct,
  invert,
}: {
  label: string
  sub?: string
  pct: number
  invert?: boolean
}) {
  const v = clamp(pct)
  const tone = invert ? invertBarTone(v) : barTone(v)
  const textColor = invert ? coverageInvertColor(v) : coverageColor(v)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between" style={{ fontSize: 12.5 }}>
        <span style={{ color: 'var(--fg)', fontWeight: 500 }}>{label}</span>
        <span
          className="gx-mono"
          style={{ color: textColor, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}
        >
          {Math.round(v)}%
        </span>
      </div>
      <div className={`gx-bar ${tone}`}>
        <span style={{ width: `${v}%` }} />
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--fg-faint)' }}>{sub}</div>
      )}
    </div>
  )
}

const clamp = (v: number) => Math.max(0, Math.min(100, v))

// Semantic coloring for positive metrics (higher = better)
const coverageColor = (v: number) => {
  if (v >= 90) return 'var(--gx-success)'
  if (v >= 75) return 'var(--gx-info)'
  if (v >= 60) return 'var(--warn)'
  return 'var(--danger)'
}

const barTone = (v: number) => {
  if (v >= 90) return 'success'
  if (v >= 75) return ''
  if (v >= 60) return 'warn'
  return 'danger'
}

// Semantic coloring for inverted metrics (higher = worse — e.g. violation rate)
const coverageInvertColor = (v: number) => {
  if (v <= 5) return 'var(--gx-success)'
  if (v <= 15) return 'var(--gx-info)'
  if (v <= 30) return 'var(--warn)'
  return 'var(--danger)'
}

const invertBarTone = (v: number) => {
  if (v <= 5) return 'success'
  if (v <= 15) return ''
  if (v <= 30) return 'warn'
  return 'danger'
}
