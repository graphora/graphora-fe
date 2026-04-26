'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

const YAMLEditor = dynamic(
  () => import('@/components/ontology/yaml-editor').then((m) => m.YAMLEditor),
  {
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full" />,
  }
)

interface SchemaTabProps {
  transformId: string
}

interface InferredOntologyResponse {
  transform_id: string
  ontology_yaml: string
  ontology: {
    entities?: Record<string, unknown>
    relationships?: Record<string, unknown>
  }
  stats: {
    node_count: number
    edge_count: number
    entity_types: number
    relationship_types: number
  }
}

/**
 * Schema tab — runs post-hoc ontology inference and shows the YAML.
 *
 * Calls /api/transform/<id>/inferred-ontology, which the backend
 * computes by feeding a graph summary back into the LLM. Each call
 * is a real round-trip (no caching yet), so we expose a manual
 * "Re-infer" button rather than auto-refreshing.
 *
 * Read-only display in PR1; a future iteration adds an "Accept &
 * persist" action that hits POST /finalize-ontology.
 */
export function SchemaTab({ transformId }: SchemaTabProps) {
  const [data, setData] = useState<InferredOntologyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const resp = await fetch(`/api/transform/${transformId}/inferred-ontology`)
      const text = await resp.text()
      if (!resp.ok) {
        const detail = safeParse<{ detail?: string; error?: string }>(text)
        throw new Error(
          detail?.detail || detail?.error || `Failed to infer ontology (${resp.status})`
        )
      }
      const parsed = JSON.parse(text) as InferredOntologyResponse
      setData(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformId])

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">Inferred ontology</h2>
          <p className="text-sm text-muted-foreground">
            Generated from the extracted graph — type clusters, naming,
            and relationship patterns reverse-engineered from what was
            actually surfaced.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Re-infer
        </Button>
      </div>

      {data && (
        <div className="grid grid-cols-4 gap-3 text-sm">
          <StatTile label="Nodes" value={data.stats.node_count} />
          <StatTile label="Edges" value={data.stats.edge_count} />
          <StatTile label="Entity types" value={data.stats.entity_types} />
          <StatTile label="Relationship types" value={data.stats.relationship_types} />
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--line)' }}>
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-destructive">
            <p className="font-medium">Could not infer ontology</p>
            <p className="mt-1 text-destructive/80">{error}</p>
            <p className="mt-3 text-xs text-destructive/70">
              The most common cause is a transform that has no extracted
              nodes yet. Wait for extraction to finish before opening the
              Schema tab.
            </p>
          </div>
        ) : data ? (
          <YAMLEditor value={data.ontology_yaml} onChange={() => {}} readOnly height="100%" />
        ) : null}
      </div>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: 'var(--line)' }}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function safeParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
