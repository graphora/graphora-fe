'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  RefreshCw,
  Trophy,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  Claim,
  Contradiction,
  ContradictionsResponse,
} from '@/types/contradictions'

/**
 * B1-prob slice 3 frontend tab.
 *
 * Renders the /contradictions surface populated by the slice 2b
 * pipeline hooks (node-side at extraction time, edge-side mirror
 * landed in the same Gate-4 push). Per (target, property) group
 * shows competing claims sorted by confidence DESC with the
 * pipeline-winning claim highlighted; the rest are alternatives
 * the contradiction detector wants the operator to review.
 *
 * Three distinct empty states matter here and have to be told
 * apart — the slice 2a backend pinned ``total_claims_scanned``
 * as a required field specifically so the UI could honor that
 * distinction:
 *
 *   1. ``total_claims_scanned === 0`` — no claims emitted for
 *      this transform yet. Either an older run (pre-slice-2b)
 *      or the writer hook didn't fire. Different message because
 *      "no contradictions" is misleading when no claims exist
 *      to evaluate.
 *   2. ``total_claims_scanned > 0 && contradictions.length === 0``
 *      — the writer is healthy, the data is consistent, no
 *      cross-chunk disagreement surfaced. This is the good
 *      state; show a positive confirmation.
 *   3. ``contradictions.length > 0`` — render the list.
 *
 * Lazy fetch: fires on first activation (same pattern as the
 * Schema tab). Manual refresh through the toolbar button.
 */
interface ContradictionsTabProps {
  transformId: string
}

