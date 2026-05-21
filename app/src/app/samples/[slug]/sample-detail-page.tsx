'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Code2, FileText, Network } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { SampleDetail } from '@/types/samples'

// GraphVisualization pulls in NVL + WebGL; dynamic-import so
// it doesn't ship in the gallery-page bundle and only loads
// when a visitor actually views a detail page.
const GraphVisualization = dynamic(
  () =>
    import('@/components/graph-viz').then(
      (mod) => mod.GraphVisualization
    ),
  { ssr: false, loading: () => <GraphSkeleton /> }
)

/**
 * /samples/[slug] — full sample view (unauthenticated).
 *
 * Three columns on wide screens (collapsing to stacked on
 * mobile):
 *   1. Source document text (left) — what the extractor saw.
 *   2. Extracted graph (center, interactive) — what came out.
 *   3. Ontology + "about this sample" README (right) — the
 *      contract + the human explanation of what extraction
 *      patterns this sample exercises.
 *
 * Bottom: "Try with your own document" CTA → sign-up page.
 */
export function SampleDetailPage({ slug }: { slug: string }) {
  const [data, setData] = useState<SampleDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(`/api/samples/${encodeURIComponent(slug)}`)
      const text = await resp.text()
      if (!resp.ok) {
        const detail = safeParse<{ error?: string; detail?: string }>(text)
        throw new Error(
          detail?.error ||
            detail?.detail ||
            `Sample fetch failed (${resp.status})`
        )
      }
      const parsed = JSON.parse(text) as SampleDetail
      setData(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-4">
        <Link
          href="/samples"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All samples
        </Link>
      </div>

      {loading && data === null && <DetailSkeleton />}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-medium">Could not load sample</p>
          <p className="mt-1 text-destructive/80">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void load()}
          >
            Retry
          </Button>
        </Card>
      )}

      {data && !error && (
        <>
          <header className="mb-6">
            <Badge variant="outline" className="mb-2 text-[10px]">
              {data.domain}
            </Badge>
            <h1 className="text-2xl font-medium tracking-tight">
              {data.display_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.expected_graph.nodes.length}{' '}
              {data.expected_graph.nodes.length === 1
                ? 'node'
                : 'nodes'}{' '}
              · {data.expected_graph.edges.length}{' '}
              {data.expected_graph.edges.length === 1
                ? 'edge'
                : 'edges'}{' '}
              extracted
            </p>
          </header>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr_1fr]">
            <DocumentPanel document={data.document} />
            <GraphPanel graph={data.expected_graph} />
            <SidebarPanel
              ontology={data.ontology_yaml}
              readme={data.readme_markdown}
            />
          </div>

          <TryItCta />
        </>
      )}
    </div>
  )
}

// ---- Panels --------------------------------------------------------------

function DocumentPanel({ document }: { document: string }) {
  return (
    <Card className="flex flex-col">
      <div className="border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <FileText className="mr-1.5 inline h-3.5 w-3.5" />
        Source document
      </div>
      <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-foreground/90">
        {document}
      </pre>
    </Card>
  )
}

function GraphPanel({
  graph,
}: {
  graph: SampleDetail['expected_graph']
}) {
  return (
    <Card className="flex flex-col">
      <div className="border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Network className="mr-1.5 inline h-3.5 w-3.5" />
        Extracted graph
      </div>
      <div className="relative h-[500px]">
        <GraphVisualization graphData={graph} />
      </div>
    </Card>
  )
}

function SidebarPanel({
  ontology,
  readme,
}: {
  ontology: string
  readme: string | null
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col">
        <div className="border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Code2 className="mr-1.5 inline h-3.5 w-3.5" />
          Ontology
        </div>
        <pre className="max-h-80 overflow-auto whitespace-pre p-4 text-[11px] leading-snug font-mono text-foreground/90">
          {ontology}
        </pre>
      </Card>
      {readme && (
        <Card className="flex flex-col">
          <div className="border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            About this sample
          </div>
          <div className="max-h-96 overflow-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-muted-foreground">
            {readme}
          </div>
        </Card>
      )}
    </div>
  )
}

function TryItCta() {
  return (
    <Card className="mt-8 p-6">
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-medium">
            Try this on your own document
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a PDF or paste text — Graphora extracts a
            graph against the ontology you provide (or one it
            infers automatically). Sign up to get started.
          </p>
        </div>
        <Link
          href="/sign-up"
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Sign up
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  )
}

// ---- Skeletons -----------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr_1fr]">
        <Skeleton className="h-[500px] w-full" />
        <Skeleton className="h-[500px] w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    </div>
  )
}

function GraphSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <Skeleton className="h-3/4 w-3/4" />
    </div>
  )
}

// ---- Helpers -------------------------------------------------------------

function safeParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
