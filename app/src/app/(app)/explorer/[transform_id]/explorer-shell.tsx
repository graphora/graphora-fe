'use client'

import { useCallback, useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { type GraphData } from '@/types/graph'
import { GraphTab } from './graph-tab'
import { SchemaTab, type InferredOntologyResponse } from './schema-tab'
import { EvidenceTab } from './evidence-tab'
import { ExportTab } from './export-tab'
import { Network, FileCode2, Quote, Download } from 'lucide-react'

type TabKey = 'graph' | 'schema' | 'evidence' | 'export'

interface ExplorerShellProps {
  transformId: string
}

/**
 * Coordinates data fetching and tab routing for the Explorer.
 *
 * Owns the shared GraphData fetch — both the Graph tab and (later)
 * the Evidence tab need the full nodes/edges list, so we fetch once
 * here and pass down. The Schema tab fetches its own ontology
 * lazily on tab activation to avoid running post-hoc inference for
 * users who never click into Schema.
 */
export function ExplorerShell({ transformId }: ExplorerShellProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [graphError, setGraphError] = useState<string | null>(null)
  const [graphLoading, setGraphLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('graph')

  // Schema tab state is owned here, not in SchemaTab itself, so the
  // already-fetched response survives tab switches. SchemaTab is a
  // pure presentation component.
  const [schemaData, setSchemaData] = useState<InferredOntologyResponse | null>(null)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setGraphLoading(true)
        const resp = await fetch(`/api/graph/${transformId}`)
        if (!resp.ok) {
          throw new Error(`Failed to load graph (${resp.status})`)
        }
        const data = (await resp.json()) as GraphData
        if (!cancelled) {
          setGraphData(data)
          setGraphError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setGraphError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (!cancelled) setGraphLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [transformId])

  const loadSchema = useCallback(async () => {
    try {
      setSchemaLoading(true)
      setSchemaError(null)
      const resp = await fetch(`/api/transform/${transformId}/inferred-ontology`)
      const text = await resp.text()
      if (!resp.ok) {
        const detail = safeParse<{ detail?: string; error?: string }>(text)
        throw new Error(
          detail?.detail || detail?.error || `Failed to infer ontology (${resp.status})`
        )
      }
      const parsed = JSON.parse(text) as InferredOntologyResponse
      setSchemaData(parsed)
    } catch (err) {
      setSchemaError(err instanceof Error ? err.message : String(err))
    } finally {
      setSchemaLoading(false)
    }
  }, [transformId])

  // First-time-only auto-load when the user opens Schema. Subsequent
  // visits show the cached data; the Re-infer button is the only way
  // to trigger a fresh request after the first response lands. Avoids
  // burning an LLM round-trip per tab toggle.
  useEffect(() => {
    if (
      activeTab === 'schema' &&
      schemaData === null &&
      schemaError === null &&
      !schemaLoading
    ) {
      loadSchema()
    }
  }, [activeTab, schemaData, schemaError, schemaLoading, loadSchema])

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-6 py-4" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold">Explorer</h1>
            <p className="text-sm text-muted-foreground">
              Transform <code className="rounded bg-muted px-1 py-0.5 text-xs">{transformId}</code>
            </p>
          </div>
          {graphData && (
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{graphData.nodes.length}</span> nodes
              </span>
              <span>
                <span className="font-medium text-foreground">{graphData.edges.length}</span> edges
              </span>
            </div>
          )}
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="px-6">
          <TabsTrigger value="graph">
            <Network className="mr-2 h-4 w-4" />
            Graph
          </TabsTrigger>
          <TabsTrigger value="schema">
            <FileCode2 className="mr-2 h-4 w-4" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="evidence">
            <Quote className="mr-2 h-4 w-4" />
            Evidence
          </TabsTrigger>
          <TabsTrigger value="export">
            <Download className="mr-2 h-4 w-4" />
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="flex-1 overflow-hidden">
          {graphLoading ? (
            <GraphSkeleton />
          ) : graphError ? (
            <ErrorPanel message={graphError} />
          ) : (
            <GraphTab data={graphData!} />
          )}
        </TabsContent>

        <TabsContent value="schema" className="flex-1 overflow-auto">
          {/* SchemaTab is always rendered once the Explorer is open;
              ExplorerShell owns the data state, so the fetch fires
              once on first activation (gated in the loadSchema effect)
              and the response survives Graph↔Schema toggling. */}
          <SchemaTab
            data={schemaData}
            loading={schemaLoading}
            error={schemaError}
            onRefresh={loadSchema}
          />
        </TabsContent>

        <TabsContent value="evidence" className="flex-1 overflow-hidden">
          {graphLoading ? (
            <GraphSkeleton />
          ) : graphError ? (
            <ErrorPanel message={graphError} />
          ) : (
            <EvidenceTab data={graphData!} />
          )}
        </TabsContent>

        <TabsContent value="export" className="flex-1 overflow-auto">
          {graphLoading ? (
            <GraphSkeleton />
          ) : graphError ? (
            <ErrorPanel message={graphError} />
          ) : (
            <ExportTab data={graphData!} transformId={transformId} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function GraphSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 p-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="flex-1 w-full" />
    </div>
  )
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
        <p className="font-medium">Failed to load graph</p>
        <p className="mt-1 text-destructive/80">{message}</p>
      </div>
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
