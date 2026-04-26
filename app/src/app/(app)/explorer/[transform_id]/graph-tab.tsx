'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { type GraphData, type Edge, type Node } from '@/types/graph'

/**
 * Lazy-load the existing GraphVisualization. NVL itself is ~575 KB
 * gzipped of WebGL renderer code; gating it behind dynamic() keeps
 * the Explorer route's first-paint cost limited to the shell + the
 * filter-bar primitives. The graph canvas streams in after the shell
 * paints, mirroring the spike's recommended fallback (1).
 */
const GraphVisualization = dynamic(
  () => import('@/components/graph-viz').then((m) => m.GraphVisualization),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading graph engine…</div>
      </div>
    ),
  }
)

interface GraphTabProps {
  data: GraphData
}

/**
 * Wraps the production GraphVisualization with Explorer-specific
 * affordances: type filter, name search, fit-to-screen shortcut, and
 * a keyboard-shortcut hint. Filtering is client-side — the data set
 * is already in memory, and the API doesn't yet support type-filtered
 * queries.
 */
export function GraphTab({ data }: GraphTabProps) {
  const [search, setSearch] = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)

  const allTypes = useMemo(() => {
    const set = new Set<string>()
    for (const n of data.nodes) {
      if (n.type) set.add(n.type)
    }
    return Array.from(set).sort()
  }, [data.nodes])

  // Initialize "all types selected" the first time the type list loads.
  useEffect(() => {
    if (activeTypes.size === 0 && allTypes.length > 0) {
      setActiveTypes(new Set(allTypes))
    }
  }, [allTypes, activeTypes.size])

  const filteredData = useMemo(() => {
    if (!search && activeTypes.size === allTypes.length) {
      return data
    }
    const needle = search.trim().toLowerCase()
    const matches = (n: Node) => {
      if (!activeTypes.has(n.type)) return false
      if (!needle) return true
      const haystack = [
        n.label,
        n.id,
        ...(Object.values(n.properties || {}).map(String)),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    }
    const keptNodes = data.nodes.filter(matches)
    const keptIds = new Set(keptNodes.map((n) => n.id))
    const keptEdges = data.edges.filter(
      (e: Edge) => keptIds.has(e.source) && keptIds.has(e.target)
    )
    return { ...data, nodes: keptNodes, edges: keptEdges }
  }, [data, search, activeTypes, allTypes.length])

  // Keyboard shortcuts: `/` focus search, `Esc` clear search.
  // `f` (fit-to-screen) is handled inside GraphVisualization's own
  // toolbar; we just document it in the help hint.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'Escape') {
        setSearch('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const allTypesActive = activeTypes.size === allTypes.length
  const filteredCount = filteredData.nodes.length
  const totalCount = data.nodes.length

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center gap-3 border-b px-6 py-3"
        style={{ borderColor: 'var(--line)' }}
      >
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Search nodes…  (press /)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-8"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {allTypes.map((t) => {
            const active = activeTypes.has(t)
            return (
              <button
                key={t}
                onClick={() =>
                  setActiveTypes((prev) => {
                    const next = new Set(prev)
                    if (next.has(t)) next.delete(t)
                    else next.add(t)
                    return next
                  })
                }
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  active
                    ? 'border-foreground/30 bg-foreground/5 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {t}
              </button>
            )
          })}
          {allTypes.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() =>
                setActiveTypes(allTypesActive ? new Set() : new Set(allTypes))
              }
            >
              {allTypesActive ? 'None' : 'All'}
            </Button>
          )}
        </div>

        <div className="ml-auto text-xs text-muted-foreground">
          {filteredCount === totalCount ? (
            <>{totalCount} nodes</>
          ) : (
            <>
              <span className="font-medium text-foreground">{filteredCount}</span> of {totalCount} nodes
            </>
          )}
          <span className="ml-3 text-muted-foreground/70">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">/</kbd>{' '}
            search ·{' '}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">Esc</kbd>{' '}
            clear
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {filteredData.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium">No nodes match the current filter.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Adjust the type filter or clear the search to see the full graph.
              </p>
            </div>
          </div>
        ) : (
          <GraphVisualization graphData={filteredData} />
        )}
      </div>
    </div>
  )
}
