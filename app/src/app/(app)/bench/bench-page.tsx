'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  RefreshCw,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/layouts/page-header'
import type {
  BenchEntryScore,
  BenchExtractorReport,
  BenchRunReport,
} from '@/types/bench'

/**
 * B4-bench slice 2 — bench dashboard (operator-facing view).
 *
 * Renders the aggregated bench report from /api/bench/run.
 *
 * Auth posture — the question the reviewer raised. Two distinct
 * surfaces with intentionally different auth contracts:
 *   * ``/api/v1/bench/run`` (backend) — unauthenticated. This
 *     is the **public reproducibility surface**: anyone with the
 *     server URL can curl the JSON and verify the numbers from
 *     a fresh checkout. "Public benchmark" in the B4-bench plan
 *     refers to this surface.
 *   * ``/bench`` (this page) — sits inside the auth-gated
 *     ``(app)/`` route group, the same shell every other
 *     operator-facing page lives in. The page is a presentation
 *     layer on top of the public API; an anonymous reviewer who
 *     wants the bench data uses the API directly (or renders
 *     their own view from it). The dashboard view is for
 *     operators, who are already signed in.
 *
 * If a genuinely-public marketing-style bench page is needed
 * later, that's a separate route outside ``(app)/`` — not part
 * of this slice.
 *
 * Three empty states, mirroring the Contradictions tab's
 * convention so an operator's mental model from one surface
 * carries to the other:
 *   1. ``corpus_size === 0`` — bench infrastructure not deployed
 *      against any golden corpus. Shouldn't normally happen in
 *      this repo; pin a placeholder anyway.
 *   2. ``extractor_count === 0`` — corpus exists but no extractor
 *      outputs have been committed yet. Show instructions
 *      pointing at bench/README.md.
 *   3. ``extractor_count > 0`` — render the full table.
 *
 * Fetch behavior: state lives in this component, the Refresh
 * button is the manual re-fetch trigger. Page-level mount fires
 * one fetch; subsequent visits get a fresh fetch on navigation
 * (no shell-level caching). The /api/bench/run endpoint is a
 * cheap DB-free file walk so re-fetching liberally is cheap.
 */
