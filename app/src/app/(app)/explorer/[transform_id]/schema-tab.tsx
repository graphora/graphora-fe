'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Check, ExternalLink, RefreshCw, RotateCcw } from 'lucide-react'
import { toast } from 'react-hot-toast'

const YAMLEditor = dynamic(
  () => import('@/components/ontology/yaml-editor').then((m) => m.YAMLEditor),
  {
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full" />,
  }
)

export interface InferredOntologyResponse {
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

interface FinalizedOntology {
  ontology_id: string
  source: 'inferred' | 'user_edit'
}

interface SchemaTabProps {
  transformId: string
  data: InferredOntologyResponse | null
  loading: boolean
  error: string | null
  onRefresh: () => void
}

/**
 * Schema tab — view, edit, and persist the inferred ontology.
 *
 * Loading the inferred YAML is owned by ExplorerShell (the parent
 * caches the response across tab switches). This component owns the
 * editable YAML state and the Accept flow:
 *
 *   * Edit YAML → drafts diverge from the inferred result; "Reset"
 *     reverts to the inferred copy without a backend call.
 *   * Accept → POST /api/transform/<id>/finalize-ontology with the
 *     current YAML body. The backend validates shape + persists
 *     verbatim (skip-inference mode added 2026-04-27).
 *   * Bodyless Accept (no edits) → the backend re-infers and
 *     persists. Lets users save the inferred output as-is without
 *     having to round-trip the YAML through their network.
 */
export function SchemaTab({
  transformId,
  data,
  loading,
  error,
  onRefresh,
}: SchemaTabProps) {
  const [draft, setDraft] = useState<string>('')
  const [accepting, setAccepting] = useState(false)
  const [finalized, setFinalized] = useState<FinalizedOntology | null>(null)

  // Sync the editor whenever a fresh inference lands. Replacing the
  // baseline also clears any saved finalize result — the user is
  // looking at a different ontology now.
  useEffect(() => {
    if (data) {
      setDraft(data.ontology_yaml)
      setFinalized(null)
    }
  }, [data])

  const dirty = data ? draft !== data.ontology_yaml : false

  const handleReset = () => {
    if (data) setDraft(data.ontology_yaml)
  }

  const handleAccept = async () => {
    if (!data) return
    setAccepting(true)
    setFinalized(null)
    try {
      const init: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
      if (dirty) {
        init.body = JSON.stringify({ yaml_content: draft })
      }
      const resp = await fetch(
        `/api/transform/${transformId}/finalize-ontology`,
        init
      )
      const text = await resp.text()
      if (!resp.ok) {
        const detail = safeParse<{ detail?: string; error?: string }>(text)
        throw new Error(
          detail?.detail || detail?.error || `Failed to persist (${resp.status})`
        )
      }
      const parsed = JSON.parse(text) as {
        ontology_id: string
        source: 'inferred' | 'user_edit'
      }
      setFinalized({ ontology_id: parsed.ontology_id, source: parsed.source })
      toast.success(
        parsed.source === 'user_edit'
          ? 'Ontology saved (your edits)'
          : 'Ontology saved'
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Could not save ontology: ${msg}`)
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Inferred ontology
            {dirty && (
              <span className="ml-2 align-middle text-xs font-normal text-amber-600 dark:text-amber-400">
                · edited
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Generated from the extracted graph — type clusters, naming,
            and relationship patterns reverse-engineered from what was
            actually surfaced. Edit the YAML and Accept to persist.
          </p>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={accepting}
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading || accepting}
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Re-infer
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={!data || loading || accepting}
          >
            <Check className={`mr-2 h-3.5 w-3.5 ${accepting ? 'animate-pulse' : ''}`} />
            {accepting ? 'Saving…' : dirty ? 'Accept edits' : 'Accept'}
          </Button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-4 gap-3 text-sm">
          <StatTile label="Nodes" value={data.stats.node_count} />
          <StatTile label="Edges" value={data.stats.edge_count} />
          <StatTile label="Entity types" value={data.stats.entity_types} />
          <StatTile label="Relationship types" value={data.stats.relationship_types} />
        </div>
      )}

      {finalized && (
        <div
          className="flex items-center justify-between rounded-lg border bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
          style={{ borderColor: 'var(--line)' }}
        >
          <div>
            <p className="font-medium">
              Saved as ontology{' '}
              <code className="rounded bg-emerald-100 px-1 py-0.5 text-xs dark:bg-emerald-900/40">
                {finalized.ontology_id}
              </code>
            </p>
            <p className="mt-0.5 text-xs text-emerald-800/80 dark:text-emerald-200/70">
              {finalized.source === 'user_edit'
                ? 'Your edited YAML was persisted verbatim.'
                : 'The inferred YAML was persisted as-is.'}
            </p>
          </div>
          {/* The Button component does not support asChild in this
              codebase, so render a styled Link directly with classes
              that match the ghost-button visual. */}
          <Link
            href={`/ontology/${finalized.ontology_id}`}
            className="inline-flex h-7 items-center gap-1.5 rounded-[var(--r-sm)] border border-transparent px-2.5 text-[11.5px] font-medium text-emerald-900 hover:bg-emerald-100/40 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
          >
            Open
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      <div
        className="flex-1 overflow-hidden rounded-lg border"
        style={{ borderColor: 'var(--line)' }}
      >
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
          <YAMLEditor value={draft} onChange={setDraft} height="100%" />
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
