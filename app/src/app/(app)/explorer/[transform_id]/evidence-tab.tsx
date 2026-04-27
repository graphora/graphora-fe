'use client'

import { useMemo, useState } from 'react'
import { type GraphData, type Node } from '@/types/graph'
import { Quote, FileText } from 'lucide-react'

/**
 * Properties the extraction pipeline writes onto nodes/edges to
 * record where they came from. Matches the backend MCP server's
 * ``_EVIDENCE_KEYS`` set so the same fields surface in both surfaces.
 */
const EVIDENCE_KEYS = [
  'source_chunk',
  'source_chunk_id',
  'source_text',
  'source',
  'document_id',
  'document_name',
  'chunk_offset',
  'page_number',
  'extraction_confidence',
] as const

interface EvidenceTabProps {
  data: GraphData
}

/**
 * Stub Evidence tab — a list view + detail panel sourced entirely
 * from properties already on the graph. No new backend endpoint;
 * the extraction pipeline writes provenance fields onto each node
 * and we surface whatever is there.
 *
 * The full version (Track B in the design doc) adds decision logs,
 * confidence breakdowns, alternative candidates, and "copy as
 * citation". This PR ships just enough to make the trust story
 * visible at a glance: which nodes have evidence, and what the
 * source span looks like.
 */
export function EvidenceTab({ data }: EvidenceTabProps) {
  const nodesWithEvidence = useMemo(() => {
    return data.nodes.filter((n) => hasAnyEvidenceField(n))
  }, [data.nodes])

  const [selectedId, setSelectedId] = useState<string | null>(
    nodesWithEvidence[0]?.id ?? null
  )
  const selected = useMemo(
    () => nodesWithEvidence.find((n) => n.id === selectedId) ?? null,
    [nodesWithEvidence, selectedId]
  )

  if (nodesWithEvidence.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Quote className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No provenance recorded</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            None of the extracted nodes carry source-span properties
            ({EVIDENCE_KEYS.slice(0, 3).join(', ')}…). Re-run extraction
            with a model + prompt that emit provenance to populate this
            tab.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-full grid-cols-[280px_1fr]">
      <aside
        className="overflow-y-auto border-r"
        style={{ borderColor: 'var(--line)' }}
      >
        <div className="border-b px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground"
          style={{ borderColor: 'var(--line)' }}
        >
          {nodesWithEvidence.length} of {data.nodes.length} nodes
        </div>
        <ul>
          {nodesWithEvidence.map((node) => {
            const isActive = node.id === selectedId
            return (
              <li key={node.id}>
                <button
                  onClick={() => setSelectedId(node.id)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b px-4 py-3 text-left text-sm transition-colors ${
                    isActive ? 'bg-muted/60' : 'hover:bg-muted/30'
                  }`}
                  style={{ borderColor: 'var(--line)' }}
                >
                  <span className="font-medium">
                    {nodeDisplayName(node)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {node.type}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <section className="overflow-y-auto p-6">
        {selected ? (
          <EvidenceDetail node={selected} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a node on the left to inspect its source span.
          </div>
        )}
      </section>
    </div>
  )
}

function EvidenceDetail({ node }: { node: Node }) {
  const evidence = pickEvidence(node)
  const props = node.properties || {}
  const sourceText = String(
    evidence.source_text ?? evidence.source_chunk ?? ''
  ).trim()

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {node.type}
        </p>
        <h2 className="mt-0.5 text-2xl font-semibold">
          {nodeDisplayName(node)}
        </h2>
      </header>

      {sourceText && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Source span
          </h3>
          <blockquote
            className="rounded-lg border bg-muted/40 p-4 font-mono text-sm leading-relaxed"
            style={{ borderColor: 'var(--line)' }}
          >
            {sourceText}
          </blockquote>
          {Boolean(evidence.document_name || evidence.document_id) && (
            <p className="mt-2 text-xs text-muted-foreground">
              From{' '}
              <span className="font-medium text-foreground">
                {String(evidence.document_name ?? evidence.document_id)}
              </span>
              {evidence.page_number != null &&
                ` · page ${String(evidence.page_number)}`}
              {evidence.chunk_offset != null &&
                ` · offset ${String(evidence.chunk_offset)}`}
            </p>
          )}
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-medium">Evidence properties</h3>
        <PropertyTable rows={evidence} />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium">All properties</h3>
        <PropertyTable rows={props} />
      </section>
    </div>
  )
}

function PropertyTable({ rows }: { rows: Record<string, unknown> }) {
  const entries = Object.entries(rows)
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">No properties.</p>
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--line)' }}>
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b last:border-b-0" style={{ borderColor: 'var(--line)' }}>
              <td className="w-48 bg-muted/30 px-3 py-2 align-top font-medium">
                {key}
              </td>
              <td className="px-3 py-2 align-top">
                <code className="font-mono text-xs">
                  {formatValue(value)}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---- helpers --------------------------------------------------------------

function hasAnyEvidenceField(node: Node): boolean {
  const props = node.properties || {}
  return EVIDENCE_KEYS.some((k) => props[k] !== undefined && props[k] !== null)
}

export function pickEvidence(node: Node): Record<string, unknown> {
  const props = node.properties || {}
  const out: Record<string, unknown> = {}
  for (const k of EVIDENCE_KEYS) {
    if (props[k] !== undefined && props[k] !== null) {
      out[k] = props[k]
    }
  }
  return out
}

function nodeDisplayName(node: Node): string {
  return (
    node.label ||
    String(node.properties?.name ?? '') ||
    String(node.properties?.title ?? '') ||
    node.id
  )
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}