export function BenchPage() {
  const [data, setData] = useState<BenchRunReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  /** Operator-controlled headline: micro (entity-weighted) vs
   * macro (per-doc mean). Both are in the response payload; the
   * toggle picks which one to show in the main column. The other
   * stays computed on the BenchExtractorReport — a deep-detail
   * view can show both side-by-side, but the dashboard's primary
   * column has to commit to one. */
  const [headline, setHeadline] = useState<'micro' | 'macro'>('micro')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('/api/bench/run')
      const text = await resp.text()
      if (!resp.ok) {
        const detail = safeParse<{ error?: string; detail?: string }>(text)
        throw new Error(
          detail?.error || detail?.detail || `Bench fetch failed (${resp.status})`
        )
      }
      const parsed = JSON.parse(text) as BenchRunReport
      setData(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <PageHeader
        kicker="Track B · Trust primitives"
        title="Benchmark"
        description={
          'Reproducible scores against the 50-entry golden corpus. ' +
          'Numbers come from extractor outputs committed under ' +
          'bench/results/; anyone with a checkout can verify them.'
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        }
      />

      {loading && data === null && <BenchSkeleton />}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-medium">Could not load bench report</p>
          <p className="mt-1 text-destructive/80">{error}</p>
        </Card>
      )}

      {data && !loading && !error && (
        <>
          <SummaryRow data={data} />
          {data.corpus_size === 0 ? (
            <NoCorpusState />
          ) : data.extractor_count === 0 ? (
            <NoExtractorsState />
          ) : (
            <>
              <HeadlineToggle headline={headline} onChange={setHeadline} />
              <ul className="flex flex-col gap-3">
                {data.extractors.map((extractor) => (
                  <li key={extractor.extractor_name}>
                    <ExtractorCard
                      extractor={extractor}
                      headline={headline}
                      corpusSize={data.corpus_size}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ---- Sub-components --------------------------------------------------------

function BenchSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

function SummaryRow({ data }: { data: BenchRunReport }) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <SummaryStat label="Corpus entries" value={data.corpus_size} />
        <SummaryStat label="Extractors scored" value={data.extractor_count} />
      </div>
    </Card>
  )
}

function SummaryStat({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div>
      <div className="text-xl font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function NoCorpusState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <CircleDashed className="h-10 w-10 text-muted-foreground" />
      <div className="max-w-md">
        <p className="text-sm font-medium">No golden corpus discovered</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The bench runner couldn&rsquo;t find any{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            golden/&lt;slug&gt;/
          </code>{' '}
          subdirectories. This should never happen in a normal
          checkout — verify the working directory is the repo
          root.
        </p>
      </div>
    </Card>
  )
}

function NoExtractorsState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <BarChart3 className="h-10 w-10 text-muted-foreground" />
      <div className="max-w-md">
        <p className="text-sm font-medium">No extractor outputs committed</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The corpus is in place, but no extractor has committed
          scoring outputs under{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            bench/results/&lt;extractor&gt;/
          </code>
          .
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          See{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            bench/README.md
          </code>{' '}
          for the population workflow. Each extractor needs a
          subdirectory with one{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            &lt;slug&gt;.json
          </code>{' '}
          file per corpus entry in the{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            GraphResponse
          </code>{' '}
          shape.
        </p>
      </div>
    </Card>
  )
}

function HeadlineToggle({
  headline,
  onChange,
}: {
  headline: 'micro' | 'macro'
  onChange: (next: 'micro' | 'macro') => void
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Headline F1:</span>
      <div className="inline-flex rounded-md border border-border/60">
        <button
          type="button"
          onClick={() => onChange('micro')}
          className={`px-3 py-1 text-xs font-medium ${
            headline === 'micro'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-muted/40'
          }`}
          title="Entity-count weighted; favors dense documents"
        >
          Micro
        </button>
        <button
          type="button"
          onClick={() => onChange('macro')}
          className={`px-3 py-1 text-xs font-medium ${
            headline === 'macro'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-muted/40'
          }`}
          title="Per-document mean; treats every doc equally"
        >
          Macro
        </button>
      </div>
    </div>
  )
}

function ExtractorCard({
  extractor,
  headline,
  corpusSize,
}: {
  extractor: BenchExtractorReport
  headline: 'micro' | 'macro'
  corpusSize: number
}) {
  const [expanded, setExpanded] = useState(false)

  // Headline-selected node + edge F1. Both micro and macro live
  // on the report; the toggle just picks which one this card
  // shows in the top row. The complementary number is rendered
  // smaller below for context — operators don't have to flip
  // the toggle to see both, just to choose which one's bigger.
  const headlineNodeF1 =
    headline === 'micro'
      ? extractor.micro_node_f1
      : extractor.macro_node_f1
  const headlineEdgeF1 =
    headline === 'micro'
      ? extractor.micro_edge_f1
      : extractor.macro_edge_f1
  const otherLabel = headline === 'micro' ? 'macro' : 'micro'
  const otherNodeF1 =
    headline === 'micro'
      ? extractor.macro_node_f1
      : extractor.micro_node_f1
  const otherEdgeF1 =
    headline === 'micro'
      ? extractor.macro_edge_f1
      : extractor.micro_edge_f1

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-semibold">{extractor.extractor_name}</span>
        <CoverageBadge
          scored={extractor.scored_count}
          errored={extractor.errored_count}
          corpusSize={corpusSize}
        />
        <span className="ml-auto flex items-center gap-4 text-sm">
          <ScoreBlock
            label="Nodes F1"
            headline={headlineNodeF1}
            other={otherNodeF1}
            otherLabel={otherLabel}
          />
          <ScoreBlock
            label="Edges F1"
            headline={headlineEdgeF1}
            other={otherEdgeF1}
            otherLabel={otherLabel}
          />
        </span>
      </button>

      {expanded && (
        <div className="mt-4 border-t pt-4">
          <PerEntryTable entries={extractor.entries} />
        </div>
      )}
    </Card>
  )
}

function CoverageBadge({
  scored,
  errored,
  corpusSize,
}: {
  scored: number
  errored: number
  corpusSize: number
}) {
  // Four visual states. The icon picks based on coverage health,
  // and the text ALWAYS surfaces both scored and errored counts
  // when errored > 0 — including the zero-scored case.
  //
  // Reviewer-flagged Medium on commit c304e06: pre-fix the
  // ``scored === 0`` branch ran first and returned the badge
  // without ever consulting errored_count, so an extractor with
  // ``scored_count: 0, errored_count: 50`` rendered just
  // "0 / 50" — exactly the failure mode the API surface
  // (errored_count required-not-optional) was pinned to
  // prevent in the wire layer. The whole-pipeline-broken vs.
  // empty-extraction distinction depends on this number being
  // visible whenever it's non-zero.
  //
  // Coverage health → icon:
  //  * scored === 0 && errored > 0 → "every entry errored" →
  //    red AlertTriangle (totally broken extractor)
  //  * scored === 0 && errored === 0 → "no outputs at all" →
  //    dashed circle (empty extractor directory)
  //  * scored > 0 && errored > 0 → "partial coverage" →
  //    amber AlertTriangle
  //  * scored > 0 && errored === 0 → "full coverage" →
  //    green check
  const allErrored = scored === 0 && errored > 0
  const noOutputs = scored === 0 && errored === 0
  const partial = scored > 0 && errored > 0

  let icon: React.ReactNode
  if (allErrored) {
    icon = (
      <AlertTriangle className="mr-1 h-3 w-3 text-red-700 dark:text-red-400" />
    )
  } else if (noOutputs) {
    icon = <CircleDashed className="mr-1 h-3 w-3" />
  } else if (partial) {
    icon = (
      <AlertTriangle className="mr-1 h-3 w-3 text-amber-700 dark:text-amber-400" />
    )
  } else {
    icon = (
      <CheckCircle2 className="mr-1 h-3 w-3 text-green-700 dark:text-green-400" />
    )
  }

  return (
    <Badge variant="outline" className="text-[10px]">
      {icon}
      {errored > 0
        ? `${scored} / ${corpusSize} · ${errored} errored`
        : `${scored} / ${corpusSize}`}
    </Badge>
  )
}

function ScoreBlock({
  label,
  headline,
  other,
  otherLabel,
}: {
  label: string
  headline: number
  other: number
  otherLabel: string
}) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="font-mono text-lg font-semibold">
        {headline.toFixed(3)}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {label} · {otherLabel} {other.toFixed(3)}
      </span>
    </div>
  )
}

function PerEntryTable({ entries }: { entries: BenchEntryScore[] }) {
  const sorted = useMemo(() => {
    // Errored rows first so coverage gaps are visible at a
    // glance, then sort by F1 ascending so the weakest scored
    // entries float to the top of the scored section.
    return [...entries].sort((a, b) => {
      if (!!a.error !== !!b.error) return a.error ? -1 : 1
      return a.node_f1 - b.node_f1
    })
  }, [entries])

  return (
    <table className="w-full text-xs">
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="pb-1 font-normal">Corpus entry</th>
          <th className="pb-1 font-normal">Nodes F1</th>
          <th className="pb-1 font-normal">Edges F1</th>
          <th className="pb-1 font-normal">Nodes (TP/FP/FN)</th>
          <th className="pb-1 font-normal">Edges (TP/FP/FN)</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((entry) => (
          <tr
            key={entry.corpus_slug}
            className={`align-top ${
              entry.error ? 'text-amber-700 dark:text-amber-400' : ''
            }`}
          >
            <td className="py-1 pr-2 font-mono">{entry.corpus_slug}</td>
            {entry.error ? (
              <td className="py-1 pr-2" colSpan={4}>
                <span className="font-medium">errored:</span> {entry.error}
              </td>
            ) : (
              <>
                <td className="py-1 pr-2 font-mono">
                  {entry.node_f1.toFixed(3)}
                </td>
                <td className="py-1 pr-2 font-mono">
                  {entry.edge_f1.toFixed(3)}
                </td>
                <td className="py-1 pr-2 font-mono text-muted-foreground">
                  {entry.node_true_positives}/{entry.node_false_positives}/
                  {entry.node_false_negatives}
                </td>
                <td className="py-1 pr-2 font-mono text-muted-foreground">
                  {entry.edge_true_positives}/{entry.edge_false_positives}/
                  {entry.edge_false_negatives}
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---- Helpers ---------------------------------------------------------------

function safeParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
