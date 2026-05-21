'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, RefreshCw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  SampleSummary,
  SamplesListResponse,
} from '@/types/samples'

/**
 * /samples — public gallery view.
 *
 * Top-level page (NOT inside the (app) auth-gated group). Lets
 * unauthenticated visitors see the 50 golden-corpus samples
 * before deciding whether to sign up. Removes the
 * "what does this thing extract?" friction that's killing
 * post-signup conversion when the next step asks for an API
 * key.
 *
 * Filter is by domain (chip row at the top). Cards link to
 * /samples/[slug] for the full document + graph view.
 */
export function SamplesGalleryPage() {
  const [data, setData] = useState<SamplesListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeDomain, setActiveDomain] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('/api/samples')
      const text = await resp.text()
      if (!resp.ok) {
        const detail = safeParse<{ error?: string; detail?: string }>(text)
        throw new Error(
          detail?.error ||
            detail?.detail ||
            `Samples fetch failed (${resp.status})`
        )
      }
      const parsed = JSON.parse(text) as SamplesListResponse
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

  const visibleSamples = useMemo(() => {
    if (!data) return []
    if (activeDomain === null) return data.samples
    return data.samples.filter((s) => s.domain === activeDomain)
  }, [data, activeDomain])

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Sample gallery
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">
          See what Graphora extracts
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Real production-quality extractions from 50 curated
          documents across {data?.domains.length ?? '14'} domains. Click any
          card to see the source document, the ontology used,
          and the resulting knowledge graph. No sign-up
          required.
        </p>
      </header>

      {loading && data === null && <GallerySkeleton />}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Could not load samples</p>
              <p className="mt-1 text-destructive/80">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        </Card>
      )}

      {data && !error && (
        <>
          <DomainFilter
            domains={data.domains}
            activeDomain={activeDomain}
            onChange={setActiveDomain}
            totalCount={data.samples.length}
          />
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleSamples.map((sample) => (
              <li key={sample.slug}>
                <SampleCard sample={sample} />
              </li>
            ))}
          </ul>
          {visibleSamples.length === 0 && (
            <div className="mt-12 text-center text-sm text-muted-foreground">
              No samples in this domain.
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---- Sub-components -------------------------------------------------------

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-36 w-full" />
      ))}
    </div>
  )
}

function DomainFilter({
  domains,
  activeDomain,
  onChange,
  totalCount,
}: {
  domains: string[]
  activeDomain: string | null
  onChange: (next: string | null) => void
  totalCount: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={chipClass(activeDomain === null)}
      >
        All <span className="ml-1 opacity-60">({totalCount})</span>
      </button>
      {domains.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={chipClass(activeDomain === d)}
        >
          {d}
        </button>
      ))}
    </div>
  )
}

function chipClass(active: boolean): string {
  const base =
    'rounded-full border px-3 py-1 transition-colors'
  if (active) {
    return `${base} border-foreground bg-foreground text-background`
  }
  return `${base} border-border/60 text-muted-foreground hover:border-foreground/60 hover:text-foreground`
}

function SampleCard({ sample }: { sample: SampleSummary }) {
  return (
    <Link href={`/samples/${sample.slug}`}>
      <Card className="group h-full p-4 transition-shadow hover:shadow-medium">
        <div className="mb-2 flex items-center justify-between">
          <Badge variant="outline" className="text-[10px]">
            {sample.domain}
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        <h3 className="font-medium leading-tight">
          {sample.display_name}
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          {sample.node_count}{' '}
          {sample.node_count === 1 ? 'node' : 'nodes'} ·{' '}
          {sample.edge_count}{' '}
          {sample.edge_count === 1 ? 'edge' : 'edges'}
        </p>
      </Card>
    </Link>
  )
}

// ---- Helpers --------------------------------------------------------------

function safeParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
