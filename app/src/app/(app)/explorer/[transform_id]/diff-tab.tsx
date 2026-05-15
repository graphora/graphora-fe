'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  CircleDashed,
  Diff as DiffIcon,
  Minus,
  Pencil,
  Plus,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  EdgeDelta,
  GraphDiff,
  NodeDelta,
  PropertyChange,
} from '@/types/diff'
import type { Edge, Node } from '@/types/graph'

/**
 * B3-diff frontend tab.
 *
 * Lets the user pick a "base" transform (an earlier run by the same
 * user) and compare it against the currently-explored transform.
 * The current transform is the "compare" side — the user is
 * exploring it and wants to see what changed vs. a prior baseline.
 *
 * Mirrors the backend response shape from
 * /api/v1/graph/{base}/diff/{compare} (graphora-server commit
 * a75cd73 + reviewer-fix follow-ups). Lazy-loads — the diff only
 * fires when both a base is picked AND the user is on this tab.
 */

export interface TransformRunSummary {
  transform_id: string
  document_name: string
  processing_completed_at?: string | null
}

interface DiffTabProps {
  /** The transform the explorer is currently rendering — the
   * compare side of the diff. */
  transformId: string
}

export function DiffTab({ transformId }: DiffTabProps) {
  const [runs, setRuns] = useState<TransformRunSummary[] | null>(null)
  const [runsError, setRunsError] = useState<string | null>(null)
  const [baseTransformId, setBaseTransformId] = useState<string | null>(null)
  const [diff, setDiff] = useState<GraphDiff | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [diffError, setDiffError] = useState<string | null>(null)

  // Reviewer-flagged P2 on commit 4ce2fe2: rapidly switching base
  // transforms could fire multiple overlapping fetches. Whichever
  // resolved LAST (often a slow earlier request, not the most
  // recently picked base) wrote into setDiff — meaning the UI
  // could show a diff for a base the user already moved past.
  //
  // Two-layer guard:
  //   1. AbortController per fetch — when a new pick supersedes
  //      the old, the previous controller aborts the in-flight
  //      HTTP request server-side.
  //   2. Monotonic request id — the abort handles the network,
  //      but the ``.json()`` parse may already be running when
  //      abort fires. We track the latest request id in a ref
  //      and drop any response whose id is stale before writing
  //      to state. The ref is preferable to a state value here
  //      because the comparison happens INSIDE the same render
  //      cycle that issued the request; stale-closure state
  //      reads would defeat the purpose.
  const inFlightRef = useRef<{
    requestId: number
    controller: AbortController | null
  }>({ requestId: 0, controller: null })

  // Load the picker options once on mount. The dashboard/runs
  // endpoint returns the current user's recent transforms — same
  // scoping the diff endpoint uses, so anything visible here is
  // also valid as a base.
  useEffect(() => {
    let cancelled = false
    async function loadRuns() {
      try {
        const resp = await fetch('/api/dashboard/runs?limit=50')
        if (!resp.ok) {
          throw new Error(`Failed to load runs (${resp.status})`)
        }
        const body = await resp.json()
        const items: TransformRunSummary[] = body?.items ?? body?.runs ?? body
        if (!Array.isArray(items)) {
          throw new Error('Unexpected runs response shape')
        }
        if (!cancelled) {
          // Exclude the current transform from the picker — diffing
          // a transform against itself is meaningless (empty diff)
          // and surfaces as a user footgun. Filtering at the picker
          // is cheaper than rendering an "all zeros" state.
          setRuns(items.filter((r) => r.transform_id !== transformId))
        }
      } catch (err) {
        if (!cancelled) {
          setRunsError(err instanceof Error ? err.message : String(err))
        }
      }
    }
    loadRuns()
    return () => {
      cancelled = true
    }
  }, [transformId])

  const runDiff = useCallback(
    async (baseId: string) => {
      // Cancel the previous in-flight request before starting a new
      // one. AbortController.abort() rejects the fetch promise with
      // an AbortError, which our catch block ignores for stale
      // requests. The state writes (setDiff / setDiffError /
      // setDiffLoading) are gated by the request-id check so even
      // if abort doesn't reach the network layer in time, the
      // stale completion can't overwrite the latest base's result.
      inFlightRef.current.controller?.abort()
      const requestId = inFlightRef.current.requestId + 1
      const controller = new AbortController()
      inFlightRef.current = { requestId, controller }

      setDiffLoading(true)
      setDiffError(null)
      setDiff(null)
      try {
        const resp = await fetch(`/api/graph/${baseId}/diff/${transformId}`, {
          signal: controller.signal,
        })
        const text = await resp.text()
        // Drop the response if a newer request was started while
        // this one was in flight. Each branch below early-returns
        // BEFORE touching state so a stale resolution can't shadow
        // the latest base's payload.
        if (inFlightRef.current.requestId !== requestId) {
          return
        }
        if (!resp.ok) {
          // The proxy passes the backend's status through; in
          // particular 413 means one of the transforms exceeds the
          // 10k-node loader cap (graphora-server's _check_truncated).
          // Surface a specific message so the user knows the cause
          // rather than seeing a generic "server error."
          const detail = safeParse<{ error?: string; detail?: string }>(text)
          let message =
            detail?.error || detail?.detail || `Diff failed (${resp.status})`
          if (resp.status === 413) {
            message =
              'One of the transforms is too large to diff (over 10k nodes). ' +
              'Streaming diff for large transforms is a future slice.'
          }
          throw new Error(message)
        }
        const parsed = JSON.parse(text) as GraphDiff
        setDiff(parsed)
      } catch (err) {
        // AbortError from a superseded request — not a real error,
        // and the state for that request was already cleared by the
        // newer call's setDiff(null). Drop silently.
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        // Same stale-response guard for error paths: don't blow
        // away a successful newer diff with an older request's
        // error message.
        if (inFlightRef.current.requestId !== requestId) {
          return
        }
        setDiffError(err instanceof Error ? err.message : String(err))
      } finally {
        if (inFlightRef.current.requestId === requestId) {
          setDiffLoading(false)
        }
      }
    },
    [transformId]
  )

  const onPickBase = useCallback(
    (value: string) => {
      setBaseTransformId(value)
      void runDiff(value)
    },
    [runDiff]
  )

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <header className="flex flex-wrap items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold">Compare with another run</h2>
          <p className="text-sm text-muted-foreground">
            Pick an earlier transform to see what changed.
          </p>
        </div>
        <div className="ml-auto w-full max-w-sm">
          {runs === null && !runsError && <Skeleton className="h-9 w-full" />}
          {runsError && (
            <p className="text-sm text-destructive">{runsError}</p>
          )}
          {runs !== null && (
            <Select
              value={baseTransformId ?? undefined}
              onValueChange={onPickBase}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select base transform…" />
              </SelectTrigger>
              <SelectContent>
                {runs.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No other transforms available
                  </div>
                ) : (
                  runs.map((r) => (
                    <SelectItem key={r.transform_id} value={r.transform_id}>
                      <span className="font-medium">{r.document_name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatTransformShort(r)}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      {baseTransformId === null && !diffLoading && (
        <EmptyState />
      )}
      {diffLoading && <DiffSkeleton />}
      {diffError && (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-medium">Could not produce diff</p>
          <p className="mt-1 text-destructive/80">{diffError}</p>
        </Card>
      )}
      {diff && !diffLoading && !diffError && (
        <>
          <SummaryCard summary={diff.summary} />
          <DiffSection
            title="Added nodes"
            count={diff.added_nodes.length}
            kind="added"
          >
            <NodeList nodes={diff.added_nodes} />
          </DiffSection>
          <DiffSection
            title="Removed nodes"
            count={diff.removed_nodes.length}
            kind="removed"
          >
            <NodeList nodes={diff.removed_nodes} />
          </DiffSection>
          <DiffSection
            title="Changed nodes"
            count={diff.changed_nodes.length}
            kind="changed"
          >
            <NodeDeltaList deltas={diff.changed_nodes} />
          </DiffSection>
          <DiffSection
            title="Added edges"
            count={diff.added_edges.length}
            kind="added"
          >
            <EdgeList edges={diff.added_edges} />
          </DiffSection>
          <DiffSection
            title="Removed edges"
            count={diff.removed_edges.length}
            kind="removed"
          >
            <EdgeList edges={diff.removed_edges} />
          </DiffSection>
          <DiffSection
            title="Changed edges"
            count={diff.changed_edges.length}
            kind="changed"
          >
            <EdgeDeltaList deltas={diff.changed_edges} />
          </DiffSection>
        </>
      )}
    </div>
  )
}

// ---- Sub-components --------------------------------------------------------

function EmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <CircleDashed className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Select a base transform from the picker above to start a diff.
      </p>
    </Card>
  )
}

function DiffSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

function SummaryCard({ summary }: { summary: GraphDiff['summary'] }) {
  // Reviewer-flagged P2 on commit 4ce2fe2: the wire shape is
  // nested (``summary.nodes.added``), not the flat naming used by
  // the server's internal dataclass. Pull through ``summary.nodes``
  // and ``summary.edges`` directly so the render survives the
  // re-key in graphora_server/api/graph.py::_diff_to_dict.
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <DiffIcon className="h-4 w-4" />
        Summary
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Nodes added" value={summary.nodes.added} tone="added" />
        <SummaryStat
          label="Nodes removed"
          value={summary.nodes.removed}
          tone="removed"
        />
        <SummaryStat
          label="Nodes changed"
          value={summary.nodes.changed}
          tone="changed"
        />
        <SummaryStat
          label="Nodes unchanged"
          value={summary.nodes.unchanged}
          tone="unchanged"
        />
        <SummaryStat label="Edges added" value={summary.edges.added} tone="added" />
        <SummaryStat
          label="Edges removed"
          value={summary.edges.removed}
          tone="removed"
        />
        <SummaryStat
          label="Edges changed"
          value={summary.edges.changed}
          tone="changed"
        />
        <SummaryStat
          label="Edges unchanged"
          value={summary.edges.unchanged}
          tone="unchanged"
        />
      </div>
    </Card>
  )
}

type DiffTone = 'added' | 'removed' | 'changed' | 'unchanged'

const TONE_STYLES: Record<DiffTone, string> = {
  added: 'text-green-700 dark:text-green-400',
  removed: 'text-red-700 dark:text-red-400',
  changed: 'text-amber-700 dark:text-amber-400',
  unchanged: 'text-muted-foreground',
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: DiffTone
}) {
  return (
    <div>
      <div className={`text-xl font-semibold ${TONE_STYLES[tone]}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function DiffSection({
  title,
  count,
  kind,
  children,
}: {
  title: string
  count: number
  kind: DiffTone
  children: React.ReactNode
}) {
  // Empty sections collapse to a single-line summary — both to
  // reduce visual noise on diffs where one side is empty AND so
  // the user can still see at-a-glance that the section was
  // checked (rather than not rendered).
  if (count === 0) {
    return (
      <Card className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <SectionIcon kind={kind} />
          <span className="font-medium">{title}</span>
          <Badge variant="secondary" className="ml-auto">
            0
          </Badge>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <SectionIcon kind={kind} />
        <span className="text-sm font-medium">{title}</span>
        <Badge variant="secondary" className="ml-auto">
          {count}
        </Badge>
      </div>
      {children}
    </Card>
  )
}

function SectionIcon({ kind }: { kind: DiffTone }) {
  const className = `h-4 w-4 ${TONE_STYLES[kind]}`
  if (kind === 'added') return <Plus className={className} />
  if (kind === 'removed') return <Minus className={className} />
  if (kind === 'changed') return <Pencil className={className} />
  return <CircleDashed className={className} />
}

function NodeList({ nodes }: { nodes: Node[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {nodes.map((n) => (
        <li key={n.id} className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="font-mono text-[10px]">
            {n.type}
          </Badge>
          <span className="font-medium">{n.label || n.id}</span>
          <span className="ml-auto text-xs text-muted-foreground">{n.id}</span>
        </li>
      ))}
    </ul>
  )
}

function EdgeList({ edges }: { edges: Edge[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {edges.map((e) => (
        <li key={e.id ?? `${e.source}-${e.target}`} className="flex items-center gap-2 text-sm">
          <span className="font-mono text-xs">{e.source}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Badge variant="outline" className="font-mono text-[10px]">
            {(e as Edge & { type?: string }).type ?? 'EDGE'}
          </Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-xs">{e.target}</span>
        </li>
      ))}
    </ul>
  )
}

function NodeDeltaList({ deltas }: { deltas: NodeDelta[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {deltas.map((d) => (
        <li key={d.compare_id} className="rounded border border-border/60 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm">
            <Badge variant="outline" className="font-mono text-[10px]">
              {d.type}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              {d.canonical_id ?? `${d.base_id} → ${d.compare_id}`}
            </span>
          </div>
          <PropertyChangeTable changes={d.property_changes} />
        </li>
      ))}
    </ul>
  )
}

function EdgeDeltaList({ deltas }: { deltas: EdgeDelta[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {deltas.map((d) => (
        <li key={d.compare_id} className="rounded border border-border/60 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="font-mono text-xs">{d.source_key}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant="outline" className="font-mono text-[10px]">
              {d.type}
            </Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-xs">{d.target_key}</span>
          </div>
          <PropertyChangeTable changes={d.property_changes} />
        </li>
      ))}
    </ul>
  )
}

function PropertyChangeTable({
  changes,
}: {
  changes: Record<string, PropertyChange>
}) {
  const rows = useMemo(() => Object.entries(changes), [changes])
  if (rows.length === 0) return null
  return (
    <table className="w-full text-xs">
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="pb-1 font-normal">Property</th>
          <th className="pb-1 font-normal">Base</th>
          <th className="pb-1 font-normal">Compare</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([key, change]) => (
          <tr key={key} className="align-top">
            <td className="py-1 pr-2 font-mono">{key}</td>
            <td className="py-1 pr-2 text-red-700 dark:text-red-400">
              {formatPropertyValue(change.base)}
            </td>
            <td className="py-1 text-green-700 dark:text-green-400">
              {formatPropertyValue(change.compare)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---- Helpers ---------------------------------------------------------------

function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined) return '∅'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function formatTransformShort(r: TransformRunSummary): string {
  // Show the document name + the short id; ordering by
  // processing_completed_at happens server-side, so the relative
  // position in the picker already encodes recency. We don't
  // display the full ISO timestamp to keep the picker narrow.
  if (r.processing_completed_at) {
    const d = new Date(r.processing_completed_at)
    if (!Number.isNaN(d.getTime())) {
      return `${d.toISOString().slice(0, 10)} · ${r.transform_id.slice(0, 8)}`
    }
  }
  return r.transform_id.slice(0, 8)
}

function safeParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