export function ContradictionsTab({ transformId }: ContradictionsTabProps) {
  const [data, setData] = useState<ContradictionsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(`/api/graph/${transformId}/contradictions`)
      const text = await resp.text()
      if (!resp.ok) {
        const detail = safeParse<{ error?: string; detail?: string }>(text)
        throw new Error(
          detail?.error ||
            detail?.detail ||
            `Contradictions fetch failed (${resp.status})`
        )
      }
      const parsed = JSON.parse(text) as ContradictionsResponse
      setData(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [transformId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <header className="flex flex-wrap items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold">Contradictions</h2>
          <p className="text-sm text-muted-foreground">
            Per-property disagreements the extractor surfaced across
            chunks. Pipeline picked the highest-confidence value for
            each; the alternatives are here for review.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </header>

      {loading && data === null && <ContradictionsSkeleton />}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-medium">Could not load contradictions</p>
          <p className="mt-1 text-destructive/80">{error}</p>
        </Card>
      )}

      {data && !loading && !error && (
        <>
          <SummaryRow data={data} />
          {data.total_claims_scanned === 0 ? (
            <NoClaimsState />
          ) : data.contradictions.length === 0 ? (
            <NoContradictionsState totalScanned={data.total_claims_scanned} />
          ) : (
            <ul className="flex flex-col gap-3">
              {data.contradictions.map((c) => (
                <li
                  key={`${c.target_kind}:${c.target_id}:${c.property_key}`}
                >
                  <ContradictionCard contradiction={c} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

// ---- Sub-components --------------------------------------------------------

function ContradictionsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

function SummaryRow({ data }: { data: ContradictionsResponse }) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryStat
          label="Contradictions"
          value={data.contradictions.length}
          tone={data.contradictions.length > 0 ? 'warning' : 'neutral'}
        />
        <SummaryStat
          label="Claims scanned"
          value={data.total_claims_scanned}
          tone="neutral"
        />
        <SummaryStat
          label="Min confidence"
          value={formatFloat(data.min_confidence)}
          tone="muted"
        />
      </div>
    </Card>
  )
}

type StatTone = 'warning' | 'neutral' | 'muted' | 'good'

const TONE_STYLES: Record<StatTone, string> = {
  warning: 'text-amber-700 dark:text-amber-400',
  neutral: 'text-foreground',
  muted: 'text-muted-foreground',
  good: 'text-green-700 dark:text-green-400',
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: StatTone
}) {
  return (
    <div>
      <div className={`text-xl font-semibold ${TONE_STYLES[tone]}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function NoClaimsState() {
  // Total_claims_scanned === 0: distinct from "no contradictions"
  // because no evidence exists yet. The operator needs to know
  // to re-run extraction, not that the data is clean.
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <CircleDashed className="h-10 w-10 text-muted-foreground" />
      <div className="max-w-md">
        <p className="text-sm font-medium">No claims emitted yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This transform has no claims to evaluate. Either it ran
          before the slice-2b pipeline hooks landed, or the
          extractor didn&rsquo;t emit any property claims. Re-run
          extraction to populate this surface.
        </p>
      </div>
    </Card>
  )
}

function NoContradictionsState({ totalScanned }: { totalScanned: number }) {
  // Total_claims_scanned > 0 && contradictions.length === 0: the
  // good state. The writer is healthy and the data agrees with
  // itself across chunks.
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <CheckCircle2 className="h-10 w-10 text-green-700 dark:text-green-400" />
      <div className="max-w-md">
        <p className="text-sm font-medium">All claims agree</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The extractor scanned {totalScanned.toLocaleString()}{' '}
          {totalScanned === 1 ? 'claim' : 'claims'} for this
          transform and found no cross-chunk disagreements. Every
          (target, property) pair has a single consistent value.
        </p>
      </div>
    </Card>
  )
}

function ContradictionCard({ contradiction }: { contradiction: Contradiction }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
        <TargetIdentity
          targetKind={contradiction.target_kind}
          targetId={contradiction.target_id}
        />
        <span className="text-muted-foreground">·</span>
        <span className="font-mono text-xs">{contradiction.property_key}</span>
        <Badge variant="secondary" className="ml-auto">
          {contradiction.severity} distinct{' '}
          {contradiction.severity === 1 ? 'value' : 'values'}
        </Badge>
      </div>
      <CompetingClaimsTable claims={contradiction.competing_claims} />
    </Card>
  )
}

/**
 * Render the (target_kind, target_id) pair as a human-readable
 * identity. Node targets are just the canonical_id. Edge targets
 * carry their structure inline in the pipe-delimited signature
 * the slice 2b-edge writer assembles: ``src_cid|TYPE|tgt_cid``.
 * Decompose so the operator sees "Alice — WORKS_AT → Acme" not
 * a raw pipe string.
 */
function TargetIdentity({
  targetKind,
  targetId,
}: {
  targetKind: string
  targetId: string
}) {
  if (targetKind === 'edge') {
    const parts = targetId.split('|')
    if (parts.length === 3) {
      const [src, type, tgt] = parts
      return (
        <span className="flex items-center gap-1.5 text-sm">
          <Badge variant="outline" className="text-[10px]">
            edge
          </Badge>
          <span className="font-mono text-xs" title={src}>
            {shortId(src)}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Badge variant="outline" className="font-mono text-[10px]">
            {type}
          </Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-xs" title={tgt}>
            {shortId(tgt)}
          </span>
        </span>
      )
    }
    // Fallback: edge signature didn't decompose (graceful-degrade
    // case from the writer, e.g. an edge with missing endpoints
    // that fell back to its per-chunk id). Render as-is.
    return (
      <span className="flex items-center gap-1.5 text-sm">
        <Badge variant="outline" className="text-[10px]">
          edge
        </Badge>
        <span className="font-mono text-xs">{targetId}</span>
      </span>
    )
  }
  // Node target — just the canonical_id (UUID).
  return (
    <span className="flex items-center gap-1.5 text-sm">
      <Badge variant="outline" className="text-[10px]">
        node
      </Badge>
      <span className="font-mono text-xs" title={targetId}>
        {shortId(targetId)}
      </span>
    </span>
  )
}

function CompetingClaimsTable({ claims }: { claims: Claim[] }) {
  // The list is sorted by confidence DESC at the server. The
  // first entry is the pipeline-winning value; the rest are
  // alternatives. Mark the winner with the Trophy icon so the
  // operator can read the precedence at a glance.
  const winner = claims[0]
  return (
    <table className="w-full text-xs">
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="pb-1 font-normal"></th>
          <th className="pb-1 font-normal">Value</th>
          <th className="pb-1 font-normal">Confidence</th>
          <th className="pb-1 font-normal">Model</th>
          <th className="pb-1 font-normal">Chunk</th>
        </tr>
      </thead>
      <tbody>
        {claims.map((claim) => {
          const isWinner = winner && claim.id === winner.id
          return (
            <tr
              key={claim.id}
              className={`align-top ${
                isWinner ? '' : 'text-muted-foreground'
              }`}
            >
              <td className="py-1 pr-2">
                {isWinner ? (
                  <Trophy
                    className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400"
                    aria-label="Pipeline-winning claim"
                  />
                ) : null}
              </td>
              <td className="py-1 pr-2 font-medium text-foreground">
                {formatValue(claim.value)}
              </td>
              <td className="py-1 pr-2 font-mono">
                {formatConfidence(claim.confidence)}
              </td>
              <td className="py-1 pr-2 font-mono">
                {claim.source_extractor_model ?? '∅'}
              </td>
              <td className="py-1 font-mono">
                {claim.source_chunk_id ?? '∅'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ---- Helpers ---------------------------------------------------------------

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '∅'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function formatConfidence(value: number): string {
  // Render as 2-decimal percent so 0.873 → "0.87". The
  // contradictions detector ranks on raw float; showing the
  // truncated form preserves visible ordering without lying about
  // precision (the underlying claim still carries the full value).
  return value.toFixed(2)
}

function formatFloat(value: number): string {
  return value.toFixed(2)
}

function shortId(value: string): string {
  // Canonical_ids are UUID5 hex; the first 8 chars are enough to
  // disambiguate within a single transform's view. The full id
  // lives on the title attribute so hover surfaces it.
  if (value.length <= 12) return value
  return `${value.slice(0, 8)}…`
}

function safeParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
